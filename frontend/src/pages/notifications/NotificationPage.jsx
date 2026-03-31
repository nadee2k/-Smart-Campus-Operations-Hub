import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/notificationService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import { formatTimeAgo } from '../../utils/formatTimeAgo';
import {
  CheckCheck,
  CalendarCheck,
  CalendarX2,
  Wrench,
  ArrowRightLeft,
  MessageSquare,
  Bell,
  Trash2,
  CheckCircle,
} from 'lucide-react';

const NOTIF_ICON_MAP = {
  BOOKING_APPROVED: { icon: CalendarCheck, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' },
  BOOKING_REJECTED: { icon: CalendarX2, color: 'text-red-500 bg-red-50 dark:bg-red-900/30' },
  TICKET_ASSIGNED: { icon: Wrench, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' },
  TICKET_STATUS_CHANGED: { icon: ArrowRightLeft, color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/30' },
  NEW_COMMENT: { icon: MessageSquare, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' },
  SLA_BREACH: { icon: Wrench, color: 'text-red-500 bg-red-50 dark:bg-red-900/30' },
};

function getNotifIcon(type) {
  return NOTIF_ICON_MAP[type] || { icon: Bell, color: 'text-gray-500 bg-gray-50 dark:bg-gray-800' };
}

function getDeepLink(n) {
  const refType = n.referenceType?.toUpperCase();
  const refId = n.referenceId;
  if (!refType || !refId) return null;
  if (refType === 'TICKET') return `/tickets/${refId}`;
  if (refType === 'BOOKING') return '/bookings';
  if (refType === 'RESOURCE') return `/resources/${refId}`;
  return null;
}

function groupByDate(notifications) {
  const groups = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  for (const n of notifications) {
    const d = new Date(n.createdAt);
    let label;
    if (d >= today) label = 'Today';
    else if (d >= yesterday) label = 'Yesterday';
    else if (d >= weekAgo) label = 'This Week';
    else label = 'Earlier';

    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }
  return groups;
}

export default function NotificationPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [deleting, setDeleting] = useState({});

  useEffect(() => { fetchNotifications(); }, [page]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationService.getAll({ page, size: 15 });
      setNotifications(res.data.content);
      setTotalPages(res.data.totalPages);
    } catch {} finally { setLoading(false); }
  };

  const markAllRead = async () => {
    await notificationService.markAllAsRead();
    fetchNotifications();
  };

  const markRead = async (id) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    setDeleting((d) => ({ ...d, [id]: true }));
    try {
      await notificationService.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {} finally {
      setDeleting((d) => ({ ...d, [id]: false }));
    }
  };

  const handleClick = (n) => {
    if (!n.isRead) markRead(n.id);
    const link = getDeepLink(n);
    if (link) navigate(link);
  };

  if (loading) return <LoadingSpinner />;

  const grouped = groupByDate(notifications ?? []);
  const isEmpty = !notifications || notifications.length === 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
        <button
          onClick={markAllRead}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/25"
        >
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </button>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">You're all caught up!</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No notifications to show.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([label, items]) => (
            <div key={label}>
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                {label}
              </h3>
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
                {items.map((n) => {
                  const { icon: Icon, color } = getNotifIcon(n.type);
                  const link = getDeepLink(n);
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`flex items-start gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        link ? 'cursor-pointer' : ''
                      } ${!n.isRead ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''}`}
                    >
                      <div className={`shrink-0 mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center ${color}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white leading-snug">{n.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400 dark:text-gray-500" title={new Date(n.createdAt).toLocaleString()}>
                            {formatTimeAgo(n.createdAt)}
                          </span>
                          <span className="text-xs text-gray-300 dark:text-gray-600">&middot;</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">{n.type?.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!n.isRead && (
                          <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        )}
                        <button
                          onClick={(e) => handleDelete(e, n.id)}
                          disabled={deleting[n.id]}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                          title="Delete notification"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
