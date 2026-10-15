'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { homePathForRole, useAuth } from '@/features/auth/AuthProvider';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Logo } from './Logo';

const navLinkClass = 'rounded-control px-3 py-2 text-sm text-fog-200 transition-colors hover:bg-white/5 hover:text-white';

export function SiteHeader() {
  const { user, status, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await logout();
    setOpen(false);
    router.push('/');
  }

  const links = (
    <>
      <Link href="/campaigns" className={navLinkClass} onClick={() => setOpen(false)}>
        Campaigns
      </Link>
      {user && (
        <Link href={homePathForRole(user.role)} className={navLinkClass} onClick={() => setOpen(false)}>
          {user.role === 'brand' ? 'Brand Studio' : 'Creator Studio'}
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {links}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {status === 'loading' ? null : user ? (
            <>
              <span className="mr-1 max-w-40 truncate text-sm text-fog-300">{user.name}</span>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                Log in
              </ButtonLink>
              <ButtonLink href="/signup" variant="accent" size="sm">
                Start free
              </ButtonLink>
            </>
          )}
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-control text-fog-200 hover:bg-white/5 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-white/[0.06] px-4 pb-4 pt-2 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {links}
          </nav>
          <div className="mt-3 flex gap-2">
            {user ? (
              <Button variant="secondary" className="w-full" onClick={handleLogout}>
                Sign out
              </Button>
            ) : (
              <>
                <ButtonLink href="/login" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
                  Log in
                </ButtonLink>
                <ButtonLink href="/signup" variant="accent" className="flex-1" onClick={() => setOpen(false)}>
                  Start free
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
