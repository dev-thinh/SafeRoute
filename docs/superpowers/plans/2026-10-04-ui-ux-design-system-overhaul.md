# SafeRoute UI/UX Overhaul & 40-Rule Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the entire SafeRoute frontend UI/UX based on the 40 mandatory design rules in `AGENTS.md`. Focus strictly on **1. Usability (Dễ sử dụng)**, **2. Consistency (Nhất quán)**, and **3. Aesthetics (Đẹp)**, keeping 100% of existing features, enforcing button locking, comprehensive loading/empty/error states, and removing verbose tutorial text in favor of crisp, professional functional labels.

**Architecture:** Refactor frontend components into modular, glassmorphic, responsive building blocks. Use unified Tailwind CSS design tokens, standard 44px minimum touch targets, atomic state management for async loading/locking, and a responsive shell that collapses neatly on mobile devices.

**Tech Stack:** React 18, TypeScript 5, Vite 6, Tailwind CSS 3, Leaflet / React-Leaflet, Lucide React.

## Global Constraints
- Strictly preserve 100% of existing features, backend endpoints, and algorithms (Tide model, rolling rainfall, compound flood risk routing, auto-crawling, report marker display).
- Strict Git Branch Policy: All changes, commits, and pushes MUST be made exclusively on branch `dev` (`git push origin dev`). Never commit or push directly to `main`!
- Zero TypeScript and Vite build errors (`npm run build` in `client`).
- Button Locking & Feedback: Every async or mutative button must have disabled/loading state and micro-interaction visual feedback (`active:scale-95`, spinners).
- No instructional/condescending text (no "Hãy kéo ghim...", "Click để..."). Use direct, professional action labels.

---

### Task 1: Foundation & Design System Utilities
**Files:**
- Modify: `client/src/index.css`
- Modify: `client/tailwind.config.js`

- [x] **Step 1: Update Tailwind theme & Design Tokens**
Ensure Tailwind configuration defines the SafeRoute color palette (Primary blue, Emerald safe, 4-tier flood alert colors) and responsive glassmorphism classes.
- [x] **Step 2: Add custom animation & utility classes in `index.css`**
Add smooth pulse, shimmer for skeletons, and micro-interaction classes.
- [x] **Step 3: Verify build with `npm run build`**

---

### Task 2: Responsive Shell & Floating Controls (`App.tsx`, `FloodDepthLegend.tsx`)
**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/Map/FloodDepthLegend.tsx`

- [x] **Step 1: Implement mobile collapsible drawer & desktop floating sidebar in `App.tsx`**
Add `isPanelCollapsed` toggle with a sleek toggle pill so mobile users can collapse the panel with 1 touch to view the full map.
- [x] **Step 2: Remove verbose tutorial text from `App.tsx` and overlays**
Replace wordy instructions with crisp functional badges ("Chọn điểm xuất phát", "Chọn điểm đến").
- [x] **Step 3: Update `FloodDepthLegend.tsx` with unified 4-tier design tokens**
Standardize depth pills (🟢 <20cm | 🟡 20-40cm | 🟠 40-60cm | 🔴 >60cm) with glassmorphism backdrop.
- [x] **Step 4: Verify build with `npm run build`**

---

### Task 3: Navigation Controller & Form Usability (`RoutePlannerPanel.tsx`, `VehicleSelector.tsx`, `TimeSelector.tsx`)
**Files:**
- Modify: `client/src/components/Navigation/RoutePlannerPanel.tsx`
- Modify: `client/src/components/Navigation/VehicleSelector.tsx`
- Modify: `client/src/components/Navigation/TimeSelector.tsx`

- [x] **Step 1: Modernize 3-tab segmented control (Lộ trình - Tin tức - Thời tiết)**
High-contrast active pills, clear icons from `lucide-react`, 44px touch targets.
- [x] **Step 2: Refactor Origin/Destination input fields and swap action**
Add smooth rotate swap button, auto-complete dropdown with district badges, clear (X) buttons, and button locking while routing or fetching GPS.
- [x] **Step 3: Update `VehicleSelector.tsx` and `TimeSelector.tsx`**
Refactor vehicle cards (Motorbike vs Car) with clear clearance icons. Refactor time presets ("Hiện tại", "17:30 Tan tầm", "19:00 Đỉnh triều").
- [x] **Step 4: Refactor Primary CTA "Tìm lộ trình an toàn"**
Implement button locking when inputs are empty/identical, active loading state with spinner "Đang tính toán lộ trình...", and error banner handling.
- [x] **Step 5: Verify build with `npm run build`**

---

### Task 4: Route Comparison Cards & Map Overlays (`RouteComparisonCard.tsx`, `RoutePolyline.tsx`)
**Files:**
- Modify: `client/src/components/Navigation/RouteComparisonCard.tsx`
- Modify: `client/src/components/Map/RoutePolyline.tsx`

- [x] **Step 1: Upgrade `RouteComparisonCard.tsx` with strong visual hierarchy**
Safe route card highlighted with Emerald border and shield check badge ("Né 100% điểm ngập"). Fastest route card with clear hazard warning badge and water depth indicator.
- [x] **Step 2: Ensure route polyline colors and pulse match design tokens**
Safe route emerald, fastest route blue with red flooded segments.
- [x] **Step 3: Verify build with `npm run build`**

---

### Task 5: Weather Dashboard Tab (`WeatherTab.tsx`)
**Files:**
- Modify: `client/src/components/Weather/WeatherTab.tsx`

- [x] **Step 1: Modernize astronomical tide status card**
Visual tidal wave curve indicator, high tide warning badge, time of peak.
- [x] **Step 2: Refactor 4-quadrant precipitation cards**
Center, South, East, Northwest radar cards with mm reading and rainfall intensity pill.
- [x] **Step 3: Upgrade 68-corridor risk list with search and 4-level flood badges**
Search bar for street names, skeleton loader, empty state when no match, one-click "Xem trên bản đồ" (`onSelectLocation`).
- [x] **Step 4: Verify build with `npm run build`**

---

### Task 6: News Feed Tab (`NewsFeedTab.tsx`)
**Files:**
- Modify: `client/src/components/News/NewsFeedTab.tsx`

- [x] **Step 1: Refactor header & manual crawl CTA**
Button "Cập nhật dữ liệu mới" with spinning sync icon, locked during crawling (`disabled={isCrawling}`).
- [x] **Step 2: Add skeleton loader and friendly empty state**
Show animated skeleton cards while fetching articles.
- [x] **Step 3: Modernize article cards**
Source tags (VnExpress, Tuổi Trẻ, Thanh Niên), flood depth tags, time badge, and one-click "Xem trên bản đồ" jump button.
- [x] **Step 4: Verify build with `npm run build`**

---

### Task 7: Flood Reporting Modal & Center Pin Overlay (`ReportLocationPinOverlay.tsx`, `ReportFloodModal.tsx`)
**Files:**
- Modify: `client/src/components/Reporting/ReportLocationPinOverlay.tsx`
- Modify: `client/src/components/Reporting/ReportFloodModal.tsx`

- [x] **Step 1: Clean up `ReportLocationPinOverlay.tsx`**
Remove verbose instructions ("Kéo hoặc phóng to..."). Use clean functional labels: "Điểm báo ngập", "Vị trí của tôi", "Xác nhận vị trí", "Hủy". Ensure button locking while moving.
- [x] **Step 2: Refactor `ReportFloodModal.tsx`**
Standard 3-part layout (Header -> Body -> Footer), location badge with "Đổi vị trí", 4-level depth cards, and submit button locking with spinner.
- [x] **Step 3: Verify build with `npm run build`**

---

### Task 8: Verification & Delivery
- [x] **Step 1: Run client build `npm run build` to confirm 0 TypeScript / Vite errors**
- [x] **Step 2: Run server unit tests `npm test` to ensure 43/43 tests pass**
- [ ] **Step 3: Commit and push strictly to `dev` (`git push origin dev`)**
