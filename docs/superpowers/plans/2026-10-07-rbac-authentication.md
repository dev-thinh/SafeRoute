# SafeRoute RBAC Authentication & Role Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full Role-Based Access Control (RBAC) separating Guest (public navigation & browsing), User (verified citizen flood reporting), and Admin (moderation dashboard), while ensuring Admin retains 100% access to all normal user features.

**Architecture:**
- **Backend (`server`):** Node.js `crypto`-based PBKDF2 password hashing & HMAC-SHA256 signed JWT tokens (zero external native dependencies, robust across Windows/Linux). In-memory + PostgreSQL user repository with seeded default accounts (`admin/admin123` and `user/user123`). Middleware `requireAuth` for `/api/reports` and `requireAdmin` for `/api/admin/*`.
- **Frontend (`client`):** Persistent auth state in `localStorage` + Axios auth interceptor. Glassmorphism `AuthModal` with Login/Register tabs and 1-click test credentials. `TopUtilityBar` role-aware pills (Admin sees "Quản trị" + User capsule; Guest sees "Đăng nhập" button; User sees Profile capsule). "Báo ngập tại đây" CTA intercepts guests with a friendly login prompt.

**Tech Stack:**
- Backend: Express, Node.js `crypto`, TypeScript, Vitest, Supertest
- Frontend: React 18, Tailwind CSS, Lucide React, Axios

## Global Constraints
- Strictly follow all 40 UI/UX rules in `AGENTS.md` and `GEMINI.md`.
- **GIT RULE:** Never commit or push to `main`/`master`. All commits must strictly stay on branch `dev`.
- All user-facing text, error messages, and alerts must be in natural Vietnamese.
- All interactive touch targets $\ge 44\text{px}$, WCAG AA contrast $\ge 4.5:1$.

---

### Task 1: Backend User Repository & Crypto Token Helpers

**Files:**
- Create: `server/src/db/usersRepo.ts`
- Modify: `server/src/types/index.ts`
- Test: `server/tests/usersRepo.test.ts`

**Interfaces:**
- Consumes: Node `crypto` (`pbkdf2Sync`, `randomBytes`, `createHmac`, `timingSafeEqual`)
- Produces:
  ```ts
  export type UserRole = 'guest' | 'user' | 'admin';
  export interface AuthUser {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
    createdAt: string;
  }
  export function createUser(data: { username: string; password: string; fullName: string; role?: UserRole }): Promise<AuthUser>;
  export function findUserByUsername(username: string): Promise<(AuthUser & { passwordHash: string; salt: string }) | null>;
  export function findUserById(id: string): Promise<AuthUser | null>;
  export function verifyPassword(password: string, hash: string, salt: string): boolean;
  export function generateToken(user: AuthUser): string;
  export function verifyToken(token: string): AuthUser | null;
  ```

- [ ] **Step 1: Write the failing unit tests for user repo and token helpers**
- [ ] **Step 2: Run `npm --workspace=server test tests/usersRepo.test.ts` to confirm failure**
- [ ] **Step 3: Implement `usersRepo.ts` with seed accounts (`admin/admin123` & `user/user123`)**
- [ ] **Step 4: Run tests to confirm pass**
- [ ] **Step 5: Commit on `dev`**

---

### Task 2: Backend Auth Routes & Middleware

**Files:**
- Create: `server/src/services/authMiddleware.ts`
- Create: `server/src/routes/authRouter.ts`
- Modify: `server/src/app.ts`
- Modify: `server/src/routes/reportsRouter.ts`
- Modify: `server/src/routes/adminRouter.ts`
- Test: `server/tests/auth.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/auth/register`: `{ username, password, fullName }` -> `{ token, user }`
  - `POST /api/auth/login`: `{ username, password }` -> `{ token, user }`
  - `GET /api/auth/me`: requires valid Bearer token -> `{ user }`
  - Protected `POST /api/reports`: rejects unauthenticated requests with 401
  - Protected `/api/admin/*`: rejects non-admin with 403

- [ ] **Step 1: Write integration tests in `server/tests/auth.test.ts`**
- [ ] **Step 2: Implement `authMiddleware.ts` (`requireAuth`, `requireAdmin`, `optionalAuth`)**
- [ ] **Step 3: Implement `authRouter.ts` and mount in `app.ts`**
- [ ] **Step 4: Apply `requireAuth` to `reportsRouter.post('/')` and `requireAdmin` to `adminRouter`**
- [ ] **Step 5: Update existing tests in `adminModeration.test.ts` and `api.test.ts` to provide admin/user auth token**
- [ ] **Step 6: Run full backend test suite `npm run test:server` (all 13 files pass)**
- [ ] **Step 7: Commit on `dev`**

---

### Task 3: Frontend API Auth Services & Storage

**Files:**
- Modify: `client/src/types/index.ts`
- Modify: `client/src/services/api.ts`

**Interfaces:**
- Produces:
  - `api.login(username, password): Promise<{ token: string; user: AuthUser }>`
  - `api.register(username, password, fullName): Promise<{ token: string; user: AuthUser }>`
  - `api.getMe(): Promise<AuthUser>`
  - Axios request interceptor attaching `Authorization: Bearer <token>` from `localStorage`

- [ ] **Step 1: Add Auth types to `client/src/types/index.ts`**
- [ ] **Step 2: Implement auth API functions & request interceptor in `client/src/services/api.ts`**
- [ ] **Step 3: Run `npm run build` in `client` to verify 0 errors**
- [ ] **Step 4: Commit on `dev`**

---

### Task 4: Frontend AuthModal Component

**Files:**
- Create: `client/src/components/Auth/AuthModal.tsx`

**Interfaces:**
- Produces:
  ```tsx
  export interface AuthModalProps {
    isOpen: boolean;
    initialTab?: 'login' | 'register';
    onClose: () => void;
    onSuccess: (user: AuthUser, token: string) => void;
    reasonMessage?: string | null;
  }
  ```
- Features:
  - Segmented pill tabs: "Đăng nhập" vs "Đăng ký"
  - Quick 1-click preset login buttons for Admin (`admin/admin123`) and User (`user/user123`)
  - Form validation with Vietnamese error handling
  - Full adherence to 40 UI/UX rules (glassmorphism, `border-sky-100/90`, buttons $\ge 44\text{px}$)

- [ ] **Step 1: Create `client/src/components/Auth/AuthModal.tsx`**
- [ ] **Step 2: Run `npm run build` in `client` to verify compile**
- [ ] **Step 3: Commit on `dev`**

---

### Task 5: TopUtilityBar & App Integration (Guest vs User vs Admin Flow)

**Files:**
- Modify: `client/src/components/Navigation/TopUtilityBar.tsx`
- Modify: `client/src/App.tsx`

**Features:**
- In `TopUtilityBar.tsx`:
  - If Guest: Display "Đăng nhập" CTA button (`LogIn` icon)
  - If Logged In: Display User Avatar Pill (Name, Role badge "Admin" / "Thành viên", and Logout icon)
  - If Admin: Show "Quản trị" button with pending count badge; if User/Guest: Hide "Quản trị" button
- In `App.tsx`:
  - Manage `currentUser` state, auto-verify token on mount via `getMe()`
  - Intercept "Báo ngập tại đây" CTA: If Guest, prompt `AuthModal` with custom reason: *"Vui lòng đăng nhập hoặc tạo tài khoản để báo ngập. Tính năng này giúp bảo vệ bản đồ khỏi tin giả và spam!"*
  - If User or Admin: Allow report pinning immediately
  - Admin retains 100% access to navigation, weather, news, and direct report moderation

- [ ] **Step 1: Update `TopUtilityBar.tsx` with user state & auth actions**
- [ ] **Step 2: Update `App.tsx` with auth state, modal triggers, and role-based gating**
- [ ] **Step 3: Run `npm run build` in `client`**
- [ ] **Step 4: Run `npm run test:server`**
- [ ] **Step 5: Commit on `dev`**
- [ ] **Step 6: Comprehensive verification & final user walkthrough**
