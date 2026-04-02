import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { resourceService } from '../../services/resourceService';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ArrowLeft } from 'lucide-react';

const RESOURCE_TYPES = [
  { value: 'LECTURE_HALL', label: 'Lecture Hall' },
  { value: 'LAB', label: 'Lab' },
  { value: 'MEETING_ROOM', label: 'Meeting Room' },
  { value: 'EQUIPMENT', label: 'Equipment' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'OUT_OF_SERVICE', label: 'Out of Service' },
];

function toTimeInput(val) {
  if (!val) return '';
  if (typeof val === 'string') {
    const match = val.match(/^(\d{1,2}):(\d{2})/);
    return match ? `${match[1].padStart(2, '0')}:${match[2]}` : '';
  }
  if (typeof val === 'object' && val.hour != null) {
    const h = String(val.hour).padStart(2, '0');
    const m = String(val.minute ?? 0).padStart(2, '0');
    return `${h}:${m}`;
  }
  return '';
}

export default function ResourceFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: '',
    capacity: 0,
    location: '',
    availabilityStartTime: '08:00',
    availabilityEndTime: '18:00',
    status: 'ACTIVE',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isAdmin) {
      navigate('/resources');
      return;
    }
    if (isEdit) {
      resourceService
        .getById(id)
        .then((res) => {
          const r = res.data;
          setForm({
            name: r.name || '',
            type: r.type || '',
            capacity: r.capacity ?? 0,
            location: r.location || '',
            availabilityStartTime: toTimeInput(r.availabilityStartTime) || '08:00',
            availabilityEndTime: toTimeInput(r.availabilityEndTime) || '18:00',
            status: r.status || 'ACTIVE',
          });
        })
        .catch(() => navigate('/resources'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit, isAdmin, navigate]);

  const validate = () => {
    const next = {};
    if (!form.name?.trim()) next.name = 'Name is required';
    if (!form.type) next.type = 'Type is required';
    if (form.capacity < 0 || form.capacity === '' || form.capacity == null) {
      next.capacity = 'Capacity must be 0 or greater';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      type: form.type,
      capacity: Number(form.capacity),
      location: form.location?.trim() || null,
      availabilityStartTime: form.availabilityStartTime || null,
      availabilityEndTime: form.availabilityEndTime || null,
      status: form.status,
    };

    setSubmitting(true);
    const request = isEdit
      ? resourceService.update(id, payload)
      : resourceService.create(payload);

    request
      .then(() => {
        toast.success(isEdit ? 'Resource updated successfully' : 'Resource created successfully');
        navigate('/resources');
      })
      .catch(() => {})
      .finally(() => setSubmitting(false));
  };

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div>
      <Link
        to={isEdit ? `/resources/${id}` : '/resources'}
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {isEdit ? 'Edit Resource' : 'New Resource'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                errors.name
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Resource name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type *
            </label>
            <select
              value={form.type}
              onChange={(e) => update('type', e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                errors.type
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <option value="">Select type</option>
              {RESOURCE_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.type && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.type}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Capacity *
            </label>
            <input
              type="number"
              min={0}
              value={form.capacity}
              onChange={(e) => update('capacity', e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                errors.capacity
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="0"
            />
            {errors.capacity && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.capacity}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Building, room, etc."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Availability Start
              </label>
              <input
                type="time"
                value={form.availabilityStartTime}
                onChange={(e) => update('availabilityStartTime', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Availability End
              </label>
              <input
                type="time"
                value={form.availabilityEndTime}
                onChange={(e) => update('availabilityEndTime', e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm border border-transparent rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {submitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
            <Link
              to={isEdit ? `/resources/${id}` : '/resources'}
              className="px-5 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
