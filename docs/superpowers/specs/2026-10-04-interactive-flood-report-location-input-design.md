# SafeRoute - Thiết kế Ô nhập địa chỉ thông minh trên giao diện Ghim điểm báo ngập (Interactive Location Input on Map Pin Overlay)

## 1. Bối cảnh & Mục tiêu (Context & Objectives)

### 1.1. Mục tiêu tinh gọn theo yêu cầu
- Giữ nguyên luồng tính năng báo ngập hiện tại: Vẫn giữ tâm ngắm định vị (`location pin`) ở chính giữa màn hình bản đồ (`ReportLocationPinOverlay`).
- **Nâng cấp cốt lõi:** Thay thế thẻ hiển thị địa chỉ tĩnh ở khung trên cùng (`Top Address Card`) thành **một ô Input cho phép người dùng tự do nhập địa chỉ**.
- **Tính năng của ô Input:**
  1. **Tự động cập nhật khi kéo bản đồ (Giữ nguyên như hiện tại):** Khi người dùng rê/kéo map, địa chỉ giải mã (reverse geocoded) sẽ tự động điền và cập nhật vào ô input.
  2. **Cho phép gõ địa chỉ trực tiếp:** Người dùng có thể click vào ô input để nhập tên đường, địa danh (VD: *"Trần Xuân Soạn"*, *"Nguyễn Hữu Cảnh"*, *"Landmark 81"*...).
  3. **Gợi ý tự động (Autocomplete Suggestions):** Khi gõ, hiển thị dropdown gợi ý địa điểm tương tự như ô tìm kiếm điểm đi/đến.
  4. **Tự động bay map đến địa chỉ được chọn:** Khi người dùng chọn một mục trong danh sách gợi ý, bản đồ sẽ tự động di chuyển (pan / flyTo) tâm đến tọa độ của địa chỉ đó, đưa tâm ghim chính xác vào vị trí vừa chọn, đồng thời cập nhật nội dung ô input.
  5. **Định vị GPS:** Nút *"Vị trí của tôi"* vẫn hoạt động để kéo bản đồ về vị trí GPS hiện tại và tự động cập nhật vào ô input.
  6. **Không phát sinh thêm nút "Ghim trên map" phụ:** Tránh làm phức tạp hóa giao diện, giữ trải nghiệm liền mạch và tự nhiên nhất.

---

## 2. Kiến trúc giao diện & Luồng tương tác (UI Architecture & Interaction Flow)

### 2.1. Luồng trải nghiệm người dùng (User Flow)

```
[Bấm 'Báo ngập tại đây' trên bản đồ]
                │
                ▼
[Chế độ Ghim điểm báo ngập (ReportLocationPinOverlay)]
 Tâm ghim cố định ở giữa bản đồ
 Khung địa chỉ phía trên là Ô NHẬP ĐỊA CHỈ (Interactive Input)
                │
   ┌────────────┴────────────┐
   │ (Cách 1)                │ (Cách 2)
   ▼                         ▼
[Kéo/rê bản đồ]           [Gõ địa chỉ vào ô Input]
   │                         │
   ▼                         ▼
[Tâm ghim di chuyển,      [Dropdown hiển thị gợi ý (Autocomplete)]
 input tự động cập nhật      │
 tên đường theo tọa độ]    [Bấm chọn 1 địa chỉ gợi ý]
   │                         │
   │                         ▼
   │                      [Bản đồ tự động bay (pan) đến tọa độ đó,
   │                       tâm ghim rơi đúng vị trí & input điền tên]
   │                         │
   └────────────┬────────────┘
                │
                ▼
      [Bấm 'Xác nhận vị trí']
                │
                ▼
     [Mở ReportFloodModal]
      (Chọn 4 mức ngập + nhập mô tả)
                │
                ▼
      [Bấm 'Gửi báo cáo ngay']
```

### 2.2. Chi tiết Component `ReportLocationPinOverlay.tsx`

1. **Center Crosshair & Pin Marker (Giữ nguyên):**
   - Vòng tròn lan tỏa (ripple effect), tâm ngắm nhỏ và ghim vị trí SVG màu xanh dương nhấc nhẹ khi map di chuyển (`isMoving`).
2. **Top Address Bar (Nâng cấp thành Interactive Search Input):**
   - **Container:** Nền kính mờ `bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/80`.
   - **Header:** Icon giọt nước, tiêu đề *"Điểm báo ngập trên bản đồ"*.
   - **Input Box:**
     - Icon `MapPin` (màu đỏ `text-red-500` hoặc xanh `text-blue-600`).
     - Thẻ `<input>` cho phép click vào nhập chữ trực tiếp.
     - Khi map di chuyển hoặc load xong địa chỉ, nếu người dùng không đang chủ động gõ thì ô input hiển thị địa chỉ của tâm bản đồ.
     - Khi người dùng focus và gõ, hiển thị nội dung đang gõ + nút `(X)` để xóa nhanh.
     - Dòng hiển thị tọa độ phụ `lat.toFixed(5), lng.toFixed(5)` ngay bên dưới.
   - **Dropdown Gợi ý (Suggestions Dropdown):**
     - Nổi phía dưới ô input (`z-50`, `max-h-56`, `overflow-y-auto`).
     - Debounce 300ms gọi `searchLocation(searchQuery)` (tích hợp Nominatim, Goong, Photon, và HCMC Presets).
     - Mỗi kết quả gồm tên địa chỉ + tọa độ `lat, lng`.
     - Khi click chọn kết quả:
       - Đóng dropdown.
       - Gọi hàm callback `onSelectSuggestedLocation(lat, lng, label)`.
       - Bản đồ di chuyển tâm đến tọa độ được chọn.
3. **Bottom Action Bar (Giữ nguyên):**
   - Nút "Hủy": Đóng chế độ ghim.
   - Nút "Vị trí của tôi": Lấy GPS, di chuyển tâm bản đồ về vị trí hiện tại và tự động điền địa chỉ.
   - Nút "Xác nhận vị trí": Mở Modal chọn mức ngập.
4. **Floating Zoom Controls (+ / -):**
   - Giữ nguyên các nút zoom trực tiếp tại tâm bản đồ.

### 2.3. Tích hợp trong `App.tsx`
- Bổ sung prop hoặc handler trong `App.tsx`: Khi người dùng chọn một địa chỉ từ gợi ý trên overlay, gọi `setMapCenter([lat, lng])` và cập nhật `centerCoord = { lat, lng }`, `centerAddress = label`. Bản đồ sẽ tự động pan đến vị trí đó.

---

## 3. Tuân thủ 40 Quy chuẩn SafeRoute Design Tokens

- Màu sắc: Primary blue `blue-600`, Alert amber/yellow/red, Neutrals `gray-900`/`gray-500`.
- Bo góc: `rounded-2xl` cho floating card, `rounded-xl` cho input.
- Kích thước chạm tối thiểu: >= 44px (`min-h-[44px]` cho các nút tương tác).
- Trạng thái phản hồi: Loading spinner khi đang tìm kiếm hoặc đang geocode địa chỉ, hover, focus-within.

---

## 4. Kế hoạch kiểm thử & Tiêu chuẩn nghiệm thu (Verification Checklist)

- [ ] Khi bấm "Báo ngập tại đây": Màn hình ghim tâm bản đồ hiển thị với ô input ở phía trên.
- [ ] Khi kéo bản đồ: Ô input tự động cập nhật tên đường theo tâm bản đồ như trước.
- [ ] Khi gõ vào ô input: Dropdown gợi ý địa chỉ hiển thị thời gian thực (autocomplete).
- [ ] Khi chọn một địa chỉ từ dropdown: Bản đồ tự động di chuyển tâm đến tọa độ đó, tâm ghim rơi đúng vị trí, ô input cập nhật địa chỉ đã chọn.
- [ ] Bấm "Vị trí của tôi" (GPS): Bản đồ di chuyển về GPS và cập nhật input.
- [ ] Bấm "Xác nhận vị trí": Mở Modal báo cáo với địa chỉ và tọa độ chuẩn xác.
- [ ] Build `npm run build` trong `client` đạt 0 lỗi TypeScript / Vite.
