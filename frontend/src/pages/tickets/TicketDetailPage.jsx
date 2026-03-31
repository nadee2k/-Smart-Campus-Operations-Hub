import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ticketService } from '../../services/ticketService';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  FileImage,
  MessageSquare,
  Pencil,
  Trash2,
  Paperclip,
  Clock,
  Star,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Save,
  History,
  Tag,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'REJECTED', label: 'Rejected' },
];

const STATUS_FLOW = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const CATEGORY_COLORS = {
  ELECTRICAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  PLUMBING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  HVAC: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  IT_EQUIPMENT: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  FURNITURE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  CLEANING: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  SECURITY: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  GENERAL_MAINTENANCE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  OTHER: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
};

const MAX_ATTACHMENTS = 3;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
}

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Only JPEG, PNG, and GIF images are allowed';
  if (file.size > MAX_SIZE_BYTES) return 'File must be 5MB or less';
  return null;
}

function useSlaCountdown(deadline) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [deadline]);

  return useMemo(() => {
    if (!deadline) return null;
    const deadlineMs = new Date(deadline).getTime();
    const createdApprox = deadlineMs - 72 * 3600_000;
    const totalWindow = deadlineMs - createdApprox;
    const remaining = deadlineMs - now;
    const fraction = totalWindow > 0 ? remaining / totalWindow : 0;

    const overdue = remaining < 0;
    const abs = Math.abs(remaining);
    const hours = Math.floor(abs / 3600_000);
    const minutes = Math.floor((abs % 3600_000) / 60_000);

    let label;
    if (overdue) {
      label = hours > 0 ? `OVERDUE by ${hours}h ${minutes}m` : `OVERDUE by ${minutes}m`;
    } else {
      label = hours > 0 ? `${hours}h ${minutes}m remaining` : `${minutes}m remaining`;
    }

    let color;
    if (overdue || fraction < 0.25) color = 'red';
    else if (fraction < 0.5) color = 'amber';
    else color = 'green';

    return { label, color, overdue };
  }, [deadline, now]);
}

function SlaCountdown({ deadline }) {
  const sla = useSlaCountdown(deadline);
  if (!sla) return <span className="text-gray-400">—</span>;

  const styles = {
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${styles[sla.color]}`}>
      {sla.overdue ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
      {sla.label}
    </span>
  );
}

function StatusTimeline({ currentStatus }) {
  const currentIdx = STATUS_FLOW.indexOf(currentStatus);
  const isRejected = currentStatus === 'REJECTED';

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {STATUS_FLOW.map((step, i) => {
        const done = !isRejected && i <= currentIdx;
        const isCurrent = step === currentStatus;
        return (
          <div key={step} className="flex items-center gap-1">
            {i > 0 && (
              <div className={`w-8 h-0.5 ${done ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-700'}`} />
            )}
            <div className="flex flex-col items-center gap-1">
              {done ? (
                <CheckCircle2 className={`h-5 w-5 ${isCurrent ? 'text-indigo-500' : 'text-indigo-400'}`} />
              ) : (
                <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600" />
              )}
              <span className={`text-[10px] font-medium whitespace-nowrap ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {STATUS_OPTIONS.find((o) => o.value === step)?.label ?? step}
              </span>
            </div>
          </div>
        );
      })}
      {isRejected && (
        <>
          <div className="w-8 h-0.5 bg-red-400" />
          <div className="flex flex-col items-center gap-1">
            <CheckCircle2 className="h-5 w-5 text-red-500" />
            <span className="text-[10px] font-medium text-red-600 dark:text-red-400">Rejected</span>
          </div>
        </>
      )}
    </div>
  );
}

function StarRating({ value, onChange, readonly }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => !readonly && onChange(star)}
          className="focus:outline-none disabled:cursor-default transition-transform hover:scale-110"
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              star <= (hover || value)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function CategoryBadge({ category }) {
  const colorClass = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.OTHER;
  const label = (category ?? 'Other').replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${colorClass}`}>
      <Tag className="h-3 w-3" />
      {label}
    </span>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user, isAdmin, isTechnician } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [deleteCommentModal, setDeleteCommentModal] = useState({ open: false, commentId: null });
  const [statusValue, setStatusValue] = useState('');
  const [assignTechnicianId, setAssignTechnicianId] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [commentPage, setCommentPage] = useState(0);
  const [commentTotalPages, setCommentTotalPages] = useState(0);

  const [technicians, setTechnicians] = useState([]);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [rating, setRating] = useState(0);
  const [savingRating, setSavingRating] = useState(false);
  const [resourceHistory, setResourceHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reopening, setReopening] = useState(false);

  const canManageTicket = isAdmin || isTechnician;
  const isOwner = user && ticket && ticket.createdBy?.id === user.id;
  const canAddAttachment = isOwner && (ticket?.attachments?.length ?? 0) < MAX_ATTACHMENTS;
  const canRate =
    isOwner &&
    (ticket?.status === 'RESOLVED' || ticket?.status === 'CLOSED');

  const fetchTicket = useCallback(() => {
    ticketService
      .getById(id)
      .then((res) => {
        const t = res.data;
        setTicket(t);
        setStatusValue(t?.status ?? '');
        setAssignTechnicianId(String(t?.assignedTechnicianId ?? ''));
        setResolutionNotes(t?.resolutionNotes ?? '');
        setRating(t?.satisfactionRating ?? t?.rating ?? 0);
      })
      .catch(() => setTicket(null))
      .finally(() => setLoading(false));
  }, [id]);

  const fetchComments = useCallback(() => {
    ticketService
      .getComments(id, { page: commentPage, size: 20 })
      .then((res) => {
        const data = res.data;
        setComments(data.content ?? data ?? []);
        setCommentTotalPages(data.totalPages ?? 0);
      })
      .catch(() => setComments([]));
  }, [id, commentPage]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);
  useEffect(() => { if (ticket) fetchComments(); }, [ticket, fetchComments]);

  useEffect(() => {
    if (!canManageTicket) return;
    userService
      .getTechnicians()
      .then((res) => {
        const data = res.data;
        setTechnicians(Array.isArray(data) ? data : data?.content ?? []);
      })
      .catch(() => setTechnicians([]));
  }, [canManageTicket]);

  const fetchResourceHistory = useCallback(() => {
    const resourceId = ticket?.resource?.id ?? ticket?.resourceId;
    if (!resourceId) return;
    setLoadingHistory(true);
    ticketService
      .getResourceHistory(resourceId, { page: 0, size: 5 })
      .then((res) => {
        const data = res.data;
        setResourceHistory(data.content ?? data ?? []);
      })
      .catch(() => setResourceHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [ticket]);

  useEffect(() => {
    if (historyOpen && resourceHistory.length === 0) fetchResourceHistory();
  }, [historyOpen, fetchResourceHistory]);

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!commentContent?.trim()) return;
    setSubmittingComment(true);
    ticketService
      .addComment(id, { content: commentContent.trim(), isInternal: isInternalNote || undefined })
      .then(() => { setCommentContent(''); setIsInternalNote(false); fetchComments(); toast.success(isInternalNote ? 'Internal note added' : 'Comment added'); })
      .catch(() => {})
      .finally(() => setSubmittingComment(false));
  };

  const startEditComment = (comment) => { setEditingCommentId(comment.id); setEditCommentContent(comment.content ?? ''); };
  const cancelEditComment = () => { setEditingCommentId(null); setEditCommentContent(''); };
  const saveEditComment = () => {
    if (!editingCommentId) return;
    const content = editCommentContent.trim();
    if (!content) return;
    ticketService
      .updateComment(id, editingCommentId, { content })
      .then(() => { cancelEditComment(); fetchComments(); toast.success('Comment updated'); })
      .catch(() => {});
  };

  const handleDeleteComment = () => {
    if (!deleteCommentModal.commentId) return;
    ticketService
      .deleteComment(id, deleteCommentModal.commentId)
      .then(() => { fetchComments(); setDeleteCommentModal({ open: false, commentId: null }); toast.success('Comment deleted'); })
      .catch(() => {});
  };

  const handleStatusChange = () => {
    if (statusValue === ticket?.status) return;
    setUpdatingStatus(true);
    ticketService
      .updateStatus(id, { status: statusValue })
      .then(() => { fetchTicket(); toast.success('Status updated'); })
      .catch(() => {})
      .finally(() => setUpdatingStatus(false));
  };

  const handleAssign = () => {
    const technicianId = assignTechnicianId ? Number(assignTechnicianId) : null;
    setAssigning(true);
    ticketService
      .assign(id, { technicianId })
      .then(() => { fetchTicket(); toast.success('Assignment updated'); })
      .catch(() => {})
      .finally(() => setAssigning(false));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !canAddAttachment) return;
    const err = validateFile(file);
    if (err) { toast.error(err); return; }
    if ((ticket?.attachments?.length ?? 0) >= MAX_ATTACHMENTS) {
      toast.error(`Maximum ${MAX_ATTACHMENTS} attachments allowed`);
      return;
    }
    setUploadingFile(true);
    ticketService
      .addAttachment(id, file)
      .then(() => { fetchTicket(); toast.success('Attachment added'); })
      .catch(() => {})
      .finally(() => setUploadingFile(false));
  };

  const handleSaveResolutionNotes = () => {
    setSavingNotes(true);
    ticketService
      .updateResolutionNotes(id, resolutionNotes)
      .then(() => { fetchTicket(); toast.success('Resolution notes saved'); })
      .catch(() => {})
      .finally(() => setSavingNotes(false));
  };

  const handleReopen = () => {
    setReopening(true);
    ticketService
      .reopen(id)
      .then(() => { fetchTicket(); toast.success('Ticket reopened'); })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to reopen'))
      .finally(() => setReopening(false));
  };

  const handleRate = (value) => {
    setRating(value);
    setSavingRating(true);
    ticketService
      .rate(id, value)
      .then(() => { fetchTicket(); toast.success('Rating submitted'); })
      .catch(() => {})
      .finally(() => setSavingRating(false));
  };

  if (loading) return <LoadingSpinner size="lg" />;

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Ticket not found</p>
        <Link to="/tickets" className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Tickets
        </Link>
      </div>
    );
  }

  const attachments = ticket.attachments ?? [];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link to="/tickets" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to Tickets
      </Link>

      {/* Header card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-mono font-bold">
                {ticket.ticketNumber ?? `TKT-${String(ticket.id).padStart(4, '0')}`}
              </span>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {ticket.category ? ticket.category.replace(/_/g, ' ') : 'Ticket'}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={ticket.category} />
              <StatusBadge status={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </div>
          </div>
          <SlaCountdown deadline={ticket.slaDeadline} />
        </div>

        {/* Status Timeline */}
        <div className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
          <StatusTimeline currentStatus={ticket.status} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Resource</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {ticket.resource?.name ?? ticket.resourceName ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Assigned Technician</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {ticket.assignedTechnicianName ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">SLA Deadline</p>
            <p className="font-medium text-gray-900 dark:text-white">{formatDateTime(ticket.slaDeadline)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
            <p className="font-medium text-gray-900 dark:text-white">{formatDateTime(ticket.createdAt)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">Description</p>
            <p className="font-medium text-gray-900 dark:text-white whitespace-pre-wrap">{ticket.description ?? '—'}</p>
          </div>
        </div>

        {/* Admin/Technician: Status & Assign */}
        {canManageTicket && (
          <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <select
                value={statusValue}
                onChange={(e) => setStatusValue(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={handleStatusChange}
                disabled={updatingStatus || statusValue === ticket.status}
                className="px-4 py-2 text-sm bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all"
              >
                {updatingStatus ? 'Updating…' : 'Update Status'}
              </button>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <select
                    value={assignTechnicianId}
                    onChange={(e) => setAssignTechnicianId(e.target.value)}
                    className="pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm min-w-[200px]"
                  >
                    <option value="">Unassigned</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name ?? tech.email} ({tech.assignedTicketCount ?? tech.workload ?? 0} tickets)
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAssign}
                  disabled={assigning}
                  className="px-4 py-2 text-sm bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 transition-all"
                >
                  {assigning ? 'Assigning…' : 'Assign'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post-Resolution Feedback Prompt */}
      {isOwner && ticket.status === 'RESOLVED' && !ticket.satisfactionRating && (
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800 p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
              <Star className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Was this resolved to your satisfaction?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Rate the resolution to help us improve our service.</p>
              <div className="flex items-center gap-4 flex-wrap">
                <StarRating value={rating} onChange={handleRate} readonly={savingRating} />
                <button
                  onClick={handleReopen}
                  disabled={reopening}
                  className="px-4 py-2 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                >
                  {reopening ? 'Reopening…' : 'Not resolved — Reopen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Button for resolved/closed tickets */}
      {isOwner && (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && ticket.satisfactionRating && (
        <div className="flex justify-end">
          <button
            onClick={handleReopen}
            disabled={reopening}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50"
          >
            <History className="h-4 w-4" />
            {reopening ? 'Reopening…' : 'Reopen Ticket'}
          </button>
        </div>
      )}

      {/* Resolution Notes */}
      {canManageTicket && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Pencil className="h-5 w-5 text-gray-500" /> Resolution Notes
            </h2>
            <button
              onClick={handleSaveResolutionNotes}
              disabled={savingNotes}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all"
            >
              <Save className="h-4 w-4" />
              {savingNotes ? 'Saving…' : 'Save'}
            </button>
          </div>
          <textarea
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            rows={4}
            placeholder="Add resolution notes…"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm"
          />
        </div>
      )}

      {/* Read-only resolution notes for non-managers */}
      {!canManageTicket && ticket.resolutionNotes && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
            <Pencil className="h-5 w-5 text-gray-500" /> Resolution Notes
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ticket.resolutionNotes}</p>
        </div>
      )}

      {/* Satisfaction Rating */}
      {canRate && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
            <Star className="h-5 w-5 text-yellow-400" /> Rate this resolution
          </h2>
          <div className="flex items-center gap-4">
            <StarRating value={rating} onChange={handleRate} readonly={savingRating} />
            {rating > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">{rating} / 5</span>
            )}
          </div>
        </div>
      )}

      {/* Display rating for non-owners when it exists */}
      {!canRate && rating > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
            <Star className="h-5 w-5 text-yellow-400" /> Satisfaction Rating
          </h2>
          <div className="flex items-center gap-4">
            <StarRating value={rating} onChange={() => {}} readonly />
            <span className="text-sm text-gray-500 dark:text-gray-400">{rating} / 5</span>
          </div>
        </div>
      )}

      {/* Attachments */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileImage className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Attachments</h2>
        </div>
        <div className="flex flex-wrap gap-4">
          {attachments.map((att) => (
            <a
              key={att.id}
              href={ticketService.getAttachmentUrl(id, att.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-24 h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 hover:opacity-80 transition-opacity"
            >
              <img
                src={ticketService.getAttachmentUrl(id, att.id)}
                alt={att.fileName ?? 'Attachment'}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.src = ''; e.target.onerror = null; }}
              />
            </a>
          ))}
          {canAddAttachment && (
            <label className="w-24 h-24 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <input type="file" accept="image/jpeg,image/png,image/gif" onChange={handleFileUpload} disabled={uploadingFile} className="hidden" />
              {uploadingFile ? <span className="text-xs text-gray-500">…</span> : <Paperclip className="h-8 w-8 text-gray-400" />}
            </label>
          )}
        </div>
      </div>

      {/* Resource Work History */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setHistoryOpen((v) => !v)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <History className="h-5 w-5 text-gray-500" /> Past issues for this resource
          </h2>
          {historyOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>
        {historyOpen && (
          <div className="px-6 pb-6 space-y-3">
            {loadingHistory && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
            {!loadingHistory && resourceHistory.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No past issues found.</p>
            )}
            {resourceHistory.map((t) => (
              <Link
                key={t.id}
                to={`/tickets/${t.id}`}
                className="block p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {(t.category ?? 'Ticket').replace(/_/g, ' ')}
                  </span>
                  <div className="flex gap-2 shrink-0">
                    <StatusBadge status={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDateTime(t.createdAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Comments</h2>
        </div>

        <div className="space-y-4 mb-6">
          {comments.map((comment) => {
            const isCommentOwner = user && comment.author?.id === user.id;
            const isEditing = editingCommentId === comment.id;

            return (
              <div key={comment.id} className={`flex gap-3 p-4 rounded-xl border ${
                comment.isInternal ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800'
              }`}>
                <div className="shrink-0">
                  {comment.author?.pictureUrl ? (
                    <img src={comment.author.pictureUrl} alt={comment.author.name} className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-medium">
                      {comment.author?.name?.charAt(0) ?? '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-white">{comment.author?.name ?? 'Unknown'}</span>
                    {(comment.author?.role || comment.userRole) && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        (comment.author?.role || comment.userRole) === 'ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                        (comment.author?.role || comment.userRole) === 'TECHNICIAN' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {(comment.author?.role || comment.userRole) === 'TECHNICIAN' ? 'Tech' : (comment.author?.role || comment.userRole)}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(comment.createdAt)}</span>
                    {comment.isInternal && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Internal</span>
                    )}
                    {comment.updatedAt && comment.createdAt && comment.updatedAt !== comment.createdAt && (
                      <span className="text-xs italic text-gray-400 dark:text-gray-500" title={`Edited ${formatDateTime(comment.updatedAt)}`}>(edited)</span>
                    )}
                    {isCommentOwner && !isEditing && (
                      <div className="flex gap-1 ml-auto">
                        <button onClick={() => startEditComment(comment)} className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteCommentModal({ open: true, commentId: comment.id })} className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editCommentContent}
                        onChange={(e) => setEditCommentContent(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      />
                      <div className="flex gap-2">
                        <button onClick={saveEditComment} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
                        <button onClick={cancelEditComment} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content ?? '—'}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleAddComment} className="space-y-2">
          <textarea
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            placeholder={isInternalNote ? 'Add an internal note (staff only)…' : 'Add a comment…'}
            rows={2}
            className={`w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 ${
              isInternalNote ? 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/10' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          <div className="flex items-center justify-between gap-2">
            {canManageTicket && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInternalNote}
                  onChange={(e) => setIsInternalNote(e.target.checked)}
                  className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                />
                <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">Internal note (staff only)</span>
              </label>
            )}
            <button
              type="submit"
              disabled={submittingComment || !commentContent?.trim()}
              className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                isInternalNote
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white'
              }`}
            >
              {submittingComment ? 'Sending…' : isInternalNote ? 'Add Note' : 'Send'}
            </button>
          </div>
        </form>

        {commentTotalPages > 1 && (
          <Pagination page={commentPage} totalPages={commentTotalPages} onPageChange={setCommentPage} />
        )}
      </div>

      <ConfirmModal
        open={deleteCommentModal.open}
        onClose={() => setDeleteCommentModal({ open: false, commentId: null })}
        onConfirm={handleDeleteComment}
        title="Delete Comment"
        message="Are you sure you want to delete this comment?"
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
