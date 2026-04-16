import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { bookingService } from '../../services/bookingService';
import { resourceService } from '../../services/resourceService';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import BookingQRCode from '../../components/bookings/BookingQRCode';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Pencil,
  Save,
  X,
  Clock,
  Users,
  FileText,
  MapPin,
  CalendarDays,
  Loader2,
  AlertTriangle,
  XCircle,
  LogIn,
} from 'lucide-react';

function formatDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString([], {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(start, end) {
  if (!start || !end) return '';
  const mins = Math.round((new Date(end) - new Date(start)) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function toLocalDatetimeString(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [resources, setResources] = useState([]);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    setLoading(true);
    bookingService
      .getById(id)
      .then((res) => {
        setBooking(res.data);
        setForm({
          resourceId: String(res.data.resourceId),
          startTime: toLocalDatetimeString(res.data.startTime),
          endTime: toLocalDatetimeString(res.data.endTime),
          purpose: res.data.purpose || '',
          expectedAttendees: res.data.expectedAttendees ?? '',
        });
      })
      .catch(() => {
        toast.error('Booking not found');
        navigate('/bookings');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (editing) {
      resourceService
        .search({ page: 0, size: 100 })
        .then((res) => {
          const data = res.data;
          const list = data.content ?? data ?? [];
          setResources(Array.isArray(list) ? list : []);
        })
        .catch(() => setResources([]));
    }
  }, [editing]);

  const isOwner = booking && user && booking.userId === user.id;
  const canEdit = isOwner && booking?.status === 'PENDING';
  const canCancel = isOwner && ['PENDING', 'APPROVED'].includes(booking?.status);
  const canCheckIn = () => {
    if (!booking || booking.status !== 'APPROVED' || booking.checkedIn) return false;
    const start = new Date(booking.startTime);
    const now = new Date();
    return now >= new Date(start.getTime() - 15 * 60000);
  };

  const selectedResource = resources.find((r) => String(r.id) === String(form.resourceId));
  const capacityExceeded =
    selectedResource &&
    form.expectedAttendees !== '' &&
    form.expectedAttendees != null &&
    Number(form.expectedAttendees) > selectedResource.capacity;

  const validate = () => {
    const next = {};
    if (!form.resourceId) next.resourceId = 'Resource is required';
    if (!form.startTime) next.startTime = 'Start time is required';
    if (!form.endTime) next.endTime = 'End time is required';
    if (!form.purpose?.trim()) next.purpose = 'Purpose is required';
    if (form.expectedAttendees === '' || form.expectedAttendees == null) {
      next.expectedAttendees = 'Expected attendees is required';
    } else if (Number(form.expectedAttendees) < 1) {
      next.expectedAttendees = 'At least 1 attendee required';
    }
    if (form.startTime && form.endTime && new Date(form.endTime) <= new Date(form.startTime)) {
      next.endTime = 'End time must be after start time';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const ensureSeconds = (dt) => dt && dt.length === 16 ? dt + ':00' : dt;
    const payload = {
      resourceId: Number(form.resourceId),
      startTime: ensureSeconds(form.startTime),
      endTime: ensureSeconds(form.endTime),
      purpose: form.purpose.trim(),
      expectedAttendees: Number(form.expectedAttendees),
    };

    setSaving(true);
    bookingService
      .update(id, payload)
      .then((res) => {
        setBooking(res.data);
        setEditing(false);
        toast.success('Booking updated successfully');
      })
      .catch((err) => {
        if (err.response?.status === 409) {
          toast.error('Time slot conflicts with an existing booking');
        } else {
          const d = err.response?.data;
          if (d?.errors && Object.keys(d.errors).length > 0) {
            toast.error(Object.values(d.errors).join(', '));
          } else {
            toast.error(d?.message || 'Failed to update booking');
          }
        }
      })
      .finally(() => setSaving(false));
  };

  const handleCancelConfirm = () => {
    bookingService
      .cancel(booking.id, cancelReason || undefined)
      .then(() => {
        toast.success('Booking cancelled');
        setCancelModalOpen(false);
        bookingService.getById(id).then((res) => setBooking(res.data));
      })
      .catch(() => toast.error('Failed to cancel booking'))
      .finally(() => { setCancelModalOpen(false); setCancelReason(''); });
  };

  const handleCheckIn = () => {
    setCheckingIn(true);
    bookingService
      .checkIn(booking.id)
      .then(() => {
        toast.success('Checked in successfully!');
        bookingService.getById(id).then((res) => setBooking(res.data));
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Check-in failed'))
      .finally(() => setCheckingIn(false));
  };

  const cancelEditing = () => {
    setEditing(false);
    setErrors({});
    setForm({
      resourceId: String(booking.resourceId),
      startTime: toLocalDatetimeString(booking.startTime),
      endTime: toLocalDatetimeString(booking.endTime),
      purpose: booking.purpose || '',
      expectedAttendees: booking.expectedAttendees ?? '',
    });
  };

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const inputBase =
    'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/40 transition-shadow';
  const inputError = 'border-red-500 dark:border-red-500';
  const inputNormal = 'border-gray-200 dark:border-gray-700';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="min-h-screen">
      <Link
        to="/bookings"
        className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Bookings
      </Link>

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 shadow-sm">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Booking #{booking.id}
                </h1>
                <StatusBadge status={booking.status} />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Created {formatDateTime(booking.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BookingQRCode booking={booking} />
            {canEdit && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Booking Details */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-5">
            {/* Resource */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                <MapPin className="h-4 w-4" />
                Resource
              </label>
              {editing ? (
                <>
                  <select
                    value={form.resourceId}
                    onChange={(e) => update('resourceId', e.target.value)}
                    className={`${inputBase} ${errors.resourceId ? inputError : inputNormal}`}
                  >
                    <option value="">Select a resource</option>
                    {resources.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (Capacity: {r.capacity})
                      </option>
                    ))}
                  </select>
                  {errors.resourceId && (
                    <p className="mt-1 text-xs text-red-500">{errors.resourceId}</p>
                  )}
                </>
              ) : (
                <p className="text-gray-900 dark:text-white font-medium">
                  {booking.resourceName || '—'}
                </p>
              )}
            </div>

            {/* Start Time */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                <Clock className="h-4 w-4" />
                Start Time
              </label>
              {editing ? (
                <>
                  <input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => update('startTime', e.target.value)}
                    className={`${inputBase} ${errors.startTime ? inputError : inputNormal}`}
                  />
                  {errors.startTime && (
                    <p className="mt-1 text-xs text-red-500">{errors.startTime}</p>
                  )}
                </>
              ) : (
                <p className="text-gray-900 dark:text-white">
                  {formatDateTime(booking.startTime)}
                </p>
              )}
            </div>

            {/* End Time */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                <Clock className="h-4 w-4" />
                End Time
              </label>
              {editing ? (
                <>
                  <input
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => update('endTime', e.target.value)}
                    className={`${inputBase} ${errors.endTime ? inputError : inputNormal}`}
                  />
                  {errors.endTime && (
                    <p className="mt-1 text-xs text-red-500">{errors.endTime}</p>
                  )}
                </>
              ) : (
                <div>
                  <p className="text-gray-900 dark:text-white">
                    {formatDateTime(booking.endTime)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Duration: {formatDuration(booking.startTime, booking.endTime)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-5">
            {/* Purpose */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                <FileText className="h-4 w-4" />
                Purpose
              </label>
              {editing ? (
                <>
                  <textarea
                    value={form.purpose}
                    onChange={(e) => update('purpose', e.target.value)}
                    rows={3}
                    className={`${inputBase} resize-none ${errors.purpose ? inputError : inputNormal}`}
                    placeholder="Describe the purpose of this booking"
                  />
                  {errors.purpose && (
                    <p className="mt-1 text-xs text-red-500">{errors.purpose}</p>
                  )}
                </>
              ) : (
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                  {booking.purpose || '—'}
                </p>
              )}
            </div>

            {/* Expected Attendees */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                <Users className="h-4 w-4" />
                Expected Attendees
              </label>
              {editing ? (
                <>
                  <input
                    type="number"
                    min={1}
                    value={form.expectedAttendees}
                    onChange={(e) => update('expectedAttendees', e.target.value)}
                    className={`${inputBase} ${errors.expectedAttendees ? inputError : inputNormal}`}
                    placeholder="0"
                  />
                  {errors.expectedAttendees && (
                    <p className="mt-1 text-xs text-red-500">{errors.expectedAttendees}</p>
                  )}
                  {capacityExceeded && (
                    <div className="mt-2 flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div className="text-sm text-amber-700 dark:text-amber-300">
                        <p className="font-medium">Capacity exceeded</p>
                        <p className="text-xs mt-0.5 text-amber-600 dark:text-amber-400">
                          <span className="font-semibold">{selectedResource.name}</span> has a maximum capacity of{' '}
                          <span className="font-semibold">{selectedResource.capacity}</span> people, but you entered{' '}
                          <span className="font-semibold">{form.expectedAttendees}</span>.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-900 dark:text-white">
                  {booking.expectedAttendees ?? '—'}
                </p>
              )}
            </div>
          </div>

          {/* Admin Comment / Rejection Reason */}
          {booking.adminComment && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Admin Comment
              </label>
              <p className="text-gray-900 dark:text-white">{booking.adminComment}</p>
            </div>
          )}

          {booking.cancellationReason && (
            <div className="rounded-2xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/20 p-6">
              <label className="flex items-center gap-2 text-sm font-medium text-red-500 dark:text-red-400 mb-1.5">
                Cancellation Reason
              </label>
              <p className="text-red-700 dark:text-red-300">{booking.cancellationReason}</p>
            </div>
          )}

          {booking.checkedIn && (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 p-6 flex items-center gap-3">
              <LogIn className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Checked In
                </p>
                {booking.checkedInAt && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatDateTime(booking.checkedInAt)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm border border-transparent rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
                <button
                  onClick={cancelEditing}
                  className="inline-flex items-center gap-2 px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                >
                  <X className="h-4 w-4" />
                  Discard
                </button>
              </>
            ) : (
              <>
                {canCheckIn() && (
                  <button
                    onClick={handleCheckIn}
                    disabled={checkingIn}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    <LogIn className="h-4 w-4" />
                    {checkingIn ? 'Checking in…' : 'Check In'}
                  </button>
                )}
                {canCancel && (
                  <button
                    onClick={() => setCancelModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel Booking
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={cancelModalOpen}
        onClose={() => { setCancelModalOpen(false); setCancelReason(''); }}
        onConfirm={handleCancelConfirm}
        title="Cancel Booking"
        message={`Are you sure you want to cancel this booking for ${booking.resourceName || 'this resource'}?`}
        confirmLabel="Cancel Booking"
        danger
      >
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Reason for cancellation
          </label>
          <select
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="">Select a reason (optional)</option>
            <option value="Schedule changed">Schedule changed</option>
            <option value="No longer needed">No longer needed</option>
            <option value="Found alternative">Found alternative</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </ConfirmModal>
    </div>
  );
}
