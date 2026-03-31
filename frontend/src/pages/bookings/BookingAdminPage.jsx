import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Dialog } from '@headlessui/react';
import { bookingService } from '../../services/bookingService';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import toast from 'react-hot-toast';
import { Check, X } from 'lucide-react';

const STATUS_TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

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

export default function BookingAdminPage() {
  const { isAdmin } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionModal, setActionModal] = useState({
    open: false, type: null, booking: null, adminComment: '',
  });

  const fetchBookings = () => {
    setLoading(true);
    const params = { page, size: 10 };
    if (statusFilter !== 'ALL') params.status = statusFilter;
    bookingService
      .getAll(params)
      .then((res) => {
        const data = res.data;
        setBookings(data.content ?? data ?? []);
        setTotalPages(data.totalPages ?? 0);
      })
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchBookings();
  }, [page, statusFilter, isAdmin]);

  const openApproveModal = (booking) => setActionModal({ open: true, type: 'approve', booking, adminComment: '' });
  const openRejectModal = (booking) => setActionModal({ open: true, type: 'reject', booking, adminComment: '' });
  const closeModal = () => setActionModal({ open: false, type: null, booking: null, adminComment: '' });

  const handleAction = () => {
    const { type, booking, adminComment } = actionModal;
    if (!booking) return;
    const data = { adminComment: adminComment?.trim() || undefined };
    const request = type === 'approve' ? bookingService.approve(booking.id, data) : bookingService.reject(booking.id, data);
    request
      .then(() => { toast.success(type === 'approve' ? 'Booking approved' : 'Booking rejected'); closeModal(); fetchBookings(); })
      .catch(() => {});
  };

  if (!isAdmin) return <Navigate to="/bookings" replace />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Manage Bookings</h1>

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl mb-6 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(0); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              statusFilter === tab.value
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : bookings.length === 0 ? (
        <EmptyState title="No bookings found" message="Try a different status filter." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Resource</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time Range</th>
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
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{booking.user?.name ?? booking.userName ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{booking.resource?.name ?? booking.resourceName ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      <span>{formatDateTimeRange(booking.startTime, booking.endTime)}</span>
                      {booking.startTime && booking.endTime && (
                        <span className="ml-2 text-xs font-medium text-indigo-500 dark:text-indigo-400">
                          ({formatDuration(booking.startTime, booking.endTime)})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate" title={booking.purpose ?? ''}>{booking.purpose ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={booking.status} />
                      {booking.status === 'REJECTED' && booking.adminComment && (
                        <p className="mt-1 text-xs text-red-500 dark:text-red-400 truncate max-w-[200px]" title={booking.adminComment}>
                          Reason: {booking.adminComment}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {booking.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openApproveModal(booking)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors">
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button onClick={() => openRejectModal(booking)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
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

      <Dialog open={actionModal.open} onClose={closeModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-200 dark:border-gray-800">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {actionModal.type === 'approve' ? 'Approve Booking' : 'Reject Booking'}
            </Dialog.Title>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Admin comment (optional)</label>
              <textarea
                value={actionModal.adminComment}
                onChange={(e) => setActionModal((prev) => ({ ...prev, adminComment: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="Add a comment for the user..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAction}
                className={`px-4 py-2 text-sm rounded-xl text-white font-medium transition-colors ${
                  actionModal.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionModal.type === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
