# SafeRoute - Thiết Kế Kỹ Thuật: Cơ Chế Đồng Thuận Cộng Đồng Động (Crowdsourced Consensus Voting Design)

**Tác giả:** SafeRoute Engineering Team  
**Ngày:** 06/10/2026  
**Nhánh:** `dev`  
**Trạng thái:** Approved by User (Phương án 1)

---

## 1. Bối cảnh & Vấn đề Cần Giải Quyết

Trong hệ thống SafeRoute, người dân có thể báo điểm ngập và cộng đồng có thể đánh giá:
* **Upvote (`upvotes`):** Xác nhận đường vẫn đang ngập.
* **Downvote / Resolved (`downvotes`):** Báo cáo nước đã rút.

### Lỗ hổng của cơ chế cũ:
1. **Ngưỡng cố định 3 phiếu (`downvotes >= 3`):** Khi hệ thống có hàng trăm người tham gia (ví dụ 100 người xác nhận ngập sâu), chỉ cần 3 người bấm nhầm hoặc troll báo nước rút là điểm ngập bị ẩn lập tức $\rightarrow$ Rất nguy hiểm vì làm mất cảnh báo trong khi đường vẫn ngập sâu.
2. **Giao diện gây bối rối (`0/3 báo đã rút`):** Người dùng hiểu nhầm rằng hệ thống chỉ cho phép tối đa 3 người vote hoặc không hiểu con số 3 ở đâu ra.

---

## 2. Giải Pháp Thiết Kế: Đồng Thuận Dựa Trên Tổng Lượt Vote

Gọi:
* $U$: Số lượt xác nhận "Đang ngập" (`report.upvotes`).
* $D$: Số lượt báo "Nước đã rút" (`report.downvotes`).
* $N = U + D$: Tổng số người đã đánh giá.

### 2.1. Thuật toán Tự động Giải tỏa Điểm ngập (`status = 'resolved'`)

Một điểm ngập chỉ được xem là nước đã rút an toàn và tự động ẩn khỏi bản đồ khi thỏa mãn **đồng thời 2 điều kiện**:
1. **Số mẫu tối thiểu (Minimum Sample Size):** $N \ge 3$ (tránh trường hợp mới có 1 hoặc 2 người vote đã vội kết luận).
2. **Tỷ lệ đa số áp đảo (Consensus Threshold):** Tỷ lệ báo nước đã rút chiếm $\ge 60\%$ tổng số lượt vote:
   $$\text{Ratio} = \frac{D}{N} \ge 0.60$$

#### Các kịch bản thực tế:
* **Kịch bản A (Điểm ngập mới rút):** 3 người đầu tiên đều báo nước rút ($U=0, D=3 \implies N=3, \frac{3}{3}=100\% \ge 60\%$) $\rightarrow$ Tự động ẩn ngay.
* **Kịch bản B (Điểm ngập lớn đông người qua lại):** Có 50 người báo đang ngập, 3 người báo nước rút ($U=50, D=3 \implies N=53, \frac{3}{53}=5.6\% < 60\%$) $\rightarrow$ **Không bị ẩn**, cảnh báo vẫn được giữ vững.
* **Kịch bản C (Nước rút dần sau mưa):** Đến trưa nước bắt đầu rút, số người báo nước rút tăng dần lên 80 người ($U=50, D=80 \implies N=130, \frac{80}{130}=61.5\% \ge 60\%$) $\rightarrow$ Điểm ngập tự động chuyển sang `resolved` và ẩn khỏi bản đồ một cách tự nhiên.

### 2.2. Giao diện Người dùng (UI/UX - Chuẩn AGENTS.md)

Tại Popup của Marker báo ngập ([`ReportMarker.tsx`](file:///D:/HCMUS/SafeRoute/client/src/components/Map/ReportMarker.tsx)):
1. **Thống kê số phiếu & Tỷ lệ %:**
   * `<ThumbsUp />` **`{U} đang ngập`** (`{Math.round(U/N * 100)}%`)
   * `<Sun />` **`{D}/{N} báo nước đã rút`** (`{Math.round(D/N * 100)}%`)
   *(Nếu $N = 0$, hiển thị 0 xác nhận / 0 báo rút).*
2. **Thanh tỷ lệ đồng thuận trực quan (Consensus Bar):**
   * Thanh mảnh `h-1.5 w-full rounded-full bg-gray-100 overflow-hidden flex`:
     * Phần màu xanh dương (`bg-blue-600`) tương ứng với `% Đang ngập`.
     * Phần màu hổ phách (`bg-amber-500`) tương ứng với `% Nước đã rút`.
3. **Tooltip giải thích rõ ràng:**
   * Nút *"Nước đã rút"*: `title="Báo cáo nước đã rút tại đây (khi đa số ≥ 60% xác nhận sẽ tự động ẩn điểm ngập)"`.

---

## 3. Kiến Trúc Dữ Liệu & API

### 3.1. Backend (`reportsRepo.ts`)
* Cập nhật hàm `voteReport(id, type)`:
  * Tính toán $N = memReport.upvotes + memReport.downvotes$.
  * Kiểm tra điều kiện:
    ```typescript
    const totalVotes = memReport.upvotes + memReport.downvotes;
    if (totalVotes >= 3 && memReport.downvotes / totalVotes >= 0.60) {
      memReport.status = 'resolved';
    }
    ```
  * Cập nhật đồng bộ vào PostgreSQL qua câu lệnh SQL:
    ```sql
    UPDATE user_reports 
    SET downvotes = downvotes + 1, 
        status = CASE 
          WHEN (upvotes + downvotes + 1 >= 3) AND ((downvotes + 1)::float / (upvotes + downvotes + 1)::float >= 0.60) 
          THEN 'resolved' 
          ELSE status 
        END 
    WHERE id::text = $1
    ```
  * Tương tự cho nhánh `type === 'upvote'`: nếu trước đó đã có vote rút nhưng sau đó lượng vote ngập áp đảo trở lại thì `status` vẫn giữ `active`.

---

## 4. Kế hoạch Kiểm thử & Xác minh

1. **Unit Test Backend:** Viết test case trong `server/tests/api.test.ts` mô phỏng:
   - 2 vote đang ngập + 1 vote nước rút $\implies$ `status` vẫn là `active` ($1/3 = 33\% < 60\%$).
   - Thêm 2 vote nước rút nữa ($1/5 \to 3/5 = 60\%$) $\implies$ `status` chuyển thành `resolved`.
2. **Kiểm tra Frontend Build:** `npm run build` trong `client` đạt 0 lỗi.
3. **Commit trên nhánh `dev`:** Tuân thủ nguyên tắc an toàn nhánh Git.
