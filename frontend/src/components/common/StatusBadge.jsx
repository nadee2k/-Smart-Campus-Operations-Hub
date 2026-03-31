const dotColorMap = {
  PENDING: 'bg-amber-400',
  APPROVED: 'bg-emerald-400',
  REJECTED: 'bg-red-400',
  CANCELLED: 'bg-gray-400',
  OPEN: 'bg-blue-400',
  IN_PROGRESS: 'bg-violet-400',
  RESOLVED: 'bg-emerald-400',
  CLOSED: 'bg-gray-400',
  ACTIVE: 'bg-emerald-400',
  OUT_OF_SERVICE: 'bg-red-400',
  LOW: 'bg-blue-400',
  MEDIUM: 'bg-amber-400',
  HIGH: 'bg-red-400',
};

const textColorMap = {
  PENDING: 'text-amber-700 dark:text-amber-400',
  APPROVED: 'text-emerald-700 dark:text-emerald-400',
  REJECTED: 'text-red-700 dark:text-red-400',
  CANCELLED: 'text-gray-500 dark:text-gray-400',
  OPEN: 'text-blue-700 dark:text-blue-400',
  IN_PROGRESS: 'text-violet-700 dark:text-violet-400',
  RESOLVED: 'text-emerald-700 dark:text-emerald-400',
  CLOSED: 'text-gray-500 dark:text-gray-400',
  ACTIVE: 'text-emerald-700 dark:text-emerald-400',
  OUT_OF_SERVICE: 'text-red-700 dark:text-red-400',
  LOW: 'text-blue-700 dark:text-blue-400',
  MEDIUM: 'text-amber-700 dark:text-amber-400',
  HIGH: 'text-red-700 dark:text-red-400',
};

export default function StatusBadge({ status }) {
  const dotColor = dotColorMap[status] || 'bg-gray-400';
  const textColor = textColorMap[status] || 'text-gray-600 dark:text-gray-400';

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${textColor}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {status?.replace(/_/g, ' ')}
    </span>
  );
}
