# SafeRoute - Đặc Tả Kỹ Thuật: Tối Ưu Hóa Hệ Thống & Cơ Chế Kháng Lỗi (System Resilience & Optimization Spec)

**Tác giả:** SafeRoute Engineering Team  
**Ngày cập nhật:** 06/10/2026  
**Nhánh:** `dev`  

---

## 1. Bối cảnh & Mục tiêu

Hệ thống SafeRoute cung cấp dịch vụ định tuyến né ngập dựa trên AI và bản đồ thời gian thực tại TP.HCM. Trong đợt rà soát toàn diện năm 2026, hệ thống đã được nâng cấp mạnh mẽ ở cả 4 tầng: **AI NLP Service**, **GIS & Geocoding**, **Database & Storage Layer**, và **Frontend UI/UX**.

Mục tiêu chính:
1. **Kháng lỗi AI (AI Fault Tolerance & Self-Healing):** Sử dụng các mô hình Google Gemini thế hệ 2026 (`gemini-3-pro`, `gemini-3.8-flash`) với cơ chế **Circuit Breaker** (Ngắt mạch tự động), Exponential Backoff Retry và khả năng tự động thăm dò (probe) để phục hồi model chính Pro khi có mạng/quota trở lại.
2. **Loại bỏ tọa độ ngập ảo:** Chuẩn hóa dịch vụ Geocoding, bổ sung từ điển đường bộ TP.HCM, chấm dứt tình trạng gán cứng tọa độ mặc định `10.75, 106.70` (kênh rạch Q4-Q7) khi trích xuất thất bại.
3. **Đồng bộ dữ liệu báo ngập:** Hợp nhất chuẩn UUID v4 giữa Node.js backend và PostgreSQL, giải quyết lỗi bất đồng bộ định danh khi cộng đồng tương tác vote.
4. **Cơ chế cộng đồng xác nhận ngập:** Cho phép người dùng vote trực tiếp trên Popup bản đồ Leaflet (👍 Báo đang ngập / ☀️ Báo nước đã rút).
5. **Giao diện chuẩn hóa UI/UX:** Triệt tiêu hoàn toàn các hộp thoại `alert()` truyền thống của trình duyệt, thay thế bằng Toast notification kính mờ (Glassmorphism) và Banner cảnh báo inline tuân thủ 40 quy tắc trong `AGENTS.md`.

---

## 2. Kiến trúc & Giải pháp Kỹ thuật

### 2.1. AI Extraction Pipeline với Circuit Breaker & Auto-Recovery

```
[Bài báo / Tin tức thời sự]
            │
            ▼
┌───────────────────────────────────────────────┐
│              Gemini Extractor                 │
│                                               │
│    State: CLOSED  ──(3 lỗi 429/Network)──► OPEN
│       ▲                                     │
│       │ (Probe thành công)                  ▼ (Cooldown 5 phút)
│    HALF_OPEN ◄───────(Hết cooldown)─────────┘
└───────────────────────────────────────────────┘
            │
            ├──► Primary Model: gemini-3-pro
            └──► Fallback Model: gemini-3.8-flash
```

* **Trạng thái Closed:** Toàn bộ request được gửi tới mô hình chất lượng cao (`gemini-3-pro`). Mỗi request thử nghiệm tối đa 2 lần với Exponential Backoff (1.5s, 3.0s).
* **Trạng thái Open:** Khi dính 3 lỗi liên tiếp (hoặc lỗi Rate Limit 429 / Quota Exceeded), mạch chuyển sang `OPEN`. Mọi request trong thời gian cooldown 5 phút lập tức được định tuyến sang model dự phòng (`gemini-3.8-flash`), không làm gián đoạn người dùng.
* **Trạng thái Half-Open & Tự phục hồi:** Khi hết thời gian cooldown (5 phút), hệ thống cho phép 1 request đóng vai trò kiểm tra (probe) chạy thử bằng Pro:
  * Nếu thành công: Mạch tự động đóng lại (`CLOSED`), hệ thống tiếp tục dùng model Pro làm mặc định.
  * Nếu thất bại: Mạch tiếp tục mở (`OPEN`) và chờ chu kỳ cooldown tiếp theo.

### 2.2. Dịch vụ Geocoding & Loại bỏ dữ liệu ngập ảo

* **Vấn đề trước đây:** Khi OpenStreetMap Nominatim không tìm thấy tên đường tại TP.HCM, hệ thống trả về fallback `lat: 10.75, lng: 106.70`. Kết quả là hàng chục điểm ngập từ tin tức bị dồn cục vào giữa kênh rạch ranh giới Quận 4 và Quận 7.
* **Giải pháp:**
  * Bổ sung từ điển tọa độ các trục đường huyết mạch hay ngập ở TP.HCM (`Nguyễn Hữu Cảnh`, `Huỳnh Tấn Phát`, `Trần Xuân Soạn`, `Lê Văn Lương`, `Quốc Hương`, `Nguyễn Văn Quá`, `Phan Huy Ích`, `Đỗ Xuân Hợp`, `Võ Văn Ngân`...).
  * Nếu Nominatim và từ điển đều không xác định được: trả về `null`. Bỏ qua điểm thay vì tạo ra ghim ngập ảo làm sai lệch thuật toán tìm đường.

### 2.3. Hợp nhất UUID & Quản lý dữ liệu báo cáo

* **Chuẩn hóa ID:** Dùng `crypto.randomUUID()` ngay khi client gửi báo cáo lên API `/api/reports`.
* **Đồng bộ Postgres:** Bảng `community_reports` lưu chính xác `report.id` do backend cấp phát, thay vì để DB tự sinh UUID ngẫu nhiên khác với ID trong bộ nhớ RAM.
* **API Vote:** Endpoint `POST /api/reports/:id/vote` nhận `{ type: 'upvote' | 'resolved' }` và cập nhật song song cả RAM cache lẫn cơ sở dữ liệu PostgreSQL.

### 2.4. Bản đồ Leaflet & Tương tác Cộng đồng

* Nâng cấp `ReportMarker.tsx`: Khi người dùng click vào ghim báo ngập, popup hiển thị:
  * Huy hiệu mức độ ngập và thời gian báo cáo thân thiện (ví dụ: *"15 phút trước"*).
  * Nút 👍 *"Đang ngập"* (tăng độ tin cậy của cảnh báo).
  * Nút ☀️ *"Nước đã rút"* (khi đủ số lượng xác nhận, điểm ngập sẽ tự động hết hiệu lực).
  * Thông báo cảm ơn trực quan ngay trong popup và gọi `onVoteReport` để đồng bộ lại dữ liệu bản đồ.

### 2.5. Trải nghiệm người dùng (UI/UX) theo chuẩn AGENTS.md

* **Xóa bỏ toàn bộ `alert()`:** Không dùng `alert()` trình duyệt vì gây gián đoạn luồng sử dụng và làm vỡ thẩm mỹ sản phẩm.
* **Toast Notification:** Floating glassmorphism badge (`bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl`) ở góc trên màn hình, tự ẩn sau 4.5s hoặc có nút đóng $X$.
* **Inline Error Banner:** Khi tìm đường thất bại hoặc GPS không phản hồi, hiển thị thông báo lỗi màu đỏ/vàng kèm gợi ý hành động cụ thể bằng tiếng Việt tự nhiên (WCAG AA Contrast $\ge 4.5:1$).

---

## 3. Danh mục Kiểm thử & Xác minh (Verification Checklist)

| Hạng mục | Công cụ kiểm thử | Kết quả |
| :--- | :--- | :--- |
| **Backend Integration & Unit Tests** | Vitest (`npm test` in `server`) | 11/11 test suites passed (100%) |
| **Circuit Breaker & Fallback Logic** | Server test suite & runtime probe | Passed |
| **Frontend TypeScript Build** | `tsc && vite build` in `client` | 0 errors, 1691 modules built |
| **Quy chuẩn UI/UX** | Agent Verification Checklist | Tuân thủ tuyệt đối 40 quy tắc |
| **Git Safety** | Git branch enforcement | 100% commits trên nhánh `dev` |
