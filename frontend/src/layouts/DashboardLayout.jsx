import { useState, useRef, useEffect, Fragment } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu as HeadlessMenu, Transition } from '@headlessui/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from '../components/notifications/NotificationBell';
import UniOpsLogo from '../components/common/UniOpsLogo';
import {
  LayoutDashboard, Building2, CalendarDays, Wrench, Bell,
  BarChart3, LogOut, Menu as MenuIcon, X, Sun, Moon, ChevronDown, User,
  Users, Activity, ClipboardList, Calendar, QrCode, Settings, Sparkles, BellRing
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout, isAdmin, isTechnician } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const location = useLocation();

  const isUser = !isAdmin && !isTechnician;

  const mainNavItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { to: '/technician/workspace', label: 'My Workspace', icon: ClipboardList, show: isTechnician },
    { to: '/resources', label: 'Resources', icon: Building2, show: true },
    { to: '/resources/watchlist', label: 'Watchlist', icon: BellRing, show: true },
    { to: '/assistant/resource', label: 'AI Assistant', icon: Sparkles, show: true },
    { to: isAdmin ? '/bookings/admin' : '/bookings', label: 'Bookings', icon: CalendarDays, show: isAdmin || isUser },
    { to: '/bookings/calendar', label: 'Calendar', icon: Calendar, show: isUser },
    { to: '/tickets', label: 'Tickets', icon: Wrench, show: true },
    { to: '/notifications', label: 'Alerts', icon: Bell, show: true },
  ].filter((item) => item.show);

  const adminNavItems = [
    { to: '/bookings/scanner', label: 'Scanner', icon: QrCode, show: isAdmin },
    { to: '/admin/users', label: 'Users', icon: Users, show: isAdmin },
    { to: '/admin/activity', label: 'Activity', icon: Activity, show: isAdmin },
    { to: '/analytics', label: 'Analytics', icon: BarChart3, show: isAdmin },
  ].filter((item) => item.show);
  
  const allNavItems = [...mainNavItems, ...adminNavItems];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/60 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Left: Logo */}
            <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
              <UniOpsLogo className="h-7 w-7" />
              <span className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">UniOps</span>
            </Link>

            {/* Center: Nav links (desktop) */}
            <div className="hidden md:flex items-center gap-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      active
                        ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                );
              })}

              {/* Admin Tools Dropdown */}
              {isAdmin && adminNavItems.length > 0 && (
                <HeadlessMenu as="div" className="relative">
                  <HeadlessMenu.Button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    adminNavItems.some(i => isActive(i.to))
                      ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
                  }`}>
                    <Settings className="h-3.5 w-3.5" />
                    Admin
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </HeadlessMenu.Button>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <HeadlessMenu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl focus:outline-none p-1.5 z-50">
                      {adminNavItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <HeadlessMenu.Item key={item.to}>
                            {({ active }) => (
                              <Link
                                to={item.to}
                                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                                  active || isActive(item.to)
                                    ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                                {item.label}
                              </Link>
                            )}
                          </HeadlessMenu.Item>
                        );
                      })}
                    </HeadlessMenu.Items>
                  </Transition>
                </HeadlessMenu>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={dark ? 'Light mode' : 'Dark mode'}
              >
                {dark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-gray-500" />}
              </button>

              <NotificationBell />

              {/* User menu (desktop) */}
              <div className="relative hidden md:block" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {user?.pictureUrl ? (
                    <img src={user.pictureUrl} alt="" className="h-6 w-6 rounded-full" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black flex items-center justify-center text-white text-xs font-semibold">
                      {user?.name?.charAt(0)}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">{user?.name?.split(' ')[0]}</span>
                  <ChevronDown className="h-3 w-3 text-gray-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-indigo-50 text-zinc-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                        {user?.role}
                      </span>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <MenuIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile overlay nav */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-72 bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200 dark:border-gray-800">
              <span className="font-bold text-gray-900 dark:text-white">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 px-3">
              {/* User info */}
              <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                {user?.pictureUrl ? (
                  <img src={user.pictureUrl} alt="" className="h-9 w-9 rounded-full" />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black flex items-center justify-center text-white text-sm font-semibold">
                    {user?.name?.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</p>
                </div>
              </div>

              <div className="space-y-0.5">
                {mainNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              {isAdmin && adminNavItems.length > 0 && (
                <div className="mt-4">
                  <p className="px-3 text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Admin Tools</p>
                  <div className="space-y-0.5">
                    {adminNavItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.to);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                            active
                              ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                          }`}
                        >
                          <Icon className="h-4.5 w-4.5" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 p-3">
              <button
                onClick={logout}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
