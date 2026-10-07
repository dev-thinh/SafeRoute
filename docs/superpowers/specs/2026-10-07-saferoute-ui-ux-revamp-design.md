# SafeRoute - Tài Liệu Thiết Kế Tái Cấu Trúc UI/UX Toàn Diện (UI/UX Revamp Design Spec)

> **Mã thiết kế:** `2026-10-07-saferoute-ui-ux-revamp`  
> **Phong cách:** Apple Maps / Mapbox Floating Island kết hợp Pastel Glassmorphism hiện đại  
> **Nhánh phát triển:** `dev`  
> **Tuân thủ quy chuẩn:** Toàn bộ 40 quy tắc UI/UX trong `AGENTS.md` & `GEMINI.md`

---

## 1. BỐI CẢNH & MỤC TIÊU DỰ ÁN

### 1.1. Hiện trạng & Thách thức
SafeRoute là hệ thống điều hướng giao thông thông minh giúp người dân TP.HCM tìm lộ trình khô ráo, tránh ngập lụt dựa trên dữ liệu khí tượng, triều cường và báo cáo cộng đồng.
Tuy nhiên, giao diện hiện tại gặp các vấn đề lớn:
1. **Xung đột vị trí hiển thị (Z-index / Layout Collisions):** Góc trên bên phải (`top-4 right-4`) bị đè lấn giữa Nút Quản trị, Bảng chú giải mức ngập và nút Toàn cảnh lộ trình của Leaflet.
2. **Bố cục phân tán:** Các nút công cụ zoom, nút báo ngập, nút quản trị nằm rải rác chưa thành một hệ thống Floating Dock đồng bộ.
3. **Thị giác khô khan:** Màu sắc chưa có chiều sâu, thiếu bảng màu pastel trẻ trung, các thẻ so sánh lộ trình và modal còn thô ráp.
4. **Trải nghiệm di động:** Cần cơ chế co giãn tối ưu dạng Bottom Sheet vuốt kéo mượt mà, không bao giờ che khuất tầm nhìn bản đồ (Anti-pattern #2).

### 1.2. Mục tiêu tái thiết kế
- Tái cấu trúc 100% giao diện theo mô hình **Apple Maps Floating Island** cao cấp.
- Áp dụng hệ thống thiết kế **Pastel Glassmorphism** (kính mờ ngọc trai, bảng màu phấn năng động, trẻ trung, thân thiện).
- Xóa bỏ triệt để xung đột layout với **Top-Right Utility Bar** tích hợp và **Bottom-Right Action Dock**.
- Nâng cấp trải nghiệm người dùng với micro-animations, phản hồi thị giác tức thì, và hỗ trợ responsive trên cả Desktop lẫn Mobile.

---

## 2. HỆ THỐNG DESIGN TOKENS & BẢNG MÀU PASTEL

### 2.1. Bảng màu chủ đạo & Bề mặt kính mờ (Surfaces)
- **Nền kính mờ chính:** `bg-white/90 backdrop-blur-xl border border-sky-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)]`
- **Nền kính phụ / Dropdowns:** `bg-white/95 backdrop-blur-md border border-gray-150 shadow-2xl`
- **Chữ chính (Primary text):** `text-slate-900` / `text-gray-900 font-bold` (Đảm bảo tương phản WCAG AA >= 4.5:1)
- **Chữ phụ (Secondary / Caption):** `text-slate-500` / `text-gray-500 font-medium`

### 2.2. Điểm xuất phát (A) & Điểm đến (B)
- **Điểm xuất phát (Origin A):**
  - Card & Badge: **Pastel Mint** (`bg-emerald-50 text-emerald-800 border-emerald-200/70`)
  - Ghim bản đồ: Xanh ngọc bạc hà thanh lịch với tâm bullseye trắng
- **Điểm đến (Destination B):**
  - Card & Badge: **Pastel Coral / Peach** (`bg-rose-50 text-rose-800 border-rose-200/70`)
  - Ghim bản đồ: Hồng san hô rực rỡ với tâm ngắm chuẩn xác

### 2.3. Bảng màu 4 cấp độ cảnh báo ngập chuẩn hóa (Pastel Flood Tiers)
1. 🟢 **Mắt cá chân (< 20 cm):** **Pastel Butter Yellow** (`bg-amber-50/90 text-amber-900 border-amber-200/70`)
2. 🟡 **Nửa bánh xe (20 - 40 cm):** **Pastel Apricot** (`bg-orange-50/90 text-orange-900 border-orange-200/70`)
3. 🟠 **Đầu gối / Ngập pô (40 - 60 cm):** **Pastel Coral Pink** (`bg-rose-50/90 text-rose-900 border-rose-200/70`)
4. 🔴 **Ngập sâu (> 60 cm):** **Pastel Crimson Red** (`bg-red-50 text-red-900 border-red-200`)

### 2.4. Hành động chính (Primary CTA)
- Nút CTA chính: **Electric Sky Blue Gradient** (`bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 active:scale-95 transition-all`)
- Nút phụ: **Clean Slate** (`bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 active:scale-95 transition-all`)

### 2.5. Bo góc & Phân tầng Spacing
- Nút bấm, thẻ chọn & input: `rounded-2xl` hoặc `rounded-xl`
- Floating Island, Cards lớn & Modals: `rounded-3xl` hoặc `rounded-2xl`
- Badges & Pills: `rounded-full`
- Spacing tuân thủ 8px / 12px / 16px / 20px

---

## 3. KIẾN TRÚC BỐ CỤC KHÔNG GIAN (SPATIAL ARCHITECTURE)

```
+---------------------------------------------------------------------------------------------+
|  [Logo SafeRoute]                                              [Top Utility Bar]            |
|  +--------------------------------+                            +-------------------------+  |
|  | (A) Điểm xuất phát (Mint)       |                            | 🌧️ Mưa 12mm | 🛡️ Quản trị|  |
|  |     [Đảo chiều A <-> B]        |                            +-------------------------+  |
|  | (B) Điểm đến (Coral)           |                                                         |
|  | [Preset Chips: TSN, Bến Thành] |                                                         |
|  | [Xe máy / Ô tô] [Giờ đi: 17:30] |                                                         |
|  | [Nút CTA: Tìm lộ trình né ngập] |                                                         |
|  | ------------------------------ |                                                         |
|  | [Card Lộ trình an toàn (Mint)] |                                                         |
|  | [Card Lộ trình nhanh (Blue)]   |                                                         |
|  +--------------------------------+                                                         |
|                                                                                             |
|                                                                                             |
|                                                                [Toàn bộ lộ trình Button]    |
|                                                                [Zoom Controls + / -]        |
|                                                                                             |
|                                                                [Báo ngập tại đây (FAB)]     |
|                                                                [Chú giải 4 mức ngập Card]   |
+---------------------------------------------------------------------------------------------+
```

### 3.1. Cụm bên trái: Floating Navigation Island (`RoutePlannerPanel.tsx`)
- Vị trí: `absolute top-4 left-4 z-[1000] w-[calc(100vw-2rem)] sm:w-[410px] max-h-[92vh] overflow-y-auto`.
- Header: Logo SafeRoute với icon sóng nước `Waves` phát sáng xanh ngọc, nút thu gọn `PanelLeftClose`.
- Tab bar dạng Segmented Pill: `[Lộ trình] [Tin tức] [Thời tiết]` nền xám phấn `bg-slate-100/80`.
- Quick Preset Chips: Thanh cuộn ngang chứa các địa danh nổi tiếng TP.HCM (Sân bay Tân Sơn Nhất, Chợ Bến Thành, KTX ĐHQG, ĐH Khoa học Tự nhiên, Landmark 81, Ngã 4 Hàng Xanh) giúp chọn nhanh điểm đi/đến.
- Input Điểm đi & Điểm đến: Nền pastel mờ, icon ghim tương ứng, nút GPS "Vị trí của tôi" 1-chạm, nút đảo chiều hoạt họa xoay 180°.
- Thẻ so sánh lộ trình (`RouteComparisonCard`): Thẻ kép trực quan so sánh Tuyến an toàn vs Tuyến nhanh nhất, gắn kèm huy hiệu "Đã né 100% ngập" khi thành công.

### 3.2. Cụm trên-phải: Top-Right Utility Bar (`TopUtilityBar.tsx`)
- Vị trí: `absolute top-4 right-4 z-[1000] flex items-center gap-2`.
- Gồm 3 thành phần xếp ngang, không chồng chéo:
  1. **Quick Weather Pill:** Chip kính mờ hiển thị trạng thái mưa tức thời & triều cường (ví dụ: `🌧️ Mưa 12mm/h • Triều kém`). Click vào sẽ tự chuyển sang tab Thời tiết.
  2. **Fit Route Button:** Nút `Toàn cảnh lộ trình`, tự động sáng lên khi có đường đi để người dùng zoom fit vừa vặn cả chặng đường.
  3. **Admin Moderation Button:** Nút `Quản trị` huy hiệu xanh công nghệ với số lượng báo cáo chờ duyệt (`pending count badge`) phát xung nhẹ nếu có tin mới.

### 3.3. Cụm dưới-phải: Floating Action Dock
- **Bảng chú giải độ sâu ngập (`FloodDepthLegend.tsx`):**
  - Chuyển xuống góc dưới bên phải (`bottom-6 right-6`), neo trên/dưới nút FAB.
  - Có chế độ thu gọn thành 1 Pill thanh lịch `[⚠️ Chú giải mức ngập]`. Khi mở rộng, hiển thị dải quang phổ gradient pastel và 4 cấp độ với số cm rõ ràng.
- **Nút FAB "Báo ngập tại đây":**
  - Nút bấm tròn mềm mại `rounded-full` màu xanh công nghệ `bg-gradient-to-r from-blue-600 to-indigo-600`, icon giọt nước `Droplet`, hiệu ứng sóng nước nhẹ nhàng mời gọi tương tác.

### 3.4. Chế độ ghim chọn điểm ngập (`ReportLocationPinOverlay.tsx`)
- Khi người dùng bấm "Báo ngập tại đây" hoặc "Ghim trên map":
  - Tự động ẩn toàn bộ Panel bên trái và Utility Bar bên phải để giải phóng 100% không gian bản đồ.
  - Tâm bản đồ: Điểm ghim cố định chính giữa màn hình với vòng xung radar đồng tâm (`animate-radar`).
  - Phóng to/thu nhỏ chuẩn xác tại tâm điểm ngập (Tuân thủ nghiêm ngặt Anti-Pattern #3).
  - Thanh địa chỉ trên cùng: Kính mờ với ô tìm kiếm gợi ý tức thì + hiển thị tọa độ thời gian thực.
  - Cụm điều khiển Zoom (+ / -) nổi dọc cạnh phải.
  - Thanh hành động dưới cùng: Nút Hủy, Nút Định vị GPS, Nút Xác nhận vị trí màu xanh nổi bật.

---

## 4. CHI TIẾT CÁC MODALS & DIALOGS

### 4.1. Modal Báo Ngập (`ReportFloodModal.tsx`)
- Cấu trúc 3 phần chuẩn (Header -> Body -> Action Footer).
- Thẻ vị trí đã đánh dấu: Nền pastel sky blue kèm tọa độ và nút "Đổi vị trí".
- 4 Thẻ chọn mức độ ngập: Thiết kế dạng lưới 2x2 với 4 màu pastel phân cấp rõ ràng (Mắt cá chân, Nửa bánh xe, Đầu gối/Ngập pô, Ngập sâu) kèm số cm và chú thích thực tế.
- Chống spam: Hiển thị cảnh báo nếu người dùng đã gửi báo cáo tại vị trí này trong vòng 2 giờ.

### 4.2. Modal Quản Trị & Kiểm Duyệt (`AdminDashboardModal.tsx` & `ClusterDetailModal.tsx`)
- Bố cục Dashboard hiện đại:
  - 3 Thẻ thống kê nhanh: Cụm chờ duyệt, Điểm đang trên bản đồ, Công tắc Auto-Pilot AI.
  - Tabs chuyển đổi: `Cụm tin chờ duyệt` và `Điểm đang hiển thị`.
  - Danh sách cụm điểm: Huy hiệu đánh giá độ tin cậy AI theo thang % và thanh đo gradient pastel.
  - Drill-down Modal (`ClusterDetailModal`): Xem chi tiết từng báo cáo của người dân trong cụm, có nút duyệt hoặc bác bỏ toàn cụm.

---

## 5. BẢO TOÀN DỮ LIỆU & RÀNG BUỘC KỸ THUẬT

1. **Không đụng chạm logic Core & Backend:** Toàn bộ API endpoint (`/api/navigate`, `/api/floods`, `/api/reports`, `/api/weather`, `/api/news`, `/api/admin/*`) giữ nguyên vẹn 100%.
2. **Không commit vào `main`:** Mọi thao tác thực hiện trên nhánh `dev`.
3. **100% Lucide React:** Không trộn icon font hoặc emoji làm biểu tượng kết cấu.
4. **Kiểm tra TypeScript/Vite:** Lệnh `npm run build` trong thư mục `client` phải pass 100% với 0 lỗi.

---

## 6. KẾ HOẠCH TRIỂN KHAI THEO GIAI ĐOẠN

- **Giai đoạn 1:** Cập nhật Tailwind config và thiết lập hệ thống Design Tokens Pastel (`tailwind.config.js`, `index.css`).
- **Giai đoạn 2:** Tạo component `TopUtilityBar` và sắp xếp lại bố cục không gian trong `App.tsx` (loại bỏ hoàn toàn va chạm layout).
- **Giai đoạn 3:** Thiết kế lại `RoutePlannerPanel`, `RouteComparisonCard`, `VehicleSelector`, `TimeSelector` với Pastel Glassmorphism.
- **Giai đoạn 4:** Nâng cấp `WeatherTab`, `NewsFeedTab`, `FloodDepthLegend`, `ReportLocationPinOverlay`, `ReportMarker`.
- **Giai đoạn 5:** Hoàn thiện `ReportFloodModal`, `AdminDashboardModal`, `ClusterDetailModal`.
- **Giai đoạn 6:** Kiểm thử toàn diện Responsive (Mobile/Desktop), kiểm tra Touch Target, xác minh build Vite & tạo commit trên nhánh `dev`.
