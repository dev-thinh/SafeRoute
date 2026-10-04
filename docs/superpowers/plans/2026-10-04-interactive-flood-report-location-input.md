# Interactive Flood Report Location Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the address display in the flood report pin overlay (`ReportLocationPinOverlay.tsx`) into an interactive text input with real-time autocomplete suggestions, automatic synchronization with map panning, and one-click map centering.

**Architecture:** 
- In `ReportLocationPinOverlay.tsx`, replace the static address text paragraph with a controlled `<input>` element that synchronizes with the map center address when dragged, but allows direct text input and autocomplete search (via `searchLocation`).
- In `App.tsx`, wire `onSelectLocation` to update `mapCenter`, `centerCoord`, and `centerAddress`, smoothly panning the Leaflet map center (`map.flyTo`) to the chosen suggestion coordinates.

**Tech Stack:** React 18, TypeScript 5, Vite 6, Tailwind CSS 3, Lucide React, Leaflet / React-Leaflet.

## Global Constraints

- Keep 100% of existing map overlay features intact (center location pin, spreading ripple, GPS locate button, zoom controls).
- Strict Git Branch Policy: All changes, commits, and pushes MUST be made exclusively on branch `dev` (`git push origin dev`). Never commit or push directly to `main`!
- Zero TypeScript and Vite build errors (`npm run build` in `client`).
- Strict adherence to SafeRoute's 40 UI/UX design rules in `AGENTS.md` (Design tokens, 44px min touch target, responsive glassmorphism, Vietnamese copy).

---

### Task 1: Implement Interactive Location Input & Autocomplete in `ReportLocationPinOverlay.tsx`

**Files:**
- Modify: `client/src/components/Reporting/ReportLocationPinOverlay.tsx`

**Interfaces:**
- Consumes: `searchLocation` from `../../services/api`, `LocationItem` or `{ label: string; lat: number; lng: number }`.
- Produces: `onSelectLocation?: (lat: number, lng: number, label: string) => void` in `ReportLocationPinOverlayProps`.

- [x] **Step 1: Update `ReportLocationPinOverlayProps` with `onSelectLocation`**

In `client/src/components/Reporting/ReportLocationPinOverlay.tsx`:
Add `onSelectLocation?: (lat: number, lng: number, label: string) => void;` to `ReportLocationPinOverlayProps`.

- [x] **Step 2: Add autocomplete and synchronization state hooks**

```tsx
import { searchLocation } from '../../services/api';

// Inside component:
const [searchQuery, setSearchQuery] = useState('');
const [isFocused, setIsFocused] = useState(false);
const [suggestions, setSuggestions] = useState<{ label: string; lat: number; lng: number }[]>([]);
const [isSearching, setIsSearching] = useState(false);
const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

// Synchronize input text with map center address when not actively typing/focused
useEffect(() => {
  if (!isFocused) {
    setSearchQuery(address || '');
  }
}, [address, isFocused]);

// Debounced autocomplete search
useEffect(() => {
  if (!isFocused) return;
  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  setIsSearching(true);
  searchTimeoutRef.current = setTimeout(async () => {
    const results = await searchLocation(searchQuery);
    setSuggestions(results);
    setIsSearching(false);
  }, 300);

  return () => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  };
}, [searchQuery, isFocused]);
```

- [x] **Step 3: Replace static address card with interactive search input & suggestions dropdown**

Replace the static address card with:
- An input wrapper with `focus-within:border-blue-500 focus-within:bg-white bg-gray-50`.
- Text input displaying `searchQuery`, with `placeholder="Nhập địa chỉ hoặc điểm ngập..."`.
- Clear button `(X)` when `searchQuery` is present.
- Dropdown suggestions rendered below the input with `z-50 max-h-56 overflow-y-auto divide-y divide-gray-100 bg-white rounded-xl shadow-2xl border border-gray-200`.
- On item click (`onMouseDown`): call `onSelectLocation?.(item.lat, item.lng, item.label)`, set `searchQuery(item.label)`, close dropdown.

- [x] **Step 4: Verify type safety in `ReportLocationPinOverlay.tsx`**

Ensure all props, types, and callbacks compile cleanly without TypeScript errors.

- [x] **Step 5: Commit changes**

```bash
git add client/src/components/Reporting/ReportLocationPinOverlay.tsx
git commit -m "feat(reporting): add interactive location input and autocomplete to pin overlay"
```

---

### Task 2: Connect Map Centering & Coordination in `App.tsx`

**Files:**
- Modify: `client/src/App.tsx`

**Interfaces:**
- Consumes: `onSelectLocation` callback from `ReportLocationPinOverlayProps`.
- Produces: Updates `mapCenter`, `centerCoord`, `centerAddress` in `App.tsx`.

- [x] **Step 1: Add suggestion handler `handleSelectReportLocation` in `App.tsx`**

```tsx
const handleSelectReportLocation = (lat: number, lng: number, label: string) => {
  setMapCenter([lat, lng]);
  setCenterCoord({ lat, lng });
  setCenterAddress(label);
};
```

- [x] **Step 2: Pass `onSelectLocation` to `<ReportLocationPinOverlay />`**

In `App.tsx`:
```tsx
<ReportLocationPinOverlay
  isPinning={isPinningReport}
  isMoving={isMapMoving}
  coord={centerCoord}
  address={centerAddress}
  isLoadingAddress={isLoadingAddress}
  onConfirm={handleConfirmReportLocation}
  onCancel={() => setIsPinningReport(false)}
  onLocateMe={handleLocateMe}
  onSelectLocation={handleSelectReportLocation}
  onZoomIn={() => zoomHandlersRef.current?.zoomIn()}
  onZoomOut={() => zoomHandlersRef.current?.zoomOut()}
/>
```

- [x] **Step 3: Commit changes**

```bash
git add client/src/App.tsx
git commit -m "feat(map): connect suggested report location selection to map center in App"
```

---

### Task 3: Verification & Quality Assurance

**Files:**
- None (verification commands)

- [x] **Step 1: Run client build check**
Run: `npm run build` in `client`
Expected: 0 TypeScript and Vite compilation errors.

- [x] **Step 2: Run server unit test check**
Run: `npm test` in `server`
Expected: 40/40 tests pass.

- [x] **Step 3: Verify git status and branch integrity**
Run: `git status`
Expected: On branch `dev`, working tree clean.
