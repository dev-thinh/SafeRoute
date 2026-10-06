# SafeRoute - Kế Hoạch Triển Khai: Cơ Chế Đồng Thuận Cộng Đồng Động (Crowdsourced Consensus Voting Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển đổi cơ chế xác thực nước rút từ con số cố định 3 phiếu sang tỷ lệ đồng thuận đa số ($\ge 60\%$) trên tổng số lượt vote ($N$), hiển thị phần trăm và thanh Consensus Bar trực quan trên Marker Popup.

**Architecture:**
- Backend: Cập nhật hàm `voteReport` trong `server/src/db/reportsRepo.ts` để tính toán $N = U + D$, chuyển `status = 'resolved'` khi $N \ge 3$ và $D / N \ge 0.60$.
- Frontend: Cập nhật `client/src/components/Map/ReportMarker.tsx` hiển thị `{U} đang ngập ({upPercent}%)` và `{D}/{N} báo đã rút ({downPercent}%)` kèm thanh Consensus Progress Bar.

**Tech Stack:** TypeScript, Node.js, Express, PostgreSQL, React 18, Leaflet, Tailwind CSS, Lucide Icons.

## Global Constraints
- Tuân thủ tuyệt đối 40 quy chuẩn UI/UX trong `AGENTS.md` / `GEMINI.md`.
- Chỉ commit trên nhánh `dev`, không commit/push lên `main`.
- Đảm bảo 100% tests trong `server` vượt qua (`npm test`).
- Đảm bảo `client` build thành công 0 lỗi (`npm run build`).

---

### Task 1: Cập nhật Thuật toán Đồng thuận Backend & Viết Test

**Files:**
- Modify: `server/src/db/reportsRepo.ts`
- Modify: `server/tests/api.test.ts`

- [x] **Step 1: Cập nhật hàm `voteReport` trong `server/src/db/reportsRepo.ts`**
  - Nhánh In-memory: Tính $total = upvotes + downvotes$. Nếu $total \ge 3$ và $downvotes / total \ge 0.60 \implies status = 'resolved'$.
  - Nhánh PostgreSQL: Dùng biểu thức SQL kiểm tra `(upvotes + downvotes + 1 >= 3) AND ((downvotes + 1)::float / (upvotes + downvotes + 1)::float >= 0.60)`.
- [x] **Step 2: Viết test case trong `server/tests/api.test.ts`**
  - Test trường hợp 2 vote ngập + 1 vote rút ($1/3 = 33\%$) $\implies$ report vẫn `active`.
  - Test trường hợp vote rút tiếp theo ($2/4 = 50\%$) $\implies$ vẫn `active`.
  - Test trường hợp vote rút tiếp theo ($3/5 = 60\%$) $\implies$ report chuyển sang `resolved`.
- [x] **Step 3: Chạy test server**
  `cd server && npm test`
- [x] **Step 4: Commit Task 1 trên nhánh `dev`**

---

### Task 2: Nâng cấp Giao diện Marker Popup với Tỷ lệ % và Thanh Consensus Bar

**Files:**
- Modify: `client/src/components/Map/ReportMarker.tsx`

- [ ] **Step 1: Cập nhật tính toán $U, D, N$ và phần trăm trong `ReportMarker.tsx`**
  - $U = \text{report.upvotes} + (\text{hasVoted} === 'upvote' ? 1 : 0)$
  - $D = \text{report.downvotes} + (\text{hasVoted} === 'resolved' ? 1 : 0)$
  - $N = U + D$
  - $\text{upPercent} = N > 0 ? \text{Math.round}((U / N) * 100) : 0$
  - $\text{downPercent} = N > 0 ? 100 - \text{upPercent} : 0$
- [ ] **Step 2: Thêm thanh Consensus Bar (2 màu: xanh dương cho ngập, vàng hổ phách cho nước rút)**
- [ ] **Step 3: Cập nhật text thống kê `{U} đang ngập ({upPercent}%)` và `{D}/{N} báo nước đã rút ({downPercent}%)`**
- [ ] **Step 4: Cập nhật tooltip nút bấm giải thích rõ ràng cơ chế $\ge 60\%$**
- [ ] **Step 5: Kiểm tra `npm run build` trong `client`**
- [ ] **Step 6: Commit Task 2 trên nhánh `dev`**

---

### Task 3: Kiểm thử Toàn diện & Cập nhật Tài liệu

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Cập nhật `README.md` phản ánh cơ chế tính toán đồng thuận tỷ lệ $\ge 60\%$**
- [ ] **Step 2: Chạy kiểm thử toàn bộ `server` và `client`**
- [ ] **Step 3: Commit Task 3 trên nhánh `dev`**
