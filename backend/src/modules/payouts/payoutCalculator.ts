/**
 * Pure payout rules. No database, no I/O: everything here is deterministic and unit-testable.
 *
 * The rule: a post earns the payout of the HIGHEST milestone it has crossed, not the sum of all
 * crossed milestones. 75,000 views on a 10k/₹500, 50k/₹2,000, 100k/₹5,000 ladder earns ₹2,000.
 */

export interface MilestoneRule {
  id: string;
  minViews: number;
  payoutPaise: number;
}

export type PayoutOutcome =
  | 'no_milestone' // views are below the first milestone
  | 'up_to_date' // nothing new to pay
  | 'awarded' // the full increment can be funded
  | 'insufficient_budget'; // the full increment cannot be funded, so nothing is paid

export interface PayoutDecision {
  outcome: PayoutOutcome;
  /** Highest milestone crossed at the given view count, if any. */
  qualifiedMilestone: MilestoneRule | null;
  /** What the submission should have earned in total at this view count. */
  targetPaise: number;
  /** Amount to add to the submission's earnings right now (0 unless outcome is "awarded"). */
  awardPaise: number;
  /** Amount the submission is still owed but cannot be paid yet (0 unless "insufficient_budget"). */
  blockedPaise: number;
}

export interface PayoutInput {
  views: number;
  milestones: readonly MilestoneRule[];
  earnedPaise: number;
  remainingBudgetPaise: number;
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer, received ${value}`);
  }
}

/**
 * Returns human-readable problems with a milestone ladder (empty array means valid).
 * Rules: at least one milestone, positive integers, unique thresholds, and payouts that strictly
 * increase with the threshold so that "highest milestone" is always also "highest payout".
 */
export function findLadderProblems(
  milestones: ReadonlyArray<Pick<MilestoneRule, 'minViews' | 'payoutPaise'>>,
  budgetPaise?: number,
): string[] {
  const problems: string[] = [];

  if (milestones.length === 0) {
    return ['Add at least one milestone.'];
  }

  for (const m of milestones) {
    if (!Number.isSafeInteger(m.minViews) || m.minViews <= 0) {
      problems.push('Every milestone needs a view threshold greater than zero.');
      break;
    }
  }
  for (const m of milestones) {
    if (!Number.isSafeInteger(m.payoutPaise) || m.payoutPaise <= 0) {
      problems.push('Every milestone needs a payout greater than zero.');
      break;
    }
  }
  if (problems.length > 0) return problems;

  const sorted = [...milestones].sort((a, b) => a.minViews - b.minViews);
  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1]!;
    const current = sorted[i]!;
    if (current.minViews === previous.minViews) {
      problems.push(`Two milestones share the same threshold (${current.minViews} views).`);
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

/** Highest milestone whose threshold is at or below `views`. Thresholds are inclusive. */
export function findHighestQualifiedMilestone(
  views: number,
  milestones: readonly MilestoneRule[],
): MilestoneRule | null {
  assertNonNegativeInteger(views, 'views');
  let best: MilestoneRule | null = null;
  for (const milestone of milestones) {
    if (milestone.minViews <= views && (best === null || milestone.minViews > best.minViews)) {
      best = milestone;
    }
  }
  return best;
}

/** The first milestone the post has not reached yet, or null when it is at the top of the ladder. */
export function findNextMilestone(
  views: number,
  milestones: readonly MilestoneRule[],
): MilestoneRule | null {
  assertNonNegativeInteger(views, 'views');
  let next: MilestoneRule | null = null;
  for (const milestone of milestones) {
    if (milestone.minViews > views && (next === null || milestone.minViews < next.minViews)) {
      next = milestone;
    }
  }
  return next;
}

/**
 * Decides what to pay for a submission right now.
 *
 *  target    = payout of the highest milestone crossed
 *  increment = target - already earned
 *
 * The increment is awarded only if the campaign can fund ALL of it. There is deliberately no
 * partial payout: if ₹3,000 remains and ₹5,000 is owed, nothing moves until it can be paid in full.
 * Lower view counts never reduce earned money (increment is clamped at zero).
 */
export function calculatePayout(input: PayoutInput): PayoutDecision {
  const { views, milestones, earnedPaise, remainingBudgetPaise } = input;
  assertNonNegativeInteger(views, 'views');
  assertNonNegativeInteger(earnedPaise, 'earnedPaise');
  assertNonNegativeInteger(remainingBudgetPaise, 'remainingBudgetPaise');

  const qualifiedMilestone = findHighestQualifiedMilestone(views, milestones);
  const targetPaise = qualifiedMilestone?.payoutPaise ?? 0;

  if (qualifiedMilestone === null && earnedPaise === 0) {
    return { outcome: 'no_milestone', qualifiedMilestone, targetPaise, awardPaise: 0, blockedPaise: 0 };
  }

  const incrementPaise = Math.max(0, targetPaise - earnedPaise);
  if (incrementPaise === 0) {
    return { outcome: 'up_to_date', qualifiedMilestone, targetPaise, awardPaise: 0, blockedPaise: 0 };
  }
  if (incrementPaise > remainingBudgetPaise) {
    return {
      outcome: 'insufficient_budget',
      qualifiedMilestone,
      targetPaise,
      awardPaise: 0,
      blockedPaise: incrementPaise,
    };
  }
  return { outcome: 'awarded', qualifiedMilestone, targetPaise, awardPaise: incrementPaise, blockedPaise: 0 };
}

export type PayoutStatus = 'no_milestone_yet' | 'earned' | 'waiting_for_budget' | 'campaign_not_live';

export interface PayoutProgress {
  status: PayoutStatus;
  /** Money owed at the current view count that has not been paid yet. */
  pendingPaise: number;
  nextMilestone: MilestoneRule | null;
  /** 0..1 progress from the previous threshold to the next one; 1 when the ladder is complete. */
  progressToNext: number;
}

/** Read-only summary used by the API and UI to explain where a submission stands. */
export function describePayoutProgress(input: PayoutInput & { campaignLive: boolean }): PayoutProgress {
  const decision = calculatePayout(input);
  const nextMilestone = findNextMilestone(input.views, input.milestones);
  const reached = decision.qualifiedMilestone?.minViews ?? 0;
  const progressToNext = nextMilestone
    ? Math.min(1, Math.max(0, (input.views - reached) / (nextMilestone.minViews - reached)))
    : 1;

  const owed = decision.outcome === 'awarded' || decision.outcome === 'insufficient_budget';
  const pendingPaise = owed ? decision.awardPaise + decision.blockedPaise : 0;

  let status: PayoutStatus;
  if (decision.outcome === 'insufficient_budget') status = 'waiting_for_budget';
  else if (!input.campaignLive && owed) status = 'campaign_not_live';
  else if (input.earnedPaise > 0 || decision.targetPaise > 0) status = 'earned';
  else status = 'no_milestone_yet';

  return { status, pendingPaise, nextMilestone, progressToNext };
}
