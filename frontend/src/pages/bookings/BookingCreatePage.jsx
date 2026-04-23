import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { bookingService } from '../../services/bookingService';
import { resourceService } from '../../services/resourceService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  CalendarPlus,
  Clock,
  Users,
  FileText,
  Loader2,
  Sparkles,
  AlertTriangle,
  Monitor,
  Map,
  List,
  Check,
} from 'lucide-react';

const TIMELINE_START = 0;
const TIMELINE_END = 24;
const TIMELINE_HOURS = TIMELINE_END - TIMELINE_START;

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function toLocalDatetimeString(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getDateFromDatetime(datetimeStr) {
  if (!datetimeStr) return null;
  return datetimeStr.split('T')[0];
}

function AvailabilityTimeline({ calendarEvents, loading, selectedStart, selectedEnd }) {
  const hours = Array.from({ length: TIMELINE_HOURS }, (_, i) => TIMELINE_START + i);

  const blocks = useMemo(() => {
    if (!calendarEvents?.length) return [];
    
    // Filter out canceled or rejected so they show as free time
    const validEvents = calendarEvents.filter(
      (evt) => evt.status !== 'CANCELLED' && evt.status !== 'REJECTED'
    );
    
    // Ensure approved slots are rendered last (on top) if there's an exact overlap
    validEvents.sort((a, b) => {
      if (a.status === 'APPROVED' && b.status !== 'APPROVED') return 1;
      if (a.status !== 'APPROVED' && b.status === 'APPROVED') return -1;
      return 0;
    });

    return validEvents.map((evt) => {
      const start = new Date(evt.startTime);
      const end = new Date(evt.endTime);
      const startHour = start.getHours() + start.getMinutes() / 60;
      const endHour = end.getHours() + end.getMinutes() / 60;
      const clampedStart = Math.max(startHour, TIMELINE_START);
      const clampedEnd = Math.min(endHour, TIMELINE_END);
      if (clampedEnd <= clampedStart) return null;
      const leftPct = ((clampedStart - TIMELINE_START) / TIMELINE_HOURS) * 100;
      const widthPct = ((clampedEnd - clampedStart) / TIMELINE_HOURS) * 100;
      return { ...evt, leftPct, widthPct };
    }).filter(Boolean);
  }, [calendarEvents]);

  const selectionBlock = useMemo(() => {
    if (!selectedStart || !selectedEnd) return null;
    const start = new Date(selectedStart);
    const end = new Date(selectedEnd);
    if (isNaN(start) || isNaN(end)) return null;

    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const clampedStart = Math.max(startHour, TIMELINE_START);
    const clampedEnd = Math.min(endHour, TIMELINE_END);
    if (clampedEnd <= clampedStart) return null;

    const leftPct = ((clampedStart - TIMELINE_START) / TIMELINE_HOURS) * 100;
    const widthPct = ((clampedEnd - clampedStart) / TIMELINE_HOURS) * 100;
    return { leftPct, widthPct };
  }, [selectedStart, selectedEnd]);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Monitor className="h-4 w-4 text-zinc-600" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Availability Preview
        </h3>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />}
      </div>

      <div className="relative">
        <div className="flex text-[10px] text-gray-400 dark:text-gray-500 mb-1">
          {hours.map((h) => (
            <div key={h} style={{ width: `${100 / TIMELINE_HOURS}%` }} className="text-left pl-0.5">
              {h % 2 === 0 ? `${h > 12 ? h - 12 : h}${h >= 12 ? 'p' : 'a'}` : ''}
            </div>
          ))}
        </div>

        <div className="relative h-8 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden">
          {hours.map((h) => (
            <div
              key={h}
              className="absolute top-0 bottom-0 border-l border-gray-200 dark:border-gray-700/50"
              style={{ left: `${((h - TIMELINE_START) / TIMELINE_HOURS) * 100}%` }}
            />
          ))}
          {blocks.map((block, i) => {
            const isApproved = block.status === 'APPROVED';
            return (
              <div
                key={i}
                className={`absolute top-1 bottom-1 rounded-md ${
                  isApproved
                    ? 'bg-emerald-500/80 dark:bg-emerald-600/70'
                    : 'bg-amber-400/80 dark:bg-amber-500/70'
                }`}
                style={{ left: `${block.leftPct}%`, width: `${block.widthPct}%` }}
                title={`${formatTime(block.startTime)} – ${formatTime(block.endTime)} (${block.status})`}
              />
            );
          })}
          
          {/* Active User Selection Overlay */}
          {selectionBlock && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-20 transition-all duration-300 rounded outline outline-1 outline-indigo-500/50 bg-indigo-500/10 overflow-hidden"
              style={{
                left: `${selectionBlock.leftPct}%`,
                width: `${selectionBlock.widthPct}%`,
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(99, 102, 241, 0.3) 4px, rgba(99, 102, 241, 0.3) 8px)`
              }}
            >
              {/* Vibrant top bar */}
              <div className="absolute top-0 inset-x-0 h-[2px] bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Approved
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400" /> Pending
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600" /> Open
          </span>
          <span className="flex items-center gap-1 ml-4 border-l border-gray-200 dark:border-gray-700 pl-4">
            <span className="inline-block w-3 h-3 rounded-[2px] bg-indigo-500/10 border-t border-indigo-500" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(99, 102, 241, 0.4) 2px, rgba(99, 102, 241, 0.4) 4px)` }} />
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">Your Selection</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function SuggestionPanel({ suggestions, onPick, loading }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 p-5 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
        <p className="text-sm text-amber-700 dark:text-amber-300">Analyzing patterns and finding the best alternatives…</p>
      </div>
    );
  }

  if (!suggestions?.length) return null;

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
          Smart Time Slot Suggestions
        </p>
      </div>
      <p className="text-xs text-amber-700 dark:text-amber-300 ml-7">
        Based on historical booking patterns, these times have excellent availability
      </p>
      <div className="grid gap-3">
        {suggestions.map((s, i) => {
          const st = s.start || s.startTime;
          const et = s.end || s.endTime;
          const score = s.score ? Math.round(s.score) : 0;
          const reasoning = s.reasoning || '';
          
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(s)}
              className="group relative rounded-xl border border-amber-200 dark:border-amber-700/50 bg-white dark:bg-gray-900 px-4 py-3 text-left hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg hover:scale-[1.02] transition-all overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:via-indigo-500/5 group-hover:to-indigo-500/5 transition-all" />
              
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatDate(st)}
                    </p>
                    <span className="text-xs font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                      #{i + 1} Match
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-2">
                    {formatTime(st)} – {formatTime(et)}
                  </p>
                  {reasoning && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">
                      💡 {reasoning}
                    </p>
                  )}
                </div>
                
                {score > 0 && (
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                        <circle
                          cx="18"
                          cy="18"
                          r="15.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="text-gray-200 dark:text-gray-700"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeDasharray={`${score * 0.97} 100`}
                          className={`${
                            score >= 80
                              ? 'text-emerald-500'
                              : score >= 60
                              ? 'text-amber-500'
                              : 'text-orange-500'
                          } transition-all`}
                        />
                      </svg>
                      <span className="absolute text-xs font-bold text-gray-700 dark:text-gray-300">
                        {score}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MapUnit({ resource, selected, onSelect }) {
  return (
    <button 
      type="button"
      onClick={() => onSelect(resource.id)}
      className={`relative rounded-xl border-2 transition-all p-3 text-left flex flex-col justify-between group overflow-hidden ${
        selected ? 'border-indigo-500 bg-zinc-100 dark:bg-zinc-800 shadow-[0_0_20px_rgba(99,102,241,0.2)] scale-[1.02] z-20' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/80 hover:border-indigo-300 dark:hover:border-indigo-600 hover:scale-[1.02] hover:-translate-y-0.5 shadow-sm hover:z-20'
      }`}
    >
      <div className="flex justify-between items-start mb-2 z-10 gap-2">
         <div className={`font-bold leading-tight ${selected ? 'text-zinc-700 dark:text-zinc-300' : 'text-gray-800 dark:text-gray-200'}`}>
            {resource.name}
         </div>
         <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300 dark:border-gray-600 group-hover:border-indigo-400'}`}>
            {selected && <Check className="h-3 w-3" strokeWidth={3} />}
         </div>
      </div>
      
      <div className="z-10 bg-gray-100 dark:bg-gray-900/80 px-2 py-1.5 rounded-lg flex items-center justify-between mt-auto">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{resource.type?.replace(/_/g, ' ') || 'ROOM'}</span>
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1"><Users className="h-3 w-3" /> {resource.capacity}</span>
      </div>
      
      {selected && (
         <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-zinc-300 dark:bg-zinc-700 opacity-10 rounded-full blur-xl"></div>
      )}
    </button>
  );
}

function FloorPlanSelector({ resources, selectedId, onSelect }) {
  if (!resources || resources.length === 0) return <div className="p-8 text-center text-gray-500">Loading map...</div>;

  const leftResources = resources.filter((_, i) => i % 2 === 0);
  const rightResources = resources.filter((_, i) => i % 2 !== 0);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/20 p-2 overflow-x-auto custom-scrollbar">
        <div className="min-w-[650px] relative mt-4 mb-2 select-none mx-auto">
        
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-72 h-8 bg-gradient-to-b from-gray-200 dark:from-gray-800 to-transparent rounded-t-xl border-t border-x border-gray-300 dark:border-gray-700 flex items-center justify-center text-xs font-bold uppercase tracking-[0.2em] text-gray-400 z-0">
             Main Entrance
          </div>
          
          <div className="flex gap-4 pt-6">
             {/* Left Wing */}
             <div className="flex-1 grid grid-cols-2 gap-3 z-10">
                {leftResources.map(r => (
                  <MapUnit key={r.id} resource={r} selected={selectedId == r.id} onSelect={onSelect} />
                ))}
             </div>
             
             {/* Corridor */}
             <div className="w-16 relative flex flex-col items-center shrink-0">
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 border-l-2 border-dashed border-gray-300 dark:border-gray-700 z-0"></div>
                <div className="sticky top-1/2 -translate-y-1/2 py-20 text-gray-300 dark:text-gray-700 text-[10px] font-black tracking-[0.4em] uppercase" style={{ writingMode: 'vertical-rl' }}>
                   CENTRAL CORRIDOR
                </div>
             </div>
             
             {/* Right Wing */}
             <div className="flex-1 grid grid-cols-2 gap-3 z-10">
                {rightResources.map(r => (
                  <MapUnit key={r.id} resource={r} selected={selectedId == r.id} onSelect={onSelect} />
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useAuth();

  const resourceIdParam = searchParams.get('resourceId') || '';
  const startParam = searchParams.get('start') || '';

  const [viewMode, setViewMode] = useState('FLOOR_PLAN'); // 'LIST' | 'FLOOR_PLAN'
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState(() => {
    let startTime = '';
    let endTime = '';
    if (startParam) {
      startTime = toLocalDatetimeString(startParam);
      const endDate = new Date(startParam);
      endDate.setHours(endDate.getHours() + 1);
      endTime = toLocalDatetimeString(endDate);
    }
    return { resourceId: resourceIdParam, startTime, endTime, purpose: '', expectedAttendees: '' };
  });

  const [errors, setErrors] = useState({});

  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  const selectedDate = getDateFromDatetime(form.startTime);

  useEffect(() => {
    resourceService
      .search({ page: 0, size: 100 })
      .then((res) => {
        const data = res.data;
        const list = data.content ?? data ?? [];
        setResources(Array.isArray(list) ? list : []);
      })
      .catch(() => setResources([]))
      .finally(() => setLoadingResources(false));
  }, []);

  useEffect(() => {
    if (!form.resourceId || !selectedDate) {
      setCalendarEvents([]);
      return;
    }

    const dayStart = `${selectedDate}T00:00:00`;
    const dayEnd = `${selectedDate}T23:59:59`;

    setLoadingCalendar(true);
    bookingService
      .getCalendar({ resourceId: form.resourceId, start: dayStart, end: dayEnd })
      .then((res) => {
        const data = res.data;
        setCalendarEvents(Array.isArray(data) ? data : data.content ?? []);
      })
      .catch(() => setCalendarEvents([]))
      .finally(() => setLoadingCalendar(false));
  }, [form.resourceId, selectedDate]);

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

  const fetchSuggestions = (resourceId, startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMinutes = Math.round((end - start) / 60000);

    setLoadingSuggestions(true);
    setSuggestions([]);
    bookingService
      .getSuggestions({
        resourceId,
        date: startTime.split('T')[0],
        duration: durationMinutes,
      })
      .then((res) => {
        const data = res.data;
        setSuggestions(Array.isArray(data) ? data : data.content ?? []);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoadingSuggestions(false));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSuggestions([]);
    // Ensure resourceId is a number (backend expects Long)
    // Append seconds to datetime strings for proper LocalDateTime parsing
    const ensureSeconds = (dt) => dt && dt.length === 16 ? dt + ':00' : dt;
    const payload = {
      resourceId: Number(form.resourceId),
      startTime: ensureSeconds(form.startTime),
      endTime: ensureSeconds(form.endTime),
      purpose: form.purpose.trim(),
      expectedAttendees: Number(form.expectedAttendees),
    };

    setSubmitting(true);
    bookingService
      .create(payload)
      .then(() => {
        toast.success('Booking created successfully');
        navigate('/bookings');
      })
      .catch((err) => {
        if (err.response?.status === 409) {
          toast.error('Time slot conflicts with an existing booking');
          fetchSuggestions(form.resourceId, form.startTime, form.endTime);
        } else {
          const d = err.response?.data;
          if (d?.errors && Object.keys(d.errors).length > 0) {
            toast.error(Object.values(d.errors).join(', '));
          } else {
            toast.error(d?.message || 'Failed to create booking');
          }
        }
      })
      .finally(() => setSubmitting(false));
  };

  const applySuggestion = (s) => {
    setForm((prev) => ({
      ...prev,
      startTime: toLocalDatetimeString(s.start || s.startTime),
      endTime: toLocalDatetimeString(s.end || s.endTime),
    }));
    setSuggestions([]);
    toast.success('Time slot applied — review and submit');
  };

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const inputBase =
    'w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/40 transition-shadow';
  const inputError = 'border-red-500 dark:border-red-500';
  const inputNormal = 'border-gray-200 dark:border-gray-700';

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
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 shadow-sm">
            <CalendarPlus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Booking</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Reserve a campus resource
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-5">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit mb-4 border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setViewMode('FLOOR_PLAN')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${viewMode === 'FLOOR_PLAN' ? 'bg-white dark:bg-gray-900 text-zinc-700 dark:text-zinc-300 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                <Map className="h-4 w-4" /> Map View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${viewMode === 'LIST' ? 'bg-white dark:bg-gray-900 text-zinc-700 dark:text-zinc-300 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                <List className="h-4 w-4" /> List View
              </button>
            </div>

            {/* Resource */}
            {viewMode === 'FLOOR_PLAN' ? (
              <div className="mb-2">
                 <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                   <Map className="h-4 w-4 text-gray-400" />
                   Choose Location
                 </div>
                 <FloorPlanSelector 
                   resources={resources} 
                   selectedId={form.resourceId} 
                   onSelect={(id) => update('resourceId', id)} 
                 />
                 {errors.resourceId && (
                   <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 font-medium text-center shadow-sm">
                      {errors.resourceId}
                   </div>
                 )}
              </div>
            ) : (
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  <List className="h-4 w-4 text-gray-400" />
                  Select Resource
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                   {resources.length === 0 && !loadingResources && (
                      <div className="col-span-full border-2 border-dashed border-gray-200 dark:border-gray-800 p-6 rounded-2xl text-center text-gray-500 text-sm">No resources found</div>
                   )}
                   {resources.map((r) => (
                      <button
                         key={r.id}
                         type="button"
                         onClick={() => update('resourceId', String(r.id))}
                         className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left group ${
                            String(form.resourceId) === String(r.id)
                               ? 'border-indigo-500 bg-zinc-100 dark:bg-zinc-800 shadow-[0_0_15px_rgba(99,102,241,0.15)] scale-[1.01]' 
                               : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-white dark:hover:bg-gray-800'
                         }`}
                      >
                         <div className={`mt-0.5 shrink-0 flex items-center justify-center h-5 w-5 rounded-full border-2 transition-colors ${
                            String(form.resourceId) === String(r.id) ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-gray-300 dark:border-gray-600 group-hover:border-indigo-400'
                         }`}>
                            {String(form.resourceId) === String(r.id) && <Check className="h-3 w-3" strokeWidth={3} />}
                         </div>
                         <div>
                            <p className={`font-semibold text-sm ${String(form.resourceId) === String(r.id) ? 'text-indigo-800 dark:text-indigo-300' : 'text-gray-900 dark:text-white'}`}>{r.name}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                               <span className="flex items-center font-medium gap-1 text-gray-600 dark:text-gray-300"><Users className="h-3 w-3"/> {r.capacity}</span>
                               <span className="uppercase tracking-widest text-[9px] font-bold opacity-60 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">{r.type?.replace(/_/g, ' ') || 'ROOM'}</span>
                            </div>
                         </div>
                      </button>
                   ))}
                </div>
                {errors.resourceId && (
                  <p className="mt-2 text-xs text-red-500 font-medium">{errors.resourceId}</p>
                )}
              </div>
            )}

            {/* Start Time */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <Clock className="h-4 w-4 text-gray-400" />
                Start Time
              </label>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => update('startTime', e.target.value)}
                className={`${inputBase} ${errors.startTime ? inputError : inputNormal}`}
              />
              {errors.startTime && (
                <p className="mt-1 text-xs text-red-500">{errors.startTime}</p>
              )}
            </div>

            {/* End Time */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <Clock className="h-4 w-4 text-gray-400" />
                End Time
              </label>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={(e) => update('endTime', e.target.value)}
                className={`${inputBase} ${errors.endTime ? inputError : inputNormal}`}
              />
              {errors.endTime && (
                <p className="mt-1 text-xs text-red-500">{errors.endTime}</p>
              )}
            </div>
          </div>

          {/* Availability Timeline */}
          {form.resourceId && selectedDate && (
            <AvailabilityTimeline 
              calendarEvents={calendarEvents} 
              loading={loadingCalendar} 
              selectedStart={form.startTime} 
              selectedEnd={form.endTime} 
            />
          )}

          {/* Conflict Suggestions */}
          <SuggestionPanel
            suggestions={suggestions}
            onPick={applySuggestion}
            loading={loadingSuggestions}
          />

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-5">
            {/* Purpose */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <FileText className="h-4 w-4 text-gray-400" />
                Purpose
              </label>
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
            </div>

            {/* Expected Attendees */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <Users className="h-4 w-4 text-gray-400" />
                Expected Attendees
              </label>
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
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm border border-transparent rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <CalendarPlus className="h-4 w-4" />
                  Create Booking
                </>
              )}
            </button>
            <Link
              to="/bookings"
              className="px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
