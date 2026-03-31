import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resourceService } from '../../services/resourceService';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import { Search, Plus, MapPin, Users, Building2 } from 'lucide-react';

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

const TYPE_BORDER_MAP = {
  LECTURE_HALL: 'border-l-indigo-500',
  LAB: 'border-l-emerald-500',
  MEETING_ROOM: 'border-l-amber-500',
  EQUIPMENT: 'border-l-violet-500',
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
              className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
            />
          </div>
          {isAdmin && (
            <Link
              to="/resources/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full text-sm font-medium hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/25"
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
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400'
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {resources.map((resource) => (
              <Link
                key={resource.id}
                to={`/resources/${resource.id}`}
                className={`block bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 border-l-4 ${
                  TYPE_BORDER_MAP[resource.type] || 'border-l-gray-300'
                } p-5 hover:shadow-md hover:scale-[1.01] transition-all`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{resource.name}</h3>
                  <StatusBadge status={resource.status} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{resource.type?.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span>Capacity: {resource.capacity ?? 0}</span>
                  </div>
                  {resource.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{resource.location}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
