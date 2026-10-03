# Predictive Multi-Source Flood Forecasting & Early Warning Engine Design

## 1. Overview & Problem Statement

SafeRoute's routing engine successfully generates safe detour routes using native `pgRouting` (Dijkstra over 260k OpenStreetMap edges) and vehicle safety thresholds ($\le 15\text{cm}$ for motorbikes, $\le 25\text{cm}$ for cars). However, the existing flood prediction subsystem suffered from several limitations:
1. **Coarse Spatial Weather Resolution**: Open-Meteo precipitation was sampled at only 4 quadrant points across Ho Chi Minh City (>2,095 km²), unable to capture hyper-local convective rainstorms.
2. **Instantaneous vs. Cumulative Rainfall**: Road flooding in urban hydrology depends heavily on 1–3 hour rolling precipitation accumulation ($R_{\text{cum}}$) and soil/drainage saturation, whereas the legacy code checked only single-hour precipitation rates.
3. **Hardcoded Semi-diurnal Tide Hours**: Legacy tidal curves hardcoded peak tides at 06:15 and 17:45 every day, failing to reflect the lunar cycle (Syzygy spring tides at the 1st and 15th of the lunar month) and diurnal phase shifts (~48.8 minutes per day) observed at the Phu An and Nha Be hydrological gauge stations.
4. **Lack of Compound Rain-Tide Coupling**: Heavy rain coinciding with high river tide prevents gravity drainage outfalls from discharging into the Saigon River (tide-locking effect), worsening water depths.
5. **Reactive vs. Predictive News Ingestion**: News articles were treated solely as live post-flood reports decaying after 3 hours, overlooking forward-looking meteorological weather bulletins (bản tin cảnh báo triều cường/mưa dông tương lai).
6. **Limited Hotspot Coverage**: Only 22 corridors were registered, leaving vast areas of HCMC unmonitored.

This design introduces a **Multi-Source Data Fusion Predictive Engine** capable of achieving $\ge 80\%$ prediction accuracy and identifying both **Active Flood Obstacles (🔴 Critical)** and **Potential Flood Zones (🟡 Warning / Early Detection)**.

---

## 2. System Architecture

```
 +-------------------------------------------------------------------------------+
 |                              METEOROLOGICAL & TIDAL INPUTS                    |
 +-------------------------------------------------------------------------------+
 | 1. Open-Meteo Multi-Station API             2. Astronomical Lunar Tide Engine |
 |    (Rolling 3h Precipitation: T-2, T-1, T)     (Phu An / Nha Be Gauge Model)  |
 +-----------------------+---------------------------------------+---------------+
                         |                                       |
                         v                                       v
         +-------------------------------+       +-------------------------------+
         |  Effective Rainfall R_eff(T)  |       |  Lunar Tide Amplitude H_peak  |
         |  & Drainage Saturation P_rain |       |  & Peak Shift P_tide          |
         +---------------+---------------+       +---------------+---------------+
                         |                                       |
                         +-------------------+-------------------+
                                             |
                                             v
                         +---------------------------------------+
                         |  Compound Flood Model (Tide-Locking)  |
                         |  P_compound = P_base + 0.35*P_r*P_t   |
                         +-------------------+-------------------+
                                             |
 +-------------------------------------------+-----------------------------------+
 | 3. Smart News AI Extractor (Gemini)       | 4. Expanded HCMC Hotspots (65+)   |
 |    - Forecast Warnings vs Live Incidents  |    - 5 Drainage Basins            |
 |    - Historical Empirical Prior Weight    |    - Calibrated Rain/Tide Limits  |
 +-------------------------------------------+-----------------------------------+
                                             |
                                             v
 +-------------------------------------------------------------------------------+
 |                    3-TIER RISK CLASSIFICATION & DISPATCH                      |
 |                                                                               |
 | 🟢 Safe (P < 0.30): Free flow, weight multiplier = 1.0                        |
 | 🟡 Potential (0.30 <= P < 0.60): Warning badge, penalty = 2.5 (Motorbike)     |
 | 🔴 Critical (P >= 0.60): Impassable obstacle, cost = Infinity in Dijkstra     |
 +-------------------------------------------+-----------------------------------+
                                             |
                                             v
 +-------------------------------------------------------------------------------+
 |                        pgRouting Dijkstra Navigation Engine                   |
 |              (Outputs Safe Route, Fastest Route & Warning Segments)           |
 +-------------------------------------------------------------------------------+
```

---

## 3. Detailed Component Specifications

### 3.1. Hydrological Rolling Precipitation Engine (`server/src/services/weatherService.ts`)

- **Rolling 3-Hour Cumulative Precipitation**:
  Urban drainage pipelines in HCMC (conforming to Decision 752/QD-TTg) can evacuate an average of $20-30\text{mm/h}$. When continuous rainfall over 2–3 hours exceeds $45\text{mm}$, ground saturation triggers severe overland ponding.
  
  $$R_{\text{eff}}(T) = R(T) + 0.70 \cdot R(T - 1\text{h}) + 0.40 \cdot R(T - 2\text{h})$$
  
  Where $R(T)$, $R(T-1\text{h})$, $R(T-2\text{h})$ are hourly precipitation rates retrieved from Open-Meteo.
- **Rain Flood Probability**:
  $$P_{\text{rain}} = \frac{1}{1 + \exp\left(-0.15 \cdot (R_{\text{eff}} - C_{\text{threshold}})\right)}$$
  Where $C_{\text{threshold}}$ is the drainage capacity rating of the corridor (default: $30\text{mm}$).

---

### 3.2. Saigon River Astronomical Lunar Tide Engine (`server/src/services/tideService.ts`)

- **Lunar Calendar Conversion**: Pure TypeScript astronomical calculation conforming to Vietnam standard time (GMT+7).
- **Semi-Diurnal Spring/Neap Tide Amplitude Model (Trạm Phú An / Nhà Bè)**:
  - Spring Tides (Triều cường Sóc Vọng): 29, 30, 1, 2, 3 and 14, 15, 16, 17, 18 of lunar month $\rightarrow$ $H_{\text{peak}} \ge 1.60\text{m}$ (Alert Level 3).
  - Neap Tides (Kém triều): 7, 8, 9 and 22, 23, 24 of lunar month $\rightarrow$ $H_{\text{peak}} \le 1.25\text{m}$ (Safe, zero tidal flooding).
  
  $$H_{\text{peak}}(d_{\text{lunar}}) = 1.15\text{m} + 0.55\text{m} \cdot \max\left(\cos^4\left(\frac{\pi (d_{\text{lunar}} - 1)}{15}\right), \cos^4\left(\frac{\pi (d_{\text{lunar}} - 15)}{15}\right)\right)$$
  
- **Diurnal Peak Time Drift**:
  Lunar day duration is 24 hours 50 minutes. Peak tide hours shift forward by $\approx 48.8\text{ minutes/day}$:
  
  $$T_{\text{peak\_morning}}(d_{\text{lunar}}) = \left(04:30 + \frac{d_{\text{lunar}} \cdot 48.8}{60}\text{ hours}\right) \pmod{12.4\text{ hours}}$$
  $$T_{\text{peak\_evening}}(d_{\text{lunar}}) = T_{\text{peak\_morning}} + 12.0\text{ hours}$$

- **Tidal Flood Probability ($P_{\text{tide}}$)**:
  - $H_{\text{peak}} < 1.45\text{m} \implies P_{\text{tide}} = 0$
  - $1.45\text{m} \le H_{\text{peak}} < 1.55\text{m} \implies P_{\text{tide}} = 0.40$
  - $1.55\text{m} \le H_{\text{peak}} < 1.65\text{m} \implies P_{\text{tide}} = 0.75$
  - $H_{\text{peak}} \ge 1.65\text{m} \implies P_{\text{tide}} = 0.95$

---

### 3.3. Compound Flood Coupling (Tide-Locking Effect)

When high river tide blocks gravity drainage gates while intense rainfall occurs in low-lying riverine basins (Districts 7, 8, Nha Be, Binh Thanh, Thu Duc):
$$P_{\text{base}} = 1 - (1 - P_{\text{rain}}) \cdot (1 - P_{\text{tide}})$$
$$P_{\text{compound}} = \min\left(1.0,\; P_{\text{base}} + 0.35 \cdot P_{\text{rain}} \cdot P_{\text{tide}}\right)$$

Compound Depth:
$$\text{Depth}_{\text{compound}} = \text{Depth}_{\text{tide}} + \text{Depth}_{\text{rain}} + 0.30 \cdot \sqrt{\text{Depth}_{\text{tide}} \cdot \text{Depth}_{\text{rain}}}$$

---

### 3.4. Two-Tier Predictive AI News Ingestion (`server/src/services/newsCrawler.ts` & `geminiExtractor.ts`)

- **Article Classification**:
  - `forecast_warning`: Weather/tide warning bulletin announcing future flooding (e.g., "dự báo triều cường rằm tháng 8 ngập từ 17h-19h trong 3 ngày tới").
    - Action: Parse prospective target dates and daily peak windows; instantiate advance `FloodEvent` objects for those upcoming dates.
  - `incident_report`: Live on-the-scene report (water currently inundating roads).
    - Action: Apply standard 3-hour active obstacle decay window.
- **Empirical Prior Risk Multiplier from PostgreSQL History**:
  $$W_{\text{history}} = 1.0 + 0.10 \cdot \min(5, N_{\text{mentions}})$$
  Corridors frequently appearing in news archives (e.g., Tran Xuan Soan, Nguyen Van Qua) receive an elevated sensitivity weight, triggering earlier warning thresholds during moderate rainfall.
- **Scheduler**: Node-cron executed every 60 minutes and before peak rush hours (05:30, 11:30, 15:30).

---

### 3.5. Expanded 65+ HCMC Flood Hotspot Database (`server/src/services/vulnerableRoads.ts`)

Expansion from 22 to 65+ chronic inundation points across all 5 major drainage basins:
1. **Nam Sài Gòn (Kênh Tẻ - Kênh Đôi - Rạch Đỉa)**: Tran Xuan Soan, Huynh Tan Phat, Le Van Luong, Pham Hung, Duong Ba Trac, Ben Phu Dinh, Nguyen Thi Thap, Me Coc, Ton That Thuyet, etc.
2. **Đông Sài Gòn (Thủ Đức - Rạch Chiếc)**: Vo Van Ngan, To Ngoc Van, Quoc Huong, Thao Dien, Nguyen Van Huong, Kha Van Can, Do Xuan Hop, Le Van Viet, La Xuan Oai, Tam Binh, etc.
3. **Tây Bắc (Tham Lương - Bến Cát)**: Nguyen Van Qua, Phan Huy Ich, Le Duc Tho, Nguyen Van Khoi, Pham Van Chieu, Le Van Tho, Song Hanh QL22, Phan Anh, Tan Ky Tan Quy, Dong Den, Bau Cat, etc.
4. **Tây Nam (Tân Hóa - Lò Gốm)**: Ho Hoc Lam, An Duong Vuong, Kinh Duong Vuong, Hau Giang, Ba Hom, Tan Hoa Dong, etc.
5. **Trung tâm (Nhiêu Lộc - Bến Nghé)**: Ung Van Khiem, Dinh Bo Linh, Bach Dang, Nguyen Huu Canh, Nguyen Van Cu, Calmette, Phan Dinh Phung, Thach Thi Thanh, etc.

Each entry specifies: `id`, `streetName`, `district`, `drainageBasin`, `primaryCause` (`heavy_rain` | `high_tide` | `combined`), `rainThresholdMm`, `tideThresholdM`, `baseDepthCm`, `coordinate`.

---

### 3.6. Routing Engine Integration (`server/src/services/pgRoutingService.ts` & `routesRouter.ts`)

- **Risk Classification Rules**:
  - 🟢 **Safe ($P < 0.30$ or $\text{Depth} < 10\text{cm}$)**: No penalty.
  - 🟡 **Potential Hazard ($0.30 \le P < 0.60$ or $10\text{cm} \le \text{Depth} \le 20\text{cm}$)**:
    - Motorbikes: Edge penalty weight $\times 2.5$.
    - Cars: Normal transit with alert flag.
  - 🔴 **Critical Hazard ($P \ge 60\%$ or $\text{Depth} > 20\text{cm}$ for motorbike / $> 35\text{cm}$ for car)**:
    - Impassable obstacle: Edge cost = $999999$ (forbidden in Dijkstra).
- **API Response Structure**:
  Returns `safe_route`, `fastest_route`, `target_time`, `vehicle_type`, along with arrays of `critical_flood_points` and `potential_flood_points` for clear map visualization.

---

## 4. Verification & Testing Strategy

1. **Unit Tests**:
   - `tideService.test.ts`: Verify lunar date conversion and astronomical peak amplitude ($1.70\text{m}$ at full moon/new moon, $1.15\text{m}$ at half moon).
   - `weatherService.test.ts`: Verify 3-hour rolling accumulation formula ($R_{\text{eff}}$) and quadrant rainfall integration.
   - `predictionEngine.test.ts`: Verify compound flood formula, tide-locking booster ($0.35 \times$), and 3-tier risk threshold boundaries ($P < 0.3$, $0.3 \le P < 0.6$, $P \ge 0.6$).
   - `newsCrawler.test.ts`: Verify parsing of `forecast_warning` vs `incident_report` and prospective date scheduling.
   - `vulnerableRoads.test.ts`: Verify all 65+ corridors have valid coordinates and hydrological parameters.
2. **Integration & Routing Tests**:
   - `pgRoutingService.test.ts`: Test that motorbikes avoid potential (yellow) and critical (red) flood corridors when viable detours exist.
   - `api.test.ts`: End-to-end `POST /api/routes/navigate` with simulated high tide and heavy rain scenario.
3. **Regression Tests**:
   - Ensure all 34 existing server test cases continue passing with 100% success.
