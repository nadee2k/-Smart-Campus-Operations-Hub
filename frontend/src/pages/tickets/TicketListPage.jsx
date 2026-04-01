import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ticketService } from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';
import SkeletonRows from '../../components/common/SkeletonRows';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import { Plus, ChevronRight, Download, Search, Filter } from 'lucide-react';
import { exportCsv } from '../../utils/exportCsv';
import { formatTimeAgo } from '../../utils/formatTimeAgo';
import { resourceService } from '../../services/resourceService';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'REJECTED', label: 'Rejected' },
];

const PRIORITY_PILLS = [
  { value: '', label: 'Any Priority' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

const ROW_BORDER_MAP = {
  OPEN: 'border-l-blue-400',
  IN_PROGRESS: 'border-l-violet-400',
  RESOLVED: 'border-l-emerald-400',
  CLOSED: 'border-l-gray-400',
  REJECTED: 'border-l-red-400',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncate(str, len = 80) {
  if (!str) return '—';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

export default function TicketListPage() {
  const { isTechnician } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [resources, setResources] = useState([]);

  const fetchTickets = () => {
    setLoading(true);
    const params = { page, size: 10 };
    if (statusFilter) params.status = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;

    ticketService
      .getAll(params)
      .then((res) => {
        const data = res.data;
        setTickets(data.content ?? data ?? []);
        setTotalPages(data.totalPages ?? 0);
      })
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTickets(); }, [page, statusFilter, priorityFilter]);

  useEffect(() => {
    resourceService.getAll({ size: 100 })
      .then(res => setResources(res.data.content || res.data || []))
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tickets</h1>
        <div className="flex items-center gap-2">
        {tickets.length > 0 && (
          <button
            onClick={() => exportCsv(tickets.map(t => ({
              ID: t.id, Category: t.category, Priority: t.priority, Status: t.status,
              Description: t.description?.slice(0, 100), Created: t.createdAt, Assigned: t.assignedTechnicianName || '',
            })), 'tickets')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        )}
        {!isTechnician && (
          <Link
            to="/tickets/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full text-sm font-medium hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/25"
          >
            <Plus className="h-4 w-4" />
            New Ticket
          </Link>
        )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        {/* Status / Priority Filters (Existing) */}
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          {/* Status tab bar */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-x-auto h-[42px] flex-shrink-0">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setStatusFilter(tab.value); setPage(0); }}
                className={`px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  statusFilter === tab.value
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Priority pills */}
          <div className="flex items-center flex-wrap gap-2 flex-shrink-0">
            {PRIORITY_PILLS.map((pill) => (
              <button
                key={pill.value}
                onClick={() => { setPriorityFilter(pill.value); setPage(0); }}
                className={`px-3 py-1 h-8 rounded-full text-xs font-medium transition-all ${
                  priorityFilter === pill.value
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-500 dark:hover:bg-gray-800'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Resource Filter */}
        <div className="flex flex-col sm:flex-row gap-2 md:max-w-md w-full">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 h-[42px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
            />
          </div>
          <div className="relative sm:w-44 flex-shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-gray-400" />
            </div>
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 h-[42px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer appearance-none shadow-sm"
            >
              <option value="">All Resources</option>
              {resources.map(res => (
                <option key={res.id} value={res.id}>{truncate(res.name, 15)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <SkeletonRows rows={6} cols={6} />
      ) : tickets.length === 0 ? (
        <EmptyState title="No tickets found" message="Create a new ticket to report an issue, or adjust your filters." actionLabel="Report an issue" actionTo="/tickets/create" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ticket #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assigned</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {tickets
                  .filter(t => !resourceFilter || Number(t.resource?.id || t.resourceId) === Number(resourceFilter))
                  .filter(t => !searchQuery || 
                    (t.category || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                    (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (t.ticketNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={`border-l-4 ${ROW_BORDER_MAP[ticket.status] || 'border-l-transparent'} hover:bg-gray-50/50 dark:hover:bg-gray-800/30 group transition-colors`}
                  >
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-indigo-600 dark:text-indigo-400">{ticket.ticketNumber ?? `TKT-${String(ticket.id).padStart(4, '0')}`}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{ticket.category ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs" title={ticket.description ?? ''}>
                      <span className="line-clamp-2">{truncate(ticket.description, 60)}</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={ticket.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400" title={ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : ''}>
                      {formatTimeAgo(ticket.createdAt) || formatDate(ticket.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{ticket.assignedTechnicianName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
