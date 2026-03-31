import { useState, useEffect, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import toast from 'react-hot-toast';
import { Search, Shield, ChevronDown, Users } from 'lucide-react';

const ROLES = ['All', 'ADMIN', 'TECHNICIAN', 'USER'];

const ROLE_COLORS = {
  ADMIN: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  TECHNICIAN: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  USER: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400',
};

const AVATAR_GRADIENTS = [
  'from-indigo-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-cyan-500 to-blue-500',
];

function avatarGradient(name) {
  const code = (name ?? '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function UserManagementPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [roleModal, setRoleModal] = useState({ open: false, user: null, newRole: '' });

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = { page, size: 10 };
    if (search.trim()) params.search = search.trim();
    if (roleFilter !== 'All') params.role = roleFilter;
    userService
      .getAll(params)
      .then((res) => {
        const data = res.data;
        setUsers(data.content ?? data ?? []);
        setTotalPages(data.totalPages ?? 0);
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => { setPage(0); }, [search, roleFilter]);

  const openRoleModal = (u, role) => setRoleModal({ open: true, user: u, newRole: role });
  const closeRoleModal = () => setRoleModal({ open: false, user: null, newRole: '' });

  const handleRoleChange = () => {
    const { user: target, newRole } = roleModal;
    if (!target || !newRole) return;
    userService
      .updateRole(target.id, newRole)
      .then(() => {
        toast.success(`${target.name} is now ${newRole}`);
        closeRoleModal();
        fetchUsers();
      })
      .catch(() => toast.error('Failed to update role'));
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">
          <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
            User Management
          </span>
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Manage roles and view user activity across campus.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-x-auto">
          {ROLES.map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                roleFilter === role
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {role === 'All' ? 'All' : role.charAt(0) + role.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" message="Try adjusting your search or filter." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joined</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bookings</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tickets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    {/* Avatar + Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.profilePicture ? (
                          <img src={u.profilePicture} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${avatarGradient(u.name)} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
                            {(u.name ?? '?')[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[160px]">{u.name}</span>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{u.email}</td>
                    {/* Role badge (clickable) */}
                    <td className="px-4 py-3">
                      <div className="relative group inline-block">
                        <button className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${ROLE_COLORS[u.role] ?? ROLE_COLORS.USER}`}>
                          <Shield className="h-3 w-3" />
                          {u.role}
                          <ChevronDown className="h-3 w-3 opacity-50" />
                        </button>
                        <div className="absolute left-0 top-full mt-1 z-20 hidden group-hover:flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[130px]">
                          {['ADMIN', 'TECHNICIAN', 'USER'].filter((r) => r !== u.role).map((r) => (
                            <button
                              key={r}
                              onClick={() => openRoleModal(u, r)}
                              className="px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              Change to {r.charAt(0) + r.slice(1).toLowerCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                    {/* Joined */}
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(u.createdAt ?? u.joinedAt)}</td>
                    {/* Bookings */}
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">{u.bookingsCount ?? 0}</td>
                    {/* Tickets */}
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">{u.ticketsCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Role change confirmation modal */}
      <Dialog open={roleModal.open} onClose={closeRoleModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white">
                <Users className="h-5 w-5" />
              </div>
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                Change Role
              </Dialog.Title>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Change <span className="font-medium text-gray-900 dark:text-white">{roleModal.user?.name}</span>'s role
              from <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${ROLE_COLORS[roleModal.user?.role] ?? ''}`}>{roleModal.user?.role}</span> to{' '}
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${ROLE_COLORS[roleModal.newRole] ?? ''}`}>{roleModal.newRole}</span>?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeRoleModal}
                className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChange}
                className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium hover:from-indigo-600 hover:to-violet-600 transition-all shadow-lg shadow-indigo-500/25"
              >
                Confirm
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
