# SafeRoute: Hệ thống định tuyến né ngập dựa trên AI và dữ liệu thời sự
**Design Specification**
*Ngày lập: 27/09/2026*
*Tác giả: SafeRoute Team*
*Trạng thái: Approved*

---

## 1. Giới thiệu & Mục tiêu (Introduction & Goals)

### 1.1. Bối cảnh
Tại các đô thị lớn như TP. Hồ Chí Minh, triều cường và mưa lớn thường xuyên gây ngập cục bộ trên nhiều tuyến đường huyết mạch, dẫn đến chết máy xe, hư hỏng phương tiện, tê liệt giao thông và nguy hiểm tính mạng. Người dân thường khó nắm bắt trước lộ trình di chuyển của mình có bị ngập vào thời điểm sắp khởi hành hay không.

### 1.2. Mục tiêu hệ thống
Xây dựng **SafeRoute** — một nền tảng định tuyến thông minh hỗ trợ:
1. **Dự đoán ngập theo mốc thời gian ($T$)**: Người dùng chọn mốc thời gian di chuyển trong tương lai (ví dụ: tan sở lúc 17h30 hoặc sáng mai lúc 07h00), hệ thống tự động suy diễn nguy cơ ngập của các tuyến đường tại đúng mốc thời gian đó.
2. **Tổng hợp đa nguồn dữ liệu**:
   * Tự động cào và trích xuất dữ liệu từ các bản tin thời sự, dự báo thời tiết/triều cường bằng Generative AI (Google Gemini LLM).
   * Tiếp nhận báo cáo thời gian thực từ cộng đồng người tham gia giao thông (Crowdsourced Reports).
   * Cho phép Admin nhập/dán bài báo khẩn cấp để trích xuất điểm ngập ngay lập tức.
3. **Định tuyến né ngập theo loại phương tiện**:
   * Phân biệt xe máy (ngưỡng an toàn thấp, dễ chết máy) và ô tô (ngưỡng chịu nước cao hơn).
   * Đưa ra 2 tuyến đường song song để người dùng so sánh: **Tuyến an toàn né ngập (Safe Route)** và **Tuyến nhanh nhất (Fastest Route)** kèm cảnh báo chi tiết vị trí/độ sâu ngập.

---

## 2. Kiến trúc hệ thống & Công nghệ (Architecture & Tech Stack)

### 2.1. Sơ đồ khối kiến trúc

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND (Vite)                    │
│   - Leaflet + react-leaflet Map Component                   │
│   - Floating Route Planner Panel (A -> B, Time, Vehicle)    │
│   - Flood Risk Heatmap & Incident Overlay                   │
│   - Crowdsource Flood Reporting Modal                       │
│   - Admin Article Ingestion Dashboard                       │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST API / GeoJSON
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                NODE.JS BACKEND (Express + TS)               │
│                                                             │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │     Routing Engine    │       │   Prediction Engine   │  │
│  │ (OSRM + Smart Detour) │       │(Temporal Hazard Calc) │  │
│  └───────────┬───────────┘       └───────────┬───────────┘  │
│              │                               │              │
│  ┌───────────┴───────────┐       ┌───────────┴───────────┐  │
│  │ AI Ingestion Service  │       │  Spatial Service Layer│  │
│  │ (Crawler + Gemini LLM)│       │ (Turf.js + PostGIS)   │  │
│  └───────────────────────┘       └───────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQL / PostGIS Functions
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 POSTGRESQL + POSTGIS DATABASE               │
│   - flood_events (Sự kiện ngập từ tin tức, triều, mưa)      │
│   - user_reports (Báo cáo ngập từ người dùng kèm upvotes)   │
│   - news_articles (Bài báo đã cào và nhật ký phân tích AI)  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2. Tech Stack lựa chọn
* **Frontend**:
  * React 18+ với TypeScript và Vite.
  * Tailwind CSS cho styling hiện đại, responsive.
  * Leaflet & `react-leaflet` hiển thị bản đồ nền OpenStreetMap và vector GeoJSON.
  * Lucide-react (bộ icon trực quan), Headless UI / Radix UI.
  * TanStack Query (React Query) quản lý caching và API fetching.
* **Backend**:
  * Node.js v20+ với Express.js và TypeScript.
  * PostgreSQL 15+ tích hợp PostGIS extension.
  * ORM / Query Builder: Prisma ORM (với Prisma Client PostGIS extension) hoặc `pg` pool + Knex cho các truy vấn GIS chuyên sâu.
  * Turf.js (`@turf/turf`): Thư viện phân tích hình học không gian (Intersection, BoundingBox, Buffers) nhanh trên server.
  * `@google/genai` (Gemini API): Trích xuất thông tin bài báo có cấu trúc (Structured Outputs).
  * Cheerio & Axios: Dịch vụ cào tin tức (Web Scraping).
  * Node-cron: Lập lịch chạy crawler ngầm định kỳ.
* **Dịch vụ bản đồ & định tuyến bên ngoài**:
  * OpenStreetMap CartoDB / Standard Tiles (miễn phí, không yêu cầu thẻ tín dụng).
  * Nominatim OSM Geocoding API: Dịch tên đường, phường/quận sang tọa độ không gian.
  * OSRM API (Open Source Routing Machine) công khai hoặc container nội bộ: Tính toán ma trận đường đi và hình học polyline.

---

## 3. Mô hình dữ liệu (Database Schema)

### 3.1. Bảng `flood_events` (Sự kiện ngập từ tin tức và dự báo thủy văn)
Lưu trữ các đoạn đường ngập được AI trích xuất hoặc Admin nhập:
* `id`: UUID (Primary Key, default: `gen_random_uuid()`)
* `title`: VARCHAR(255) — Tiêu đề sự kiện hoặc tên bài báo
* `source_url`: TEXT — Đường dẫn bài báo nguồn
* `source_type`: VARCHAR(50) — `'news_crawler'` | `'admin_manual'` | `'tide_forecast'`
* `cause`: VARCHAR(50) — `'high_tide'` (triều cường) | `'heavy_rain'` (mưa lớn) | `'combined'`
* `street_name`: VARCHAR(255) — Tên đường (VD: "Trần Xuân Soạn")
* `district`: VARCHAR(100) — Quận / Huyện (VD: "Quận 7")
* `city`: VARCHAR(100) — Tỉnh / Thành phố (Mặc định: "TP. Hồ Chí Minh")
* `location_geom`: GEOMETRY(Geometry, 4326) — Tọa độ tâm hoặc LineString trục đường
* `buffer_geom`: GEOMETRY(Polygon, 4326) — Đa giác vùng ngập tràn (buffer 50m quanh trục đường)
* `start_time`: TIMESTAMPTZ — Thời điểm bắt đầu dâng nước
* `peak_time`: TIMESTAMPTZ — Thời điểm đỉnh triều hoặc mưa lớn nhất
* `end_time`: TIMESTAMPTZ — Thời điểm nước rút hoàn toàn
* `estimated_depth_cm`: INTEGER — Độ sâu dự kiến tại đỉnh ngập (cm)
* `confidence_score`: REAL — Hệ số tin cậy do AI đánh giá (0.0 đến 1.0)
* `created_at`: TIMESTAMPTZ (default: `NOW()`)

### 3.2. Bảng `user_reports` (Báo cáo cộng đồng thời gian thực)
* `id`: UUID (Primary Key)
* `location_geom`: GEOMETRY(Point, 4326) — Tọa độ người dùng đánh dấu
* `address_text`: VARCHAR(255) — Địa chỉ gần đúng
* `depth_level`: VARCHAR(20) — `'ankle'` (<20cm) | `'wheel'` (20-40cm) | `'knee'` (40-60cm) | `'deep'` (>60cm)
* `description`: TEXT — Ghi chú mô tả (VD: "Đoạn trước chợ ngập sâu xe máy chết máy la liệt")
* `image_url`: TEXT (tùy chọn) — Ảnh chụp hiện trường
* `upvotes`: INTEGER (default: 1) — Số người xác nhận
* `downvotes`: INTEGER (default: 0) — Số người báo nước đã rút
* `status`: VARCHAR(20) (default: `'active'`) — `'active'` | `'resolved'`
* `reported_at`: TIMESTAMPTZ (default: `NOW()`)

### 3.3. Bảng `news_articles` (Lịch sử bài báo đã xử lý)
* `id`: UUID (Primary Key)
* `url`: TEXT UNIQUE — URL bài viết tránh cào trùng lặp
* `title`: VARCHAR(500)
* `content`: TEXT — Nội dung văn bản thô
* `published_at`: TIMESTAMPTZ
* `is_parsed`: BOOLEAN (default: false)
* `raw_ai_response`: JSONB — Kết quả thô trả về từ Gemini AI

---

## 4. Mô hình suy diễn & Dự đoán ngập theo thời gian (Temporal Prediction Model)

Khi người dùng chỉ định điểm xuất phát, đích đến và mốc thời gian $T$:

### 4.1. Hàm biến thiên độ sâu ngập theo thời gian $T$ đối với sự kiện tin tức
Đối với mỗi bản ghi trong `flood_events`:
* Nếu $T < start\_time$ hoặc $T > end\_time + 30\text{ phút}$:
  $$Depth_{event}(T) = 0$$
* Nếu $start\_time \le T \le end\_time$: Áp dụng hàm chuông đối xứng quanh `peak_time`:
  $$Depth_{event}(T) = Depth_{peak} \times \left(1 - \frac{|T - peak\_time|}{\Delta t_{half}}\right)$$
  *(Trong đó $\Delta t_{half} = \frac{end\_time - start\_time}{2}$. Độ sâu đạt cực đại đúng lúc đỉnh triều/mưa).*

### 4.2. Hàm suy giảm theo thời gian đối với báo cáo cộng đồng
Báo cáo người dùng phản ánh hiện trạng tại $T_{report}$. Mức độ ảnh hưởng suy giảm theo thời gian (Decay):
* Độ sâu quy đổi ban đầu:
  * `ankle`: 15 cm
  * `wheel`: 30 cm
  * `knee`: 50 cm
  * `deep`: 70 cm
* Hàm suy giảm:
  $$\text{EffectiveDepth}_{report}(T) = Depth_{initial} \times \exp\left(-\lambda \cdot (T - T_{report})\right)$$
  *(Với $\lambda \approx 0.015$ tương ứng nửa chu kỳ rút nước khoảng 90 phút).*

### 4.3. Tổng hợp vùng nguy hiểm tại thời điểm $T$
Backend thực hiện truy vấn hợp không gian:
```sql
SELECT ST_Union(buffer_geom) AS hazard_polygon
FROM flood_events
WHERE start_time <= :target_time 
  AND end_time >= :target_time
  AND (estimated_depth_cm * (1 - ABS(EXTRACT(EPOCH FROM (:target_time - peak_time))) / (EXTRACT(EPOCH FROM (end_time - start_time))/2))) >= :vehicle_threshold
```
Kết quả là một tập hợp các đa giác (MultiPolygon) đại diện cho các vùng cấm tại thời điểm $T$.

---

## 5. Thuật toán định tuyến né ngập (Routing & Detour Algorithm)

### 5.1. Ngưỡng an toàn phương tiện
* **Xe máy**:
  * Safe depth: $\le 15\text{ cm}$
  * Must-avoid depth (Vùng cấm): $> 20\text{ cm}$
* **Ô tô**:
  * Safe depth: $\le 25\text{ cm}$
  * Must-avoid depth (Vùng cấm): $> 35\text{ cm}$

### 5.2. Các bước định tuyến
1. **Bước 1 — Tìm tuyến ban đầu**:
   * Gửi yêu cầu đến OSRM: `GET /route/v1/driving/{lon1},{lat1};{lon2},{lat2}?alternatives=3&geometries=geojson&overview=full`
   * Nhận về tối đa 3 tuyến đường phân nhánh ($R_1, R_2, R_3$).
2. **Bước 2 — Đo lường giao cắt ngập (Spatial Intersect Analysis)**:
   * Với mỗi tuyến $R_i$, sử dụng Turf.js `lineSplit` hoặc `booleanIntersects` với MultiPolygon vùng cấm $H_T$.
   * Tính toán:
     * `flooded_segments`: Danh sách các đoạn đường cắt qua vùng ngập.
     * `flooded_distance_meters`: Tổng chiều dài đoạn bị ngập.
     * `max_depth_cm`: Độ sâu cao nhất gặp phải.
3. **Bước 3 — Tuyển chọn & Sinh Waypoint né ngập (Detour Bypass)**:
   * Nếu có ít nhất 1 tuyến đường có `flooded_distance_meters == 0`, tuyến đó được chỉ định là **Safe Route**.
   * Nếu **toàn bộ 3 tuyến ban đầu đều đi qua vùng ngập**:
     * Lấy đa giác vùng ngập $P$ gây cản trở lớn nhất.
     * Lấy Bounding Box của $P$ và tính toán 2 điểm né (tangential detour points) cách biên polygon một khoảng đệm an toàn 150m theo hướng vuông góc với hướng di chuyển.
     * Gọi OSRM yêu cầu vẽ lại lộ trình qua điểm detour: `Origin -> Detour_Point -> Destination`.
     * Tuyến đường mới sinh ra đảm bảo né hoàn toàn chướng ngại vật ngập lụt.
4. **Bước 4 — Xuất kết quả**:
   * Trả về đồng thời:
     * **Safe Route (Tuyến an toàn)**: Quãng đường né ngập, chỉ số ngập = 0.
     * **Fastest Route (Tuyến nhanh nhất)**: Lộ trình thông thường của Google Maps/OSRM, kèm highlight màu đỏ đoạn ngập, cảnh báo độ sâu $D\text{ cm}$ và ước tính thời gian trễ.

---

## 6. Pipeline cào tin & Trích xuất bằng Gemini AI

### 6.1. Thu thập tin tức (News Collection)
* Nguồn tin:
  * RSS / Trang tin tức: VnExpress mục Thời sự / Giao thông, Báo Tuổi Trẻ, Báo Thanh Niên.
  * Bản tin dự báo triều cường từ Đài Khí tượng Thủy văn khu vực Nam Bộ.
* Tần suất cào: Mỗi 60 phút thông qua `node-cron`.
* Lọc bài viết qua từ khóa: `"ngập"`, `"triều cường"`, `"mưa to"`, `"ngập sâu"`, `"chết máy"`, `"đỉnh triều"`.

### 6.2. Schema trích xuất Gemini LLM
Sử dụng Gemini API với response format JSON Schema bắt buộc:

```typescript
const floodExtractionSchema = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    cause: { type: "STRING", enum: ["high_tide", "heavy_rain", "combined"] },
    confidence_overall: { type: "NUMBER" },
    locations: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          street_name: { type: "STRING" },
          district: { type: "STRING" },
          city: { type: "STRING" },
          estimated_depth_cm: { type: "INTEGER" },
          start_time: { type: "STRING", description: "ISO 8601 timestamp" },
          peak_time: { type: "STRING", description: "ISO 8601 timestamp" },
          end_time: { type: "STRING", description: "ISO 8601 timestamp" },
          confidence: { type: "NUMBER" }
        },
        required: ["street_name", "district", "city", "estimated_depth_cm", "start_time", "end_time"]
      }
    }
  },
  required: ["summary", "cause", "locations"]
};
```

### 6.3. Geocoding & Lưu trữ PostGIS
* Sau khi trích xuất được `street_name` và `district`:
  * Backend gửi truy vấn sang OpenStreetMap Nominatim API:
    `https://nominatim.openstreetmap.org/search?street=${encodeURIComponent(street_name)}&city=Ho+Chi+Minh&format=json&polygon_geojson=1`
  * Thu được tọa độ hoặc GeoJSON LineString của đoạn đường.
  * Dùng hàm PostGIS sinh vùng đệm:
    `ST_Transform(ST_Buffer(ST_Transform(geom, 3857), 50), 4326)` tạo buffer 50m quanh trục đường.
  * Lưu vào bảng `flood_events`.

---

## 7. Thiết kế REST API Specification

### 7.1. Định tuyến (Routing API)
* `POST /api/routes/navigate`
  * **Body**:
    ```json
    {
      "origin": { "lat": 10.762622, "lng": 106.682379 },
      "destination": { "lat": 10.730386, "lng": 106.707556 },
      "target_time": "2026-09-27T17:30:00+07:00",
      "vehicle_type": "motorbike"
    }
    ```
  * **Response**:
    ```json
    {
      "safe_route": {
        "distance_meters": 7800,
        "duration_seconds": 1260,
        "is_flooded": false,
        "max_flood_depth_cm": 0,
        "geometry": { "type": "LineString", "coordinates": [...] },
        "steps": [...]
      },
      "fastest_route": {
        "distance_meters": 6200,
        "duration_seconds": 960,
        "is_flooded": true,
        "max_flood_depth_cm": 38,
        "flooded_segments": [
          {
            "street": "Trần Xuân Soạn",
            "depth_cm": 38,
            "length_meters": 450,
            "geometry": { "type": "LineString", "coordinates": [...] }
          }
        ],
        "geometry": { "type": "LineString", "coordinates": [...] }
      }
    }
    ```

### 7.2. Dữ liệu ngập theo thời gian (Flood Data API)
* `GET /api/floods/active?target_time=2026-09-27T17:30:00+07:00`
  * Trả về GeoJSON FeatureCollection các vùng ngập (`Polygon`) và các điểm báo cáo (`Point`) hợp lệ tại mốc $T$.

### 7.3. Báo cáo người dùng (Crowdsource API)
* `POST /api/reports`
  * Body: `{ "lat": 10.75, "lng": 106.69, "depth_level": "wheel", "description": "Ngập nửa bánh xe", "image_url": null }`
* `POST /api/reports/:id/vote`
  * Body: `{ "type": "upvote" | "resolved" }`

### 7.4. Quản trị & AI Ingestion (Admin API)
* `POST /api/admin/articles/parse`
  * Body: `{ "url": "https://...", "raw_text": "..." }`
  * Kích hoạt Gemini LLM phân tích ngay lập tức và trả về các điểm ngập được nhận diện để Admin duyệt/lưu.
* `GET /api/admin/events`
  * Danh sách toàn bộ các sự kiện ngập do crawler quét được kèm bộ lọc.

---

## 8. Giao diện người dùng (Frontend UI/UX)

### 8.1. Các thành phần chính trên giao diện
1. **Sidebar Điều hướng (Floating Navigation Panel)**:
   * Ô tìm kiếm Điểm đi và Điểm đến (hỗ trợ tự động điền gợi ý qua Nominatim / Photon hoặc click trực tiếp lên bản đồ).
   * Bộ chọn phương tiện: Nút chuyển đổi `🛵 Xe máy` / `🚗 Ô tô`.
   * Bộ chọn thời gian:
     * Nút chọn nhanh: "Bây giờ", "+1 giờ", "+2 giờ", "18:00 (Giờ tan tầm / Đỉnh triều)".
     * Bộ chọn ngày/giờ chi tiết (DateTime Picker).
   * Thẻ so sánh lộ trình (Route Cards): Hiển thị đồng thời Tuyến an toàn và Tuyến nhanh nhất, gắn nhãn xanh lục/đỏ rõ ràng.
2. **Bản đồ Leaflet toàn màn hình**:
   * Lớp nền OpenStreetMap sắc nét.
   * Lớp phủ nhiệt vùng ngập (Flood Polygons): Màu sắc theo cấp độ (Vàng $\to$ Cam $\to$ Đỏ sẫm).
   * Marker ghim các báo cáo người dùng với tooltip trực quan.
   * Vẽ đồng thời 2 tuyến đường: Tuyến Safe nét liền đậm màu xanh, Tuyến ngập nét đứt xám/đỏ.
3. **Modal Báo cáo ngập nhanh**:
   * Nút nổi "📍 Báo ngập" góc màn hình.
   * Click mở modal trực quan 4 mức nước minh họa bằng hình ảnh.
4. **Trang Quản trị Admin `/admin`**:
   * Dashboard theo dõi tin tức cào được, bảng quản lý điểm ngập và công cụ nạp bài báo bằng tay qua AI.

---

## 9. Xử lý ngoại lệ, Giới hạn & Dự phòng (Error Handling & Fallbacks)

* **Khi OSRM công khai bị giới hạn tần suất (Rate limit)**:
  * Backend triển khai bộ đệm (In-memory LRU Cache / Redis) lưu kết quả định tuyến giữa các cặp tọa độ phổ biến.
  * Hỗ trợ cấu hình chuyển đổi mượt sang OpenRouteService hoặc dịch vụ OSRM thay thế.
* **Khi bài báo không chứa tên đường cụ thể**:
  * Gemini AI trích xuất cấp độ Quận/Phường, confidence score bị đánh giá thấp ($< 0.5$). Hệ thống đánh dấu cờ `needs_admin_review` thay vì tự động tạo vùng cấm lớn.
* **Khi Nominatim không tìm thấy tọa độ đường**:
  * Fallback cơ chế tìm kiếm mở rộng (bỏ số nhà, chỉ lấy tên đường chính + quận + thành phố).
* **Khi không thể tìm được bất kỳ tuyến đường nào né ngập (bị cô lập hoàn toàn)**:
  * Trả về tuyến đường ít ngập nhất (Minimal Flood Exposure) kèm cảnh báo nguy hiểm khẩn cấp: *"Mọi lối đi đều ngập sâu quá mức an toàn của phương tiện. Vui lòng hoãn khởi hành đến khi nước rút."*

---

## 10. Kế hoạch kiểm thử & Đánh giá (Testing & Verification Plan)

1. **Unit & Integration Test (Backend)**:
   * Kiểm thử hàm tính toán độ sâu theo thời gian $Depth(T)$ (Đảm bảo giá trị đỉnh tại peak_time và = 0 ngoài khoảng).
   * Kiểm thử tính toán giao cắt không gian giữa Polyline lộ trình và Polygon vùng ngập bằng Turf.js.
   * Kiểm thử thuật toán sinh Waypoint né ngập.
   * Kiểm thử trích xuất JSON của Gemini AI với các mẫu bài báo thời sự thực tế từ báo Tuổi Trẻ / VnExpress.
2. **Frontend UI Test**:
   * Kiểm thử tương tác chọn điểm trên bản đồ, đổi phương tiện và đổi mốc thời gian xem bản đồ cập nhật thời gian thực.
   * Kiểm thử luồng gửi báo cáo điểm ngập.
3. **End-to-End Scenario Test**:
   * Kịch bản: Người dùng đi từ Quận 1 sang Quận 7 lúc 18:00 (đỉnh triều đường Trần Xuân Soạn ngập 40cm).
   * Kỳ vọng: Tuyến ngắn nhất qua Trần Xuân Soạn bị cảnh báo đỏ, hệ thống tự động sinh Tuyến an toàn đi vòng qua cầu Him Lam / Nguyễn Hữu Thọ hoàn toàn khô ráo.
