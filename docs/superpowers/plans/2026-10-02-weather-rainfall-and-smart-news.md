# Weather Rainfall Integration & Smart News Crawler Implementation Plan

> **Goal:** Integrate real-time Open-Meteo precipitation data, map rainfall to flood-vulnerable corridors in HCMC, upgrade news crawling with deduplication and 3-hour temporal decay for routing obstacles, and connect everything to pgRouting.

---

## Proposed File Changes

| File | Status | Responsibility |
| --- | --- | --- |
| `server/src/services/weatherService.ts` | New | Calls Open-Meteo API for 4 HCMC quadrants, caches precipitation rates for 15 minutes. |
| `server/tests/weatherService.test.ts` | New | Unit tests verifying parsing of precipitation, caching, and fallback handling. |
| `server/src/services/vulnerableRoads.ts` | New | Registry of HCMC flood hotspots mapped to rainfall thresholds (mm/h) and dynamic flood depth. |
| `server/tests/vulnerableRoads.test.ts` | New | Unit tests verifying corridor activation when rainfall exceeds thresholds. |
| `server/src/services/newsCrawler.ts` | Modify | Adds event deduplication/clustering, sets 3-hour expiration on routing obstacles, preserves database archive. |
| `server/tests/newsCrawler.test.ts` | New | Unit tests verifying deduplication and temporal filtering. |
| `server/src/routes/routesRouter.ts` | Modify | Merges real-time rain events into `combinedEvents` for `findPgRoutingSafeRoute`. |
| `server/tests/api.test.ts` | Modify | Tests `/api/routes/navigate` with high precipitation scenario avoiding rain-flooded corridor. |

---

## Tasks

### Task 1: Real-time Weather Service (`weatherService.ts`)
1. Create `server/src/services/weatherService.ts` implementing:
   - 4 quadrant coordinates for HCMC (Center, South, East, Northwest).
   - `getPrecipitationForQuadrants(targetDate?: Date): Promise<Record<string, number>>`.
   - 15-minute in-memory cache to respect API rate limits.
2. Create unit tests `server/tests/weatherService.test.ts`.
3. Run `npm test tests/weatherService.test.ts` and confirm passing.

### Task 2: Vulnerable Roads Registry (`vulnerableRoads.ts`)
1. Create `server/src/services/vulnerableRoads.ts` with:
   - List of iconic HCMC flood-prone streets with district, coordinates, and rainfall thresholds (20-45mm/h).
   - `getRainInducedFloodEvents(targetDate: Date, rainByQuadrant: Record<string, number>): FloodEvent[]`.
   - Triangular depth hydrograph (rising during rain, receding over 90 mins).
2. Create unit tests `server/tests/vulnerableRoads.test.ts`.
3. Run `npm test tests/vulnerableRoads.test.ts` and confirm passing.

### Task 3: Smart News Crawler with Deduplication & Temporal Decay (`newsCrawler.ts`)
1. Update `server/src/services/newsCrawler.ts`:
   - Deduplicate/cluster events for same street within 24 hours (merge depth, increment confidence score up to 1.0).
   - Add helper `getActiveNewsFloodEvents(targetDate: Date): FloodEvent[]` that filters events within a 3-hour window from publication.
2. Create unit tests `server/tests/newsCrawler.test.ts`.
3. Run `npm test tests/newsCrawler.test.ts` and confirm passing.

### Task 4: Integration with Dynamic Routing Engine (`routesRouter.ts`)
1. Update `server/src/routes/routesRouter.ts`:
   - Fetch quadrant precipitation via `weatherService`.
   - Generate rain-induced events via `vulnerableRoads`.
   - Filter active news events via `getActiveNewsFloodEvents`.
   - Merge into `combinedEvents` and pass to `findPgRoutingSafeRoute`.
2. Update `server/tests/api.test.ts` to verify the multi-source routing pipeline.
3. Run `npm test` across the full test suite (all tests passing).

### Task 5: End-to-End Build and Verification
1. Run `npm test` in `server` (expect 100% pass).
2. Run `npm run build` in `client` (expect 0 errors).
3. Commit completed feature.
