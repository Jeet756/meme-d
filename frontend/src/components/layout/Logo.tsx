import Link from 'next/link';

/** Rising steps: the same shape as a milestone ladder, with the top step lit like an earned payout. */
export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#33264A" />
      <rect x="6" y="19" width="5" height="7" rx="1.5" fill="#8B5CF6" />
      <rect x="13.5" y="13" width="5" height="13" rx="1.5" fill="#A78BFA" />
      <rect x="21" y="6" width="5" height="20" rx="1.5" fill="#C6F432" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-control" aria-label="Meme’d home">
      <LogoMark />
      <span className="font-display text-xl font-semibold tracking-tight text-fog-50">Meme’d</span>
    </Link>
  );
}
