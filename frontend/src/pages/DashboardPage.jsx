import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { analyticsService } from '../services/analyticsService';
import { bookingService } from '../services/bookingService';
import { ticketService } from '../services/ticketService';
import { notificationService } from '../services/notificationService';
import { activityService } from '../services/activityService';
import StatusBadge from '../components/common/StatusBadge';
import {
  CalendarDays, Wrench, AlertTriangle, CheckCircle2, Clock,
  ArrowRight, Users, Star, Activity, ShieldCheck, BarChart3,
  BookOpen, Bell, CalendarCheck, Loader2, Inbox, Timer,
  CircleDot, ThumbsUp, ThumbsDown, Search, Zap,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getSlaColor(slaDeadline) {
  if (!slaDeadline) return 'text-gray-400 dark:text-gray-500';
  const now = Date.now();
  const deadline = new Date(slaDeadline).getTime();
  const created = deadline - 24 * 60 * 60 * 1000;
  const total = deadline - created;
  const remaining = deadline - now;
  const pct = total > 0 ? remaining / total : 0;
  if (pct <= 0) return 'text-red-500 dark:text-red-400';
  if (pct < 0.25) return 'text-red-500 dark:text-red-400';
  if (pct < 0.5) return 'text-amber-500 dark:text-amber-400';
  return 'text-emerald-500 dark:text-emerald-400';
}

function getSlaBarColor(slaDeadline) {
  if (!slaDeadline) return 'bg-gray-300 dark:bg-gray-600';
  const now = Date.now();
  const deadline = new Date(slaDeadline).getTime();
  const created = deadline - 24 * 60 * 60 * 1000;
  const total = deadline - created;
  const remaining = deadline - now;
  const pct = total > 0 ? remaining / total : 0;
  if (pct <= 0) return 'bg-red-500';
  if (pct < 0.25) return 'bg-red-500';
  if (pct < 0.5) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getSlaPercent(slaDeadline) {
  if (!slaDeadline) return 0;
  const now = Date.now();
  const deadline = new Date(slaDeadline).getTime();
  const created = deadline - 24 * 60 * 60 * 1000;
  const total = deadline - created;
  const remaining = deadline - now;
  return Math.max(0, Math.min(100, (remaining / total) * 100));
}

function getCountdown(dateStr) {
  if (!dateStr) return '';
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'started';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `starts in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `starts in ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `starts in ${days}d`;
}

function formatShortDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const activityIcons = {
  BOOKING_CREATED: CalendarDays,
  BOOKING_APPROVED: CheckCircle2,
  BOOKING_REJECTED: ThumbsDown,
  TICKET_CREATED: AlertTriangle,
  TICKET_RESOLVED: CheckCircle2,
  TICKET_ASSIGNED: Wrench,
  USER_REGISTERED: Users,
  DEFAULT: Activity,
};

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
    </div>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
      <Icon className="h-8 w-8 mb-2 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({ label, value, icon: Icon, iconColor, alert, to }) {
  const inner = (
    <div
      className={`bg-white dark:bg-gray-900 rounded-2xl border ${
        alert ? 'border-red-300 dark:border-red-800' : 'border-gray-200 dark:border-gray-800'
      } p-5 flex items-start justify-between transition-colors ${
        to ? 'hover:border-zinc-400 dark:hover:border-zinc-600 cursor-pointer' : ''
      }`}
    >
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {label}
        </p>
        <p className={`mt-2 text-3xl font-bold ${alert ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
          {value ?? '—'}
        </p>
      </div>
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${iconColor}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

// ---------------------------------------------------------------------------
// Admin Dashboard
// ---------------------------------------------------------------------------

function AdminDashboard({ user }) {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [slaBreaches, setSlaBreaches] = useState(0);
  const [satisfaction, setSatisfaction] = useState(null);
  const [activities, setActivities] = useState([]);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      analyticsService.getDashboard(),
      analyticsService.getSlaBreaches(),
      analyticsService.getSatisfactionSummary(),
      activityService.getAll({ page: 0, size: 10 }),
      bookingService.getAll({ page: 0, size: 5, status: 'PENDING' }),
    ]).then(([dashRes, slaRes, satRes, actRes, bkRes]) => {
      if (!mounted) return;
      if (dashRes.status === 'fulfilled') setDashboard(dashRes.value.data);
      if (slaRes.status === 'fulfilled') {
        const d = slaRes.value.data;
        setSlaBreaches(typeof d === 'number' ? d : d?.count ?? d?.totalElements ?? 0);
      }
      if (satRes.status === 'fulfilled') setSatisfaction(satRes.value.data);
      if (actRes.status === 'fulfilled') setActivities(actRes.value.data?.content ?? actRes.value.data ?? []);
      if (bkRes.status === 'fulfilled') setPendingBookings(bkRes.value.data?.content ?? []);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const handleBookingAction = useCallback(async (id, action) => {
    setProcessing((p) => ({ ...p, [id]: action }));
    try {
      if (action === 'approve') await bookingService.approve(id);
      else await bookingService.reject(id);
      setPendingBookings((prev) => prev.filter((b) => b.id !== id));
    } catch {
      // silently handle
    } finally {
      setProcessing((p) => ({ ...p, [id]: null }));
    }
  }, []);

  if (loading) return <Spinner />;

  const pendingCount = dashboard?.pendingBookings ?? dashboard?.pendingBookingCount ?? 0;
  const openTickets = dashboard?.openTickets ?? dashboard?.openTicketCount ?? 0;
  const breachCount = typeof slaBreaches === 'number' ? slaBreaches : 0;
  const totalUsers = dashboard?.totalUsers ?? dashboard?.userCount ?? 0;
  const avgSat = satisfaction?.average ?? satisfaction?.avgRating ?? 0;

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 sm:p-10 mb-2">
        <img 
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000" 
          alt="Abstract Architecture" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
        <div className="relative z-10 flex flex-col items-start">
          <span className="px-3 py-1 bg-white/10 text-white backdrop-blur-md rounded-full text-xs font-semibold tracking-wider uppercase mb-3 border border-white/20">
            Operations Command
          </span>
          <h1 className="text-3xl sm:text-4xl font-medium text-white tracking-tight drop-shadow-md">
            {getGreeting()}, {user?.name?.split(' ')[0]}.
          </h1>
          <p className="mt-2 text-gray-300 font-light max-w-xl text-lg drop-shadow-sm">
            Here's what's happening across the campus right now.
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Pending Bookings"
          value={pendingCount}
          icon={CalendarDays}
          iconColor="bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
          to="/bookings/admin"
        />
        <StatCard
          label="Open Tickets"
          value={openTickets}
          icon={AlertTriangle}
          iconColor="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
          to="/tickets"
        />
        <StatCard
          label="SLA Breaches"
          value={breachCount}
          icon={ShieldCheck}
          iconColor={breachCount > 0 ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'}
          alert={breachCount > 0}
        />
        <StatCard
          label="Total Users"
          value={totalUsers}
          icon={Users}
          iconColor="bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400"
        />
        <StatCard
          label="Avg Satisfaction"
          value={avgSat ? `${Number(avgSat).toFixed(1)} ★` : '—'}
          icon={Star}
          iconColor="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-500"
        />
      </div>

      {/* Two-column: Activity + Pending Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Recent Activity
            </h2>
            <Link
              to="/admin/activity"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {activities.length === 0 ? (
            <EmptyState icon={Activity} message="No recent activity" />
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {activities.slice(0, 10).map((a, i) => {
                const Icon = activityIcons[a.action] || activityIcons.DEFAULT;
                return (
                  <div key={a.id ?? i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="h-8 w-8 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {a.description ?? a.message ?? a.action?.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {a.userName ?? a.performedBy ?? 'System'} · {formatTimeAgo(a.createdAt ?? a.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Booking Approvals */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Pending Approvals
            </h2>
            <Link
              to="/bookings/admin"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {pendingBookings.length === 0 ? (
            <EmptyState icon={CalendarCheck} message="No pending approvals" />
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {pendingBookings.slice(0, 5).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {b.resource?.name ?? b.resourceName ?? 'Resource'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {b.user?.name ?? b.userName ?? 'User'} · {formatShortDate(b.startTime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      disabled={!!processing[b.id]}
                      onClick={() => handleBookingAction(b.id, 'approve')}
                      className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors disabled:opacity-50"
                      title="Approve"
                    >
                      {processing[b.id] === 'approve' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ThumbsUp className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      disabled={!!processing[b.id]}
                      onClick={() => handleBookingAction(b.id, 'reject')}
                      className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50"
                      title="Reject"
                    >
                      {processing[b.id] === 'reject' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ThumbsDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Nav */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'User Management', desc: 'Manage campus accounts', icon: Users, to: '/admin/users', color: 'bg-black dark:bg-white text-white dark:text-black' },
          { label: 'Analytics', desc: 'View detailed reports', icon: BarChart3, to: '/analytics', color: 'bg-gray-800 dark:bg-gray-200 text-white dark:text-black' },
          { label: 'Activity Feed', desc: 'Full audit trail', icon: Activity, to: '/admin/activity', color: 'bg-gray-600 dark:bg-gray-400 text-white dark:text-black' },
        ].map((nav) => {
          const Icon = nav.icon;
          return (
            <Link
              key={nav.label}
              to={nav.to}
              className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:border-black dark:hover:border-white transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`h-11 w-11 shrink-0 rounded-xl ${nav.color} flex items-center justify-center shadow-sm border border-transparent dark:border-gray-700`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-indigo-400 transition-colors">
                    {nav.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{nav.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Technician Dashboard
// ---------------------------------------------------------------------------

function TechnicianDashboard({ user }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ assigned: 0, resolvedWeek: 0, slaCompliance: 0 });
  const [tickets, setTickets] = useState([]);
  const [resolved, setResolved] = useState([]);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      analyticsService.getTechnicianStats(user?.id),
      analyticsService.getMyStats(),
      ticketService.getAll({ page: 0, size: 50 }),
      ticketService.getAll({ page: 0, size: 50 }),
    ]).then(([techRes, myRes, ticketRes, resolvedRes]) => {
      if (!mounted) return;

      const techData = techRes.status === 'fulfilled' ? techRes.value.data : null;
      const myData = myRes.status === 'fulfilled' ? myRes.value.data : null;
      const merged = { ...myData, ...techData };

      setStats({
        assigned: merged?.assignedOpen ?? merged?.openTickets ?? merged?.assigned ?? 0,
        resolvedWeek: merged?.resolvedThisWeek ?? merged?.resolvedWeek ?? 0,
        slaCompliance: merged?.slaCompliance ?? merged?.slaComplianceRate ?? 0,
      });

      if (ticketRes.status === 'fulfilled') {
        const all = ticketRes.value.data?.content ?? ticketRes.value.data ?? [];
        const open = all.filter(t => t.assignedTechnicianId === user?.id && (t.status === 'OPEN' || t.status === 'IN_PROGRESS'));
        const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        open.sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));
        setTickets(open);
      }
      if (resolvedRes.status === 'fulfilled') {
        const all = resolvedRes.value.data?.content ?? resolvedRes.value.data ?? [];
        setResolved(all.filter(t => t.assignedTechnicianId === user?.id && (t.status === 'RESOLVED' || t.status === 'CLOSED')).slice(0, 5));
      }
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [user?.id]);

  if (loading) return <Spinner />;

  const compliancePct = typeof stats.slaCompliance === 'number' ? stats.slaCompliance : 0;

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 sm:p-10 mb-2">
        <img 
          src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=2000" 
          alt="Workshop tools" 
          className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
        <div className="relative z-10 flex flex-col items-start">
          <span className="px-3 py-1 bg-white/10 text-white backdrop-blur-md rounded-full text-xs font-semibold tracking-wider uppercase mb-3 border border-white/20">
            Work Queue
          </span>
          <h1 className="text-3xl sm:text-4xl font-medium text-white tracking-tight drop-shadow-md">
            {getGreeting()}, {user?.name?.split(' ')[0]}.
          </h1>
          <p className="mt-2 text-gray-300 font-light max-w-xl text-lg drop-shadow-sm">
            Here are your assigned tickets and service tasks.
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="My Assigned (Open)"
          value={stats.assigned}
          icon={Wrench}
          iconColor="bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
        />
        <StatCard
          label="Resolved This Week"
          value={stats.resolvedWeek}
          icon={CheckCircle2}
          iconColor="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
        />
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            SLA Compliance
          </p>
          <div className="flex items-end gap-3 mt-2">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {compliancePct}%
            </p>
            <div className="flex-1 mb-1.5">
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${compliancePct >= 90 ? 'bg-emerald-500' : compliancePct >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(compliancePct, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Queue */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Ticket Queue
          </h2>
          <Link
            to="/tickets"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {tickets.length === 0 ? (
          <EmptyState icon={Inbox} message="No assigned tickets — nice work!" />
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => {
              const slaColor = getSlaColor(t.slaDeadline);
              const barColor = getSlaBarColor(t.slaDeadline);
              const pct = getSlaPercent(t.slaDeadline);
              return (
                <Link
                  key={t.id}
                  to={`/tickets/${t.id}`}
                  className="block p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {t.category ?? 'General'}
                        </span>
                        <StatusBadge status={t.priority} />
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {t.title ?? t.description?.slice(0, 60)}
                      </p>
                      {t.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                          {t.description.slice(0, 100)}
                        </p>
                      )}
                    </div>
                    <div className={`shrink-0 text-right ${slaColor}`}>
                      <Timer className="h-4 w-4 inline-block" />
                      <p className="text-xs font-medium mt-0.5">
                        {t.slaDeadline ? formatTimeAgo(t.slaDeadline).replace(' ago', ' left').replace('just now', 'overdue') : 'No SLA'}
                      </p>
                    </div>
                  </div>
                  {t.slaDeadline && (
                    <div className="mt-3 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recently Resolved */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Recently Resolved
        </h2>
        {resolved.length === 0 ? (
          <EmptyState icon={CheckCircle2} message="No resolved tickets yet" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {resolved.slice(0, 5).map((t) => (
              <Link
                key={t.id}
                to={`/tickets/${t.id}`}
                className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {t.title ?? t.description?.slice(0, 40)}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <StatusBadge status="RESOLVED" />
                  <span className="text-xs text-gray-400">{formatTimeAgo(t.updatedAt ?? t.resolvedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// User Dashboard
// ---------------------------------------------------------------------------

function UserDashboard({ user }) {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    Promise.allSettled([
      bookingService.getMyBookings({ page: 0, size: 5, sort: 'startTime,asc' }),
      ticketService.getAll({ page: 0, size: 20 }),
      notificationService.getUnreadCount(),
    ]).then(([bkRes, tkRes, ntRes]) => {
      if (!mounted) return;
      if (bkRes.status === 'fulfilled') {
        const all = bkRes.value.data?.content ?? bkRes.value.data ?? [];
        const upcoming = all.filter(
          (b) => new Date(b.startTime) >= new Date() && new Date(b.startTime) <= weekFromNow
        );
        setBookings(upcoming.length > 0 ? upcoming : all.slice(0, 5));
      }
      if (tkRes.status === 'fulfilled') {
        const allTk = tkRes.value.data?.content ?? tkRes.value.data ?? [];
        setTickets(allTk.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').slice(0, 5));
      }
      if (ntRes.status === 'fulfilled') setUnreadCount(ntRes.value.data?.count ?? ntRes.value.data ?? 0);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  if (loading) return <Spinner />;

  const quickActions = [
    { label: 'Book a Room', desc: 'Reserve campus spaces', icon: CalendarDays, to: '/bookings/create', color: 'bg-black dark:bg-white text-white dark:text-black' },
    { label: 'Report Issue', desc: 'Submit a maintenance ticket', icon: AlertTriangle, to: '/tickets/create', color: 'bg-gray-800 dark:bg-gray-200 text-white dark:text-black' },
    { label: 'Browse Resources', desc: 'Explore available facilities', icon: Search, to: '/resources', color: 'bg-gray-600 dark:bg-gray-400 text-white dark:text-black' },
  ];

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 sm:p-10 mb-2">
        <img 
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=2000" 
          alt="Modern Library" 
          className="absolute inset-0 w-full h-full object-cover opacity-70 mix-blend-overlay grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
        <div className="relative z-10 flex flex-col items-start">
          <span className="px-3 py-1 bg-white/10 text-white backdrop-blur-md rounded-full text-xs font-semibold tracking-wider uppercase mb-3 border border-white/20">
            Campus Hub
          </span>
          <h1 className="text-3xl sm:text-4xl font-medium text-white tracking-tight drop-shadow-md">
            {getGreeting()}, {user?.name?.split(' ')[0]}.
          </h1>
          <p className="mt-2 text-gray-300 font-light max-w-xl text-lg drop-shadow-sm">
            Ready to explore facilities or report an issue?
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.to}
              className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:border-black dark:hover:border-white transition-all hover:-translate-y-0.5 shadow-sm"
            >
              <div className={`h-12 w-12 rounded-xl ${action.color} flex items-center justify-center border border-transparent dark:border-gray-700 shadow-sm mb-3`}>
                <Icon className="h-6 w-6" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                {action.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{action.desc}</p>
            </Link>
          );
        })}
      </div>

      {/* Two-column: Bookings + Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Bookings */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Upcoming Bookings
            </h2>
            <Link
              to="/bookings"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {bookings.length === 0 ? (
            <EmptyState icon={CalendarDays} message="No upcoming bookings" />
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => {
                const countdown = getCountdown(b.startTime);
                return (
                  <Link
                    key={b.id}
                    to={`/bookings/${b.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
                  >
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <CalendarDays className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {b.resource?.name ?? b.resourceName ?? 'Resource'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatShortDate(b.startTime)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <StatusBadge status={b.status} />
                      {countdown && countdown !== 'started' && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 font-medium">
                          {countdown}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Open Tickets */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              My Open Tickets
            </h2>
            <Link
              to="/tickets"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {tickets.length === 0 ? (
            <EmptyState icon={CheckCircle2} message="No open tickets — all clear!" />
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <Link
                  key={t.id}
                  to={`/tickets/${t.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:border-amber-200 dark:hover:border-amber-800 transition-colors"
                >
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                    <Wrench className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {t.title ?? t.description?.slice(0, 50)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatTimeAgo(t.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notification Summary */}
      <Link
        to="/notifications"
        className="block bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors group"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black flex items-center justify-center text-white shadow-lg">
              <Bell className="h-6 w-6" />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-indigo-400 transition-colors">
              Notifications
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-zinc-600 transition-colors" />
        </div>
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { user, isAdmin, isTechnician } = useAuth();

  if (isAdmin) return <AdminDashboard user={user} />;
  if (isTechnician) return <TechnicianDashboard user={user} />;
  return <UserDashboard user={user} />;
}
