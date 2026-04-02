import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resourceService } from '../../services/resourceService';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import { Search, Plus, MapPin, Users, Building2, Monitor, Presentation, FlaskConical, Server } from 'lucide-react';

const TYPE_PILLS = [
  { value: '', label: 'All' },
  { value: 'LECTURE_HALL', label: 'Lecture Hall' },
  { value: 'LAB', label: 'Lab' },
  { value: 'MEETING_ROOM', label: 'Meeting Room' },
  { value: 'EQUIPMENT', label: 'Equipment' },
];

const STATUS_PILLS = [
  { value: '', label: 'Any Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'OUT_OF_SERVICE', label: 'Out of Service' },
];

const TYPE_BG_MAP = {
  LECTURE_HALL: 'bg-zinc-100 dark:bg-zinc-800',
  LAB: 'bg-zinc-100 dark:bg-zinc-800',
  MEETING_ROOM: 'bg-zinc-100 dark:bg-zinc-800',
  EQUIPMENT: 'bg-zinc-100 dark:bg-zinc-800',
  OTHER: 'bg-zinc-100 dark:bg-zinc-800',
};

const TYPE_IMAGE_MAP = {
  LECTURE_HALL: 'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?auto=format&fit=crop&q=80&w=500&h=200',
  LAB: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=500&h=200',
  MEETING_ROOM: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=500&h=200',
  EQUIPMENT: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=500&h=200',
  OTHER: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=500&h=200',
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'LECTURE_HALL': return <Presentation className="h-6 w-6" />;
    case 'LAB': return <FlaskConical className="h-6 w-6" />;
    case 'MEETING_ROOM': return <Users className="h-6 w-6" />;
    case 'EQUIPMENT': return <Server className="h-6 w-6" />;
    default: return <Building2 className="h-6 w-6" />;
  }
};

export default function ResourceListPage() {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');

  useEffect(() => {
    const params = {
      page,
      size: 12,
      ...(typeFilter && { type: typeFilter }),
      ...(statusFilter && { status: statusFilter }),
      ...(searchInput && { q: searchInput }),
    };

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(page));
      if (typeFilter) next.set('type', typeFilter); else next.delete('type');
      if (statusFilter) next.set('status', statusFilter); else next.delete('status');
      if (searchInput) next.set('q', searchInput); else next.delete('q');
      return next;
    });

    setLoading(true);
    resourceService
      .search(params)
      .then((res) => {
        const data = res.data;
        setResources(data.content || []);
        setTotalPages(data.totalPages || 0);
      })
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  }, [page, typeFilter, statusFilter, searchInput]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Resources</h1>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setPage(0); }}
              placeholder="Search resources..."
              className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-zinc-400 focus:border-transparent outline-none transition"
            />
          </div>
          {isAdmin && (
            <Link
              to="/resources/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm border border-transparent rounded-full text-sm font-medium transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              New Resource
            </Link>
          )}
        </div>
      </div>

      {/* Type pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        {TYPE_PILLS.map((pill) => (
          <button
            key={pill.value}
            onClick={() => { setTypeFilter(pill.value); setPage(0); }}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
              typeFilter === pill.value
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_PILLS.map((pill) => (
          <button
            key={pill.value}
            onClick={() => { setStatusFilter(pill.value); setPage(0); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              statusFilter === pill.value
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-500 dark:hover:bg-gray-800'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : resources.length === 0 ? (
        <EmptyState title="No resources found" message="Try adjusting your search or filters." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {resources.map((resource) => {
               const bannerBg = TYPE_BG_MAP[resource.type] || TYPE_BG_MAP.OTHER;
               return (
                 <Link
                   key={resource.id}
                   to={`/resources/${resource.id}`}
                   className="group flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300"
                 >
                   <div className={`h-32 ${bannerBg} relative border-b border-gray-100 dark:border-gray-800/50 overflow-hidden`}>
                      <img 
                        src={TYPE_IMAGE_MAP[resource.type] || TYPE_IMAGE_MAP.OTHER} 
                        alt="" 
                        className="absolute inset-0 w-full h-full object-cover grayscale opacity-50 dark:opacity-30 group-hover:opacity-70 group-hover:grayscale-0 transition-all duration-500"
                      />
                      <div className="absolute top-3 right-4 z-10">
                         <StatusBadge status={resource.status} />
                      </div>
                      {/* Floating Badge */}
                      <div className="absolute -bottom-6 left-5 h-13 w-13 rounded-xl bg-white dark:bg-gray-900 shadow-md border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors z-10">
                         {getTypeIcon(resource.type)}
                      </div>
                   </div>
                   
                   {/* Content Block */}
                   <div className="pt-10 pb-5 px-5 flex-1 flex flex-col bg-white dark:bg-gray-900">
                     <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate mb-4">{resource.name}</h3>
                     <div className="space-y-3 mt-auto">
                       <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                         <Building2 className="h-4 w-4 text-zinc-400 shrink-0" />
                         <span className="truncate">{resource.type?.replace(/_/g, ' ')}</span>
                       </div>
                       <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                         <Users className="h-4 w-4 text-zinc-400 shrink-0" />
                         <span>{resource.capacity ?? 0} seats</span>
                       </div>
                       {resource.location && (
                         <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                           <MapPin className="h-4 w-4 text-zinc-400 shrink-0" />
                           <span className="truncate">{resource.location}</span>
                         </div>
                       )}
                     </div>
                   </div>
                 </Link>
               );
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
