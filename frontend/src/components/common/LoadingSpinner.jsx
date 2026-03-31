export default function LoadingSpinner({ size = 'md' }) {
  const sizes = { sm: 'h-6 w-6', md: 'h-10 w-10', lg: 'h-16 w-16' };
  return (
    <div className="flex items-center justify-center p-8">
      <div className={`animate-spin rounded-full border-2 border-gray-200 dark:border-gray-800 border-t-indigo-600 dark:border-t-indigo-400 ${sizes[size]}`} />
    </div>
  );
}
