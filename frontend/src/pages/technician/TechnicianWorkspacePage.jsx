import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ticketService } from '../../services/ticketService';
import { analyticsService } from '../../services/analyticsService';
import toast from 'react-hot-toast';
import {
  ClipboardList, CheckCircle2, Clock, ShieldCheck,
  ChevronDown, ChevronUp, Star, Zap, Wifi, Droplets,
  Lightbulb, Monitor, Wrench, AlertTriangle, Send,
  Loader2,
} from 'lucide-react';

const PRIORITY_FILTERS = ['All', 'HIGH', 'MEDIUM', 'LOW'];
const SLA_FILTERS = ['All', 'On Track', 'At Risk', 'Breached'];

const PRIORITY_COLOR = {
  HIGH: 'bg-red-500',
  MEDIUM: 'bg-amber-500',
  LOW: 'bg-emerald-500',
};

const CATEGORY_ICON = {
  ELECTRICAL: Zap,
  NETWORK: Wifi,
  PLUMBING: Droplets,
  LIGHTING: Lightbulb,
  IT_EQUIPMENT: Monitor,
  HVAC: Wrench,
};

function getSlaInfo(ticket) {
  if (!ticket.slaDeadline) return { pct: 1, label: 'No SLA', color: 'bg-gray-300 dark:bg-gray-700' };

  const now = Date.now();
  const created = new Date(ticket.createdAt).getTime();
  const deadline = new Date(ticket.slaDeadline).getTime();
  const total = deadline - created;
  const remaining = deadline - now;

  if (total <= 0) return { pct: 0, label: 'Breached', color: 'bg-red-500', status: 'Breached' };

  const pct = Math.max(0, Math.min(1, remaining / total));
  const hours = Math.max(0, Math.floor(remaining / 3600000));
  const mins = Math.max(0, Math.floor((remaining % 3600000) / 60000));

  let color = 'bg-emerald-500';
  let status = 'On Track';
  if (pct < 0.25) { color = 'bg-red-500'; status = 'Breached'; }
  else if (pct < 0.5) { color = 'bg-amber-500'; status = 'At Risk'; }

  const label = remaining <= 0 ? 'Breached' : `${hours}h ${mins}m left`;
  return { pct, label, color, status: remaining <= 0 ? 'Breached' : status };
}

function truncate(str, len = 100) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 flex items-start gap-4">
      <div className={`h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-white shadow-lg`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function PriorityDot({ priority }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
      <span className={`h-2 w-2 rounded-full ${PRIORITY_COLOR[priority] || 'bg-gray-400'}`} />
      {priority}
    </span>
  );
}

function SlaBar({ ticket }) {
  const { pct, label, color } = getSlaInfo(ticket);
  return (
    <div className="flex items-center gap-3 min-w-[160px]">
      <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct * 100}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{label}</span>
    </div>
  );
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
        />
      ))}
    </div>
  );
}

function TicketCard({ ticket, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(ticket.status);
  const [notes, setNotes] = useState(ticket.resolutionNotes || '');
  const [saving, setSaving] = useState(false);

  const CatIcon = CATEGORY_ICON[ticket.category] || Wrench;

  const handleStatusUpdate = async () => {
    setSaving(true);
    try {
      await ticketService.updateStatus(ticket.id, { status, resolutionNotes: notes });
      if (notes !== (ticket.resolutionNotes || '')) {
        await ticketService.updateResolutionNotes(ticket.id, notes);
      }
      toast.success('Ticket updated');
      onUpdate();
    } catch {
      toast.error('Failed to update ticket');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-shadow hover:shadow-md">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-4 p-4 text-left"
      >
        <div className="h-10 w-10 shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <CatIcon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {ticket.ticketNumber ?? `TKT-${String(ticket.id).padStart(4, '0')}`}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {ticket.title || ticket.category || 'Ticket'}
            </span>
            <PriorityDot priority={ticket.priority} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {truncate(ticket.description, 80)}
          </p>
          {ticket.resource?.name && (
            <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">{ticket.resource.name}</p>
          )}
        </div>

        <div className="hidden sm:block shrink-0 w-44">
          <SlaBar ticket={ticket} />
        </div>

        {expanded
          ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
          : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>

      <div className="sm:hidden px-4 pb-2">
        <SlaBar ticket={ticket} />
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-4 space-y-4 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleStatusUpdate}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Update
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Resolution Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Describe steps taken to resolve this issue…"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function TechnicianWorkspacePage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [slaFilter, setSlaFilter] = useState('All');

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [ticketRes, statsRes] = await Promise.all([
        ticketService.getAll({ page: 0, size: 50 }),
        analyticsService.getTechnicianStats(user.id),
      ]);
      const all = ticketRes.data.content ?? ticketRes.data ?? [];
      const mine = all.filter(
        (t) =>
          t.assignedTechnicianId === user.id,
      );
      setTickets(mine);
      setStats(statsRes.data);
    } catch {
      toast.error('Failed to load workspace data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeTickets = useMemo(
    () => tickets.filter((t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED' && t.status !== 'REJECTED'),
    [tickets],
  );

  const resolvedTickets = useMemo(
    () => tickets
      .filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED')
      .sort((a, b) => new Date(b.resolvedAt ?? b.updatedAt) - new Date(a.resolvedAt ?? a.updatedAt))
      .slice(0, 5),
    [tickets],
  );

  const filteredTickets = useMemo(() => {
    let list = [...activeTickets];

    if (priorityFilter !== 'All') {
      list = list.filter((t) => t.priority === priorityFilter);
    }

    if (slaFilter !== 'All') {
      list = list.filter((t) => {
        const { status } = getSlaInfo(t);
        return status === slaFilter;
      });
    }

    list.sort((a, b) => {
      const aInfo = getSlaInfo(a);
      const bInfo = getSlaInfo(b);
      return aInfo.pct - bInfo.pct;
    });

    return list;
  }, [activeTickets, priorityFilter, slaFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Technician Workspace
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Manage your assigned tickets and track SLA compliance.
        </p>
      </div>

      {/* Stats Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ClipboardList}
          label="Assigned Tickets"
          value={stats?.assignedCount ?? activeTickets.length}
          accent="from-indigo-500 to-violet-500"
        />
        <StatCard
          icon={CheckCircle2}
          label="Resolved"
          value={stats?.resolvedCount ?? resolvedTickets.length}
          accent="from-emerald-500 to-teal-500"
        />
        <StatCard
          icon={Clock}
          label="Avg Resolution Time"
          value={stats?.avgResolutionTime ?? '—'}
          accent="from-amber-500 to-orange-500"
        />
        <StatCard
          icon={ShieldCheck}
          label="SLA Compliance"
          value={stats?.slaCompliance != null ? `${Math.round(stats.slaCompliance)}%` : '—'}
          accent="from-rose-500 to-pink-500"
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">Priority</span>
          {PRIORITY_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setPriorityFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                priorityFilter === f
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {f === 'All' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">SLA</span>
          {SLA_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setSlaFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                slaFilter === f
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket Queue */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Ticket Queue
          <span className="ml-2 text-gray-400 dark:text-gray-500 font-normal normal-case">
            ({filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''})
          </span>
        </h2>

        {filteredTickets.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center">
            <AlertTriangle className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No tickets match the current filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} onUpdate={fetchData} />
            ))}
          </div>
        )}
      </div>

      {/* Recently Resolved */}
      {resolvedTickets.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Recently Resolved
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {resolvedTickets.map((ticket) => {
              const CatIcon = CATEGORY_ICON[ticket.category] || Wrench;
              return (
                <div
                  key={ticket.id}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 flex items-start gap-3"
                >
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500">
                    <CatIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {ticket.ticketNumber ?? `TKT-${String(ticket.id).padStart(4, '0')}`}
                      </span>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {ticket.title || ticket.category || 'Ticket'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {ticket.resolvedAt || ticket.updatedAt
                        ? new Date(ticket.resolvedAt ?? ticket.updatedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </p>
                    {ticket.satisfactionRating != null && (
                      <div className="mt-1.5">
                        <StarRating rating={ticket.satisfactionRating} />
                      </div>
                    )}
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-1" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
