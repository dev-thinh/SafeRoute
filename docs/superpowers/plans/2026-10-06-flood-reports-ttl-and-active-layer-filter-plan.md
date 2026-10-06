# SafeRoute - Kế Hoạch Triển Khai: Cơ Chế TTL, Auto-Extend Động và Tối Ưu Lớp Dự Báo Ngập

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai cơ chế tự động hết hạn (TTL 3 tiếng) và tự động gia hạn Sliding Window khi có người bấm "Đang ngập" (tối đa 12 tiếng) cho báo cáo ngập; đồng thời ẩn các vòng tròn xám khô ráo trên lớp bản đồ FloodLayer.

**Architecture:**
- Backend:
  - Cập nhật schema `user_reports` bổ sung cột `last_verified_at`.
  - Cập nhật `reportsRepo.ts`: áp dụng bộ lọc TTL 3 giờ và trần 12 giờ cho `getActiveReports(targetTime)`.
  - Cập nhật `voteReport`: khi vote `upvote` sẽ cập nhật `last_verified_at = NOW()` để gia hạn thêm 3 giờ.
  - Cập nhật `floodsRouter.ts` truyền `targetTime` vào `getActiveReports`.
- Frontend:
  - Cập nhật `FloodLayer.tsx`: chỉ render các điểm có độ sâu $\ge 10\text{ cm}$, ẩn hoàn toàn các vòng tròn xám khô ráo.
  - Cập nhật `ReportMarker.tsx`: hiển thị thời gian hiệu lực còn lại và tooltip giải thích gia hạn 3 giờ.

**Tech Stack:** TypeScript, PostgreSQL, Express, React 18, Leaflet, Tailwind CSS, Lucide Icons.

## Global Constraints
- Tuân thủ tuyệt đối 40 quy chuẩn UI/UX trong `AGENTS.md` / `GEMINI.md`.
- Chỉ commit trên nhánh `dev`, tuyệt đối không commit/push lên `main`.
- Đảm bảo 100% tests trong `server` vượt qua (`npm test`).
- Đảm bảo `client` build thành công 0 lỗi (`npm run build`).

---

### Task 1: Backend - Schema & TTL Sliding Window Auto-Extend Logic

**Files:**
- Modify: `server/src/types/index.ts`
- Modify: `server/src/db/initDb.ts`
- Modify: `server/src/db/reportsRepo.ts`
- Modify: `server/src/routes/floodsRouter.ts`
- Modify: `server/tests/api.test.ts`

- [x] **Step 1: Thêm `lastVerifiedAt` vào kiểu `UserReport` trong `server/src/types/index.ts`**
- [x] **Step 2: Thêm migration cho cột `last_verified_at` trong `server/src/db/initDb.ts`**
- [x] **Step 3: Cập nhật hàm `saveReport`, `getActiveReports` và `voteReport` trong `server/src/db/reportsRepo.ts`**
  - Hỗ trợ TTL 3 giờ và Max Lifetime 12 giờ cho cả PostgreSQL và In-memory.
  - Khi `upvote`: gia hạn `last_verified_at = NOW()`.
- [x] **Step 4: Cập nhật `server/src/routes/floodsRouter.ts` truyền `targetTime` vào `getActiveReports`**
- [x] **Step 5: Bổ sung Unit & Integration Test trong `server/tests/api.test.ts`**
  - Test báo cáo mới < 3h $\implies$ xuất hiện.
  - Test báo cáo > 3h $\implies$ tự động ẩn.
  - Test báo cáo được upvote $\implies$ tự động gia hạn thêm 3h.
- [x] **Step 6: Chạy kiểm thử server `npm test`**
- [x] **Step 7: Commit Task 1 trên nhánh `dev`**

---

### Task 2: Frontend - Lọc Sạch Vòng Tròn Khô Ráo & Hiển Thị TTL Trên Marker

**Files:**
- Modify: `client/src/types/index.ts`
- Modify: `client/src/components/Map/FloodLayer.tsx`
- Modify: `client/src/components/Map/ReportMarker.tsx`

- [x] **Step 1: Cập nhật kiểu `UserReport` trong `client/src/types/index.ts` bổ sung `lastVerifiedAt`**
- [x] **Step 2: Cập nhật `client/src/components/Map/FloodLayer.tsx` chỉ hiển thị các điểm có độ sâu $\ge 10\text{ cm}$**
- [x] **Step 3: Cập nhật `client/src/components/Map/ReportMarker.tsx` hiển thị thời gian còn lại của điểm ngập và tooltip nút bấm**
- [x] **Step 4: Chạy `npm run build` trong thư mục `client` kiểm tra 0 lỗi**
- [x] **Step 5: Commit Task 2 trên nhánh `dev`**

---

### Task 3: Cập nhật Tài liệu & Kiểm tra Toàn diện

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Cập nhật `README.md` tài liệu hóa cơ chế TTL 3h và Sliding Window Auto-Extend**
- [ ] **Step 2: Chạy kiểm thử toàn bộ `server` và `client`**
- [ ] **Step 3: Commit Task 3 trên nhánh `dev`**
