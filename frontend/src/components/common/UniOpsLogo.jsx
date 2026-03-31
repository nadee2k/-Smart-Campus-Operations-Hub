export default function UniOpsLogo({ className = 'h-8 w-8' }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#2563EB"/>
      <path d="M20 8L8 15l12 7 12-7-12-7z" fill="#93C5FD"/>
      <path d="M8 15v8l12 7V22L8 15z" fill="#60A5FA"/>
      <path d="M32 15v8l-12 7V22l12-7z" fill="#3B82F6"/>
      <circle cx="28" cy="26" r="6" fill="#1E40AF"/>
      <path d="M26.5 26l1 1 2.5-2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
