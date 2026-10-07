# SafeRoute UI/UX Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild and elevate the entire SafeRoute UI/UX with Apple Maps Floating Island spatial architecture and modern Pastel Glassmorphism styling, strictly complying with the 40 UI/UX design rules in `AGENTS.md` and `GEMINI.md`.

**Architecture:** The map spans 100% of the viewport. Floating above it are decoupled, non-overlapping glassmorphic surfaces: a left-side `RoutePlannerPanel`, a consolidated top-right `TopUtilityBar` (Weather, Fit-Route, Admin Moderation), and a bottom-right action dock (`FloodDepthLegend` and "Báo ngập" FAB). All components share a cohesive pastel design token system.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, Leaflet, React-Leaflet, Lucide React, Axios.

## Global Constraints

- Never commit directly to `main` / `master`. All work and commits must be on branch `dev`.
- 100% vector icons from `lucide-react` (Rule 8, 38). No emojis as structural icons.
- Strict 4-tier flood risk color standard: Butter Yellow (< 20cm), Apricot (20-40cm), Coral Pink (40-60cm), Crimson Red (> 60cm).
- Touch target minimum >= 44x44px for interactive elements (Rule 27).
- Anti-pattern #1: No arbitrary inline CSS.
- Anti-pattern #2: Never block 100% of the map on desktop; support collapsible floating panels.
- Anti-pattern #3: Center-lock zoom during `isPinningReport` must be strictly maintained.
- Anti-pattern #4: Always provide loading spinners and disabled states.
- Anti-pattern #5: Human-friendly Vietnamese error handling.
- Anti-pattern #6: Always use real GPS/map center coordinates.
- Maintain WCAG AA text contrast ratio >= 4.5:1.
- `npm run build` in `client` must pass with 0 TypeScript/Vite errors after every task.

---

### Task 1: Design Tokens & Tailwind Configuration (Pastel Design System)

**Files:**
- Modify: `client/tailwind.config.js`
- Modify: `client/src/index.css`

**Interfaces:**
- Consumes: Tailwind CSS base configuration
- Produces: Extended pastel color palette (`pastel-mint`, `pastel-coral`, `pastel-sky`, `pastel-yellow`, `pastel-apricot`, `pastel-rose`, `pastel-lavender`), glass shadows (`shadow-glass`, `shadow-glass-hover`, `shadow-pastel-glow`), custom glassmorphic backdrop classes.

- [x] **Step 1: Update tailwind.config.js with pastel colors and shadow tokens**

Add custom colors and shadows to `client/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        safe: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        flood: {
          ankle: '#FDE047',  // pastel yellow < 20cm
          wheel: '#FB923C',  // pastel apricot 20 - 40cm
          knee: '#F87171',   // pastel coral 40 - 60cm
          deep: '#DC2626',   // crimson red > 60cm
        },
        pastel: {
          mint: {
            50: '#F0FDF4',
            100: '#DCFCE7',
            200: '#BBF7D0',
            600: '#16A34A',
            700: '#15803D',
            800: '#166534',
          },
          coral: {
            50: '#FFF1F2',
            100: '#FFE4E6',
            200: '#FECDD3',
            600: '#E11D48',
            700: '#BE123C',
            800: '#9F1239',
          },
          sky: {
            50: '#F0F9FF',
            100: '#E0F2FE',
            200: '#BAE6FD',
            500: '#0EA5E9',
            600: '#0284C7',
            700: '#0369A1',
          },
          amber: {
            50: '#FEFCE8',
            100: '#FEF9C3',
            200: '#FEF08A',
            700: '#A16207',
            800: '#854D0E',
          },
          lavender: {
            50: '#F5F3FF',
            100: '#EDE9FE',
            200: '#DDD6FE',
            700: '#6D28D9',
          },
        },
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(15, 23, 42, 0.08), 0 2px 8px 0 rgba(15, 23, 42, 0.04)',
        'glass-hover': '0 16px 40px 0 rgba(15, 23, 42, 0.12), 0 4px 12px 0 rgba(15, 23, 42, 0.06)',
        'pastel-blue': '0 8px 24px -4px rgba(37, 99, 235, 0.25)',
        'pastel-mint': '0 8px 24px -4px rgba(16, 185, 129, 0.25)',
        'pastel-coral': '0 8px 24px -4px rgba(244, 63, 94, 0.25)',
      },
    },
  },
  plugins: [],
};
```

- [x] **Step 2: Add smooth transitions and glassmorphism helpers in client/src/index.css**

Update `client/src/index.css` with enhanced glass backdrop styles and animations:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.leaflet-container {
  width: 100%;
  height: 100%;
}

/* Custom modern thin scrollbar */
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.35);
  border-radius: 9999px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.6);
}

/* Radar pulse animation for flood pins */
@keyframes radar-pulse {
  0% {
    transform: scale(0.9);
    opacity: 0.8;
  }
  70% {
    transform: scale(1.6);
    opacity: 0;
  }
  100% {
    transform: scale(0.9);
    opacity: 0;
  }
}

.animate-radar {
  animation: radar-pulse 2s cubic-bezier(0, 0.2, 0.8, 1) infinite;
}

/* Subtle glass surface utility */
.glass-panel {
  background-color: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(224, 242, 254, 0.8);
}
```

- [x] **Step 3: Test build verification**

Run: `npm run build` in `client`
Expected: PASS with 0 errors.

- [x] **Step 4: Commit changes**

```bash
git add client/tailwind.config.js client/src/index.css
git commit -m "feat(ui): add pastel design tokens and glassmorphism styles"
```

---

### Task 2: TopUtilityBar Component & Layout Reorganization in App.tsx

**Files:**
- Create: `client/src/components/Navigation/TopUtilityBar.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/Map/MapView.tsx`

**Interfaces:**
- Consumes: `onOpenAdmin: () => void`, `onOpenWeather: () => void`, `pendingAdminCount: number`, `onFitRoute?: () => void`, `hasRoute: boolean`
- Produces: Consolidated, collision-free top-right utility dock `TopUtilityBar`

- [x] **Step 1: Create client/src/components/Navigation/TopUtilityBar.tsx**

Create the component with:
- Quick weather summary chip (e.g. icon CloudRain + text "Khí tượng & Triều" that opens the Weather tab).
- Fit Route button (Route icon, enabled when `hasRoute = true`).
- Admin Moderation button (ShieldCheck icon with pending badge).
- Clean horizontal flexbox layout with pastel glass styling and active scale animations.

- [x] **Step 2: Remove colliding FitRouteButton from client/src/components/Map/MapView.tsx**

Expose a fit bounds callback via `onRegisterFitRoute` ref or trigger from parent, and remove the hardcoded `leaflet-top leaflet-right` button in `MapView.tsx` that previously collided with the Admin button.

- [x] **Step 3: Integrate TopUtilityBar and reposition bottom-right dock in client/src/App.tsx**

In `App.tsx`:
- Render `<TopUtilityBar />` at `absolute top-4 right-4 z-[1000]` instead of separate overlapping buttons.
- Position `<FloodDepthLegend />` and FAB "Báo ngập tại đây" cleanly in bottom-right without collision.
- Wire up tab switching so clicking the Weather pill in `TopUtilityBar` sets `mainTab = 'weather'` in `RoutePlannerPanel`.

- [x] **Step 4: Test build verification**

Run: `npm run build` in `client`
Expected: PASS with 0 errors.

- [x] **Step 5: Commit changes**

```bash
git add client/src/components/Navigation/TopUtilityBar.tsx client/src/App.tsx client/src/components/Map/MapView.tsx
git commit -m "feat(ui): create TopUtilityBar and eliminate top-right layout collisions"
```

---

### Task 3: Redesign Route Planner Panel & Selectors (Pastel Glass & Quick Presets)

**Files:**
- Create: `client/src/components/Navigation/QuickPresetChips.tsx`
- Modify: `client/src/components/Navigation/VehicleSelector.tsx`
- Modify: `client/src/components/Navigation/TimeSelector.tsx`
- Modify: `client/src/components/Navigation/RoutePlannerPanel.tsx`

**Interfaces:**
- Consumes: `origin`, `destination`, `onChangeOrigin`, `onChangeDestination`, `onRoutesCalculated`, `selectedRouteType`, `onSelectRouteType`
- Produces: Beautiful, responsive navigation panel with HCMC landmark quick presets, pastel origin/destination inputs, and refined segmented controls.

- [x] **Step 1: Create client/src/components/Navigation/QuickPresetChips.tsx**

Define popular HCMC presets:
- Sân bay Tân Sơn Nhất (10.8184, 106.6588)
- Chợ Bến Thành (10.7725, 106.6980)
- KTX ĐHQG TP.HCM (10.8800, 106.7820)
- ĐH Khoa học Tự nhiên (10.7626, 106.6823)
- Landmark 81 (10.7950, 106.7218)
- Ngã 4 Hàng Xanh (10.8016, 106.7114)
Render as a horizontally scrollable chip bar with pastel mint/coral badge indicators for 1-tap setting.

- [x] **Step 2: Redesign VehicleSelector.tsx & TimeSelector.tsx**

- `VehicleSelector`: Modern pastel segmented pill with Bike and Car icons, tactile feedback, and subtle glow.
- `TimeSelector`: Clean local datetime picker with "Hiện tại", "+1 tiếng", and "17:30 Tan tầm" pastel shortcut buttons.

- [x] **Step 3: Redesign RoutePlannerPanel.tsx with Pastel Glassmorphism**

- Brand Header: Sóng nước `Waves` với logo pastel phát sáng, nút thu gọn mượt mà.
- Segmented Pill Tab bar: Lộ trình - Tin tức - Thời tiết.
- Origin Input: Border pastel mint (`focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100 bg-emerald-50/40`), bullseye icon, 1-touch GPS button.
- Destination Input: Border pastel coral (`focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-100 bg-rose-50/40`), precision target icon.
- Swap button: Circular floating pill with 180° rotation on click.
- Primary CTA Button: Electric Sky Blue gradient `from-blue-600 to-indigo-600` with `shadow-pastel-blue`.

- [x] **Step 4: Test build verification**

Run: `npm run build` in `client`
Expected: PASS with 0 errors.

- [x] **Step 5: Commit changes**

```bash
git add client/src/components/Navigation/QuickPresetChips.tsx client/src/components/Navigation/VehicleSelector.tsx client/src/components/Navigation/TimeSelector.tsx client/src/components/Navigation/RoutePlannerPanel.tsx
git commit -m "feat(ui): redesign RoutePlannerPanel with pastel glassmorphism and quick presets"
```

---

### Task 4: Redesign Route Comparison Cards, Legend & Markers

**Files:**
- Modify: `client/src/components/Navigation/RouteComparisonCard.tsx`
- Modify: `client/src/components/Map/FloodDepthLegend.tsx`
- Modify: `client/src/components/Map/ReportMarker.tsx`

**Interfaces:**
- Consumes: Route results (safe route vs fastest route), flood events, community reports
- Produces: High-contrast pastel comparison cards, collapsible bottom-right legend, and polished community report popups.

- [x] **Step 1: Redesign RouteComparisonCard.tsx**

- Safe Route Card: Mint pastel surface (`bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-200`), shield icon with gentle pulse, badge "Đã né 100% ngập" khi thành công.
- Fastest Route Card: Sky pastel surface (`bg-sky-50/70 border-sky-300 ring-2 ring-sky-200`), lightning icon.
- Clear flood severity breakdown (cm and meters flooded).

- [x] **Step 2: Redesign FloodDepthLegend.tsx**

- Relocate from top-right to bottom-right (`bottom-6 right-6`), docked cleanly beside/above the FAB.
- Collapsible toggle: When collapsed, displays a mini glass pill `[⚠️ 4 mức ngập]`; when expanded, displays the full 4-tier pastel scale (Butter Yellow, Apricot, Coral Pink, Crimson Red) with cm thresholds.

- [x] **Step 3: Redesign ReportMarker.tsx**

- Community report marker: Blue droplet icon with radar ring.
- Popup card: Pastel status badges, consensus ratio bar (đang ngập vs nước đã rút), upvote/resolve buttons with tactile feedback.

- [x] **Step 4: Test build verification**

Run: `npm run build` in `client`
Expected: PASS with 0 errors.

- [x] **Step 5: Commit changes**

```bash
git add client/src/components/Navigation/RouteComparisonCard.tsx client/src/components/Map/FloodDepthLegend.tsx client/src/components/Map/ReportMarker.tsx
git commit -m "feat(ui): redesign RouteComparisonCard, FloodDepthLegend and ReportMarker"
```

---

### Task 5: Redesign Report Location Pinning Overlay

**Files:**
- Modify: `client/src/components/Reporting/ReportLocationPinOverlay.tsx`

**Interfaces:**
- Consumes: `isPinning`, `coord`, `address`, `isLoadingAddress`, `onConfirm`, `onCancel`, `onLocateMe`, `onZoomIn`, `onZoomOut`
- Produces: Immersive, distraction-free map pinning experience.

- [x] **Step 1: Redesign Center Reticle & Radar Pulse**

- Center concentric radar rings: smooth `animate-radar` pulse.
- Floating Pin: SVG with sharp ground tip, droplet cut-out, ground shadow that shrinks/fades when map drags.
- Guaranteed center-lock zoom (Anti-pattern #3 preserved).

- [x] **Step 2: Redesign Address Search Card & Bottom Action Bar**

- Top Address Card: Floating glass bar with search input, live reverse-geocode ticker, and coordinates badge.
- Right Floating Zoom Buttons (+ / -): Glass vertical pill for 1-tap zooming.
- Bottom Action Dock: Cancel button, GPS "Vị trí của tôi" button, and Confirm button with >=44px touch target.

- [x] **Step 3: Test build verification**

Run: `npm run build` in `client`
Expected: PASS with 0 errors.

- [x] **Step 4: Commit changes**

```bash
git add client/src/components/Reporting/ReportLocationPinOverlay.tsx
git commit -m "feat(ui): elevate ReportLocationPinOverlay with modern glass reticle"
```

---

### Task 6: Redesign Weather & News Feed Tabs

**Files:**
- Modify: `client/src/components/Weather/WeatherTab.tsx`
- Modify: `client/src/components/News/NewsFeedTab.tsx`

**Interfaces:**
- Consumes: Weather API data, News API data, `onSelectLocation` callback
- Produces: Visually rich pastel data tabs.

- [x] **Step 1: Redesign WeatherTab.tsx**

- Tide Status Card: Pastel Cyan & Sky gradient with peak tide height and lunar calendar display.
- 4-Quadrant Precipitation Cards: Pastel tiles with live rainfall rates (mm/h).
- 12-Hour Hourly Rain Timeline: Rounded vertical bars with pastel gradients.
- Vulnerable Corridors List: Clean cards with depth badges and "Xem vị trí" map pin buttons.

- [x] **Step 2: Redesign NewsFeedTab.tsx**

- News header with "Cập nhật tin" button and status alert banner.
- Article cards with pastel source tags (VnExpress in pastel red, Tuổi Trẻ in pastel blue, Thanh Niên in pastel indigo).
- AI Extracted Hotspots: Pastel amber tags with direct "Ghim" buttons to locate on map.

- [x] **Step 3: Test build verification**

Run: `npm run build` in `client`
Expected: PASS with 0 errors.

- [x] **Step 4: Commit changes**

```bash
git add client/src/components/Weather/WeatherTab.tsx client/src/components/News/NewsFeedTab.tsx
git commit -m "feat(ui): redesign WeatherTab and NewsFeedTab with pastel data visualizations"
```

---

### Task 7: Redesign Reporting & Admin Moderation Modals

**Files:**
- Modify: `client/src/components/Reporting/ReportFloodModal.tsx`
- Modify: `client/src/components/Admin/AdminDashboardModal.tsx`
- Modify: `client/src/components/Admin/ClusterDetailModal.tsx`

**Interfaces:**
- Consumes: Report form state, admin moderation data, cluster inspection
- Produces: Enterprise-grade modal dialogs with standard Header-Body-Footer structure.

- [x] **Step 1: Redesign ReportFloodModal.tsx**

- Standard 3-part modal: Header (Droplet icon + Title + Close X) -> Content Body -> Action Footer.
- Location preview card in pastel sky blue with "Đổi vị trí" button.
- 4-Tier Flood Depth Cards: 2x2 grid of tactile pastel buttons with depth cm and descriptive labels.
- Duplicate prevention banner for reports submitted within 2 hours.
- Submit button with loading spinner and friendly Vietnamese confirmations.

- [x] **Step 2: Redesign AdminDashboardModal.tsx & ClusterDetailModal.tsx**

- Admin Header: Shield icon, Auto-Pilot AI toggle switch, summary stat cards.
- Segmented tabs: "Cụm tin chờ duyệt" vs "Điểm đang hiển thị".
- AI Confidence Meters: Pastel gradient progress bars distinguishing verified reports from spam.
- Cluster Detail Modal: Drill-down inspection of individual citizen reports with one-click approve/reject actions.

- [x] **Step 3: Test build verification**

Run: `npm run build` in `client`
Expected: PASS with 0 errors.

- [x] **Step 4: Commit changes**

```bash
git add client/src/components/Reporting/ReportFloodModal.tsx client/src/components/Admin/AdminDashboardModal.tsx client/src/components/Admin/ClusterDetailModal.tsx
git commit -m "feat(ui): redesign ReportFloodModal and Admin moderation modals"
```

---

### Task 8: Verification Checklist, Mobile Polish & Git Status

**Files:**
- All client source files

- [x] **Step 1: Run full production build verification**

Run: `npm run build` in `client`
Expected: Built in < 15s with 0 errors.

- [x] **Step 2: Self-review against 40 UI/UX rules**

Checklist:
- [x] No layout collisions (TopUtilityBar consolidated at top-right).
- [x] Báo ngập FAB and FloodDepthLegend docked at bottom-right.
- [x] Center-lock zoom during report pinning strictly maintained.
- [x] 100% `lucide-react` icons.
- [x] Pastel color tokens applied consistently.
- [x] Touch targets >= 44x44px.
- [x] 5 interaction states (Default, Hover, Active, Disabled, Loading) present on all buttons.
- [x] Vietnamese error and status messages friendly and natural.
- [x] Git branch confirmed on `dev` (never `main`).

- [x] **Step 3: Commit and summarize execution**

```bash
git status
git commit -m "chore(ui): finalize UI/UX revamp and verify all 40 design rules"
```
