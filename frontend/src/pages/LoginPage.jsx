import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import UniOpsLogo from '../components/common/UniOpsLogo';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn, UserPlus, Shield, Wrench, GraduationCap } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { email: 'admin@uniops.edu', password: 'password123', label: 'Admin', icon: Shield, color: 'bg-black dark:bg-white text-white dark:text-black' },
  { email: 'tech@uniops.edu', password: 'password123', label: 'Technician', icon: Wrench, color: 'bg-gray-800 dark:bg-gray-200 text-white dark:text-black' },
  { email: 'john@uniops.edu', password: 'password123', label: 'Student', icon: GraduationCap, color: 'bg-gray-600 dark:bg-gray-400 text-white dark:text-black' },
];

export default function LoginPage() {
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (account) => {
    setSubmitting(true);
    try {
      await login(account.email, account.password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Demo login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getPasswordStrength = (pw) => {
    if (!pw) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { level: 2, label: 'Fair', color: 'bg-amber-500' };
    return { level: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = tab === 'register' ? getPasswordStrength(password) : null;

  const inputCls = 'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-zinc-400 focus:border-transparent outline-none transition';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left: Branding Panel (Minimalist Architectural Photo) */}
      <div className="hidden lg:block lg:w-1/2 relative bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        <img 
          src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=2000" 
          alt="Modern abstract architecture" 
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
        
        <div className="relative flex flex-col justify-between h-full p-12">
          <div className="flex items-center gap-3">
            <UniOpsLogo className="h-10 w-10 text-white drop-shadow-lg" />
            <span className="text-2xl font-bold text-white tracking-tight drop-shadow-md">UniOps</span>
          </div>

          <div className="pb-8">
            <h1 className="text-4xl lg:text-5xl font-medium text-white tracking-tight mb-4 drop-shadow-sm">
              Campus operations,<br />elegantly simplified.
            </h1>
            <p className="text-lg text-gray-300 max-w-md font-light drop-shadow-sm">
              Manage facilities, track maintenance, and handle bookings—all in one quiet, focused workspace.
            </p>
          </div>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-950 px-4 py-8 lg:px-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-2">
            <UniOpsLogo className="h-12 w-12 mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">UniOps</h1>
          </div>

          {/* Welcome text */}
          <div className="hidden lg:block">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Sign in to continue to your dashboard</p>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-900 rounded-xl p-1">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'login'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" /> Sign In
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'register'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" /> Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Anderson" className={inputCls} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Enter your password" className={`${inputCls} pr-11`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {strength && password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength.level ? strength.color : 'bg-gray-200 dark:bg-gray-700'}`} />
                    ))}
                  </div>
                  <p className={`text-xs ${strength.level === 1 ? 'text-red-500' : strength.level === 2 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>
            <button type="submit" disabled={submitting} className="w-full py-2.5 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 font-semibold rounded-xl transition-all shadow-sm">
              {submitting ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-800" /></div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-gray-950 px-3 text-gray-400">or</span>
            </div>
          </div>

          {/* Google */}
          <a
            href="/oauth2/authorization/google"
            className="flex items-center justify-center gap-3 w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </a>

          {/* Demo Accounts */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Quick Demo</p>
            <div className="flex gap-2">
              {DEMO_ACCOUNTS.map((account) => {
                const Icon = account.icon;
                return (
                  <button
                    key={account.email}
                    onClick={() => handleDemoLogin(account)}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-50"
                  >
                    <div className={`h-6 w-6 rounded-lg ${account.color} flex items-center justify-center text-white`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{account.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
