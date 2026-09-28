# 🌊 SafeRoute — Hệ thống Định Tuyến Né Ngập Thông Minh Dựa Trên AI

Dự án định tuyến tránh các vùng ngập do triều cường và mưa lớn tại TP. Hồ Chí Minh, hỗ trợ dự đoán theo mốc thời gian di chuyển, phân loại ngưỡng an toàn theo phương tiện (Xe máy / Ô tô), tích hợp trích xuất tin tức thời sự bằng Google Gemini AI và bản đồ cộng đồng thời gian thực.

---

## 🚀 Tính năng nổi bật

1. **Định tuyến né ngập thông minh (Turn-by-turn Navigation Engine)**:
   * So sánh song song **Tuyến an toàn (Safe Route)** và **Tuyến nhanh nhất (Fastest Route)**.
   * Tự động sinh điểm trung chuyển vòng tránh (Detour Waypoints) khi mọi tuyến đường mặc định đều cắt qua vùng ngập.
2. **Dự đoán ngập theo mốc thời gian tương lai ($T$)**:
   * Áp dụng **Mô hình sóng điều hòa (Half-Sine Harmonic Model)** $Depth(T) = D_{peak} \cdot \sin^2\left(\frac{\pi(T - t_{start})}{t_{end} - t_{start}}\right)$ mô phỏng chính xác chế độ bán nhật triều sông Sài Gòn (trạm Phú An / Nhà Bè).
   * Áp dụng **Mô hình thủy văn tam giác (Synthetic Triangular Hydrograph)** cho các cơn mưa rào cục bộ.
3. **Phân loại ngưỡng an toàn theo phương tiện**:
   * 🛵 **Xe máy**: Ngưỡng an toàn $\le 15\text{cm}$, cấm tuyệt đối $> 20\text{cm}$ (tránh chết máy xe tay ga).
   * 🚗 **Ô tô**: Ngưỡng an toàn $\le 25\text{cm}$, cấm tuyệt đối $> 35\text{cm}$.
4. **Trích xuất tin tức tự động bằng Gemini Generative AI**:
   * Quét bài báo thời sự hoặc dự báo triều cường và trích xuất JSON chuẩn (địa điểm, thời gian bắt đầu/đỉnh/hết, độ sâu).
   * Tự động chuyển đổi tên đường sang tọa độ không gian bằng OpenStreetMap Nominatim.
5. **Cộng đồng đóng góp thời gian thực (Crowdsourced Reports)**:
   * Báo điểm ngập trực quan với 4 mức độ: Mắt cá chân, Nửa bánh xe, Đầu gối, Ngập sâu.
   * Áp dụng mô hình suy giảm độ tin cậy thông tin theo thời gian và trọng số đồng thuận xác nhận.

---

## 🛠️ Tech Stack

* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Leaflet & `react-leaflet`, Lucide Icons.
* **Backend**: Node.js 20+, Express.js, TypeScript, PostgreSQL + PostGIS, Turf.js (`@turf/turf`).
* **AI & NLP**: Google Gemini API (`@google/generative-ai`), Cheerio, Axios.
* **Bản đồ & Routing**: OpenStreetMap, OSRM (Open Source Routing Machine), Nominatim Geocoder.
* **Kiểm thử**: Vitest, Supertest (100% Passing Unit & Integration Tests).

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
