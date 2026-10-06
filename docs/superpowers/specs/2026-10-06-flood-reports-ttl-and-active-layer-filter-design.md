# SafeRoute - Thiết Kế Kỹ Thuật: Cơ Chế Tự Động Hết Hạn (TTL), Gia Hạn Động (Auto-Extend) và Tối Ưu Lớp Dự Báo Ngập

## 1. Bối cảnh & Vấn đề
- **Vấn đề 1 (Báo cáo cộng đồng tồn tại vô thời hạn):**
  Bảng `user_reports` chỉ chuyển trạng thái sang `resolved` khi có $\ge 3$ lượt vote và $\ge 60\%$ vote báo nước rút. Không có cơ chế hết hạn theo thời gian (Time-To-Live / TTL). Do đó, các báo cáo ngập từ nhiều ngày trước (ví dụ: ngày 01/10/2026) vẫn hiển thị vĩnh viễn trên bản đồ dù nước đã rút từ lâu.
- **Vấn đề 2 (Lớp dự báo ngập hiển thị tràn lan điểm khô ráo):**
  `FloodLayer.tsx` đang render cả 68 tuyến đường khảo sát dưới dạng vòng tròn màu xám viền nét đứt kể cả khi độ sâu dự báo bằng 0 cm (`Khô ráo / Bình thường`), khiến bản đồ bị rối rắm và người dùng lầm tưởng các điểm này luôn ngập.

---

## 2. Mục tiêu Thiết kế
1. **Cơ chế TTL & Sliding Window Auto-Extend cho Báo cáo người dùng:**
   - Thời gian sống cơ bản (Base TTL): **3 giờ**.
   - Cơ chế tự động gia hạn (Sliding Window): Mỗi khi có người dùng bấm 👍 *"Đang ngập"*, thời gian hiệu lực được **reset lại 3 giờ tính từ thời điểm xác nhận đó**.
   - Giới hạn trần tối đa (Max Lifetime): Không vượt quá **12 giờ** kể từ thời điểm tạo báo cáo ban đầu (`reportedAt`), tránh tình trạng một điểm bị spam tồn tại mãi mãi.
2. **Lọc sạch Lớp Dự báo Ngập (`FloodLayer`):**
   - Chỉ hiển thị các vòng tròn dự báo khi độ sâu thực tế $\ge 10\text{ cm}$.
   - Ẩn hoàn toàn các điểm khô ráo ($< 10\text{ cm}$) để giao diện bản đồ thông thoáng, tập trung 100% vào các mối nguy hiểm thực sự.
3. **Giao diện Marker Popup Minh Bạch:**
   - Hiển thị thời gian hiệu lực còn lại của điểm báo ngập.
   - Tooltip nút *"Đang ngập"* giải thích rõ: *"Xác nhận điểm ngập này vẫn còn (tự động gia hạn thêm 3 giờ)"*.

---

## 3. Kiến trúc Kỹ thuật & Thuật toán

### 3.1. Dữ liệu & Mô hình TTL (Backend)
- Thêm trường `last_verified_at TIMESTAMPTZ DEFAULT NOW()` vào bảng `user_reports` (PostgreSQL) và `lastVerifiedAt?: Date` vào kiểu `UserReport` (TypeScript).
- Khi tạo báo cáo mới (`saveReport`):
  - `reported_at = NOW()`
  - `last_verified_at = NOW()`
- Khi người dùng xác nhận 👍 *"Đang ngập"* (`voteReport(id, 'upvote')`):
  - `upvotes = upvotes + 1`
  - `last_verified_at = NOW()` (Gia hạn thời gian sống)
  - Nếu báo cáo còn trong hạn 12 giờ và tỷ lệ báo nước rút $< 60\% \implies status = 'active'`.

### 3.2. Thuật toán Lọc Báo Cáo Hiệu Lực (`getActiveReports`)
Một báo cáo được trả về trong danh sách ngập khi và chỉ khi thỏa mãn đồng thời 3 điều kiện:
1. Trạng thái hoạt động: `status = 'active'`
2. Không vượt quá giới hạn trần: $T_{\text{current}} - reported\_at \le 12\text{ giờ}$
3. Chưa hết hạn TTL: $T_{\text{current}} - \max(last\_verified\_at, reported\_at) \le 3\text{ giờ}$

```sql
SELECT 
  id, 
  ST_X(location_geom) as lng, 
  ST_Y(location_geom) as lat, 
  depth_level as "depthLevel", 
  depth_cm as "depthCm", 
  description, 
  image_url as "imageUrl", 
  upvotes, 
  downvotes, 
  status, 
  reported_at as "reportedAt",
  COALESCE(last_verified_at, reported_at) as "lastVerifiedAt"
FROM user_reports 
WHERE status = 'active'
  AND reported_at >= $1 - INTERVAL '12 hours'
  AND COALESCE(last_verified_at, reported_at) >= $1 - INTERVAL '3 hours'
ORDER BY reported_at DESC;
```
*(Trong đó `$1` là `targetTime`, mặc định là `NOW()`)*

### 3.3. Tối ưu hiển thị `FloodLayer.tsx` (Frontend)
```tsx
const activeFloodedEvents = events.filter((event) => {
  const depth = event.current_depth_cm !== undefined ? event.current_depth_cm : event.estimatedDepthCm;
  return depth >= 10;
});
```
- Chỉ render danh sách `activeFloodedEvents`. Nếu tuyến đường khô ráo, không vẽ vòng tròn xám lên bản đồ.

---

## 4. Kế hoạch Kiểm thử (Test Strategy)
1. **Unit Test Backend (`reportsRepo.test.ts` / `api.test.ts`)**:
   - Test report mới tạo (< 3h) $\implies$ trả về trong `getActiveReports()`.
   - Test report đã quá 3h mà không ai vote $\implies$ tự động bị loại khỏi `getActiveReports()`.
   - Test report ở mốc 2h50p được vote `upvote` $\implies$ `lastVerifiedAt` được cập nhật, sống thêm 3h.
   - Test report quá 12h kể từ `reportedAt` $\implies$ hết hạn vĩnh viễn dù có vote tiếp.
2. **Frontend Build & UI Check**:
   - Kiểm tra `client` build thành công 0 lỗi.
   - Kiểm tra Marker Popup hiển thị thời gian còn hiệu lực và tooltip gia hạn 3 giờ.
   - Kiểm tra bản đồ không còn các vòng tròn xám khô ráo.
