import { useState, useEffect } from 'react';
import { analyticsService } from '../../services/analyticsService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { Users, Building2, CalendarDays, Wrench, Clock, Trophy, Download } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsDashboardPage() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [peakHours, setPeakHours] = useState([]);
  const [mostBooked, setMostBooked] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [statsRes, peakRes, bookedRes, lbRes] = await Promise.allSettled([
        analyticsService.getDashboard(),
        analyticsService.getPeakHours(),
        analyticsService.getMostBooked(),
        analyticsService.getTechnicianLeaderboard(),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (peakRes.status === 'fulfilled') setPeakHours(peakRes.value.data.map((d) => ({ ...d, label: `${d.hour}:00` })));
      if (bookedRes.status === 'fulfilled') setMostBooked(bookedRes.value.data);
      if (lbRes.status === 'fulfilled') setLeaderboard(lbRes.value.data ?? []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = (data, filename) => {
    if (!data || data.length === 0) return;
    const keys = Object.keys(data[0]);
    const csvContent = [
      keys.join(','),
      ...data.map((row) => keys.map((k) => JSON.stringify(row[k] ?? '')).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (loading) return <LoadingSpinner />;
  if (!stats) return null;

  const statCards = [
    { label: 'Total Resources', value: stats.totalResources, icon: Building2, color: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'Total Bookings', value: stats.totalBookings, icon: CalendarDays, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Pending Bookings', value: stats.pendingBookings, icon: Clock, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Open Tickets', value: stats.openTickets, icon: Wrench, color: 'text-red-600 dark:text-red-400' },
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-violet-600 dark:text-violet-400' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Analytics Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center gap-3">
                <Icon className={`h-8 w-8 ${card.color}`} />
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Most Booked Resources</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mostBooked}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="resourceName" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="bookingCount" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Peak Booking Hours</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={peakHours}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tickets by Status</h2>
          {stats.ticketsByStatus?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.ticketsByStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ status, count }) => `${status}: ${count}`}
                >
                  {stats.ticketsByStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-8">No ticket data</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resolution Metrics</h2>
          <div className="flex flex-col items-center justify-center h-[300px]">
            <Clock className="h-12 w-12 text-indigo-500 mb-4" />
            <p className="text-4xl font-bold text-gray-900 dark:text-white">
              {stats.avgResolutionTimeHours ? stats.avgResolutionTimeHours.toFixed(1) : '—'}
            </p>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Average Resolution Time (hours)</p>
          </div>
        </div>
      </div>

      {/* Technician Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" /> Technician Leaderboard
            </h2>
            <button
              onClick={() => exportCsv(leaderboard, 'technician-leaderboard')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">#</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Technician</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Resolved</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Open</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {leaderboard.map((tech, i) => (
                  <tr key={tech.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-2 text-sm">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">{tech.name}</td>
                    <td className="px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400 font-semibold">{tech.resolved}</td>
                    <td className="px-4 py-2 text-sm text-amber-600 dark:text-amber-400">{tech.open}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{tech.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export Actions */}
      <div className="flex flex-wrap gap-3 mt-6">
        {mostBooked.length > 0 && (
          <button
            onClick={() => exportCsv(mostBooked, 'most-booked-resources')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Download className="h-4 w-4" /> Export Resources CSV
          </button>
        )}
        {peakHours.length > 0 && (
          <button
            onClick={() => exportCsv(peakHours, 'peak-hours')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Download className="h-4 w-4" /> Export Peak Hours CSV
          </button>
        )}
      </div>
    </div>
  );
}
