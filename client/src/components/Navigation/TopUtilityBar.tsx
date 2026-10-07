import React from 'react';
import { ShieldCheck, Compass, LogIn, LogOut, User } from 'lucide-react';
import { AuthUser } from '../../types';

interface TopUtilityBarProps {
  onOpenAdmin: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  currentUser: AuthUser | null;
  pendingAdminCount: number;
  onFitRoute?: () => void;
  hasRoute: boolean;
}

export const TopUtilityBar: React.FC<TopUtilityBarProps> = ({
  onOpenAdmin,
  onOpenAuth,
  onLogout,
  currentUser,
  pendingAdminCount,
  onFitRoute,
  hasRoute,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const showFitRoute = Boolean(hasRoute && onFitRoute);

  return (
    <div className="absolute top-4 right-4 z-[1000] select-none font-sans">
      {/* Unified Floating Island Capsule - Consistent with Left Panel */}
      <div className="bg-white/92 backdrop-blur-xl border border-sky-100/90 rounded-2xl shadow-xl p-1.5 flex items-center gap-1">
        {/* 1. Fit Route Button (Enabled only when routes exist) */}
        {showFitRoute && (
          <button
            type="button"
            onClick={onFitRoute}
            className="group flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-blue-700 hover:bg-slate-100/70 transition-all duration-200 active:scale-95 cursor-pointer animate-in fade-in min-h-[38px]"
            title="Thu nhỏ để xem toàn cảnh lộ trình"
            aria-label="Xem toàn cảnh lộ trình"
          >
            <div className="w-5 h-5 rounded-lg bg-pastel-mint-100 text-pastel-mint-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Compass className="w-4 h-4" />
            </div>
            <span className="hidden sm:inline">Toàn cảnh tuyến</span>
          </button>
        )}

        {/* Separator between Fit Route and Admin */}
        {showFitRoute && isAdmin && <div className="h-4 w-px bg-slate-200/80" />}

        {/* 2. Admin Moderation Button (Only visible to Admin) */}
        {isAdmin && (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="group flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:text-blue-700 hover:bg-slate-100/70 transition-all duration-200 active:scale-95 cursor-pointer min-h-[38px]"
            title="Mở trung tâm quản trị & kiểm duyệt ngập lụt"
            aria-label="Mở trung tâm quản trị & kiểm duyệt"
          >
            <div className="w-5 h-5 rounded-lg bg-pastel-sky-100 text-pastel-sky-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span>Quản trị</span>
            {pendingAdminCount > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse shadow-xs">
                {pendingAdminCount}
              </span>
            ) : null}
          </button>
        )}

        {/* Separator before Auth section */}
        {(showFitRoute || isAdmin) && <div className="h-4 w-px bg-slate-200/80" />}

        {/* 3. RBAC Auth Section: Guest vs Logged-in User/Admin */}
        {!currentUser ? (
          <button
            type="button"
            onClick={onOpenAuth}
            className="group flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all duration-200 cursor-pointer min-h-[38px] shadow-sm shadow-blue-500/20"
            title="Đăng nhập hoặc đăng ký tài khoản"
            aria-label="Đăng nhập hoặc đăng ký tài khoản"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-xl bg-slate-100/80 border border-slate-200/60 min-h-[38px]">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                  isAdmin
                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}
                title={isAdmin ? 'Tài khoản Quản trị viên' : 'Tài khoản Thành viên'}
              >
                <User className="w-3.5 h-3.5" />
              </div>
              <span
                className="text-sm font-medium text-gray-800 max-w-[110px] truncate hidden sm:inline"
                title={currentUser.fullName || currentUser.username}
              >
                {currentUser.fullName || currentUser.username}
              </span>
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                  isAdmin
                    ? 'bg-amber-500/15 text-amber-800'
                    : 'bg-emerald-500/15 text-emerald-800'
                }`}
              >
                {isAdmin ? 'Admin' : 'Thành viên'}
              </span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 active:scale-90 transition-all cursor-pointer"
              title="Đăng xuất tài khoản"
              aria-label="Đăng xuất tài khoản"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopUtilityBar;
