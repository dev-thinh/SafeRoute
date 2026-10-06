# SafeRoute - Thiết Kế Kỹ Thuật: Hệ Thống Phân Quyền Báo Ngập, Kiểm Duyệt Đa Tầng AI và Bảng Điều Khiển Admin

## 1. Bối Cảnh & Vấn Đề Giải Quyết
- **Vấn đề báo ảo / troll công khai:** Khi cho phép người dùng tự do bấm báo ngập và hiển thị ngay lập tức lên bản đồ công cộng, kẻ xấu có thể ngồi tại nhà tạo điểm ngập ảo gây hoang mang và bóp méo thuật toán né đường.
- **Vấn đề phụ thuộc vào người dùng:** Không thể ép buộc người dân phải chạy vào vùng ngập để xác nhận "nước đã rút" hoặc vote xác minh.
- **Giải pháp đột phá:**
  1. **Phân quyền (User vs Admin):** Người dùng thông thường chỉ gửi tin báo và nhận thông báo tiếp nhận lịch sự. Tin chưa kiểm duyệt **hoàn toàn KHÔNG hiển thị trên bản đồ công cộng**.
  2. **Thẩm định tự động bằng AI (4 trụ cột, ngưỡng tối thiểu 5 người báo):** AI (Gemini) tự động phân tích ngữ nghĩa, đối chiếu thời tiết/triều cường và gom cụm không gian để chấm điểm tin cậy.
  3. **Bảng điều khiển Admin (Human-in-the-Loop Dashboard):** Admin có giao diện trực quan xem tóm tắt các cụm báo cáo, số lượng tin gửi về, bấm xem chi tiết từng tin báo thô, và 1-click Duyệt hoặc Từ chối, kèm công tắc Bật/Tắt Auto-Pilot.

---

## 2. Kiến Trúc Phân Quyền & Luồng Dữ Liệu

### 2.1. Luồng Người Dùng Thường (Public User Flow)
1. Người dùng mở modal "Báo ngập" trên bản đồ $\rightarrow$ Chọn vị trí, mức ngập, nhập mô tả (và ảnh nếu có).
2. Khi bấm **"Gửi báo cáo"**:
   - Backend lưu báo cáo với trạng thái ban đầu: `status = 'pending'`.
   - Frontend hiển thị thông báo phản hồi an tâm:
     > *"Đã tiếp nhận báo cáo! Cảm ơn bạn đã hỗ trợ cộng đồng. Thông tin đã được chuyển đến ban điều phối để kiểm duyệt."*
3. **Bản đồ công cộng (`GET /api/floods/active`):**
   - **CHỈ hiển thị** các báo cáo có `status = 'approved'` (do AI hoặc Admin duyệt) còn trong thời hạn hiệu lực.
   - Toàn bộ tin `pending` hoặc `rejected` **hoàn toàn bị giấu kín**. Kẻ troll tự gửi bừa sẽ không thể làm phiền bất kỳ người tham gia giao thông nào.

### 2.2. Luồng Kiểm Duyệt & Quản Trị Admin (Admin Flow)
- Giao diện Admin có thể truy cập qua nút điều hướng **"Quản trị"** trên thanh công cụ (có huy hiệu số tin chờ duyệt, ví dụ: `3 mới`).
- Admin có quyền:
  - Xem danh sách báo cáo được gom cụm theo vị trí (Hotspot Clusters).
  - Xem điểm tin cậy AI chấm và lý do phân tích.
  - Mở modal xem chi tiết từng báo cáo đơn lẻ (thời gian, nội dung thô, ảnh, tọa độ).
  - 1-click **Duyệt (Approve)** hoặc **Từ chối (Reject)**.
  - 1-click **Gỡ bỏ (Take Down)** bất kỳ điểm ngập nào đang hiển thị trên bản đồ.
  - Bật/Tắt công tắc **Auto-Pilot Mode** (Tự động duyệt khi AI đạt $\ge 85\%$ tin cậy và $\ge 5$ người báo).

---

## 3. Ma Trận Thẩm Định Thật/Giả 4 Trụ Cột của AI (The 4-Pillar Verification Matrix)

> **Lưu ý:** Ma trận này hoàn toàn độc lập với Mô hình Dự báo Thủy văn của SafeRoute (`predictionEngine.ts`). Mô hình thủy văn vẫn tự động tính toán nước dâng/rút theo chu kỳ tự nhiên; Ma trận này chỉ dùng để lọc tin báo người dùng.

```
Tổng Điểm Tin Cậy (Confidence Score 0 - 100%) = 
  (Trụ cột 1 × 35%) + (Trụ cột 2 × 35%) + (Trụ cột 3 × 20%) + (Trụ cột 4 × 10%)
```

### Chi tiết 4 Trụ Cột:
1. **Trụ cột 1: Đối chiếu Khí tượng & Thủy văn Thực tế (Trọng số 35%)**
   - Kiểm tra dữ liệu thời gian thực: Khu vực có radar mưa rolling $\ge 15\text{mm}$ hoặc triều dâng sông Sài Gòn $\ge 1.45\text{m}$ không?
   - *Nếu trời hoàn toàn khô ráo, triều cạn:* Trừ điểm nặng (-40%), **không bao giờ được AI tự duyệt**.
2. **Trụ cột 2: Gom cụm Không gian & Số lượng Người Báo (Trọng số 35%)**
   - Bán kính không gian: $\le 350\text{m}$.
   - Khung thời gian: $\le 45$ phút.
   - **Thang bậc số lượng người báo:**
     - **1 – 2 người:** Điểm gom cụm $= 20\%$. Bắt buộc chuyển Admin duyệt thủ công, AI không tự duyệt.
     - **3 – 4 người:** Điểm gom cụm $= 60\%$. Vẫn cần Admin duyệt trừ khi có mưa bão cực lớn.
     - **$\ge 5$ người độc lập cùng báo:** Điểm gom cụm $= 100\%$. Đạt chuẩn đồng thuận cộng đồng đông đảo.
3. **Trụ cột 3: Phân tích Ngữ nghĩa NLP bằng Gemini AI (Trọng số 20%)**
   - Phân tích nội dung mô tả:
     - Nhận diện chi tiết thực tế: Tên ngã tư, trường học, chợ, tình trạng xe cộ chết máy ("nước ngập ngang ống pô, xe chết máy đoạn trước chợ...").
     - Phát hiện troll/spam/tục tĩu ("ngập tới nóc nhà lầu 3 haha", spam ký tự vô nghĩa) $\rightarrow$ Điểm trụ cột $= 0\%$, gán nhãn `Spam`.
4. **Trụ cột 4: Mức độ nhạy cảm địa hình (Trọng số 10%)**
   - Vị trí có nằm gần một trong 68 hành lang trũng thấp đã được khảo sát của TP.HCM hay không?

### Quy tắc Tự Động Duyệt (Strict Auto-Publish Rule):
Điểm ngập **CHỈ ĐƯỢC PHÉP TỰ ĐỘNG HIỂN THỊ** lên bản đồ công cộng khi thỏa mãn đồng thời:
1. `isAutoPilotEnabled === true`
2. Tổng điểm tin cậy $\ge 85\%$
3. Cụm điểm ngập có **tối thiểu $\ge 5$ người báo độc lập**.

Mọi trường hợp còn lại đều giữ ở trạng thái `pending` để Admin xem xét thủ công.

---

## 4. Mô Hình Dữ Liệu & API

### 4.1. Cập nhật Bảng `user_reports` (PostgreSQL & In-memory)
- `status`: `'pending' | 'approved' | 'rejected' | 'resolved'` (mặc định là `'pending'`).
- `ai_confidence`: `REAL` (0.0 đến 1.0).
- `ai_reasoning`: `TEXT` (Giải trình ngắn gọn của AI về điểm tin cậy).
- `cluster_id`: `VARCHAR(100)` (Mã cụm gộp các báo cáo trong bán kính 350m và 45 phút).
- `is_auto_approved`: `BOOLEAN` (True nếu do AI tự duyệt, False nếu do Admin duyệt).
- `reviewed_by`: `VARCHAR(50)` (`'ai' | 'admin' | null`).
- `reviewed_at`: `TIMESTAMPTZ`.

### 4.2. API Endpoints
- **Public:**
  - `POST /api/reports`: Người dùng gửi báo cáo $\rightarrow$ AI tự động chấm điểm $\rightarrow$ nếu đủ điều kiện Auto-Pilot ($\ge 85\%$ và $\ge 5$ người) thì chuyển `approved`, ngược lại lưu `pending`. Trả về `{ success: true, message: 'Đã tiếp nhận báo cáo' }`.
  - `GET /api/floods/active`: Chỉ trả về các báo cáo có `status = 'approved'`.
- **Admin:**
  - `GET /api/admin/reports`: Lấy danh sách báo cáo gom cụm (Clustered Hotspots) kèm thống kê.
  - `POST /api/admin/reports/:id/approve`: Admin duyệt thủ công báo cáo đơn lẻ.
  - `POST /api/admin/reports/:id/reject`: Admin từ chối báo cáo.
  - `POST /api/admin/clusters/:clusterId/approve`: Admin duyệt cả cụm điểm ngập.
  - `POST /api/admin/clusters/:clusterId/reject`: Admin từ chối cả cụm điểm ngập.
  - `POST /api/admin/reports/:id/takedown`: Gỡ bỏ điểm ngập đã duyệt khỏi bản đồ.
  - `GET /api/admin/settings` & `POST /api/admin/settings`: Lấy và cập nhật cấu hình Auto-Pilot (Bật/Tắt, ngưỡng 85%).

---

## 5. Thiết Kế Giao Diện UI/UX (Tuân thủ 40 Quy chuẩn AGENTS.md)

1. **Modal Phản Hồi Người Dùng:**
   - Toast notification hoặc Success Modal lịch sự, phong cách kính mờ (Glassmorphism), icon `CheckCircle` từ `lucide-react`, không dùng emoji.
2. **Nút Mở Bảng Quản Trị (Admin Navigation):**
   - Đặt trên thanh header/navbar: Icon `ShieldCheck` hoặc `SlidersHorizontal` kèm chữ *"Quản trị"* và badge số lượng tin chờ duyệt (ví dụ: `bg-red-500 text-white text-[10px] rounded-full px-1.5`).
3. **Bảng Quản Trị Admin (Admin Dashboard Modal / Panel):**
   - **Header:** Tiêu đề *"Trung Tâm Điều Phối & Kiểm Duyệt Ngập Lụt"* + Công tắc Toggle *"Chế độ Tự Động Duyệt (Auto-Pilot $\ge 85\%$)"* + Thẻ thống kê (Chờ duyệt, Đã duyệt).
   - **Danh sách Cụm Điểm Ngập (Hotspot Cards):**
     - Hiển thị tên đường, quận, số lượng người báo (`5 báo cáo từ người dân`).
     - Thanh điểm tin cậy AI: Dải màu xanh dương/hổ phách/đỏ kèm lý do tóm tắt.
     - Nút *"Xem chi tiết"* mở modal xem nguyên văn từng báo cáo.
     - Hai nút thao tác nhanh: `Duyệt nhanh (Approve)` và `Bác bỏ (Dismiss)`.
   - **Modal Chi Tiết Cụm:**
     - Danh sách từng người báo: Giờ gửi, nội dung mô tả, ảnh chụp (nếu có).
     - Thông tin radar mưa và triều cường lúc báo.
     - Nút phê duyệt hoặc từ chối toàn cụm.
