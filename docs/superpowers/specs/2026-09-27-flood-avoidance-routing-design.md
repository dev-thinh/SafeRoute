# SafeRoute: Hệ thống định tuyến né ngập dựa trên AI và dữ liệu thời sự
**Design Specification**
*Phiên bản hiện tại: v1.1*
*Ngày cập nhật: 28/09/2026*
*Tác giả: SafeRoute Team*
*Trạng thái: Approved*

### Lịch sử phiên bản (Revision History)
| Phiên bản | Ngày cập nhật | Người thực hiện | Nội dung thay đổi chi tiết |
| :--- | :--- | :--- | :--- |
| **v1.0** | 27/09/2026 | SafeRoute Team | Khởi tạo tài liệu đặc tả thiết kế kiến trúc, mô hình dữ liệu PostGIS, thuật toán định tuyến và UI/UX ban đầu. |
| **v1.1** | 28/09/2026 | SafeRoute Team | • **Mục 1.3**: Bổ sung phân tích so sánh định vị sản phẩm trực diện với UDI Maps & Google Maps.<br>• **Mục 4.1**: Nâng cấp công thức dự đoán triều cường sang mô hình Sóng điều hòa (Half-Sine Harmonic Tide Model) trơn tru và sát thực tế hải văn hơn hàm tam giác.<br>• **Mục 4.2**: Tách biệt độ sâu vật lý và mô hình suy giảm độ tin cậy thông tin không - thời gian kết hợp điểm đồng thuận cộng đồng (Confidence Aging & Social Consensus).<br>• **Mục 10**: Bổ sung quy trình kiểm chứng thực nghiệm đối chứng với trạm thủy văn Phú An/Nhà Bè & UDI Maps, cùng bộ chỉ số đánh giá (Precision, Recall, F1, sai số thời gian đỉnh triều). |

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

### 1.3. Định vị sản phẩm & So sánh trực diện với UDI Maps

| Tiêu chí | UDI Maps (Thoát nước TP.HCM) | Google Maps | SafeRoute (Hệ thống đề xuất) |
| :--- | :--- | :--- | :--- |
| **Bản chất cốt lõi** | Bản đồ giám sát / Tra cứu thụ động | Dẫn đường tối ưu thời gian/kẹt xe | **Dẫn đường né ngập thông minh (Navigation)** |
| **Tính năng chỉ đường (Routing)** | ❌ Không có (người dùng tự nhìn icon ngập rồi tự mở app khác tìm đường) | ❌ Không tính toán vùng ngập lụt hay triều cường | ✅ **Tự động vẽ tuyến né ngập an toàn**, so sánh song song với tuyến nhanh nhất |
| **Dự đoán theo thời gian ($T$)** | ❌ Chỉ xem hiện trạng tại thời điểm mở app | ❌ Không có | ✅ **Dự đoán trước theo mốc giờ di chuyển trong tương lai** ($T$) dựa trên sóng triều/mưa |
| **Phân loại phương tiện** | ❌ Cảnh báo chung chung | ⚠️ Chỉ phân biệt ô tô/xe máy theo vận tốc, không theo độ sâu nước | ✅ **Tùy biến ngưỡng an toàn ngập**: Xe máy ($\le 15\text{cm}$, cấm $> 20\text{cm}$), Ô tô ($\le 25\text{cm}$, cấm $> 35\text{cm}$) |
| **Nguồn dữ liệu** | Giới hạn ở trạm quan trắc/camera cố định của UDI | Tốc độ GPS người dùng | **Đa nguồn**: AI Gemini cào tin tức báo chí, bản tin thủy văn + Báo cáo cộng đồng (Crowdsourcing) |
| **Nền tảng** | App di động độc quyền, giao diện cũ | App thương mại đóng mã nguồn | **Web App hiện đại (React + Leaflet + PostGIS)**, nhẹ, chạy mượt trên mọi thiết bị |

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

Khi người dùng chỉ định điểm xuất phát, đích đến, phương tiện và mốc thời gian di chuyển trong tương lai $T$:

### 4.1. Hàm biến thiên độ sâu do Triều cường (Mô hình Sóng điều hòa - Half-Sine Harmonic Model)
Hạ lưu sông Sài Gòn chịu chế độ bán nhật triều không đều từ Biển Đông (ghi nhận tại trạm Phú An và Nhà Bè). Mực nước dâng và rút theo dạng sóng điều hòa trơn tru, đứng triều ở đỉnh và giảm dần. Đối với sự kiện ngập do triều cường (`cause = 'high_tide'`), độ sâu tại thời điểm $T$ được mô hình hóa bởi:

$$Depth_{tide}(T) = \begin{cases} 
D_{peak} \cdot \sin^2\left(\frac{\pi \cdot (T - t_{start})}{t_{end} - t_{start}}\right) & \text{khi } t_{start} \le T \le t_{end} \\
0 & \text{khi } T < t_{start} \text{ hoặc } T > t_{end}
\end{cases}$$

* **Ưu điểm vật lý**: 
  * Tính liên tục vi phân ($C^1$ continuity): Đạo hàm tại hai thời điểm biên ($t_{start}, t_{end}$) bằng 0, mô tả hiện tượng nước bắt đầu mấp mé và rút êm.
  * Đạo hàm tại đỉnh $t_{peak} = \frac{t_{start} + t_{end}}{2}$ bằng 0: Tái hiện đúng hiện tượng **đứng triều** (slack water) trong 20-30 phút thực tế.

### 4.2. Hàm biến thiên độ sâu do Mưa lớn (Mô hình Thủy văn Tam giác - Synthetic Triangular Hydrograph)
Đối với ngập do mưa rào cục bộ (`cause = 'heavy_rain'`), nước dâng nhanh theo cường độ mưa và rút dần theo công suất cống thoát nước:

$$Depth_{rain}(T) = \begin{cases} 
D_{peak} \cdot \left(\frac{T - t_{start}}{t_{peak} - t_{start}}\right) & \text{khi } t_{start} \le T \le t_{peak} \\
D_{peak} \cdot \left(\frac{t_{end} - T}{t_{end} - t_{peak}}\right) & \text{khi } t_{peak} < T \le t_{end} \\
0 & \text{ngoài khoảng thời gian trên}
\end{cases}$$

### 4.3. Báo cáo cộng đồng: Tách biệt Độ sâu vật lý và Hệ số tin cậy (Confidence Aging & Consensus)
Để đảm bảo tính đúng đắn vật lý, hệ thống không làm suy giảm độ sâu thực tế của vũng nước mà làm suy giảm **Độ tin cậy của thông tin (Information Freshness & Reliability)**:

1. **Độ sâu ngập vật lý ($Depth_{reported}$)**: Giữ nguyên theo mức quan sát thực tế (`ankle`: 15cm, `wheel`: 30cm, `knee`: 50cm, `deep`: 70cm).
2. **Hệ số tin cậy không - thời gian $Confidence(T) \in [0, 1]$**:
   $$Confidence(T) = \exp\left(-\frac{T - T_{report}}{\tau}\right) \times \frac{1}{1 + \exp\left(-(w_{up} \cdot \text{upvotes} - w_{down} \cdot \text{downvotes})\right)}$$
   * $\tau \approx 60\text{ phút}$: Hằng số thời gian tiêu thoát nước đặc trưng của đô thị. Sau 60 phút không có người cập nhật, độ tin cậy tự nhiên giảm đi $1/e \approx 63\%$.
   * $w_{up} = 0.5, w_{down} = 1.2$: Trọng số xác nhận cộng đồng (lượt báo "nước đã rút" sẽ làm độ tin cậy tụt nhanh hơn).
3. **Quy tắc kích hoạt né đường**: Điểm báo cáo người dùng chỉ được đưa vào tập cản trở định tuyến nếu:
   $$Confidence(T) \ge 0.4 \quad \text{và} \quad Depth_{reported} \ge \text{Ngưỡng an toàn của xe}$$

### 4.4. Hợp nhất vùng nguy hiểm không gian (Spatial Hazard MultiPolygon) tại thời điểm $T$
Backend truy vấn kết hợp PostGIS:
```sql
WITH active_events AS (
  SELECT buffer_geom,
    CASE 
      WHEN cause = 'high_tide' THEN 
        estimated_depth_cm * POWER(SIN(PI() * EXTRACT(EPOCH FROM (:target_time - start_time)) / EXTRACT(EPOCH FROM (end_time - start_time))), 2)
      ELSE 
        estimated_depth_cm * (1.0 - ABS(EXTRACT(EPOCH FROM (:target_time - peak_time))) / (EXTRACT(EPOCH FROM (end_time - start_time))/2.0))
    END AS current_depth
  FROM flood_events
  WHERE start_time <= :target_time AND end_time >= :target_time
),
active_reports AS (
  SELECT ST_Buffer(ST_Transform(location_geom, 3857), 30) AS buffer_geom,
         depth_cm AS current_depth
  FROM user_reports
  WHERE (EXP(-EXTRACT(EPOCH FROM (:target_time - reported_at)) / 3600.0) * (1.0 / (1.0 + EXP(-(0.5*upvotes - 1.2*downvotes))))) >= 0.4
)
SELECT ST_Union(ST_Transform(buffer_geom, 4326)) AS hazard_polygon
FROM (
  SELECT buffer_geom FROM active_events WHERE current_depth >= :vehicle_threshold
  UNION ALL
  SELECT buffer_geom FROM active_reports WHERE current_depth >= :vehicle_threshold
) combined_hazards;
```
Kết quả trả về là một `MultiPolygon` duy nhất đại diện cho tất cả các vùng cấm tại thời điểm $T$ phù hợp với loại xe đã chọn.

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

### 10.1. Kiểm thử phần mềm (Software Testing)
1. **Unit & Integration Test (Backend)**:
   * Kiểm thử hàm sóng điều hòa $Depth_{tide}(T)$ và hàm tam giác $Depth_{rain}(T)$ (đảm bảo đạo hàm êm tại biên và giá trị cực đại tại đỉnh).
   * Kiểm thử hàm suy giảm độ tin cậy $Confidence(T)$ theo thời gian và trọng số tương tác upvote/downvote.
   * Kiểm thử tính toán giao cắt không gian giữa Polyline lộ trình và MultiPolygon vùng ngập bằng Turf.js / PostGIS.
   * Kiểm thử thuật toán sinh Waypoint né ngập khi mọi tuyến mặc định đều ngập.
   * Kiểm thử trích xuất JSON của Gemini AI với các bài báo thực tế từ báo Tuổi Trẻ, VnExpress.
2. **Frontend UI Test**:
   * Kiểm thử tương tác chọn điểm trên bản đồ, chuyển đổi phương tiện (Xe máy / Ô tô) và chọn mốc giờ tương lai.
   * Kiểm thử luồng gửi báo cáo điểm ngập từ bản đồ.
3. **End-to-End Scenario Test**:
   * Kịch bản: Người dùng đi từ Quận 1 sang Quận 7 lúc 18:00 (đỉnh triều đường Trần Xuân Soạn ngập 40cm).
   * Kỳ vọng: Tuyến ngắn nhất qua Trần Xuân Soạn bị cảnh báo đỏ, hệ thống tự động sinh Tuyến an toàn đi vòng qua cầu Him Lam / Nguyễn Hữu Thọ hoàn toàn khô ráo.

### 10.2. Phương pháp Đối chứng & Kiểm chứng Thực tế (Ground Truth Verification)
Để đánh giá độ chính xác của mô hình dự đoán và thuật toán né ngập trong thực tế:
1. **Nguồn dữ liệu đối chứng (Ground Truth Data)**:
   * **Dữ liệu ngập thực tế**: Đối chiếu danh sách tuyến đường ngập và thời gian ngập với ứng dụng **UDI Maps** (Công ty TNHH MTV Thoát nước Đô thị TP.HCM) và thông báo khẩn cấp của Ban Chỉ huy Phòng chống thiên tai & Tìm kiếm cứu nạn TP.HCM.
   * **Dữ liệu triều thực tế**: Đối chiếu mốc giờ đỉnh triều $t_{peak}$ và độ cao đỉnh triều với số liệu đo đạc thực tế tại **Trạm thủy văn Phú An (sông Sài Gòn)** và **Trạm Nhà Bè (sông Đồng Điền)** do Đài Khí tượng Thủy văn khu vực Nam Bộ phát hành.
2. **Bộ chỉ số đo lường hiệu năng (Evaluation Metrics)**:
   * **Độ chính xác phân loại đường ngập**:
     $$\text{Precision} = \frac{TP}{TP + FP} \quad (\text{Tỷ lệ đoạn đường báo ngập mà thực tế có ngập thật - tránh đi vòng oan})$$
     $$\text{Recall} = \frac{TP}{TP + FN} \quad (\text{Tỷ lệ đoạn ngập thực tế được phát hiện - mục tiêu: } \ge 90\% \text{ để tránh chết máy})$$
     $$\text{F1-Score} = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$$
   * **Sai số thời gian đỉnh ngập**:
     $$\Delta t = |t_{peak\_predicted} - t_{peak\_actual}| \quad (\text{Mục tiêu: } \Delta t \le 15 \text{ phút})$$
   * **Hiệu quả né ngập của lộ trình (Route Safety Gain)**:
     Đo lường mức giảm chiều dài ngập lụt: $\Delta L = L_{flooded\_fastest} - L_{flooded\_safe}$. Tuyến an toàn phải đạt $L_{flooded\_safe} = 0$ đối với các điểm ngập vượt ngưỡng an toàn của xe.

