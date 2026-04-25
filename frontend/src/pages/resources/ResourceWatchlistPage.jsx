import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  BellRing,
  Building2,
  MapPin,
  Trash2,
  Users,
} from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import { resourceService } from '../../services/resourceService';
import { useAuth } from '../../context/AuthContext';

export default function ResourceWatchlistPage() {
  const { user, isAdmin, isTechnician } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unwatching, setUnwatching] = useState({});
  const isUser = !!user && !isAdmin && !isTechnician;

  if (!isUser) {
    return <Navigate to="/resources" replace />;
  }

  useEffect(() => {
    resourceService
      .getMyWatchlist()
      .then((res) => setItems(res.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const handleUnwatch = async (resourceId) => {
    try {
      setUnwatching((current) => ({ ...current, [resourceId]: true }));
      await resourceService.unwatch(resourceId);
      setItems((current) => current.filter((item) => item.resourceId !== resourceId));
      toast.success('Resource removed from your watchlist');
    } catch {
      toast.error('Unable to update your watchlist right now');
    } finally {
      setUnwatching((current) => ({ ...current, [resourceId]: false }));
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">
            Resource Alerts
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">My Watchlist</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Track resources you want to book next and remove them anytime.
          </p>
        </div>
        <div className="rounded-2xl bg-amber-100 dark:bg-amber-500/10 p-3">
          <BellRing className="h-5 w-5 text-amber-700 dark:text-amber-300" />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-10 text-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your watchlist is empty</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Open any resource and use the watch button to start tracking it.
          </p>
          <Link
            to="/resources"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-zinc-900 dark:bg-white px-5 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
          >
            Browse resources
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {items.map((item) => (
            <div
              key={item.resourceId}
              className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                    {item.resourceType || 'RESOURCE'}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                    {item.resourceName}
                  </h2>
                </div>
                <StatusBadge status={item.status?.replace(/ /g, '_')} />
              </div>

              <div className="mt-4 grid gap-3 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{item.location || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>{item.capacity ?? 0} capacity • {item.watcherCount} watcher{item.watcherCount === 1 ? '' : 's'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span>Watching since {new Date(item.watchedAt).toLocaleString()}</span>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
                {item.description || 'No description available for this resource.'}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to={`/resources/${item.resourceId}`}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  View resource
                </Link>
                <button
                  onClick={() => handleUnwatch(item.resourceId)}
                  disabled={!!unwatching[item.resourceId]}
                  className="inline-flex items-center gap-2 rounded-full border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  {unwatching[item.resourceId] ? 'Removing...' : 'Unwatch'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
