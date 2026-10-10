# 🌊 SafeRoute — Hệ thống Định Tuyến Né Ngập Thông Minh Dựa Trên AI

Dự án định tuyến tránh các vùng ngập do triều cường và mưa lớn tại TP. Hồ Chí Minh, hỗ trợ dự đoán theo mốc thời gian di chuyển, phân loại ngưỡng an toàn theo phương tiện (Xe máy / Ô tô), tích hợp trích xuất tin tức thời sự bằng Google Gemini AI (hỗ trợ Circuit Breaker & Fallback tự phục hồi), bản đồ cộng đồng tương tác thời gian thực và giao diện hiện đại chuẩn hóa UI/UX.

---

## 🚀 Tính năng nổi bật

1. **Định tuyến né ngập thông minh (Turn-by-turn Navigation Engine)**:
   * So sánh song song **Tuyến an toàn (Safe Route)** và **Tuyến nhanh nhất (Fastest Route)**.
   * Tự động sinh điểm trung chuyển vòng tránh (Detour Waypoints) khi mọi tuyến đường mặc định đều cắt qua vùng ngập.
   * Kháng lỗi cơ sở dữ liệu: Tự động chuyển đổi mượt mà giữa PGrouting và OSRM khi PostgreSQL ngoại tuyến.

2. **Dự đoán ngập theo mốc thời gian tương lai ($T$)**:
   * Áp dụng **Mô hình sóng điều hòa (Half-Sine Harmonic Model)** $Depth(T) = D_{peak} \cdot \sin^2\left(\frac{\pi(T - t_{start})}{t_{end} - t_{start}}\right)$ mô phỏng chính xác chế độ bán nhật triều sông Sài Gòn (trạm Phú An / Nhà Bè).
   * Áp dụng **Mô hình thủy văn tam giác (Synthetic Triangular Hydrograph)** cho các cơn mưa rào cục bộ.

3. **Phân loại ngưỡng an toàn theo phương tiện**:
   * 🛵 **Xe máy**: Ngưỡng an toàn $\le 15\text{cm}$, cấm tuyệt đối $> 20\text{cm}$ (tránh chết máy xe tay ga).
   * 🚗 **Ô tô**: Ngưỡng an toàn $\le 25\text{cm}$, cấm tuyệt đối $> 35\text{cm}$.

4. **Trích xuất tin tức tự động bằng Google Gemini AI & Cơ chế Tự phục hồi (Resilient AI)**:
   * Hỗ trợ mô hình chính **Gemini `gemini-3.8-flash`** và fallback khác provider qua **Groq** để tránh lãng phí retry khi quota Gemini đã cạn theo project.
   * Tích hợp **Circuit Breaker Pattern** với Exponential Backoff Retry (1.5s, 3.0s).
   * Tự động định tuyến sang Flash khi gặp lỗi Quota (429) hoặc mạng; định kỳ 5 phút tự động kích hoạt lượt probe thăm dò để **hồi phục về Gemini Pro** ngay khi quota hoặc kết nối khả dụng trở lại.
   * Geocoding chuẩn xác: Tích hợp từ điển các tuyến đường xung yếu tại TP.HCM, loại bỏ hoàn toàn các điểm ngập ảo do lỗi tọa độ fallback.

5. **Phân quyền Báo ngập, Thẩm định AI 4 Trụ cột & Bảng Điều phối Admin (Role-Based Moderation & AI Credibility Engine)**:
   * **Phân quyền rành mạch (User vs Admin)**: Người dùng gửi báo cáo ngập kèm vị trí, mức ngập và mô tả; hệ thống phản hồi xác nhận tiếp nhận văn minh. Bản đồ công cộng chỉ hiển thị điểm ngập **đã được kiểm duyệt (`status = approved`)**, cách ly 100% tin ảo và troll phá hoại.
   * **Ma trận Thẩm định Thật/Giả 4 Trụ cột AI (The 4-Pillar Verification Matrix)**:
     1. *Khí tượng & Thủy văn thực tế (35%)*: Đối chiếu radar mưa $\ge 15$mm hoặc triều dâng $\ge 1.45$m.
     2. *Gom cụm không gian & Đồng thuận cộng đồng (35%)*: Ngưỡng $\ge 5$ người độc lập báo cùng vị trí ($\le 350$m, 45 phút) mới đạt điểm tối đa gom cụm.
     3. *Phân tích ngữ nghĩa NLP bằng Gemini (20%)*: Nhận diện chi tiết hiện trường thực tế, loại trừ 100% ngôn từ spam/đùa cợt.
     4. *Độ nhạy cảm địa hình (10%)*: Đối chiếu với 68 hành lang trũng thấp đã được hiệu chuẩn.
   * **Trung tâm Điều hành Admin (Admin Dashboard Panel)**:
     - Thống kê thời gian thực theo cụm điểm ngập nóng (Hotspot Clusters).
     - Xem tóm tắt điểm tin cậy AI, số lượng tin gửi về và bấm xem chi tiết từng tin báo thô của người dân.
     - 1-click Phê duyệt (Approve), Bác bỏ (Reject) hoặc Gỡ bỏ khỏi bản đồ (Take down).
     - Công tắc **Auto-Pilot Mode**: Cho phép AI tự động duyệt khi tin cậy $\ge 85\%$ và có $\ge 5$ người báo.
   * **Lớp Bản đồ Tinh gọn (Active Flood Filtering)**: Chỉ hiển thị các vùng thực sự có rủi ro ngập úng ($\ge 10\text{cm}$), ẩn 100% các vòng tròn xám khô ráo giúp giao diện thông thoáng, chuẩn xác.
   * Đồng bộ tức thì giữa bộ nhớ RAM và PostgreSQL thông qua chuẩn định danh UUID v4 nhất quán.

6. **Thiết kế UI/UX hiện đại (Tuân thủ 40 Quy chuẩn AGENTS.md)**:
   * Phong cách kính mờ (Glassmorphism), bảng màu chuẩn hóa theo cấp độ rủi ro, typography phân tầng rõ ràng.
   * Loại bỏ 100% hộp thoại `alert()` truyền thống; thay thế bằng Toast notification tinh tế và banner cảnh báo lỗi inline thân thiện.
   * Tương thích hoàn hảo trên cả thiết bị di động (Mobile) và máy tính để bàn (Desktop).

---

## 🛠️ Tech Stack

* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Leaflet & `react-leaflet`, Lucide Icons.
* **Backend**: Node.js 20+, Express.js, TypeScript, PostgreSQL + PostGIS, Turf.js (`@turf/turf`).
* **AI & NLP**: Google Gemini API (`@google/generative-ai`), Cheerio, Axios.
* **Bản đồ & Routing**: OpenStreetMap, OSRM (Open Source Routing Machine), Nominatim Geocoder, pgRouting.
* **Kiểm thử**: Vitest, Supertest (100% Passing Unit & Integration Tests).

---

## ⚙️ Cấu hình Biến Môi Trường (Environment Variables)

Tại thư mục `server`, tạo file `.env` (tham khảo `.env.example`):

```ini
PORT=5000
NODE_ENV=development

# Gemini AI API Key & Models
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash

# Groq fallback provider
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
GROQ_BASE_URL=https://api.groq.com/openai/v1

# Database (PostgreSQL / PostGIS - Tùy chọn)
DATABASE_URL=postgresql://user:password@localhost:5432/saferoute
# Hoặc các biến độc lập (hỗ trợ Docker Compose):
# POSTGRES_HOST=localhost
# POSTGRES_PORT=5432
# POSTGRES_DB=saferoute
# POSTGRES_USER=postgres
# POSTGRES_PASSWORD=postgres
```

---

## 📦 Hướng dẫn cài đặt & Chạy ứng dụng

### 1. Cài đặt dependencies
```bash
# Cài đặt server
cd server
npm install

# Cài đặt client
cd ../client
npm install
```

### 2. Chạy môi trường phát triển (Development)
Khởi động backend server (cổng 5000):
```bash
cd server
npm run dev
```

Khởi động frontend client (cổng 3000):
```bash
cd client
npm run dev
```
Truy cập ứng dụng tại: `http://localhost:3000`

### 3. Chạy kiểm thử tự động (Unit & Integration Tests)
```bash
cd server
npm test
```
