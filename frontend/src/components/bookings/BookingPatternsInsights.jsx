import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Clock, Calendar, Users, CheckCircle } from 'lucide-react';

export default function BookingPatternsInsights({ resourceId }) {
  const [hourlyData, setHourlyData] = useState([]);
  const [dayData, setDayData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!resourceId) return;

    const loadPatterns = async () => {
      try {
        setLoading(true);
        
        const hourlyRes = await fetch(`/api/analytics/resources/${resourceId}/patterns/hourly`);
        const dayRes = await fetch(`/api/analytics/resources/${resourceId}/patterns/day-of-week`);
        const statsRes = await fetch(`/api/analytics/resources/${resourceId}/patterns/statistics`);

        if (hourlyRes.ok) {
          const data = await hourlyRes.json();
          setHourlyData(data.map(d => ({
            hour: `${d.hour}:00`,
            utilization: Math.round(d.utilizationRate * 100),
            bookings: d.bookingCount
          })));
        }

        if (dayRes.ok) {
          const data = await dayRes.json();
          setDayData(data.map(d => ({
            day: d.dayName,
            utilization: Math.round(d.utilizationRate * 100),
            bookings: d.bookingCount
          })));
        }

        if (statsRes.ok) {
          setStats(await statsRes.json());
        }
      } catch (err) {
        console.error('Failed to load booking patterns:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPatterns();
  }, [resourceId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Bookings</p>
              <TrendingUp className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalBookings}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last 90 days</p>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Approval Rate</p>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.approvalRate}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stats.approvedBookings} approved</p>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Peak Day</p>
              <Calendar className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.peakDay}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Most bookings</p>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Peak Hour</p>
              <Clock className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.peakHour}:00</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Busiest time</p>
          </div>
        </div>
      )}

      {/* Hourly Pattern Chart */}
      {hourlyData.length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Hourly Booking Patterns</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#f3f4f6'
                }}
              />
              <Bar dataKey="utilization" fill="#6366f1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            Shows utilization percentage by hour. Moderate utilization (30-70%) indicates good availability with balanced demand.
          </p>
        </div>
      )}

      {/* Day of Week Pattern Chart */}
      {dayData.length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Weekly Booking Patterns</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#f3f4f6'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="utilization" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            Shows how booking patterns vary throughout the week. Use this to find consistently available days.
          </p>
        </div>
      )}

      {/* Insights */}
      {stats && (
        <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-4">
          <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">Smart Insights</h4>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
            <li>✓ Peak day: <strong>{stats.peakDay}</strong> with highest demand</li>
            <li>✓ Busiest hour: <strong>{stats.peakHour}:00</strong> - expect higher competition</li>
            <li>✓ Approval rate: <strong>{stats.approvalRate}</strong> - historical acceptance likelihood</li>
            <li>✓ Check-in rate: <strong>{stats.checkInRate}</strong> - users show up for approved bookings</li>
            <li>✓ Average group size: <strong>{Math.round(stats.averageAttendees)} attendees</strong></li>
          </ul>
        </div>
      )}
    </div>
  );
}
