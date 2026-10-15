import type { Milestone } from '@/types/api';

type Rung = Pick<Milestone, 'minViews' | 'payoutPaise'>;

/** Highest rung at or below `views`. The payout is this rung's amount, never the sum of rungs crossed. */
export function highestRungReached<T extends Rung>(views: number, milestones: readonly T[]): T | null {
  let best: T | null = null;
  for (const rung of milestones) {
    if (rung.minViews <= views && (best === null || rung.minViews > best.minViews)) best = rung;
  }
  return best;
}

/** What a (wrong) additive scheme would pay. Only used to show why "highest, not sum" matters. */
export function sumOfRungsReached(views: number, milestones: readonly Rung[]): number {
  return milestones.filter((rung) => rung.minViews <= views).reduce((total, rung) => total + rung.payoutPaise, 0);
}

/** Mirrors the backend validation so people get instant feedback; the server remains the authority. */
export function findLadderProblems(milestones: readonly Rung[], budgetPaise?: number): string[] {
  if (milestones.length === 0) return ['Add at least one milestone.'];
  const problems: string[] = [];
  if (milestones.some((m) => !Number.isSafeInteger(m.minViews) || m.minViews <= 0)) {
    problems.push('Every milestone needs a view threshold greater than zero.');
  }
  if (milestones.some((m) => !Number.isSafeInteger(m.payoutPaise) || m.payoutPaise <= 0)) {
    problems.push('Every milestone needs a payout greater than zero.');
  }
  if (problems.length > 0) return problems;

  const sorted = [...milestones].sort((a, b) => a.minViews - b.minViews);
  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1]!;
    const current = sorted[i]!;
    if (current.minViews === previous.minViews) {
      problems.push('Two milestones share the same view threshold.');
    } else if (current.payoutPaise <= previous.payoutPaise) {
      problems.push('Payouts must increase as view thresholds increase.');
    }
  }
  const top = sorted[sorted.length - 1]!;
  if (budgetPaise !== undefined && top.payoutPaise > budgetPaise) {
    problems.push('The largest payout cannot exceed the campaign budget.');
  }
  return problems;
}
