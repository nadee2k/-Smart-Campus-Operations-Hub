import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import UniOpsLogo from '../components/common/UniOpsLogo';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-zinc-950 px-4">
      <div className="relative max-w-xl w-full">
        {/* Ambient photo */}
        <div className="absolute inset-0 -top-20 -bottom-20 -left-20 -right-20 overflow-hidden rounded-3xl opacity-20 dark:opacity-10 blur-sm">
          <img 
            src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=1000" 
            alt="" 
            className="w-full h-full object-cover grayscale"
          />
        </div>
        <div className="relative text-center">
          <UniOpsLogo className="h-12 w-12 mx-auto mb-6 opacity-30" />
          <h1 className="text-8xl font-light text-zinc-300 dark:text-zinc-700 tracking-tighter">404</h1>
          <p className="text-xl text-zinc-500 dark:text-zinc-400 mt-4 mb-8 font-light">
            This page doesn't exist.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm"
          >
            <Home className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
