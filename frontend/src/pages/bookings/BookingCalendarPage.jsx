import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resourceService } from '../../services/resourceService';
import { bookingService } from '../../services/bookingService';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ChevronLeft, ChevronRight, CalendarDays, ChevronDown, Clock } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const START_HOUR = 8;
const END_HOUR = 22;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

const STATUS_COLORS = {
  APPROVED: 'bg-emerald-500/80 dark:bg-emerald-600/80 border-emerald-600 dark:border-emerald-500 text-white',
  PENDING: 'bg-amber-400/80 dark:bg-amber-500/70 border-amber-500 dark:border-amber-400 text-amber-950 dark:text-white',
  CANCELLED: 'bg-gray-400/60 dark:bg-gray-600/60 border-gray-500 dark:border-gray-500 text-gray-800 dark:text-gray-200',
  REJECTED: 'bg-gray-400/60 dark:bg-gray-600/60 border-gray-500 dark:border-gray-500 text-gray-800 dark:text-gray-200',
};

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatWeekRange(monday) {
  const sunday = addDays(monday, 6);
  const opts = { month: 'short', day: 'numeric' };
  const yearOpts = { ...opts, year: 'numeric' };
  if (monday.getFullYear() !== sunday.getFullYear()) {
    return `${monday.toLocaleDateString('en-US', yearOpts)} – ${sunday.toLocaleDateString('en-US', yearOpts)}`;
  }
  if (monday.getMonth() !== sunday.getMonth()) {
    return `${monday.toLocaleDateString('en-US', opts)} – ${sunday.toLocaleDateString('en-US', yearOpts)}`;
  }
  return `${monday.toLocaleDateString('en-US', opts)} – ${sunday.getDate()}, ${sunday.getFullYear()}`;
}

function formatHour(hour) {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function toISOLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}:${s}`;
}

export default function BookingCalendarPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin, isTechnician } = useAuth();

  const [resources, setResources] = useState([]);
  const [selectedResourceId, setSelectedResourceId] = useState(searchParams.get('resourceId') || '');
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    setResourcesLoading(true);
    resourceService
      .search({ page: 0, size: 100 })
      .then((res) => {
        const list = res.data?.content ?? res.data ?? [];
        setResources(list);
        if (!selectedResourceId && list.length > 0) {
          setSelectedResourceId(String(list[0].id));
        }
      })
      .catch(() => setResources([]))
      .finally(() => setResourcesLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedResourceId) return;
    setLoading(true);
    const start = toISOLocal(weekStart);
    const end = toISOLocal((() => { const d = addDays(weekStart, 6); d.setHours(23, 59, 59, 0); return d; })());
    bookingService
      .getCalendar({ resourceId: selectedResourceId, start, end })
      .then((res) => setBookings(res.data?.content ?? res.data ?? []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [selectedResourceId, weekStart]);

  const bookingMap = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      for (let t = new Date(bStart); t < bEnd; t = new Date(t.getTime() + 3600000)) {
        const dayIdx = (t.getDay() + 6) % 7;
        const hour = t.getHours();
        if (hour < START_HOUR || hour >= END_HOUR) continue;
        const key = `${dayIdx}-${hour}`;
        if (!map[key]) {
          map[key] = { ...b, isStart: t.getTime() === bStart.getTime() };
        }
      }
    });
    return map;
  }, [bookings]);

  const selectedResource = resources.find((r) => String(r.id) === String(selectedResourceId));
  const canCreateBookings = !isAdmin && !isTechnician;

  const handlePrevWeek = () => setWeekStart((prev) => addDays(prev, -7));
  const handleNextWeek = () => setWeekStart((prev) => addDays(prev, 7));
  const handleToday = () => setWeekStart(getMonday(new Date()));

  const handleCellClick = (dayIdx, hour) => {
    if (!canCreateBookings) return;
    const key = `${dayIdx}-${hour}`;
    if (bookingMap[key]) return;
    const cellDate = addDays(weekStart, dayIdx);
    cellDate.setHours(hour, 0, 0, 0);
    navigate(`/bookings/create?resourceId=${selectedResourceId}&start=${toISOLocal(cellDate)}`);
  };

  const isToday = (dayIdx) => {
    const cellDate = addDays(weekStart, dayIdx);
    const today = new Date();
    return cellDate.toDateString() === today.toDateString();
  };

  const selectedDateKey = searchParams.get('date');
  const selectedDate = selectedDateKey ? new Date(selectedDateKey) : new Date();
  const selectedDayStart = new Date(selectedDate);
  selectedDayStart.setHours(0, 0, 0, 0);
  const selectedDayEnd = new Date(selectedDate);
  selectedDayEnd.setHours(23, 59, 59, 999);

  const selectedDateBookings = bookings
    .filter((b) => {
      const start = new Date(b.startTime);
      const end = new Date(b.endTime);
      return start <= selectedDayEnd && end >= selectedDayStart;
    })
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-zinc-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Booking Calendar</h1>
        </div>
      </div>

      {/* Resource selector + Week nav */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Resource dropdown */}
          <div className="relative flex-1 max-w-xs">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-900 dark:text-white hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
            >
              <span className="truncate">
                {resourcesLoading ? 'Loading…' : selectedResource?.name ?? 'Select a resource'}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
            </button>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl max-h-60 overflow-auto">
                  {resources.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => { setSelectedResourceId(String(r.id)); setDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${
                        String(r.id) === String(selectedResourceId)
                          ? 'text-zinc-700 dark:text-zinc-300 font-semibold bg-indigo-50/50 dark:bg-indigo-900/20'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {r.name}
                    </button>
                  ))}
                  {resources.length === 0 && !resourcesLoading && (
                    <div className="px-4 py-3 text-sm text-gray-400">No resources available</div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Week navigation */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handlePrevWeek}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white min-w-[180px] text-center">
              {formatWeekRange(weekStart)}
            </span>
            <button
              onClick={handleNextWeek}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        {!canCreateBookings && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            You are in view-only mode. Select a resource to inspect bookings by date and time.
          </p>
        )}
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        {loading ? (
          <div className="py-20">
            <LoadingSpinner />
          </div>
        ) : !selectedResourceId ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Clock className="h-10 w-10 mb-3" />
            <p className="text-sm">Select a resource to view its calendar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Day headers */}
              <div
                className="grid border-b border-gray-200 dark:border-gray-800"
                style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}
              >
                <div className="p-2" />
                {DAYS.map((day, idx) => {
                  const cellDate = addDays(weekStart, idx);
                  const today = isToday(idx);
                  return (
                    <div
                      key={day}
                      className={`p-3 text-center border-l border-gray-200 dark:border-gray-800 ${
                        today ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''
                      }`}
                    >
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {day}
                      </div>
                      <div
                        className={`text-lg font-bold mt-0.5 ${
                          today
                            ? 'text-zinc-700 dark:text-zinc-300'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {cellDate.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time grid */}
              <div
                className="grid"
                style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}
              >
                {HOURS.map((hour) => (
                  <div key={hour} className="contents">
                    {/* Time label */}
                    <div className="px-2 py-3 text-right border-t border-gray-100 dark:border-gray-800/60">
                      <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 leading-none">
                        {formatHour(hour)}
                      </span>
                    </div>

                    {/* Day cells for this hour */}
                    {DAYS.map((_, dayIdx) => {
                      const key = `${dayIdx}-${hour}`;
                      const booking = bookingMap[key];
                      const today = isToday(dayIdx);
                      return (
                        <div
                          key={key}
                          onClick={() => handleCellClick(dayIdx, hour)}
                          className={`relative border-t border-l border-gray-100 dark:border-gray-800/60 min-h-[44px] transition-colors ${
                            booking ? 'cursor-default' : 'cursor-pointer hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10'
                          } ${today ? 'bg-indigo-50/20 dark:bg-indigo-900/10' : ''}`}
                        >
                          {booking && (
                            <div
                              className={`absolute inset-0.5 rounded-lg border-l-[3px] px-2 py-1 text-[11px] font-medium leading-tight overflow-hidden ${
                                STATUS_COLORS[booking.status] || STATUS_COLORS.CANCELLED
                              }`}
                              title={`${booking.purpose ?? 'Booking'} (${booking.status})`}
                            >
                              {booking.isStart && (
                                <span className="line-clamp-2">
                                  {booking.purpose ?? booking.resource?.name ?? 'Booked'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 px-1">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Legend:</span>
        {[
          { label: 'Approved', cls: 'bg-emerald-500' },
          { label: 'Pending', cls: 'bg-amber-400' },
          { label: 'Cancelled / Rejected', cls: 'bg-gray-400' },
        ].map(({ label, cls }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${cls}`} />
            {label}
          </span>
        ))}
      </div>

      {/* Date/time booking list */}
      <div className="mt-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bookings by Date/Time</h2>
          <input
            type="date"
            value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
            onChange={(e) => {
              const next = new Date(e.target.value);
              const params = new URLSearchParams(searchParams);
              params.set('date', `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`);
              navigate(`/bookings/calendar?${params.toString()}`);
            }}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
          />
        </div>

        {!selectedResourceId ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Select a resource to view bookings.</p>
        ) : selectedDateBookings.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No bookings on this date for the selected resource.</p>
        ) : (
          <div className="space-y-2">
            {selectedDateBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {booking.purpose ?? 'Booking'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${
                    STATUS_COLORS[booking.status] || STATUS_COLORS.CANCELLED
                  }`}
                >
                  {booking.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
