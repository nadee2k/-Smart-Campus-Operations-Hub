import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import UniOpsLogo from '../components/common/UniOpsLogo';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center">
        <UniOpsLogo className="h-12 w-12 mx-auto mb-6 opacity-30" />
        <h1 className="text-7xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">404</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mt-4 mb-8">This page doesn't exist</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full font-medium hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/25"
        >
          <Home className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
