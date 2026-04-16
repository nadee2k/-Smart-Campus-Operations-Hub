import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingService } from '../../services/bookingService';
import SkeletonRows from '../../components/common/SkeletonRows';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import toast from 'react-hot-toast';
import { Plus, XCircle, LogIn, Download, Eye, Pencil } from 'lucide-react';
import { exportCsv } from '../../utils/exportCsv';
import BookingQRCode from '../../components/bookings/BookingQRCode';
import { useAuth } from '../../context/AuthContext';

const ROW_BORDER_MAP = {
  PENDING: 'border-l-amber-400',
  APPROVED: 'border-l-emerald-400',
  REJECTED: 'border-l-red-400',
  CANCELLED: 'border-l-gray-400',
};

function formatDateTimeRange(start, end) {
  if (!start || !end) return '—';
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleString()} – ${e.toLocaleString()}`;
}

function formatDuration(start, end) {
  if (!start || !end) return '';
  const mins = Math.round((new Date(end) - new Date(start)) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function BookingListPage() {
  const { isAdmin } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [checkingIn, setCheckingIn] = useState({});

  const fetchBookings = () => {
    setLoading(true);
    bookingService
      .getMyBookings({ page, size: 10 })
      .then((res) => {
        const data = res.data;
        setBookings(data.content ?? data ?? []);
        setTotalPages(data.totalPages ?? 0);
      })
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [page]);

  const handleCancelClick = (booking) => { setBookingToCancel(booking); setCancelReason(''); setCancelModalOpen(true); };

  const handleCancelConfirm = () => {
    if (!bookingToCancel) return;
    bookingService
      .cancel(bookingToCancel.id, cancelReason || undefined)
      .then(() => { toast.success('Booking cancelled'); fetchBookings(); })
      .catch(() => {})
      .finally(() => { setCancelModalOpen(false); setBookingToCancel(null); setCancelReason(''); });
  };

  const handleCheckIn = (id) => {
    setCheckingIn((p) => ({ ...p, [id]: true }));
    bookingService
      .checkIn(id)
      .then(() => { toast.success('Checked in successfully!'); fetchBookings(); })
      .catch((err) => toast.error(err.response?.data?.message || 'Check-in failed'))
      .finally(() => setCheckingIn((p) => ({ ...p, [id]: false })));
  };

  const canCheckIn = (booking) => {
    if (booking.status !== 'APPROVED' || booking.checkedIn) return false;
    const start = new Date(booking.startTime);
    const now = new Date();
    const earliest = new Date(start.getTime() - 15 * 60000);
    return now >= earliest;
  };

  const canCancel = (status) => ['PENDING', 'APPROVED'].includes(status);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Bookings</h1>
        <div className="flex items-center gap-2">
        {bookings.length > 0 && (
          <button
            onClick={() => exportCsv(bookings.map(b => ({
              ID: b.id, Resource: b.resourceName ?? '', Start: b.startTime, End: b.endTime,
              Purpose: b.purpose, Status: b.status,
            })), 'bookings')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        )}
        {!isAdmin && (
          <Link
            to="/bookings/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm border border-transparent rounded-full text-sm font-medium transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Booking
          </Link>
        )}
        </div>
      </div>

      {loading ? (
        <SkeletonRows rows={5} cols={5} />
      ) : bookings.length === 0 ? (
        <EmptyState title="No bookings found" message="Create a new booking to get started." actionLabel="Book a room now" actionTo="/bookings/create" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Resource</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date / Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Purpose</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className={`border-l-4 ${ROW_BORDER_MAP[booking.status] || 'border-l-transparent'} hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      <Link to={`/bookings/${booking.id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        {booking.resource?.name ?? booking.resourceName ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      <span>{formatDateTimeRange(booking.startTime, booking.endTime)}</span>
                      {booking.startTime && booking.endTime && (
                        <span className="ml-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          ({formatDuration(booking.startTime, booking.endTime)})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate" title={booking.purpose ?? ''}>
                      {booking.purpose ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={booking.status} />
                      {booking.status === 'REJECTED' && booking.adminComment && (
                        <p className="mt-1 text-xs text-red-500 dark:text-red-400 truncate max-w-[200px]" title={booking.adminComment}>
                          Reason: {booking.adminComment}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right flex justify-end gap-1">
                      <Link
                        to={`/bookings/${booking.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>
                      {booking.status === 'PENDING' && (
                        <Link
                          to={`/bookings/${booking.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                          title="Edit booking"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                      )}
                      <BookingQRCode booking={booking} />
                      {canCheckIn(booking) && (
                        <button
                          onClick={() => handleCheckIn(booking.id)}
                          disabled={checkingIn[booking.id]}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          {checkingIn[booking.id] ? '…' : 'Check In'}
                        </button>
                      )}
                      {booking.checkedIn && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <LogIn className="h-3.5 w-3.5" /> Checked In
                        </span>
                      )}
                      {canCancel(booking.status) && (
                        <button
                          onClick={() => handleCancelClick(booking)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <ConfirmModal
        open={cancelModalOpen}
        onClose={() => { setCancelModalOpen(false); setBookingToCancel(null); setCancelReason(''); }}
        onConfirm={handleCancelConfirm}
        title="Cancel Booking"
        message={bookingToCancel ? `Are you sure you want to cancel this booking for ${bookingToCancel.resource?.name ?? bookingToCancel.resourceName ?? 'this resource'}?` : ''}
        confirmLabel="Cancel Booking"
        danger
      >
        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for cancellation</label>
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
