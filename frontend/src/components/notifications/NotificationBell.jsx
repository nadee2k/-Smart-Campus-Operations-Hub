import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { useNavigate } from 'react-router-dom';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { if (open) fetchRecent(); }, [open]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchCount = async () => {
    try { const res = await notificationService.getUnreadCount(); setCount(res.data.count); } catch {}
  };

  const fetchRecent = async () => {
    try { const res = await notificationService.getAll({ page: 0, size: 8 }); setNotifications(res.data.content); } catch {}
  };

  const markRead = async (id) => {
    await notificationService.markAsRead(id);
    setCount((c) => Math.max(0, c - 1));
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
        <Bell className="h-4.5 w-4.5 text-gray-500 dark:text-gray-400" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4.5 min-w-4.5 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</h3>
            {count > 0 && (
              <button
                onClick={async () => { await notificationService.markAllAsRead(); setCount(0); fetchRecent(); }}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">No notifications</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { if (!n.isRead) markRead(n.id); setOpen(false); navigate('/notifications'); }}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${!n.isRead ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {!n.isRead && <span className="mt-1.5 h-2 w-2 rounded-full bg-indigo-500 shrink-0" />}
                    <div className={!n.isRead ? '' : 'ml-5'}>
                      <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{n.message}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <button
            onClick={() => { setOpen(false); navigate('/notifications'); }}
            className="w-full text-center text-xs font-medium text-indigo-600 dark:text-indigo-400 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-t border-gray-100 dark:border-gray-800 transition-colors"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
