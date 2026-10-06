# SafeRoute - Kế Hoạch Triển Khai: Hệ Thống Phân Quyền Báo Ngập, Kiểm Duyệt Đa Tầng AI và Bảng Điều Khiển Admin

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển đổi mô hình báo ngập sang cơ chế phân quyền (User vs Admin), kiểm duyệt đa tầng qua AI Gemini 4 trụ cột (ngưỡng gom cụm $\ge 5$ người), và bảng điều khiển Admin Dashboard cho phép xem tóm tắt + số lượng báo cáo + bấm xem chi tiết từng tin.

**Architecture:**
- Backend:
  - Bổ sung các trường audit & AI vào `user_reports` (`status`, `ai_confidence`, `ai_reasoning`, `cluster_id`, `is_auto_approved`, `reviewed_by`).
  - Dịch vụ `aiModerationService.ts`: Đánh giá 4 trụ cột (Khí tượng 35%, Gom cụm $\ge 5$ người 35%, Ngữ nghĩa NLP 20%, Địa hình 10%).
  - API công khai: `POST /api/reports` nhận tin lưu `pending` (hoặc auto `approved` nếu $\ge 85\%$ và $\ge 5$ người). `GET /api/floods/active` chỉ trả về tin `approved`.
  - API quản trị: `adminRouter.ts` hỗ trợ lấy danh sách cụm, duyệt, từ chối, gỡ bỏ và bật/tắt Auto-Pilot.
- Frontend:
  - User Flow: Gửi báo cáo nhận thông báo lịch sự, an tâm. Bản đồ công cộng chỉ hiện điểm đã duyệt.
  - Admin Flow: Nút mở Quản trị có badge đếm tin chờ duyệt $\rightarrow$ Mở `AdminDashboardModal` xem tổng quan cụm + điểm tin cậy AI + bấm xem chi tiết từng tin báo trong `ClusterDetailModal`.

**Tech Stack:** TypeScript, PostgreSQL / In-Memory fallback, Google Gemini AI, Express, React 18, Leaflet, Tailwind CSS, Lucide Icons.

## Global Constraints
- Tuân thủ tuyệt đối 40 quy chuẩn UI/UX trong `AGENTS.md` / `GEMINI.md`.
- Chỉ commit trên nhánh `dev`, tuyệt đối không commit/push lên `main`.
- Đảm bảo 100% tests trong `server` vượt qua (`npm test`).
- Đảm bảo `client` build thành công 0 lỗi (`npm run build`).

---

### Task 1: Backend - Mô Hình Dữ Liệu, Dịch Vụ AI Thẩm Định 4 Trụ Cột & API Admin

**Files:**
- Modify: `server/src/types/index.ts`
- Modify: `server/src/db/initDb.ts`
- Create: `server/src/services/aiModerationService.ts`
- Modify: `server/src/db/reportsRepo.ts`
- Modify: `server/src/routes/reportsRouter.ts`
- Create: `server/src/routes/adminRouter.ts`
- Modify: `server/src/app.ts`
- Create: `server/tests/adminModeration.test.ts`

- [x] **Step 1: Cập nhật kiểu `UserReport` và kiểu Admin trong `server/src/types/index.ts`**
  - Thêm `status: 'pending' | 'approved' | 'rejected' | 'resolved'`, `aiConfidence`, `aiReasoning`, `clusterId`, `isAutoApproved`, `reviewedBy`, `reviewedAt`.
  - Định nghĩa kiểu `ReportCluster` và `AdminSettings`.
- [x] **Step 2: Thêm schema migration cho bảng `user_reports` trong `server/src/db/initDb.ts`**
- [x] **Step 3: Xây dựng `server/src/services/aiModerationService.ts`**
  - Trụ cột 1 (35%): Khí tượng mưa radar & triều cường sông Sài Gòn.
  - Trụ cột 2 (35%): Gom cụm không gian $\le 350$m, $\le 45$p. Ngưỡng $\ge 5$ người đạt 100% điểm, 3-4 người = 60%, 1-2 người = 20%.
  - Trụ cột 3 (20%): Gemini NLP phân tích chi tiết hiện trường vs spam/troll.
  - Trụ cột 4 (10%): Khoảng cách tới 68 hành lang trũng thấp.
  - Quy tắc auto-approve: `score >= 0.85 && clusterCount >= 5 && isAutoPilotEnabled`.
- [x] **Step 4: Cập nhật `server/src/db/reportsRepo.ts`**
  - `saveReport`: Gán `clusterId`, lưu thông tin AI đánh giá.
  - `getActiveReports`: CHỈ trả về `status === 'approved'`.
  - Bổ sung các hàm: `getAdminReportClusters()`, `approveReport()`, `rejectReport()`, `approveCluster()`, `rejectCluster()`, `takeDownReport()`, `getAdminSettings()`, `updateAdminSettings()`.
- [x] **Step 5: Cập nhật `server/src/routes/reportsRouter.ts` và tạo `server/src/routes/adminRouter.ts`**
  - `POST /api/reports`: Chạy AI đánh giá, trả về thông báo đã tiếp nhận.
  - Router admin với đầy đủ endpoints quản trị và bật/tắt Auto-Pilot.
- [x] **Step 6: Đăng ký `adminRouter` trong `server/src/app.ts`**
- [x] **Step 7: Viết kiểm thử tự động trong `server/tests/adminModeration.test.ts`**
  - Test tin mới ở trạng thái `pending` không lộ ra `getActiveReports()`.
  - Test gom cụm $\ge 5$ tin báo kèm mưa đạt $\ge 85\%$ tự động duyệt.
  - Test admin phê duyệt, từ chối và gỡ bỏ điểm ngập.
- [x] **Step 8: Chạy kiểm thử server `npm test`**
- [x] **Step 9: Commit Task 1 trên nhánh `dev`**

---

### Task 2: Frontend - Phản Hồi Người Dùng & Cô Lập Bản Đồ Công Cộng

**Files:**
- Modify: `client/src/types/index.ts`
- Modify: `client/src/components/Reporting/ReportFloodModal.tsx`
- Modify: `client/src/components/Map/ReportMarker.tsx`
- Modify: `client/src/services/api.ts`

- [x] **Step 1: Cập nhật `client/src/types/index.ts` bổ sung các trường trạng thái và kiểu Admin**
- [x] **Step 2: Cập nhật `ReportFloodModal.tsx`**
  - Sau khi gửi báo cáo thành công: Hiển thị thông báo an tâm *"Đã tiếp nhận báo cáo! Cảm ơn bạn đã hỗ trợ cộng đồng. Thông tin đã được chuyển đến ban điều phối để kiểm duyệt."*
  - Đóng modal và reset trạng thái sạch sẽ.
- [x] **Step 3: Cập nhật `ReportMarker.tsx`**
  - Bỏ dòng đếm ngược TTL (`Còn ~2h 45p`).
  - Hiển thị nhãn *"Điểm ngập đã kiểm duyệt"* (Verified Hazard).
- [x] **Step 4: Kiểm tra `npm run build` trong `client`**
- [x] **Step 5: Commit Task 2 trên nhánh `dev`**

---

### Task 3: Frontend - Bảng Điều Khiển Admin & Modal Chi Tiết Cụm Báo Cáo

**Files:**
- Modify: `client/src/services/api.ts`
- Create: `client/src/components/Admin/ClusterDetailModal.tsx`
- Create: `client/src/components/Admin/AdminDashboardModal.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Bổ sung các hàm gọi API Admin trong `client/src/services/api.ts`**
- [ ] **Step 2: Xây dựng `ClusterDetailModal.tsx`**
  - Xem danh sách từng tin báo của người dân (thời gian, mô tả, ảnh, tọa độ).
  - Hiển thị thông số thời tiết và triều cường lúc báo.
  - Hai nút hành động: Duyệt cả cụm hoặc Bác bỏ cả cụm.
- [ ] **Step 3: Xây dựng `AdminDashboardModal.tsx`**
  - Header: Thống kê số tin chờ duyệt / đã duyệt + Công tắc bật/tắt Auto-Pilot ($\ge 85\%$ & $\ge 5$ người).
  - Danh sách thẻ cụm điểm ngập: Tên đường, số lượng báo cáo, thanh điểm tin cậy AI và giải trình ngắn.
  - Nút xem chi tiết, duyệt nhanh, bác bỏ nhanh.
  - Tab xem các điểm đang hiển thị trên bản đồ kèm nút "Gỡ bỏ".
- [ ] **Step 4: Tích hợp nút mở Quản trị vào `client/src/App.tsx`**
  - Nút *"Quản trị"* trên thanh điều hướng với huy hiệu đỏ đếm tin chờ duyệt.
  - Mở/đóng modal mượt mà, hỗ trợ phím Escape.
- [ ] **Step 5: Kiểm tra `npm run build` trong `client`**
- [ ] **Step 6: Commit Task 3 trên nhánh `dev`**

---

### Task 4: Kiểm Thử Toàn Diện & Cập Nhật Tài Liệu

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Cập nhật `README.md` tài liệu hóa kiến trúc phân quyền và AI Moderation 4 trụ cột**
- [ ] **Step 2: Chạy kiểm thử toàn bộ `server` và `client`**
- [ ] **Step 3: Commit Task 4 trên nhánh `dev`**
