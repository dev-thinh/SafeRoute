# SafeRoute - System Optimization & Bugfixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khắc phục triệt để các lỗi bất hợp lý về dữ liệu (xung đột ID báo ngập, điểm ngập ảo 10.75/106.70), chuẩn hóa tích hợp Gemini 3 API & biến môi trường Docker, và nâng cấp UI/UX tương tác cộng đồng (Vote/Resolve điểm ngập trên bản đồ, thông báo lỗi tiếng Việt thân thiện).

**Architecture:** 
- Backend: Đồng bộ hóa cơ chế sinh ID UUID cho báo cáo ngập giữa client/router và PostgreSQL/In-memory; trả về `null` trong geocoding khi không tìm thấy đường để tránh tạo điểm ngập ảo; linh hoạt hóa Gemini 3 model qua biến môi trường `GEMINI_MODEL`; kiểm tra `isDbConnected` trước khi gọi pgRouting; tự động cấu hình `DATABASE_URL` từ các biến rời rạc của Docker Compose.
- Frontend: Nâng cấp `ReportMarker.tsx` với tương tác trực tiếp (nút Xác nhận ngập & Báo nước đã rút); thay thế toàn bộ `alert(...)` bằng thông báo lỗi giao diện chuẩn UI/UX theo `AGENTS.md`.

**Tech Stack:** Node.js, Express, TypeScript, PostgreSQL/PostGIS, React 18, Leaflet, Tailwind CSS, Google Gemini 3 SDK.

## Global Constraints
- Tuân thủ tuyệt đối 40 quy tắc UI/UX trong `AGENTS.md` / `GEMINI.md`.
- Mọi thao tác git chỉ thực hiện trên nhánh `dev`, không commit/push vào `main`.
- Đảm bảo 100% tests trong `server` vượt qua (`npm test`).
- Đảm bảo `client` build thành công không lỗi TypeScript/Vite (`npm run build`).

---

### Task 1: Sửa lỗi Database ID Mismatch & Đồng bộ Vote Cộng đồng (Server)

**Files:**
- Modify: `server/src/routes/reportsRouter.ts:24-45`
- Modify: `server/src/db/reportsRepo.ts:10-38, 90-123`
- Test: `server/tests/api.test.ts`

**Interfaces:**
- `UserReport.id`: Sử dụng chuẩn UUID v4 (thông qua `crypto.randomUUID()`) thay vì `report-${Date.now()}`.
- `saveReport(report: UserReport)`: Lưu đúng `report.id` vào PostgreSQL thay vì gọi `gen_random_uuid()` độc lập.
- `voteReport(id: string, type: 'upvote' | 'resolved')`: Tìm và cập nhật thành công cả trong PostgreSQL và In-memory.

- [x] **Step 1: Viết test kiểm tra tính nhất quán ID và Vote API trong `server/tests/api.test.ts`**
Thêm test case gọi `POST /api/reports` sau đó lập tức gọi `POST /api/reports/:id/vote` với ID vừa tạo để xác nhận vote hoạt động với cùng một ID.

- [x] **Step 2: Chạy test để xác nhận kiểm tra**
Run: `cd server && npm test`

- [x] **Step 3: Cập nhật `reportsRouter.ts` và `reportsRepo.ts`**
  - Trong `reportsRouter.ts`: dùng `crypto.randomUUID()` để sinh `id` cho report.
  - Trong `reportsRepo.ts`: 
    - `saveReport`: Chèn `$1` chính là `report.id` vào cột `id` của bảng `user_reports`.
    - `voteReport`: Đồng bộ trạng thái và số phiếu chuẩn xác giữa database và `inMemoryReports`.

- [x] **Step 4: Chạy test xác nhận pass 100%**
Run: `cd server && npm test`

- [x] **Step 5: Commit thay đổi Task 1**
```bash
git add server/src/routes/reportsRouter.ts server/src/db/reportsRepo.ts server/tests/api.test.ts
git commit -m "fix(server): synchronize user report UUID between memory and postgres database"
```

---

### Task 2: Loại bỏ Điểm ngập Ảo (10.75, 106.70) & Cải thiện Geocoding Fallback

**Files:**
- Modify: `server/src/services/geocodingService.ts:80-95`
- Modify: `server/src/services/newsCrawler.ts:275-335`
- Test: `server/tests/newsCrawler.test.ts`

**Interfaces:**
- `geocodeStreet(streetName: string, district: string)`: Trả về `Promise<Coordinate | null>` (trả về `null` nếu không tìm thấy, tuyệt đối không trả tọa độ mặc định `10.75, 106.70`).
- `newsCrawler`: Bỏ qua việc tạo điểm ngập trên bản đồ nếu tọa độ là `null`, nhưng vẫn lưu bài báo vào tin tức.

- [x] **Step 1: Sửa `geocodingService.ts` để trả về `null` khi geocoding thất bại**
Thay thế `return { lat: 10.75, lng: 106.70 };` bằng `return null;`.

- [x] **Step 2: Kiểm tra lại `newsCrawler.ts` để xử lý khi `coord === null`**
Nếu `coord` là `null`, không tạo `FloodEvent` ảo trên bản đồ.

- [x] **Step 3: Chạy test `newsCrawler` và `server`**
Run: `cd server && npm test`

- [x] **Step 4: Commit thay đổi Task 2**
```bash
git add server/src/services/geocodingService.ts server/src/services/newsCrawler.ts
git commit -m "fix(geocoding): return null instead of hardcoded coordinates on geocoding failure"
```

---

### Task 3: Tối ưu Gemini 3 Model (Pro/Flash) với Circuit Breaker & Docker Config

**Files:**
- Modify: `server/src/config/env.ts`
- Modify: `server/src/services/geminiExtractor.ts`
- Modify: `server/src/routes/routesRouter.ts`

**Interfaces:**
- `ENV.GEMINI_MODEL`: Đọc từ `process.env.GEMINI_MODEL || 'gemini-3-pro'`.
- `ENV.DATABASE_URL`: Tự động lắp ráp từ `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB` nếu chưa có `DATABASE_URL`.
- `geminiCircuitBreaker`: 
  - Thử Gemini Pro với Exponential Backoff (1.5s, 3.0s).
  - Nếu cạn quota (429/resource exhausted), chuyển sang trạng thái `OPEN` trong cooldown 5 phút để dùng Flash không delay.
  - Khi hết cooldown (`HALF_OPEN`), thử gửi 1 probe tới Pro để tự động đóng lại `CLOSED` và khôi phục Pro làm model chính.
- `routesRouter`: Chỉ gọi `findPgRoutingSafeRoute` khi `isDbConnected === true`.

- [x] **Step 1: Cập nhật `env.ts` để tự động ghép DATABASE_URL và hỗ trợ GEMINI_MODEL**
- [x] **Step 2: Cập nhật `geminiExtractor.ts` với Circuit Breaker, Exponential Backoff và Probe Recovery**
- [x] **Step 3: Cập nhật `routesRouter.ts` kiểm tra `isDbConnected` trước khi gọi pgRouting**
- [x] **Step 4: Chạy test server**
Run: `cd server && npm test`

- [x] **Step 5: Commit thay đổi Task 3**
```bash
git add server/src/config/env.ts server/src/services/geminiExtractor.ts server/src/routes/routesRouter.ts
git commit -m "feat(ai): add circuit breaker with exponential backoff and dynamic gemini pro model"
```

---

### Task 4: Hoàn thiện UI Vote/Resolve Điểm Ngập Cộng Đồng Trên Bản Đồ (Client)

**Files:**
- Modify: `client/src/components/Map/ReportMarker.tsx`
- Modify: `client/src/components/Map/MapView.tsx`
- Modify: `client/src/App.tsx`
- Test: Verify bằng cách click marker và vote trên trình duyệt hoặc build.

**Interfaces:**
- Popup trong `ReportMarker.tsx`:
  - Nút 👍 *"Xác nhận ngập"* $\rightarrow$ gọi `voteReport(report.id, 'upvote')`.
  - Nút ☀️ *"Nước đã rút"* $\rightarrow$ gọi `voteReport(report.id, 'resolved')`.
  - Disable nút sau khi người dùng đã vote để tránh spam.

- [x] **Step 1: Nâng cấp `ReportMarker.tsx` với state vote và 2 nút hành động**
- [x] **Step 2: Truyền callback `onVoteReport` từ `App.tsx` xuống `ReportMarker`**
- [x] **Step 3: Kiểm tra `npm run build` trong `client`**
Run: `cd client && npm run build`

- [x] **Step 4: Commit thay đổi Task 4**
```bash
git add client/src/components/Map/ReportMarker.tsx client/src/components/Map/MapView.tsx client/src/App.tsx
git commit -m "feat(client): implement interactive community upvote and resolve buttons on flood reports"
```

---

### Task 5: Thay thế `alert(...)` và Hiển thị Error Banner Thân Thiện (Client)

**Files:**
- Modify: `client/src/components/Navigation/RoutePlannerPanel.tsx`
- Modify: `client/src/App.tsx`

**Interfaces:**
- Thêm error state `errorMsg: string | null` trong `RoutePlannerPanel.tsx`.
- Hiển thị banner báo lỗi tiếng Việt thân thiện khi tìm đường thất bại (kèm nút Thử lại).
- Thay thế các lời gọi `alert(...)` bằng thông báo giao diện/toast nhẹ nhàng.

- [x] **Step 1: Cập nhật `RoutePlannerPanel.tsx` thêm `errorMsg` và giao diện lỗi thân thiện**
- [x] **Step 2: Thay thế `alert(...)` trong `App.tsx` và `RoutePlannerPanel.tsx`**
- [x] **Step 3: Kiểm tra `npm run build` trong `client`**
Run: `cd client && npm run build`

- [x] **Step 4: Commit thay đổi Task 5**
```bash
git add client/src/components/Navigation/RoutePlannerPanel.tsx client/src/App.tsx
git commit -m "feat(client): replace native alerts with elegant toast notifications and route error banner"
```

---

### Task 6: Cập nhật Tài liệu Kỹ thuật (Docs & README)

**Files:**
- Modify: `README.md`
- Create: `docs/superpowers/specs/2026-10-06-system-optimization-and-resilience.md`

- [x] **Step 1: Cập nhật `README.md` phản ánh kiến trúc mới (Gemini 3 Pro/Flash Circuit Breaker, Community Voting, Geocoding refinement)**
- [x] **Step 2: Tạo tài liệu đặc tả kỹ thuật `docs/superpowers/specs/2026-10-06-system-optimization-and-resilience.md`**
- [x] **Step 3: Commit thay đổi Task 6**
```bash
git add README.md docs/superpowers/
git commit -m "docs: document system optimization, ai circuit breaker, and community voting"
```

