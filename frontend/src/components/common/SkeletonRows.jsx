export default function SkeletonRows({ rows = 5, cols = 5 }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="animate-pulse">
        <div className="bg-gray-50/50 dark:bg-gray-800/50 px-4 py-3 flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-3 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-4 flex gap-4 border-t border-gray-100 dark:border-gray-800">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className={`h-3 bg-gray-100 dark:bg-gray-800 rounded ${c === 0 ? 'w-1/4' : 'flex-1'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
