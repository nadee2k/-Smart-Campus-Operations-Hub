import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { activityService } from '../../services/activityService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import { CalendarDays, Wrench, Building2, User, Activity } from 'lucide-react';

const FILTERS = [
  { value: 'All', label: 'All' },
  { value: 'BOOKING', label: 'Bookings' },
  { value: 'TICKET', label: 'Tickets' },
  { value: 'RESOURCE', label: 'Resources' },
  { value: 'USER', label: 'Users' },
];

const ICON_MAP = {
  BOOKING: { icon: CalendarDays, bg: 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-800' },
  TICKET: { icon: Wrench, bg: 'bg-zinc-600 dark:bg-zinc-400 text-white dark:text-zinc-900' },
  RESOURCE: { icon: Building2, bg: 'bg-zinc-700 dark:bg-zinc-300 text-white dark:text-zinc-900' },
  USER: { icon: User, bg: 'bg-zinc-500 dark:bg-zinc-500 text-white dark:text-zinc-100' },
};

function getIconConfig(actionType) {
  if (!actionType) return ICON_MAP.USER;
  const prefix = actionType.split('_')[0];
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

function matchesFilter(actionType, filter) {
  if (filter === 'All') return true;
  return actionType?.startsWith(filter);
}

export default function ActivityFeedPage() {
  const { isAdmin } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filter, setFilter] = useState('All');

  const fetchActivities = useCallback(() => {
    setLoading(true);
    const params = { page, size: 15 };
    if (filter !== 'All') params.type = filter;
    activityService
      .getAll(params)
      .then((res) => {
        const data = res.data;
        setActivities(data.content ?? data ?? []);
        setTotalPages(data.totalPages ?? 0);
      })
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, [page, filter]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  useEffect(() => { setPage(0); }, [filter]);

  const displayed = activities.filter((a) => matchesFilter(a.actionType ?? a.type, filter));

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">
          <span className="text-zinc-900 dark:text-white">
            Activity Feed
          </span>
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Chronological log of actions across the platform.</p>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-x-auto w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              filter === f.value
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <LoadingSpinner />
      ) : displayed.length === 0 ? (
        <EmptyState title="No activity yet" message="Actions will appear here as they happen." />
      ) : (
        <>
          <div className="relative">
            {/* Timeline connector line */}
            <div className="absolute left-[22px] top-4 bottom-4 w-px bg-gray-200 dark:bg-gray-800 hidden sm:block" />

            <div className="space-y-3">
              {displayed.map((entry, idx) => {
                const actionType = entry.actionType ?? entry.type ?? '';
                const config = getIconConfig(actionType);
                const Icon = config.icon;

                return (
                  <div
                    key={entry.id ?? idx}
                    className="relative flex items-start gap-4 p-4 sm:pl-0 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 sm:border-0 sm:bg-transparent sm:dark:bg-transparent sm:rounded-none hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group"
                  >
                    {/* Icon */}
                    <div className={`relative z-10 h-11 w-11 shrink-0 rounded-xl ${config.bg} flex items-center justify-center text-white shadow-lg`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content card */}
                    <div className="flex-1 min-w-0 sm:bg-white sm:dark:bg-gray-900 sm:border sm:border-gray-200 sm:dark:border-gray-800 sm:rounded-2xl sm:p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white">
                            <span className="font-semibold">{entry.actorName ?? entry.userName ?? 'System'}</span>
                            {' '}
                            <span className="text-gray-600 dark:text-gray-400">{entry.description ?? entry.action ?? actionType.replace(/_/g, ' ').toLowerCase()}</span>
                          </p>
                          {(entry.targetName || entry.targetLink) && (
                            <p className="mt-1 text-sm">
                              {entry.targetLink ? (
                                <Link to={entry.targetLink} className="text-zinc-700 dark:text-zinc-300 hover:underline font-medium">
                                  {entry.targetName ?? 'View'}
                                </Link>
                              ) : (
                                <span className="text-gray-500 dark:text-gray-400">{entry.targetName}</span>
                              )}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap shrink-0">
                          {timeAgo(entry.createdAt ?? entry.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
