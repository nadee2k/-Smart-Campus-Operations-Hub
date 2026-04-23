import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { resourceService } from '../../services/resourceService';
import { ticketService } from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import { getResourceHealthScore } from '../../utils/resourceHealth';
import {
  Building2,
  MapPin,
  Users,
  Clock,
  Calendar,
  ShieldCheck,
  Image,
  Link2,
  Pencil,
  Trash2,
  ArrowLeft,
  Wrench,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
} from 'lucide-react';

function formatTime(val) {
  if (!val) return '-';
  let h;
  let m;
  if (typeof val === 'string') {
    const parts = val.split(':');
    h = parseInt(parts[0], 10);
    m = parts[1] || '00';
  } else if (typeof val === 'object' && val.hour != null) {
    h = val.hour;
    m = String(val.minute ?? 0).padStart(2, '0');
  } else {
    return '-';
  }
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString();
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getMaintenanceTone(score = 100) {
  if (score >= 80) return 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10';
  if (score >= 50) return 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10';
  return 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-500/10';
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
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportDownloading, setReportDownloading] = useState(false);

  useEffect(() => {
    setLoading(true);
    resourceService
      .getById(id)
      .then((res) => setResource(res.data))
      .catch(() => setResource(null))
      .finally(() => setLoading(false));

    ticketService
      .getResourceHistory(id, { page: 0, size: 5 })
      .then((res) => setWorkHistory(res.data.content ?? []))
      .catch(() => {});

    setReportLoading(true);
    resourceService
      .getWeeklyReport(id)
      .then((res) => setWeeklyReport(res.data))
      .catch(() => setWeeklyReport(null))
      .finally(() => setReportLoading(false));
  }, [id]);

  const handleDelete = () => {
    resourceService
      .delete(id)
      .then(() => {
        navigate('/resources');
      })
      .catch(() => {});
  };

  const handleDownloadWeeklyReport = async () => {
    try {
      setReportDownloading(true);
      const res = await resourceService.downloadWeeklyReport(id);
      const filename =
        res.headers['content-disposition']?.match(/filename="(.+)"/)?.[1] ||
        `resource-${id}-weekly-report.pdf`;
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error('Unable to download weekly report right now');
    } finally {
      setReportDownloading(false);
    }
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
      ? `${formatTime(availabilityStart)} - ${formatTime(availabilityEnd)}`
      : '-';
  const amenities = resource.amenities || [];
  const photoUrls = resource.photoUrls || [];
  const maintenanceScore = getResourceHealthScore(resource);

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
          <Link
            to={`/bookings/calendar?resourceId=${resource.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Calendar className="h-4 w-4" />
            View availability
          </Link>
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
                {resource.type?.replace(/_/g, ' ') || '-'}
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
              <p className="font-medium text-gray-900 dark:text-white">{resource.location || '-'}</p>
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
              <ShieldCheck className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Health Indicator</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getMaintenanceTone(maintenanceScore)}`}>
                {maintenanceScore}/100
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0">
              <Building2 className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Owner / Department</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {resource.ownerName || '-'} {resource.department ? `• ${resource.department}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0">
              <Clock className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatDateTime(resource.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0">
              <Clock className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Updated</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatDateTime(resource.updatedAt)}</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Amenities / Tags</p>
          {amenities.length ? (
            <div className="flex flex-wrap gap-2">
              {amenities.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No amenities set</p>
          )}
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Media Gallery</p>
          {photoUrls.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photoUrls.map((url, index) => (
                <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="group block">
                  <img
                    src={url}
                    alt={`Resource media ${index + 1}`}
                    className="h-28 w-full object-cover rounded-xl border border-gray-200 dark:border-gray-800 group-hover:opacity-90 transition"
                  />
                </a>
              ))}
            </div>
          )}
          {photoUrls.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No photos available</p>
          )}
          <div className="flex flex-wrap gap-3">
            {resource.layoutMapUrl && (
              <a
                href={resource.layoutMapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Image className="h-4 w-4" />
                Open Layout Map
              </a>
            )}
            {resource.view360Url && (
              <a
                href={resource.view360Url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Link2 className="h-4 w-4" />
                Open 360 View
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/10">
              <FileText className="h-5 w-5 text-blue-700 dark:text-blue-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Weekly Resource Report Card</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Auto-generated summary for {weeklyReport ? `${formatDate(weeklyReport.weekStart)} to ${formatDate(weeklyReport.weekEnd)}` : 'this week'}
              </p>
            </div>
          </div>
          <button
            onClick={handleDownloadWeeklyReport}
            disabled={reportDownloading || !weeklyReport}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="h-4 w-4" />
            {reportDownloading ? 'Preparing PDF...' : 'Download PDF'}
          </button>
        </div>

        {reportLoading ? (
          <div className="mt-6">
            <LoadingSpinner />
          </div>
        ) : weeklyReport ? (
          <>
            <p className="mt-5 text-sm leading-6 text-gray-600 dark:text-gray-300">
              {weeklyReport.operationalSummary}
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                { label: 'Bookings', value: weeklyReport.totalBookings, subtext: `${weeklyReport.approvedBookings} approved` },
                { label: 'Reserved Hours', value: weeklyReport.totalReservedHours, subtext: `${weeklyReport.averageAttendees} avg attendees` },
                { label: 'Check-ins', value: `${weeklyReport.checkInRate}%`, subtext: `${weeklyReport.checkedInBookings} completed` },
                { label: 'Tickets', value: weeklyReport.ticketsOpened, subtext: `${weeklyReport.ticketsResolved} resolved this week` },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-950/40 p-4"
                >
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{item.value}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.subtext}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Peak day</p>
                <p className="mt-2 font-semibold text-gray-900 dark:text-white">{weeklyReport.busiestDay}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Peak time</p>
                <p className="mt-2 font-semibold text-gray-900 dark:text-white">{weeklyReport.busiestTimeRange}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Utilization band</p>
                <p className="mt-2 font-semibold text-gray-900 dark:text-white">{weeklyReport.utilizationBand}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {weeklyReport.openTickets} active maintenance ticket{weeklyReport.openTickets !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            Weekly report data is unavailable right now.
          </p>
        )}
      </div>

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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {workHistory.length} past issue{workHistory.length !== 1 ? 's' : ''} for this resource
              </p>
            </div>
          </div>
          {historyOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
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
                      #{t.id} - {t.category?.replace(/_/g, ' ')}
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
