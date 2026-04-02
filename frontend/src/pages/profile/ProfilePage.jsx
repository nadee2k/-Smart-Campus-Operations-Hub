import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { userService } from '../../services/userService';
import { analyticsService } from '../../services/analyticsService';
import { activityService } from '../../services/activityService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  CalendarDays,
  Mail,
  User,
  Star,
  CalendarCheck,
  Edit3,
  Save,
  X,
  Wrench,
  Building2,
} from 'lucide-react';

const ICON_MAP = {
  BOOKING: { icon: CalendarDays, bg: 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-800' },
  TICKET: { icon: Wrench, bg: 'bg-zinc-600 dark:bg-zinc-400 text-white dark:text-zinc-900' },
  RESOURCE: { icon: Building2, bg: 'bg-zinc-700 dark:bg-zinc-300 text-white dark:text-zinc-900' },
  USER: { icon: User, bg: 'bg-zinc-500 dark:bg-zinc-500 text-white dark:text-zinc-100' },
};

function getIconConfig(actionType) {
  if (!actionType) return ICON_MAP.USER;
  const prefix = (actionType ?? '').split('_')[0];
  return ICON_MAP[prefix] ?? ICON_MAP.USER;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMemberSince(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function getActivityLink(entry) {
  const targetType = (entry.targetType ?? entry.entityType ?? '').toUpperCase();
  const targetId = entry.targetId ?? entry.entityId;
  if (!targetType || !targetId) return null;
  if (targetType === 'TICKET') return `/tickets/${targetId}`;
  if (targetType === 'BOOKING') return '/bookings';
  if (targetType === 'RESOURCE') return `/resources/${targetId}`;
  return null;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const [profileRes, statsRes, activityRes] = await Promise.allSettled([
          userService.getMyProfile(),
          analyticsService.getMyStats(),
          activityService.getMyActivity({ page: 0, size: 10 }),
        ]);

        if (!mounted) return;

        if (profileRes.status === 'fulfilled') {
          const data = profileRes.value.data;
          setProfile(data);
          setEditedName(data?.name ?? '');
        }

        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value.data);
        }

        if (activityRes.status === 'fulfilled') {
          const data = activityRes.value.data;
          const list = data?.content ?? data ?? [];
          setActivities(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        toast.error('Failed to load profile');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, []);

  const handleStartEdit = () => {
    setEditedName(profile?.name ?? '');
    setEditingName(true);
  };

  const handleCancelEdit = () => {
    setEditedName(profile?.name ?? '');
    setEditingName(false);
  };

  const handleSaveName = async () => {
    const trimmed = editedName?.trim();
    if (!trimmed || trimmed === profile?.name) {
      setEditingName(false);
      return;
    }

    setSaving(true);
    try {
      await userService.updateProfile({ name: trimmed });
      setProfile((p) => ({ ...p, name: trimmed }));
      setEditingName(false);
      toast.success('Name updated');
    } catch {
      toast.error('Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500 dark:text-gray-400">Unable to load profile.</p>
      </div>
    );
  }

  const displayName = profile?.name ?? 'User';
  const initial = (displayName || 'U').charAt(0).toUpperCase();
  const role = profile?.role ?? 'USER';
  const totalBookings = stats?.totalBookings ?? profile?.totalBookings ?? 0;
  const approvedBookings = stats?.approvedBookings ?? 0;
  const totalTickets = stats?.totalTickets ?? profile?.totalTickets ?? 0;
  const avgSatisfaction = stats?.avgSatisfaction ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 sm:p-10 mb-2">
        <img 
          src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=2000" 
          alt="Profile" 
          className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-medium text-white tracking-tight drop-shadow-md">
            My Profile
          </h1>
          <p className="mt-2 text-gray-300 font-light text-lg drop-shadow-sm">Manage your campus operations hub account.</p>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="shrink-0">
            {profile?.pictureUrl ? (
              <img
                src={profile.pictureUrl}
                alt={displayName}
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl object-cover border-2 border-gray-200 dark:border-gray-700"
              />
            ) : (
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-zinc-800 dark:bg-zinc-200 flex items-center justify-center text-white dark:text-zinc-800 text-3xl sm:text-4xl font-bold shadow-lg">
                {initial}
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0 w-full">
            {/* Name - editable */}
            <div className="mb-2">
              {editingName ? (
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-zinc-400 focus:border-transparent max-w-xs"
                    placeholder="Your name"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm border border-transparent text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{displayName}</h2>
                  <button
                    onClick={handleStartEdit}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-zinc-700 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                    title="Edit name"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Email - read-only */}
            <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-500 dark:text-gray-400 mb-2">
              <Mail className="h-4 w-4 shrink-0" />
              <span>{profile?.email ?? '—'}</span>
            </div>

            {/* Role badge */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300">
                {role}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Member since {formatMemberSince(profile?.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Bookings', value: totalBookings, thisMonth: stats?.bookingsThisMonth, icon: CalendarDays, iconBg: 'bg-zinc-100 dark:bg-zinc-800/60', iconColor: 'text-zinc-700 dark:text-zinc-300' },
          { label: 'Approved', value: approvedBookings, icon: CalendarCheck, iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconColor: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Total Tickets', value: totalTickets, thisMonth: stats?.ticketsThisMonth, icon: Wrench, iconBg: 'bg-amber-100 dark:bg-amber-900/40', iconColor: 'text-amber-600 dark:text-amber-400' },
          { label: 'Avg Satisfaction', value: avgSatisfaction ? `${Number(avgSatisfaction).toFixed(1)} ★` : '—', icon: Star, iconBg: 'bg-yellow-100 dark:bg-yellow-900/40', iconColor: 'text-yellow-600 dark:text-yellow-500' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{card.value ?? '—'}</p>
                  {card.thisMonth != null && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 font-medium">
                      +{card.thisMonth} this month
                    </p>
                  )}
                </div>
                <div className={`h-10 w-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* My Recent Activity */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          My Recent Activity
        </h2>

        {activities.length === 0 ? (
          <EmptyState title="No activity yet" message="Your actions will appear here." />
        ) : (
          <div className="relative">
            <div className="absolute left-[22px] top-4 bottom-4 w-px bg-gray-200 dark:bg-gray-800" />

            <div className="space-y-3">
              {activities.map((entry, idx) => {
                const actionType = entry.actionType ?? entry.type ?? '';
                const config = getIconConfig(actionType);
                const Icon = config.icon;
                const description = entry.description ?? entry.action ?? actionType.replace(/_/g, ' ').toLowerCase();

                const link = getActivityLink(entry);
                return (
                  <div
                    key={entry.id ?? idx}
                    onClick={() => link && navigate(link)}
                    className={`relative flex items-start gap-4 pl-0 ${link ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl p-2 -m-2 transition-colors' : ''}`}
                  >
                    <div
                      className={`relative z-10 h-11 w-11 shrink-0 rounded-xl ${config.bg} flex items-center justify-center shadow-sm`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {description}
                      </p>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {timeAgo(entry.createdAt ?? entry.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
