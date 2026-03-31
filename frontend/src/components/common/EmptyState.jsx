import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'No data found', message = '', actionLabel, actionTo, icon: CustomIcon }) {
  const Icon = CustomIcon || Inbox;
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      {message && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs text-center">{message}</p>}
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full text-sm font-medium hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/25"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
