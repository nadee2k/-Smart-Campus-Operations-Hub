import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';

const ILLUSTRATION_URLS = {
  tickets: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=400&h=250',
  bookings: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=400&h=250',
  resources: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=400&h=250',
  default: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=400&h=250',
};

function guessCategory(title = '', message = '') {
  const t = (title + message).toLowerCase();
  if (t.includes('ticket')) return 'tickets';
  if (t.includes('booking')) return 'bookings';
  if (t.includes('resource')) return 'resources';
  return 'default';
}

export default function EmptyState({ title = 'No data found', message = '', actionLabel, actionTo, icon: CustomIcon }) {
  const Icon = CustomIcon || Inbox;
  const cat = guessCategory(title, message);
  const imgUrl = ILLUSTRATION_URLS[cat];

  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      <div className="relative w-64 h-40 rounded-2xl overflow-hidden mb-6 shadow-sm border border-gray-200 dark:border-gray-800">
        <img 
          src={imgUrl} 
          alt="" 
          className="w-full h-full object-cover grayscale opacity-60 dark:opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-zinc-950 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 h-12 w-12 rounded-xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur flex items-center justify-center shadow-sm border border-gray-200 dark:border-gray-700">
          <Icon className="h-6 w-6 text-zinc-400 dark:text-zinc-500" />
        </div>
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      {message && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs text-center">{message}</p>}
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-full text-sm font-medium transition-all shadow-sm"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
