import Link from 'next/link';
import { Banknote, Gauge, LockKeyhole, ReceiptText } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { HeroDemo } from '@/features/landing/HeroDemo';

const steps = [
  { title: 'A brand sets the rules', body: 'Pick a platform, fix a budget, and define a ladder: for example 10,000 views pays ₹500, 50,000 pays ₹2,000.' },
  { title: 'Creators submit posts', body: 'Anyone with a creator account can paste a link to a post. The same post can only enter a campaign once.' },
  { title: 'Views move, money follows', body: 'As views grow, each post earns the payout of the highest milestone it reaches. Every payment lands in a ledger.' },
];

const guarantees = [
  { icon: Gauge, title: 'Highest milestone, never the sum', body: 'A post at 75,000 views earns ₹2,000, not ₹2,500. Brands can reason about the worst case per post.' },
  { icon: LockKeyhole, title: 'The budget cannot be overspent', body: 'Payouts are checked and recorded inside a locked database transaction, so two payouts can never spend the same rupee.' },
  { icon: Banknote, title: 'No half payments', body: 'If ₹3,000 is left and a post is owed ₹5,000, it waits. Creators see exactly why.' },
  { icon: ReceiptText, title: 'Every rupee explained', body: 'Each payout records the milestone, view count and amount, and the ledger always adds up to the budget spent.' },
];

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-8 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
        <div>
          <h1 className="text-5xl leading-[1.05] sm:text-6xl">Pay creators for the views they actually earn.</h1>
          <p className="mt-6 max-w-xl text-lg text-fog-300">
            Meme’d is a campaign marketplace where payouts are tied to view milestones and capped by a budget you control. Brands stay in control of spend; creators see precisely what each post can earn.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/signup?role=brand" variant="accent" size="lg">Launch a campaign</ButtonLink>
            <ButtonLink href="/signup?role=creator" variant="secondary" size="lg">Earn as a creator</ButtonLink>
          </div>
          <p className="mt-4 text-sm text-fog-400">
            Just looking? <Link className="text-violet-300 underline-offset-4 hover:underline" href="/campaigns">Browse live campaigns</Link>.
          </p>
        </div>
        <HeroDemo />
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6" aria-labelledby="how">
        <h2 id="how" className="max-w-xl text-3xl sm:text-4xl">How a campaign runs</h2>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="rounded-panel border border-white/[0.07] bg-ink-800/60 p-6">
              <span className="tabular font-display text-3xl text-violet-300">{index + 1}</span>
              <h3 className="mt-3 font-sans text-lg font-semibold text-fog-50">{step.title}</h3>
              <p className="mt-2 text-sm text-fog-300">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6" aria-labelledby="guarantees">
        <h2 id="guarantees" className="max-w-2xl text-3xl sm:text-4xl">Built so the numbers always add up</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {guarantees.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4 rounded-panel border border-white/[0.07] bg-ink-800/60 p-6">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-control bg-violet-500/15 text-violet-300"><Icon className="h-5 w-5" aria-hidden /></span>
              <div>
                <h3 className="font-sans text-base font-semibold text-fog-50">{title}</h3>
                <p className="mt-1 text-sm text-fog-300">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6">
        <div className="grid gap-6 rounded-panel border border-violet-400/20 bg-gradient-to-br from-violet-600/20 to-ink-800 p-8 sm:p-12 md:grid-cols-2">
          <div>
            <h2 className="text-3xl sm:text-4xl">For brands</h2>
            <p className="mt-3 text-fog-200">Set a budget, define milestones, and watch spend, submissions and unusual view spikes from one studio.</p>
            <ButtonLink href="/signup?role=brand" variant="accent" className="mt-6">Create a brand account</ButtonLink>
          </div>
          <div>
            <h2 className="text-3xl sm:text-4xl">For creators</h2>
            <p className="mt-3 text-fog-200">Find campaigns with visible ladders, submit a post, and follow progress to the next milestone.</p>
            <ButtonLink href="/signup?role=creator" variant="secondary" className="mt-6">Create a creator account</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
