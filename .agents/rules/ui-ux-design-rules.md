# SafeRoute - Quy Chuẩn & Quy Tắc Thiết Kế Giao Diện UI/UX (Mandatory UI/UX Design Rules)

> **QUY TẮC BẮT BUỘC DÀNH CHO TẤT CẢ AGENTS & DEVELOPERS:**
> Mọi AI Agent (bao gồm cả Subagents, Code Reviewers và Pair Programmers) khi tham gia xây dựng, chỉnh sửa hoặc tối ưu hóa giao diện người dùng (Frontend - React, Tailwind CSS, Leaflet) cho dự án SafeRoute **BẮT BUỘC PHẢI TUÂN THỦ TUYỆT ĐỐI** bộ 40 quy tắc UI/UX dưới đây. Tuyệt đối không phá vỡ, không làm suy giảm chất lượng thẩm mỹ và tính khả dụng của sản phẩm.

---

## I. HỆ THỐNG DESIGN TOKENS CHUẨN (SAFE ROUTE DESIGN SYSTEM)

Mọi component UI phải sử dụng nhất quán hệ thống Design Tokens định nghĩa qua Tailwind CSS:

### 1. Bảng màu chuẩn (Color Palette)
- **Primary (Chủ đạo):** Xanh dương công nghệ / an toàn giao thông
  - `blue-600` (`#2563EB`) cho nút CTA chính, active state, icon nhận diện.
  - `blue-700` (`#1D4ED8`) cho hover state.
  - `blue-50` / `blue-100` cho background card, badge mềm.
- **Secondary (Phụ trợ):** Xanh ngọc / Xanh lục định vị
  - `emerald-500` / `emerald-600` cho Điểm xuất phát (A), tuyến đường an toàn tuyệt đối, chỉ báo tích cực.
- **Alert & Flood Risk (Cảnh báo mức ngập - Chuẩn hóa 4 cấp):**
  - 🟢 Mắt cá chân (< 20 cm): `yellow-500` / `bg-yellow-50` / `text-yellow-800` (Cảnh báo nhẹ)
  - 🟡 Nửa bánh xe (20 - 40 cm): `amber-500` / `bg-amber-50` / `text-amber-800` (Cần cẩn thận)
  - 🟠 Đầu gối / Ngập pô (40 - 60 cm): `orange-500` / `bg-orange-50` / `text-orange-800` (Nguy hiểm cho xe máy)
  - 🔴 Ngập sâu (> 60 cm): `red-600` / `bg-red-50` / `text-red-800` (Tuyệt đối không đi vào)
- **Neutrals (Nền & Văn bản):**
  - Text chính: `gray-900` / `gray-800`
  - Text phụ / caption: `gray-500` / `gray-600`
  - Border: `border-gray-200` hoặc `border-gray-200/80`
  - Background nền kính: `bg-white/95 backdrop-blur-md`

### 2. Typography & Font Scale
- Font chữ: System Sans-serif hiện đại (`font-sans`: Inter, SF Pro, Roboto).
- Phân cấp kích cỡ chuẩn:
  - Header chính modal / panel: `text-base` đến `text-lg font-bold text-gray-900`
  - Tiêu đề mục / Section title: `text-xs font-bold text-gray-700 uppercase tracking-wider`
  - Nội dung thông thường (Body): `text-xs text-gray-700` hoặc `text-sm text-gray-800`
  - Chú thích phụ / Thời gian (Caption): `text-[10px]` đến `text-[11px] text-gray-500`
  - Tọa độ / Mã số (Code / Mono): `font-mono text-[10px] text-gray-500`

### 3. Spacing & Radius Scale
- Spacing tuân thủ bội số 4px: `gap-1.5` (6px), `gap-2` (8px), `gap-2.5` (10px), `gap-3` (12px), `gap-4` (16px).
- Bo góc (Border Radius):
  - Buttons & Inputs: `rounded-xl` (12px).
  - Floating Panels, Cards & Modals: `rounded-2xl` (16px).
  - Badges, Pills & Floating Action Buttons: `rounded-full`.

---

## II. CHI TIẾT 40 QUY TẮC UI/UX THEO 3 TRỤ CỘT CỐT LÕI

### Trụ cột 1: Visual Design – Giao diện đẹp mắt & Thẩm mỹ

1. **Color Palette:** Luôn sử dụng bảng màu hài hòa, có màu chủ đạo (`blue`), màu phụ (`emerald`), và màu cảnh báo ngập phân cấp rõ ràng (vàng -> hổ phách -> cam -> đỏ). Tuyệt đối không dùng màu sắc ngẫu nhiên, chói gắt.
2. **Typography:** Font chữ đồng nhất, không dùng quá 2 font-family. Trọng số font (weight) rõ ràng: 700 cho tiêu đề, 600 cho label/nút, 400-500 cho nội dung.
3. **Visual Hierarchy:** Yếu tố quan trọng nhất (nút hành động chính, mức ngập sâu, tuyến đường an toàn) phải nổi bật nhất qua độ tương phản, kích thước và màu sắc; thông tin chi tiết kỹ thuật hiển thị tinh tế ở cấp phụ.
4. **Spacing:** Không nhồi nhét nội dung. Mọi component phải có khoảng đệm (`padding`) tối thiểu 12px-16px (`p-3` đến `p-4`) để tạo không gian thở.
5. **Alignment:** Căn chỉnh thẳng hàng tuyệt đối. Các icon và nhãn text phải luôn nằm trên cùng một trục (`flex items-center gap-2`).
6. **Whitespace:** Sử dụng khoảng trắng hợp lý giữa các khối dữ liệu để người dùng không bị quá tải thông tin khi xem bản đồ ngập lụt.
7. **Contrast:** Đảm bảo tỷ lệ tương phản chữ trên nền tối thiểu 4.5:1 (chuẩn WCAG AA). Không dùng chữ xám nhạt trên nền trắng.
8. **Iconography:** Chỉ sử dụng icon từ thư viện `lucide-react`, kích cỡ chuẩn hóa (`w-4 h-4` cho nút/dòng văn bản, `w-5 h-5` cho card header), nét vẽ thanh mảnh đồng đều.
9. **Imagery & Visual Elements:** Icon giọt nước, ghim định vị, và minh họa phải sắc nét, tối ưu SVG, đúng bản chất ứng dụng bản đồ giao thông chống ngập.
10. **Visual Balance:** Bố cục cân đối, phân bổ các panel điều khiển (trái), nút công cụ zoom (phải), chú giải độ sâu (dưới) hài hòa, không che khuất trọng tâm bản đồ.
11. **Border & Shadow:** Sử dụng viền mảnh (`border border-gray-200/80`) kết hợp đổ bóng tinh tế (`shadow-lg`, `shadow-2xl`) và hiệu ứng kính mờ (`backdrop-blur-md`) tạo chiều sâu giao diện hiện đại.
12. **Modern Aesthetic:** Phong cách thiết kế tối giản, thanh lịch, mang cảm giác ứng dụng công nghệ cao (Clean UI, Glassmorphism, Rounded UI, Micro-animations).

---

### Trụ cột 2: Usability – Trải nghiệm người dùng & Tính dễ dùng

13. **Intuitive Navigation:** Các luồng điều hướng phải rõ ràng, chuyển đổi giữa chế độ tìm đường, xem tin tức thời tiết, và báo ngập mượt mà, không làm người dùng bối rối.
14. **Clear Call to Action (CTA):** Nút hành động chính (ví dụ: *"Tìm lộ trình an toàn"*, *"Báo ngập tại đây"*, *"Xác nhận vị trí"*) luôn có text động từ rõ nghĩa, màu nổi bật nhất trong khung nhìn.
15. **Information Architecture:** Cấu trúc thông tin phân tầng logic: Nhập điểm đi/đến -> Hiển thị so sánh Tuyến an toàn vs Tuyến nhanh nhất -> Chi tiết đoạn đường ngập.
16. **Learnability:** Người dùng mới nhìn vào bản đồ là hiểu ngay: vạch đỏ là ngập sâu, vạch xanh là an toàn, ghim A là điểm đi, ghim B là điểm đến mà không cần đọc hướng dẫn.
17. **Feedback:** Mọi tương tác của người dùng (click, kéo bản đồ, chọn mức ngập) phải có phản hồi thị giác ngay lập tức (`active:scale-95`, hover đổi màu, ghim nhấc lên khi kéo).
18. **Error Prevention:** Ngăn ngừa sai sót trước khi xảy ra: Vô hiệu hóa nút gửi khi chưa có đủ dữ liệu, cảnh báo rõ ràng khi tuyến đường đi qua điểm ngập nguy hiểm.
19. **Error Handling:** Thông báo lỗi bằng tiếng Việt tự nhiên, giải thích rõ nguyên nhân và đề xuất cách khắc phục (ví dụ: *"Không thể lấy vị trí GPS. Vui lòng cấp quyền truy cập vị trí trên trình duyệt"*).
20. **Loading States:** Mọi tác vụ bất đồng bộ (tìm đường, cào tin tức, trích xuất AI, reverse geocoding) phải có loading spinner (`Loader2 animate-spin`) hoặc skeleton, kèm thông báo trạng thái rõ ràng.
21. **Empty States:** Khi không có dữ liệu (ví dụ: khu vực không bị ngập, không có bài báo mới), phải hiển thị giao diện thông báo thân thiện kèm gợi ý hành động thay vì để trống màn hình.
22. **Form Usability:** Form báo cáo ngập phải dễ điền, các nút chọn mức ngập thiết kế dạng thẻ chọn trực quan kèm hình ảnh minh họa độ sâu cm, ô nhập mô tả có placeholder gợi ý cụ thể.
23. **Search & Filter:** Tìm kiếm địa chỉ phải có gợi ý nhanh các địa danh phổ biến TP.HCM (`HCMC_PRESETS`), hỗ trợ gõ tiếng Việt có dấu và không dấu, có cơ chế debounce tránh spam API.
24. **Task Efficiency:** Tối ưu hóa số lần chạm/click để hoàn thành mục tiêu. Cho phép chấm tâm điểm ngập trực tiếp trên bản đồ và lấy GPS 1-chạm thay vì bắt người dùng tự gõ tọa độ.
25. **Responsive Design:** Giao diện co giãn hoàn hảo trên mọi kích thước màn hình (Mobile, Tablet, Desktop). Trên màn hình nhỏ, các panel tự thu gọn hợp lý, không để thanh cuộn ngang xuất hiện trên trang.
26. **Accessibility (a11y):** Các nút bấm đều có `title` hoặc nhãn mô tả, hỗ trợ đóng modal bằng phím `Escape` hoặc nút `X`, màu sắc luôn đi kèm biểu tượng/văn bản giải thích để người khiếm sắc vẫn hiểu được.
27. **Touch Target:** Tất cả nút bấm và vùng tương tác trên thiết bị di động phải đạt kích thước tối thiểu 40x40px (khuyến nghị 44x44px) với khoảng cách đủ an toàn để tránh bấm nhầm.
28. **User Control & Freedom:** Người dùng luôn có quyền kiểm soát: Có nút "Hủy", nút "Đổi vị trí", nút "Đóng (X)" rõ ràng để có thể quay lui bất kỳ lúc nào mà không bị kẹt trong màn hình.

---

### Trụ cột 3: Consistency – Tính nhất quán & Đồng bộ tuyệt đối

29. **Design System:** Toàn bộ component phải sử dụng chung quy chuẩn thiết kế đã thiết lập, không tạo ra các biến thể kiểu dáng dị biệt trong cùng một dự án.
30. **Component Consistency:** Các thành phần cùng loại (Modal, Input, Select, Badge, Card) phải có cùng độ bo góc, padding, shadow và kiểu hiển thị tiêu đề.
31. **Color Consistency:** Màu xanh dương luôn là hành động chính/hệ thống, màu xanh lá luôn là an toàn/bắt đầu, màu đỏ luôn là ngập sâu/nguy hiểm. Tuyệt đối không hoán đổi ngữ nghĩa của màu.
32. **Typography Consistency:** Cùng một cấp độ thông tin (như nhãn địa chỉ, chỉ số cm ngập) phải có font-size và font-weight giống hệt nhau ở mọi tab và modal.
33. **Spacing Consistency:** Khoảng cách lề, khoảng cách giữa các phần tử con (`gap`) phải tuân thủ chuẩn 8px / 12px / 16px, không dùng khoảng cách tùy hứng.
34. **Button Consistency:** Nút Primary, Secondary, Tertiary và Icon Button phải tuân theo đúng kiểu dáng:
    - Primary: `bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700`
    - Secondary: `bg-white text-gray-700 font-bold rounded-xl border border-gray-200 hover:bg-gray-50`
    - Danger / Warning: Phù hợp với mức độ cảnh báo.
35. **Navigation Consistency:** Cách mở, chuyển tab và đóng các khung điều khiển phải nhất quán về vị trí xuất hiện và hiệu ứng chuyển động.
36. **Interaction Consistency:** Các hiệu ứng nhấn chuột (`active:scale-95`), hover (`hover:shadow-xl`), và transition (`transition-all duration-200`) phải áp dụng đồng bộ cho tất cả nút bấm.
37. **Terminology Consistency:** Thuật ngữ tiếng Việt phải đồng nhất trong toàn bộ hệ thống: *"Điểm xuất phát (A)"*, *"Điểm đến (B)"*, *"Lộ trình an toàn"*, *"Lộ trình nhanh nhất"*, *"Mức ngập"*, *"Báo ngập tại đây"*.
38. **Icon Consistency:** Không trộn lẫn các thư viện icon khác nhau; 100% icon sử dụng `lucide-react` với phong cách đường nét đồng nhất.
39. **Layout Consistency:** Các modal pop-up đều có cấu trúc 3 phần chuẩn: Header (Icon + Title + Close X) -> Content Body -> Action Footer (Nút Hủy bên trái, Nút Xác nhận bên phải).
40. **State Consistency:** Mọi thành phần tương tác phải thể hiện đầy đủ và nhất quán 5 trạng thái: `Default`, `Hover`, `Active/Pressed`, `Disabled` (mờ `opacity-50`, `cursor-not-allowed`), và `Loading`.

---

## III. NHỮNG ĐIỀU NGHIÊM CẤM (STRICTLY FORBIDDEN ANTI-PATTERNS)

Agents tuyệt đối **KHÔNG ĐƯỢC PHÉP**:
1. ❌ **Không viết Inline CSS tùy tiện:** Không sử dụng `style={{ ... }}` bừa bãi trừ trường hợp tính toán tọa độ động hoặc màu sắc động theo biến số của Leaflet.
2. ❌ **Không phá vỡ trải nghiệm bản đồ:** Không đặt các bảng điều khiển cố định chiếm hết 100% diện tích bản đồ trên màn hình lớn. Luôn để bản đồ tương tác được.
3. ❌ **Không zoom lệch tâm trong chế độ chọn điểm:** Khi người dùng đang ở chế độ đánh dấu điểm ngập (`isPinningReport`), mọi thao tác cuộn chuột phải zoom chính xác tại tâm điểm ngập (Point A), tuyệt đối không để bản đồ trôi theo con trỏ chuột.
4. ❌ **Không bỏ quên trạng thái Loading / Disabled:** Không bao giờ để nút bấm ở trạng thái kích hoạt khi API đang xử lý; phải hiển thị spinner và vô hiệu hóa nút để tránh gửi trùng lặp dữ liệu.
5. ❌ **Không hiển thị thông báo lỗi thô:** Tuyệt đối không hiển thị trực tiếp `[AxiosError: Request failed with status code 500]` lên giao diện người dùng. Phải bọc qua thông báo thân thiện bằng tiếng Việt.
6. ❌ **Không hardcode dữ liệu tọa độ:** Khi người dùng gửi báo cáo ngập, bắt buộc phải lấy tọa độ thực tế từ tâm bản đồ mà người dùng đã chấm, tuyệt đối không dùng tọa độ mẫu gắn cứng.

---

## IV. QUY TRÌNH KIỂM TRA UI/UX TRƯỚC KHI HOÀN THÀNH TÁC VỤ (VERIFICATION CHECKLIST)

Trước khi xác nhận hoàn thành bất kỳ task frontend nào, Agent phải tự rà soát:
- [ ] Giao diện có tuân thủ đầy đủ 40 tiêu chí về Thẩm mỹ, Dễ dùng và Nhất quán ở trên không?
- [ ] Đã kiểm tra trạng thái tương thích trên cả màn hình Desktop và Mobile chưa?
- [ ] Đã có đủ các trạng thái Hover, Active, Disabled, Loading và Error chưa?
- [ ] Các icon, màu sắc và thuật ngữ có đồng nhất với phần còn lại của SafeRoute không?
- [ ] Đã chạy lệnh `npm run build` trong thư mục `client` và đảm bảo 0 lỗi TypeScript / Vite chưa?

---

## V. QUY ĐỊNH BẮT BUỘC VỀ QUẢN LÝ GIT BRANCH

- ⚠️ **NGHIÊM CẤM TUYỆT ĐỐI:** Không bao giờ được commit hoặc push trực tiếp vào nhánh `main` / `master`!
- 🌿 **QUY TRÌNH CHUẨN:** Mọi thay đổi, commit và push **chỉ được phép thực hiện trên nhánh `dev`** (`git push origin dev`). Người dùng sẽ trực tiếp kiểm tra, tạo Pull Request và merge vào nhánh `main` khi họ đã hài lòng.
