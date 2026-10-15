/**
 * Transparent, rule-based view-spike check. It is NOT fraud detection: it only flags updates that
 * look unusually fast so a brand can take a second look. Known blind spots: slow, steady botting
 * stays under the radar, and a genuine viral moment can be flagged by mistake.
 */

export const SPIKE_RULES = {
  /** Ignore small jumps: a post going from 10 to 500 views is not interesting. */
  minimumJumpViews: 20_000,
  /** The jump must at least triple the previous view count (or start from zero). */
  minimumGrowthMultiple: 3,
  /** Only compare against updates that happened within this window. */
  windowMs: 24 * 60 * 60 * 1000,
} as const;

export interface SpikeCheckInput {
  previousViews: number;
  newViews: number;
  previousUpdatedAt: Date;
  now: Date;
}

export function isSuspiciousViewSpike(input: SpikeCheckInput): boolean {
  const { previousViews, newViews, previousUpdatedAt, now } = input;
  const jump = newViews - previousViews;
  if (jump < SPIKE_RULES.minimumJumpViews) return false;

  const elapsedMs = now.getTime() - previousUpdatedAt.getTime();
  if (elapsedMs > SPIKE_RULES.windowMs) return false;

  if (previousViews === 0) return true;
  return newViews >= previousViews * SPIKE_RULES.minimumGrowthMultiple;
}
