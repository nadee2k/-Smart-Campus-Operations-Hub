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
  Share2,
  Pencil,
  Trash2,
  ArrowLeft,
  Wrench,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  Bell,
  BellRing,
  Power,
  Sparkles,
  Ban,
  Plus,
  MessageSquare,
  Star,
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

function StarRating({ value, onChange, readonly = false, size = 'md' }) {
  const starSize = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6';

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(star)}
          className="disabled:cursor-default transition-transform hover:scale-105"
        >
          <Star
            className={`${starSize} ${
              star <= value
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ResourceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isTechnician } = useAuth();
  const isUser = !!user && !isAdmin && !isTechnician;
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [workHistory, setWorkHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportDownloading, setReportDownloading] = useState(false);
  const [watchStatus, setWatchStatus] = useState(null);
  const [watchLoading, setWatchLoading] = useState(true);
  const [watchSaving, setWatchSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [blackouts, setBlackouts] = useState([]);
  const [blackoutsLoading, setBlackoutsLoading] = useState(true);
  const [blackoutSaving, setBlackoutSaving] = useState(false);
  const [removingBlackoutId, setRemovingBlackoutId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [removingReviewId, setRemovingReviewId] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    comment: '',
  });
  const [blackoutForm, setBlackoutForm] = useState({
    title: '',
    reason: '',
    startTime: '',
    endTime: '',
  });
  const canViewWeeklyReport = isAdmin || isTechnician;

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

    if (canViewWeeklyReport) {
      setReportLoading(true);
      resourceService
        .getWeeklyReport(id)
        .then((res) => setWeeklyReport(res.data))
        .catch(() => setWeeklyReport(null))
        .finally(() => setReportLoading(false));
    } else {
      setWeeklyReport(null);
      setReportLoading(false);
    }

    if (isUser) {
      setWatchLoading(true);
      resourceService
        .getWatchStatus(id)
        .then((res) => setWatchStatus(res.data))
        .catch(() => setWatchStatus(null))
        .finally(() => setWatchLoading(false));
    } else {
      setWatchStatus(null);
      setWatchLoading(false);
    }

    setBlackoutsLoading(true);
    resourceService
      .getBlackouts(id)
      .then((res) => setBlackouts(res.data ?? []))
      .catch(() => setBlackouts([]))
      .finally(() => setBlackoutsLoading(false));

    setReviewsLoading(true);
    resourceService
      .getReviews(id)
      .then((res) => setReviews(res.data ?? []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  }, [id, canViewWeeklyReport, isUser]);

  useEffect(() => {
    if (!user) {
      setReviewForm({ rating: 0, comment: '' });
      return;
    }
    const existingReview = reviews.find((review) => review.userId === user.id);
    setReviewForm({
      rating: existingReview?.rating ?? 0,
      comment: existingReview?.comment ?? '',
    });
  }, [reviews, user]);

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

  const handleToggleWatch = async () => {
    try {
      setWatchSaving(true);
      if (watchStatus?.watching) {
        await resourceService.unwatch(id);
        setWatchStatus((current) => current ? {
          ...current,
          watching: false,
          watcherCount: Math.max(0, (current.watcherCount ?? 1) - 1),
        } : current);
        toast.success('Resource removed from your watchlist');
      } else {
        const res = await resourceService.watch(id);
        setWatchStatus(res.data);
        toast.success('You will be notified when this resource opens up');
      }
    } catch {
      toast.error('Unable to update watchlist right now');
    } finally {
      setWatchSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      setStatusSaving(true);
      const res = await resourceService.toggleStatus(id);
      setResource(res.data);
      toast.success(
        res.data.status === 'ACTIVE'
          ? 'Resource marked active'
          : 'Resource marked out of service'
      );
    } catch {
      toast.error('Unable to update resource status right now');
    } finally {
      setStatusSaving(false);
    }
  };

  const handleShareBookingLink = async () => {
    const shareUrl = `${window.location.origin}/bookings/create?resourceId=${resource.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Book ${resource.name}`,
          text: `Use this link to book ${resource.name}.`,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      toast.success('Booking link copied to clipboard');
    } catch {
      toast.error('Unable to share the booking link right now');
    }
  };

  const handleBlackoutInputChange = (key, value) => {
    setBlackoutForm((current) => ({ ...current, [key]: value }));
  };

  const handleCreateBlackout = async (event) => {
    event.preventDefault();
    try {
      setBlackoutSaving(true);
      const payload = {
        title: blackoutForm.title.trim(),
        reason: blackoutForm.reason.trim() || null,
        startTime: blackoutForm.startTime ? `${blackoutForm.startTime}:00` : null,
        endTime: blackoutForm.endTime ? `${blackoutForm.endTime}:00` : null,
      };
      const res = await resourceService.createBlackout(id, payload);
      setBlackouts((current) => {
        const next = [...current, res.data];
        next.sort((left, right) => new Date(left.startTime) - new Date(right.startTime));
        return next;
      });
      setBlackoutForm({
        title: '',
        reason: '',
        startTime: '',
        endTime: '',
      });
      toast.success('Blackout period added');
    } catch {
      // Toast handled by API interceptor.
    } finally {
      setBlackoutSaving(false);
    }
  };

  const handleDeleteBlackout = async (blackoutId) => {
    try {
      setRemovingBlackoutId(blackoutId);
      await resourceService.deleteBlackout(id, blackoutId);
      setBlackouts((current) => current.filter((blackout) => blackout.id !== blackoutId));
      toast.success('Blackout period removed');
    } catch {
      // Toast handled by API interceptor.
    } finally {
      setRemovingBlackoutId(null);
    }
  };

  const handleSaveReview = async (event) => {
    event.preventDefault();
    if (!reviewForm.rating) {
      toast.error('Choose a rating before submitting your review');
      return;
    }

    try {
      setReviewSaving(true);
      const res = await resourceService.saveReview(id, {
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim() || null,
      });
      setReviews((current) => {
        const next = current.filter((review) => review.userId !== res.data.userId);
        next.unshift(res.data);
        return next.sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt));
      });
      setResource((current) => {
        if (!current) return current;
        const isUpdate = reviews.some((review) => review.userId === res.data.userId);
        const nextCount = isUpdate ? (current.reviewCount ?? 0) : (current.reviewCount ?? 0) + 1;
        const currentTotal = (current.averageRating ?? 0) * (current.reviewCount ?? 0);
        const previousRating = reviews.find((review) => review.userId === res.data.userId)?.rating ?? 0;
        const adjustedTotal = isUpdate
          ? currentTotal - previousRating + res.data.rating
          : currentTotal + res.data.rating;

        return {
          ...current,
          reviewCount: nextCount,
          averageRating: nextCount > 0 ? Number((adjustedTotal / nextCount).toFixed(1)) : null,
        };
      });
      toast.success(reviews.some((review) => review.userId === res.data.userId) ? 'Review updated' : 'Review added');
    } catch {
      // Toast handled by API interceptor.
    } finally {
      setReviewSaving(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    const reviewToRemove = reviews.find((review) => review.id === reviewId);
    if (!reviewToRemove) return;

    try {
      setRemovingReviewId(reviewId);
      await resourceService.deleteReview(id, reviewId);
      setReviews((current) => current.filter((review) => review.id !== reviewId));
      setResource((current) => {
        if (!current) return current;
        const nextCount = Math.max(0, (current.reviewCount ?? 0) - 1);
        const currentTotal = (current.averageRating ?? 0) * (current.reviewCount ?? 0);
        const adjustedTotal = currentTotal - reviewToRemove.rating;

        return {
          ...current,
          reviewCount: nextCount,
          averageRating: nextCount > 0 ? Number((adjustedTotal / nextCount).toFixed(1)) : null,
        };
      });
      toast.success('Review removed');
    } catch {
      // Toast handled by API interceptor.
    } finally {
      setRemovingReviewId(null);
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
  const userReview = user ? reviews.find((review) => review.userId === user.id) : null;
  const averageRatingLabel = resource.averageRating ? resource.averageRating.toFixed(1) : 'No ratings yet';

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
          {isUser && (
            <button
              onClick={handleToggleWatch}
              disabled={watchLoading || watchSaving}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                watchStatus?.watching
                  ? 'border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                  : 'border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {watchStatus?.watching ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              {watchSaving ? 'Saving...' : watchStatus?.watching ? 'Watching resource' : 'Watch resource'}
            </button>
          )}
          <Link
            to={`/bookings/calendar?resourceId=${resource.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Calendar className="h-4 w-4" />
            View availability
          </Link>
          <Link
            to={`/assistant/resource?resourceId=${resource.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-amber-200 dark:border-amber-700 rounded-full text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Ask AI
          </Link>
          {!isTechnician && (
            <button
              onClick={handleShareBookingLink}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              Share booking link
            </button>
          )}
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
              <button
                onClick={handleToggleStatus}
                disabled={statusSaving}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  resource.status === 'ACTIVE'
                    ? 'border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                    : 'border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                }`}
              >
                <Power className="h-4 w-4" />
                {statusSaving
                  ? 'Updating...'
                  : resource.status === 'ACTIVE'
                    ? 'Mark Out of Service'
                    : 'Mark Active'}
              </button>
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{resource.name}</h1>
            {isUser && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {watchLoading
                  ? 'Loading watchlist status...'
                  : `${watchStatus?.watcherCount ?? 0} user${watchStatus?.watcherCount === 1 ? '' : 's'} watching for the next open slot`}
              </p>
            )}
          </div>
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
              <FileText className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Description</p>
              <p className="font-medium text-gray-900 dark:text-white whitespace-pre-wrap">
                {resource.description || '-'}
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
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/10">
              <MessageSquare className="h-5 w-5 text-amber-700 dark:text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ratings & Reviews</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Quick feedback from people who have used this resource.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-950/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{averageRatingLabel}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {resource.reviewCount ?? 0} review{resource.reviewCount === 1 ? '' : 's'}
                </p>
              </div>
              <StarRating value={Math.round(resource.averageRating ?? 0)} readonly size="sm" />
            </div>
          </div>
        </div>

        {!isTechnician && user && (
          <form onSubmit={handleSaveReview} className="mt-5 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {userReview ? 'Update your review' : 'Leave a review'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Share a quick rating and any notes that would help other users.
                </p>
              </div>
              <StarRating
                value={reviewForm.rating}
                onChange={(rating) => setReviewForm((current) => ({ ...current, rating }))}
                readonly={reviewSaving}
              />
            </div>

            <textarea
              rows={4}
              value={reviewForm.comment}
              onChange={(event) => setReviewForm((current) => ({ ...current, comment: event.target.value }))}
              placeholder="What worked well? Anything others should know?"
              className="mt-4 w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={reviewSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Star className="h-4 w-4" />
                {reviewSaving ? 'Saving review...' : userReview ? 'Update review' : 'Submit review'}
              </button>
              {userReview && (
                <button
                  type="button"
                  onClick={() => handleDeleteReview(userReview.id)}
                  disabled={removingReviewId === userReview.id}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-red-200 dark:border-red-800 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  {removingReviewId === userReview.id ? 'Removing...' : 'Delete my review'}
                </button>
              )}
            </div>
          </form>
        )}

        <div className="mt-5 space-y-3">
          {reviewsLoading ? (
            <LoadingSpinner />
          ) : reviews.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No reviews yet. Be the first to rate this resource.
            </p>
          ) : (
            reviews.map((review) => {
              const canDeleteReview = isAdmin || user?.id === review.userId;
              return (
                <div
                  key={review.id}
                  className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-950/40 p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-semibold text-gray-900 dark:text-white">{review.userName}</p>
                        <StarRating value={review.rating} readonly size="sm" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(review.updatedAt || review.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                        {review.comment || 'Rated this resource without additional comments.'}
                      </p>
                    </div>
                    {canDeleteReview && (
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        disabled={removingReviewId === review.id}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full border border-red-200 dark:border-red-800 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        {removingReviewId === review.id ? 'Removing...' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-500/10">
            <Ban className="h-5 w-5 text-rose-700 dark:text-rose-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Resource Blackout Dates</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Block out maintenance windows, holidays, and special events so the resource cannot be booked during those periods.
            </p>
          </div>
        </div>

        {isAdmin && (
          <form onSubmit={handleCreateBlackout} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Blackout title
              </label>
              <input
                type="text"
                value={blackoutForm.title}
                onChange={(e) => handleBlackoutInputChange('title', e.target.value)}
                placeholder="Maintenance, public holiday, exam event..."
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start time
              </label>
              <input
                type="datetime-local"
                value={blackoutForm.startTime}
                onChange={(e) => handleBlackoutInputChange('startTime', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End time
              </label>
              <input
                type="datetime-local"
                value={blackoutForm.endTime}
                onChange={(e) => handleBlackoutInputChange('endTime', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                rows={3}
                value={blackoutForm.reason}
                onChange={(e) => handleBlackoutInputChange('reason', e.target.value)}
                placeholder="Optional note for admins and users."
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={blackoutSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="h-4 w-4" />
                {blackoutSaving ? 'Saving blackout...' : 'Add blackout period'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-5 space-y-3">
          {blackoutsLoading ? (
            <LoadingSpinner />
          ) : blackouts.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No blackout periods have been scheduled for this resource.
            </p>
          ) : (
            blackouts.map((blackout) => {
              const isPast = new Date(blackout.endTime) < new Date();
              return (
                <div
                  key={blackout.id}
                  className={`rounded-2xl border p-4 ${
                    isPast
                      ? 'border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-950/40'
                      : 'border-rose-200 dark:border-rose-900/70 bg-rose-50/70 dark:bg-rose-950/20'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 dark:text-white">{blackout.title}</p>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            isPast
                              ? 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                          }`}
                        >
                          {isPast ? 'Past blackout' : 'Blocked'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {formatDateTime(blackout.startTime)} - {formatDateTime(blackout.endTime)}
                      </p>
                      {blackout.reason && (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap">
                          {blackout.reason}
                        </p>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteBlackout(blackout.id)}
                        disabled={removingBlackoutId === blackout.id}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full border border-red-200 dark:border-red-800 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        {removingBlackoutId === blackout.id ? 'Removing...' : 'Remove'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {canViewWeeklyReport && (
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
      )}

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
