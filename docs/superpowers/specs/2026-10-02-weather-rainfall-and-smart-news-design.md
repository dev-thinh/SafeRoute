# Real-time Weather Rainfall Integration & Smart News Ingestion Design

## 1. Overview & Context

SafeRoute currently models flood events using semi-diurnal astronomical tidal curves for the Saigon River and a static set of predefined hotspots. While effective for tidal surges, the system was unable to detect sudden, intense rainstorms (mưa dông nhiệt cục bộ) because it lacked real-time precipitation input. Furthermore, the news crawler was locked to 4 legacy articles due to deprecated model names (`gemini-1.5-flash`), had no clustering or deduplication for duplicate media reports, and lacked a temporal decay mechanism to clear dried-up roads after water receded.

This design introduces a **Multi-Source Data Fusion Architecture** that combines:
1. Real-time precipitation measurements and hourly rainfall forecasts from the Open-Meteo API.
2. A calibrated registry of HCMC flood-vulnerable road corridors mapped to drainage capacity thresholds (20mm, 35mm, 50mm/hour).
3. An upgraded news crawler with Gemini 3.5/3.8 Flash, event deduplication/clustering, and a 3-hour temporal decay window for navigation obstacles while preserving permanent article records in PostgreSQL.
4. Seamless integration with `pgRoutingService` on local PostGIS to bypass active rain and tide flood zones dynamically.

---

## 2. Architecture & Subsystems

```
 +------------------------+      +---------------------------+
 | Open-Meteo Weather API |      | Vulnerable Roads Registry |
 | (Hourly Precipitation) |      | (Thresholds & Depths)     |
 +-----------+------------+      +-------------+-------------+
             |                                 |
             +----------------+----------------+
                              |
                              v
             +---------------------------------+
             |   Dynamic Rain Flood Events     |
             +----------------+----------------+
                              |
 +----------------------------v-----+      +--------------------------+
 | Dynamic Baseline Tidal Hotspots  |      | Crowdsourced Live Reports|
 +----------------------------+-----+      +------------+-------------+
                              |                         |
 +----------------------------v-----+                   |
 | Smart News Crawler (3h TTL)      |                   |
 +----------------------------+-----+                   |
                              |                         |
                              +------------+------------+
                                           |
                                           v
                             +---------------------------+
                             | routesRouter: /navigate   |
                             +-------------+-------------+
                                           |
                                           v
                             +---------------------------+
                             | pgRouting Engine (Dijkstra|
                             | on OSM Network 260k edges)|
                             +---------------------------+
```

---

## 3. Component Specifications

### 3.1. Real-time Weather Service (`server/src/services/weatherService.ts`)
- **API Provider:** Open-Meteo Free Forecast API (`https://api.open-meteo.com/v1/forecast`).
- **Coverage Areas:** 4 primary HCMC meteorological quadrants:
  - Center: `10.7769, 106.7009` (District 1, 3, 4, 10)
  - South: `10.7333, 106.7167` (District 7, Nha Be)
  - East: `10.8494, 106.7725` (Thu Duc City)
  - Northwest: `10.8400, 106.6300` (Go Vap, District 12, Tan Binh)
- **Parameters:** `current=precipitation,rain` and `hourly=precipitation,rain`.
- **In-Memory Cache:** 15-minute TTL per quadrant to prevent extraneous HTTP requests.
- **Output:** Current precipitation rate (`mm/hour`) and peak forecast for the query timestamp.

### 3.2. Vulnerable Roads Registry (`server/src/services/vulnerableRoads.ts`)
- **Scientific & Engineering Basis:** Based on HCMC Department of Construction & Urban Drainage Company (UDC) drainage capacity ratings (designed for 30-45mm/h).
- **Corridor Registry:**
  - `Phan Huy Ích` (Go Vap/Tan Binh): threshold 30mm/h -> depth 45cm
  - `Lê Đức Thọ` (Go Vap): threshold 35mm/h -> depth 40cm
  - `Nguyễn Văn Khối / Cây Trâm` (Go Vap): threshold 25mm/h -> depth 45cm
  - `Võ Văn Ngân` (Thu Duc): threshold 35mm/h -> depth 50cm (steep slope runoff)
  - `Tô Ngọc Vân` (Thu Duc): threshold 30mm/h -> depth 40cm
  - `Quốc Hương` (Thu Duc / Thao Dien): threshold 25mm/h -> depth 45cm
  - `Nguyễn Văn Quá` (District 12): threshold 30mm/h -> depth 55cm
  - `Song Hành QL22` (District 12): threshold 35mm/h -> depth 40cm
  - `Ung Văn Khiêm` (Binh Thanh): threshold 30mm/h -> depth 45cm
  - `Nguyễn Hữu Cảnh` (Binh Thanh): threshold 35mm/h -> depth 40cm
  - `Hồ Học Lãm` (Binh Tan): threshold 25mm/h -> depth 50cm
  - `An Dương Vương` (District 8 / Binh Tan): threshold 30mm/h -> depth 40cm
  - `Huỳnh Tấn Phát` (District 7): threshold 30mm/h -> depth 45cm
  - `Lê Văn Lương` (District 7 / Nha Be): threshold 25mm/h -> depth 40cm
- **Dynamic Activation Function:**
  `evaluateRainfallHotspots(targetDate: Date, weatherByQuadrant: Record<Quadrant, number>): FloodEvent[]`
  Activates flood events if `quadrantRainMm >= corridor.rainThresholdMm`.
  Calculates depth using synthetic hydrograph: rising during storm, receding over 90 minutes.

### 3.3. Smart News Crawler & AI Extraction (`server/src/services/newsCrawler.ts`, `geminiExtractor.ts`)
- **AI Model Upgrade:** Support `gemini-3.5-flash` with graceful fallback to `gemini-3.8-flash`.
- **Deduplication / Clustering Algorithm:**
  - Normalize street name and district.
  - If an active flood event exists for `(street, district)` within 24 hours:
    - Update `estimatedDepthCm = Math.max(existing.depth, new.depth)`
    - Update `confidenceScore = Math.min(1.0, existing.confidence + 0.1)`
    - Do NOT insert duplicate obstacle points.
- **Temporal Decay (Active Routing Obstacles):**
  - Navigation obstacle window: `startTime = publishedAt`, `endTime = publishedAt + 3 hours`.
  - After 3 hours, the obstacle is cleared from routing so roads are not permanently blocked.
- **Historical Persistence:**
  - All articles remain permanently saved in PostgreSQL table `news_articles` for analytics, frequency ranking, and client UI feed display.

### 3.4. Routing Integration (`server/src/routes/routesRouter.ts`)
- `/api/routes/navigate`:
  - Fetch weather precipitation for target time.
  - Generate dynamic rain flood events.
  - Combine: `[...baselineTidalEvents, ...weatherRainEvents, ...activeNewsEvents, ...crowdsourcedEvents]`.
  - Pass into `findPgRoutingSafeRoute`.
  - Fall back to Goong API if origin/destination is outside Saigon coverage.

---

## 4. Testing & Verification Plan

1. **Unit Tests:**
   - `weatherService.test.ts`: Mock Open-Meteo responses, verify quadrant precipitation parsing and cache behavior.
   - `vulnerableRoads.test.ts`: Verify rainfall thresholds trigger expected flood depths and coordinate mappings.
   - `newsCrawler.test.ts`: Verify deduplication/clustering groups identical streets and respects 3-hour expiration.
2. **Integration Tests:**
   - `routesRouter.test.ts`: Run `POST /api/routes/navigate` with high precipitation scenario, verify pgRouting avoids rain-flooded corridor.
3. **End-to-End Build:**
   - Verify `npm test` passes 100%.
   - Verify `npm run build` in client succeeds.
