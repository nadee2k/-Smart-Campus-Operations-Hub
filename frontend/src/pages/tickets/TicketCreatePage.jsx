import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ticketService } from '../../services/ticketService';
import { resourceService } from '../../services/resourceService';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  X,
  Image as ImageIcon,
  Info,
  History,
  Tag,
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'IT_EQUIPMENT', label: 'IT Equipment' },
  { value: 'FURNITURE', label: 'Furniture' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'GENERAL_MAINTENANCE', label: 'General Maintenance' },
  { value: 'OTHER', label: 'Other' },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

const PRIORITY_GUIDANCE = {
  HIGH: 'Critical issue requiring immediate attention (4h SLA)',
  MEDIUM: 'Standard issue (24h SLA)',
  LOW: 'Non-urgent request (72h SLA)',
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 3;

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Only JPEG, PNG, and GIF images are allowed';
  if (file.size > MAX_SIZE_BYTES) return 'File must be 5MB or less';
  return null;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
}

export default function TicketCreatePage() {
  const navigate = useNavigate();
  useAuth();

  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    resourceId: '',
    category: '',
    description: '',
    priority: 'MEDIUM',
  });
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});

  const [resourceHistory, setResourceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showPriorityTip, setShowPriorityTip] = useState(false);

  useEffect(() => {
    resourceService
      .getAll({ size: 200 })
      .then((res) => {
        const data = res.data;
        const list = data.content ?? data ?? [];
        setResources(Array.isArray(list) ? list : []);
      })
      .catch(() => setResources([]))
      .finally(() => setLoadingResources(false));
  }, []);

  useEffect(() => {
    if (!form.resourceId) {
      setResourceHistory([]);
      return;
    }
    setLoadingHistory(true);
    ticketService
      .getResourceHistory(form.resourceId, { page: 0, size: 3 })
      .then((res) => {
        const data = res.data;
        setResourceHistory(data.content ?? data ?? []);
      })
      .catch(() => setResourceHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [form.resourceId]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    const nextFiles = [...files];
    for (const file of selected) {
      if (nextFiles.length >= MAX_FILES) { toast.error(`Maximum ${MAX_FILES} images allowed`); break; }
      const err = validateFile(file);
      if (err) toast.error(`${file.name}: ${err}`);
      else nextFiles.push(file);
    }
    setFiles(nextFiles.slice(0, MAX_FILES));
  };

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const validate = () => {
    const next = {};
    if (!form.resourceId) next.resourceId = 'Resource is required';
    if (!form.category) next.category = 'Category is required';
    if (!form.description?.trim()) next.description = 'Description is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      resourceId: form.resourceId,
      category: form.category,
      description: form.description.trim(),
      priority: form.priority,
    };
    setSubmitting(true);
    try {
      const res = await ticketService.create(payload);
      const ticketId = res.data?.id;
      if (ticketId && files.length > 0) {
        for (const file of files) await ticketService.addAttachment(ticketId, file);
      }
      toast.success('Ticket created successfully');
      navigate('/tickets');
    } catch (err) {
      if (err.response?.data?.message) toast.error(err.response.data.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link
        to="/tickets"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">New Ticket</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Resource */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resource *</label>
            <select
              value={form.resourceId}
              onChange={(e) => update('resourceId', e.target.value)}
              disabled={loadingResources}
              className={`w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                errors.resourceId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <option value="">Select resource</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            {errors.resourceId && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.resourceId}</p>}
          </div>

          {/* Resource History Preview */}
          {form.resourceId && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-gray-500" /> Recent issues for this resource
              </h3>
              {loadingHistory && <p className="text-xs text-gray-500 dark:text-gray-400">Loading…</p>}
              {!loadingHistory && resourceHistory.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">No past issues found.</p>
              )}
              <div className="space-y-2">
                {resourceHistory.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {(t.category ?? 'Ticket').replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(t.createdAt)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <StatusBadge status={t.priority} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <span className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Category *
              </span>
            </label>
            <select
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                errors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <option value="">Select category</option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={4}
              maxLength={1000}
              className={`w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Describe the issue in detail"
            />
            <div className="flex justify-between mt-1">
              {errors.description ? <p className="text-sm text-red-600 dark:text-red-400">{errors.description}</p> : <span />}
              <span className={`text-xs ${form.description.length > 900 ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'}`}>
                {form.description.length} / 1000
              </span>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <span className="flex items-center gap-1.5">
                Priority *
                <button
                  type="button"
                  onClick={() => setShowPriorityTip((v) => !v)}
                  className="text-gray-400 hover:text-indigo-500 transition-colors"
                >
                  <Info className="h-4 w-4" />
                </button>
              </span>
            </label>
            {showPriorityTip && (
              <div className="mb-2 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-sm space-y-1">
                {PRIORITY_OPTIONS.map((opt) => (
                  <p key={opt.value} className="text-gray-700 dark:text-gray-300">
                    <span className="font-semibold text-gray-900 dark:text-white">{opt.label}:</span>{' '}
                    {PRIORITY_GUIDANCE[opt.value]}
                  </p>
                ))}
              </div>
            )}
            <select
              value={form.priority}
              onChange={(e) => update('priority', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {PRIORITY_GUIDANCE[form.priority]}
            </p>
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Attachments</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Up to {MAX_FILES} images (JPEG, PNG, GIF, max 5MB each)
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif"
              onChange={handleFileChange}
              multiple
              className="block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-400 file:cursor-pointer"
            />
            {files.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {files.map((file, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
                    {file.type.startsWith('image/') ? (
                      <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate">{file.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25"
            >
              {submitting ? 'Creating…' : 'Create'}
            </button>
            <Link
              to="/tickets"
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
