// The prototype's mark: two overlapping rings, "with" + small "CNX".
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap font-extrabold tracking-tight text-cnx-green ${className}`}>
      <svg viewBox="0 0 44 32" aria-hidden className="h-[1.1em] w-auto">
        <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" fill="none" />
        <circle cx="29" cy="16" r="12" stroke="currentColor" strokeWidth="3" fill="none" />
      </svg>
      <span className="text-cnx-ink">with</span>
      <small className="self-end pb-[0.2em] text-[0.55em] font-semibold tracking-[0.2em] text-cnx-muted">CNX</small>
    </span>
  );
}
