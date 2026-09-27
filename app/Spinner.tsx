// Visible "Claude is working" state for every AI action.
export default function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity=".2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function AiWorking({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span role="status" className={`inline-flex items-center gap-2 text-sm text-cnx-muted ${className}`}>
      <Spinner className="h-4 w-4 text-cnx-green" />
      {label}
    </span>
  );
}
