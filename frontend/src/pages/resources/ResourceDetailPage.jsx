import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { resourceService } from '../../services/resourceService';
import { ticketService } from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import {
  Building2,
  MapPin,
  Users,
  Clock,
  Calendar,
  Pencil,
  Trash2,
  ArrowLeft,
  Wrench,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

function formatTime(val) {
  if (!val) return '—';
  let h, m;
  if (typeof val === 'string') {
    const parts = val.split(':');
    h = parseInt(parts[0], 10);
    m = parts[1] || '00';
  } else if (typeof val === 'object' && val.hour != null) {
    h = val.hour;
    m = String(val.minute ?? 0).padStart(2, '0');
  } else {
    return '—';
  }
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString();
}

export default function ResourceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isTechnician } = useAuth();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [workHistory, setWorkHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    resourceService
      .getById(id)
      .then((res) => setResource(res.data))
      .catch(() => setResource(null))
      .finally(() => setLoading(false));

    ticketService.getResourceHistory(id, { page: 0, size: 5 })
      .then((res) => setWorkHistory(res.data.content ?? []))
      .catch(() => {});
  }, [id]);

  const handleDelete = () => {
    resourceService
      .delete(id)
      .then(() => {
        navigate('/resources');
      })
      .catch(() => {});
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (!resource) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Resource not found</p>
        <Link
          to="/resources"
          className="inline-flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Resources
        </Link>
      </div>
    );
  }

  const availabilityStart = resource.availabilityStartTime;
  const availabilityEnd = resource.availabilityEndTime;
  const availabilityStr =
    availabilityStart && availabilityEnd
      ? `${formatTime(typeof availabilityStart === 'string' ? availabilityStart : availabilityStart)} – ${formatTime(typeof availabilityEnd === 'string' ? availabilityEnd : availabilityEnd)}`
      : '—';

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <Link
          to="/resources"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Resources
        </Link>
        <div className="flex flex-wrap gap-2">
          {!isTechnician && (
            <Link
              to={`/bookings/create?resourceId=${resource.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm border border-transparent rounded-full text-sm font-medium transition-all shadow-sm"
            >
              <Calendar className="h-4 w-4" />
              Book this resource
            </Link>
          )}
          {isAdmin && (
            <>
              <Link
                to={`/resources/${resource.id}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 dark:border-red-800 rounded-full text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{resource.name}</h1>
          <StatusBadge status={resource.status} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <Building2 className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {resource.type?.replace(/_/g, ' ') || '—'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <Users className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Capacity</p>
              <p className="font-medium text-gray-900 dark:text-white">{resource.capacity ?? 0}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 sm:col-span-2">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0">
              <MapPin className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {resource.location || '—'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 sm:col-span-2">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0">
              <Clock className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Availability</p>
              <p className="font-medium text-gray-900 dark:text-white">{availabilityStr}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0">
              <Clock className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatDateTime(resource.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0">
              <Clock className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Updated</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatDateTime(resource.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Work History */}
      <div className="mt-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/10">
              <Wrench className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Maintenance History</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{workHistory.length} past issue{workHistory.length !== 1 ? 's' : ''} for this resource</p>
            </div>
          </div>
          {historyOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>

        {historyOpen && (
          <div className="border-t border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
            {workHistory.length === 0 ? (
              <p className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">No maintenance history found.</p>
            ) : (
              workHistory.map((t) => (
                <Link
                  key={t.id}
                  to={`/tickets/${t.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      #{t.id} — {t.category?.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t.description}</p>
                  </div>
                  <div className="ml-4 shrink-0">
                    <StatusBadge status={t.status} />
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Resource"
        message={`Are you sure you want to delete "${resource.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
