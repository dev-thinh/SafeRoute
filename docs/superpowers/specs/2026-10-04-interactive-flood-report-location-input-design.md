# SafeRoute - Thiết kế Ô nhập địa chỉ thông minh cho tính năng Báo cáo ngập (Interactive Flood Report Location Input)

## 1. Bối cảnh & Mục tiêu (Context & Objectives)

### 1.1. Hiện trạng
Trước đây, luồng báo cáo ngập trong SafeRoute bắt buộc người dùng phải trải qua chế độ kéo tâm bản đồ toàn màn hình (`ReportLocationPinOverlay.tsx`):
1. Người dùng bấm nút "Báo ngập tại đây".
2. Bị chuyển sang giao diện toàn màn hình với tâm ngắm ở giữa bản đồ.
3. Người dùng phải tự kéo/zoom bản đồ đến vị trí ngập, chờ reverse geocode.
4. Bấm "Xác nhận vị trí" thì mới mở `ReportFloodModal.tsx` để chọn mức ngập và gửi.

Hạn chế: Người dùng không thể nhập trực tiếp tên đường, địa chỉ hoặc địa danh cụ thể (ví dụ: *"Trần Xuân Soạn"*, *"Nguyễn Hữu Cảnh"*, *"227 Nguyễn Văn Cừ"*...), gây mất thời gian và giảm khả năng tiếp nhận báo cáo ngập tức thời từ cộng đồng.

### 1.2. Mục tiêu
- Biến phần chọn vị trí trong Modal báo cáo ngập thành một **ô nhập địa chỉ tương tác (Interactive Location Input)** hoàn chỉnh.
- Tích hợp gợi ý tự động (Autocomplete Suggestions) thời gian thực tương tự như các ô nhập Điểm đi / Điểm đến trong `RoutePlannerPanel`.
- Hỗ trợ nút **"Vị trí của tôi" (GPS 1-chạm)**: Tự động phát hiện vị trí hiện tại của thiết bị và điền thẳng địa chỉ + tọa độ vào ô input.
- Giữ tùy chọn **"Ghim trên map"**: Người dùng có thể chuyển sang chế độ kéo tâm bản đồ trực quan nếu muốn; sau khi xác nhận, thông tin vị trí sẽ đồng bộ ngược lại vào ô input.
- Cho phép mở Modal báo cáo ngập ngay khi bấm nút "Báo ngập tại đây" ngoài bản đồ, rút ngắn thời gian thao tác.
- Tuân thủ 100% bộ 40 quy chuẩn UI/UX thiết kế của SafeRoute (nhất quán màu sắc, bo góc, micro-interactions, responsive, tiếng Việt tự nhiên).

---

## 2. Kiến trúc & Luồng tương tác (Architecture & User Flows)

### 2.1. Luồng trải nghiệm người dùng (User Flows)

```
[Bấm 'Báo ngập tại đây' trên bản đồ]
                │
                ▼
      [Mở ReportFloodModal]
                │
   ┌────────────┼────────────┐
   │ (Cách 1)   │ (Cách 2)   │ (Cách 3)
   ▼            ▼            ▼
[Gõ địa chỉ]  [Bấm GPS]   [Bấm 'Ghim trên map']
   │            │            │
   ▼            ▼            ▼
[Chọn gợi ý]  [Lấy GPS &]  [Chuyển sang map overlay]
   │          [điền input]   │
   │            │          [Rê map & bấm 'Xác nhận']
   │            │            │
   └────────────┴────────────┘
                │
                ▼
   [Vị trí & tọa độ đã được điền vào ô input]
                │
                ▼
   [Chọn mức độ ngập: 4 cấp độ]
   [Nhập mô tả bổ sung (nếu có)]
                │
                ▼
   [Bấm 'Gửi báo cáo ngay']
                │
                ▼
   [Lưu vào DB / InMemory & hiển thị marker ngay trên bản đồ]
```

### 2.2. Chi tiết các thành phần giao diện

#### A. Trong `ReportFloodModal.tsx`:
1. **Header:** Giữ nguyên phong cách chuẩn: Icon giọt nước xanh, tiêu đề *"Báo cáo điểm ngập tức thì"*, nút đóng `X`.
2. **Khu vực Nhập vị trí (Location Input Section):**
   - **Label bar:** Nhãn `VỊ TRÍ BÁO NGẬP` (chữ in hoa đậm, `text-[11px] text-gray-700`).
   - **Thanh công cụ nhanh (Quick Actions):**
     - Nút `[Vị trí của tôi]`: Icon `Crosshair` / `Navigation`, hiển thị spinner `Loader2` khi đang truy vấn GPS.
     - Nút `[Ghim trên map]`: Icon `Map`, cho phép tạm ẩn modal và mở overlay kéo tâm bản đồ.
   - **Input Box:**
     - Icon `MapPin` (màu xanh dương `blue-600` hoặc đỏ cảnh báo `rose-500`).
     - Text input với placeholder *"Nhập địa chỉ hoặc điểm ngập (VD: Trần Xuân Soạn, Q7)..."*.
     - Nút xóa nhanh `(X)` xuất hiện khi có văn bản trong input.
     - Dòng phụ hiển thị tọa độ đã nhận diện (`lat.toFixed(5), lng.toFixed(5)`).
   - **Dropdown Gợi ý địa chỉ (Suggestions Dropdown):**
     - Kích hoạt khi input focus và có nội dung (hoặc hiển thị preset địa điểm ngập quen thuộc TP.HCM).
     - Debounce 300ms gọi `searchLocation(query)`.
     - Header sticky: *"Gợi ý địa chỉ"* kèm trạng thái spinner *"đang tìm..."*.
     - Mỗi mục gồm tên địa điểm + tọa độ `lat, lng`.
     - Hover hiệu ứng `hover:bg-blue-50 hover:text-blue-800`.
     - Khi chọn một mục: Cập nhật địa chỉ hiển thị và gán tọa độ ngầm `{ lat, lng }`.
3. **Phần chọn mức độ ngập (Flood Depth Levels):**
   - 4 thẻ chọn trực quan với chuẩn màu sắc:
     - 🟢 Mắt cá chân (< 20 cm)
     - 🟡 Nửa bánh xe (20 - 40 cm)
     - 🟠 Đầu gối / Ngập pô (40 - 60 cm)
     - 🔴 Ngập sâu (> 60 cm)
4. **Mô tả chi tiết (Tùy chọn):**
   - Textarea nhập tình trạng thực tế.
5. **Action Footer:**
   - Nút "Hủy" (`min-h-[44px]`, nền trắng viền xám).
   - Nút "Gửi báo cáo ngay" (`min-h-[44px]`, xanh `blue-600`, khóa disabled khi chưa có vị trí hợp lệ hoặc đang gửi).

#### B. Trong `App.tsx`:
- Nút FAB *"Báo ngập tại đây"* ở góc dưới bên phải mở trực tiếp `isReportOpen = true`.
- Khi mở modal, tự động nạp vị trí tâm bản đồ hiện tại làm giá trị khởi tạo (nếu người dùng đã ngắm map), hoặc cho phép người dùng tùy ý nhập mới/chọn GPS.
- Khi người dùng bấm *"Ghim trên map"* trong modal:
  - Tạm ẩn modal (`isReportOpen = false`).
  - Kích hoạt `isPinningReport = true`.
- Khi người dùng bấm *"Xác nhận vị trí"* trên `ReportLocationPinOverlay`:
  - Đóng pin overlay (`isPinningReport = false`).
  - Mở lại modal (`isReportOpen = true`) với tọa độ và địa chỉ đã chọn từ tâm bản đồ.

---

## 3. Xử lý lỗi & Tình huống đặc biệt (Edge Cases & Error Handling)

1. **Người dùng gõ địa chỉ nhưng không chọn từ gợi ý:**
   - Trước khi submit form, nếu tọa độ chưa có (`lat === 0`), hệ thống tự động gọi `searchLocation(searchQuery)` để lấy tọa độ gợi ý đầu tiên.
   - Nếu không tìm thấy kết quả nào tương ứng, hiển thị thông báo lỗi thân thiện bằng tiếng Việt: *"Không tìm thấy tọa độ phù hợp cho địa chỉ này. Vui lòng chọn từ danh sách gợi ý hoặc bấm 'Ghim trên map'."*
2. **Quyền truy cập GPS bị từ chối / Lỗi định vị:**
   - Bắt lỗi `navigator.geolocation` lỗi timeout hoặc denied, hiển thị thông báo: *"Không thể xác định vị trí GPS. Vui lòng cấp quyền truy cập vị trí trên trình duyệt hoặc nhập địa chỉ thủ công."*
3. **Mất kết nối mạng / API lỗi khi gửi báo cáo:**
   - Hiển thị banner lỗi màu đỏ trong modal, giữ nguyên các thông tin người dùng đã nhập, mở khóa nút gửi để họ có thể bấm thử lại.

---

## 4. Kế hoạch kiểm thử & Tiêu chuẩn nghiệm thu (Testing & Verification)

- **Unit / Build Tests:**
  - `npm run build` trong `client` phải đạt 0 lỗi TypeScript và Vite.
  - `npm test` trong `server` giữ vững 40/40 tests pass.
- **Manual Verification Checklist:**
  - [ ] Bấm nút "Báo ngập tại đây" mở ngay Modal báo cáo ngập.
  - [ ] Ô vị trí cho phép gõ văn bản và hiện danh sách gợi ý tự động (autocomplete).
  - [ ] Bấm một gợi ý sẽ cập nhật địa chỉ và tọa độ chuẩn.
  - [ ] Bấm nút "Vị trí của tôi" lấy được vị trí GPS và điền vào ô input.
  - [ ] Bấm nút "Ghim trên map" chuyển sang chế độ ghim tâm màn hình, xác nhận xong quay lại modal với địa chỉ mới.
  - [ ] Nút xóa `(X)` trong ô input hoạt động trơn tru.
  - [ ] Gửi báo cáo thành công hiển thị ngay điểm ngập trên bản đồ.
