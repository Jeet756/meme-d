import Link from 'next/link';
import { Logo } from './Logo';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/[0.06]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="max-w-sm space-y-3">
          <Logo />
          <p className="text-sm text-fog-400">
            Creator campaigns where every rupee paid out can be traced to a view milestone and a ledger entry.
          </p>
        </div>
        <nav aria-label="Product" className="space-y-2 text-sm">
          <p className="font-medium text-fog-100">Product</p>
          <Link className="block text-fog-400 hover:text-white" href="/campaigns">
            Browse campaigns
          </Link>
          <Link className="block text-fog-400 hover:text-white" href="/signup">
            Create an account
          </Link>
          <Link className="block text-fog-400 hover:text-white" href="/login">
            Log in
          </Link>
        </nav>
        <div className="space-y-2 text-sm text-fog-400">
          <p className="font-medium text-fog-100">Good to know</p>
          <p>Amounts are in Indian rupees (₹).</p>
          <p>View counts are simulated in this build; no real platform data is read.</p>
        </div>
      </div>
      <div className="border-t border-white/[0.06] py-5 text-center text-xs text-fog-500">© {new Date().getFullYear()} Meme’d</div>
    </footer>
  );
}
