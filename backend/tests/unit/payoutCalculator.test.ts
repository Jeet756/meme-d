import {
  calculatePayout,
  describePayoutProgress,
  findHighestQualifiedMilestone,
  findLadderProblems,
  findNextMilestone,
  type MilestoneRule,
} from '../../src/modules/payouts/payoutCalculator';

const rupees = (amount: number) => amount * 100;

// The example ladder from the product brief: 10k -> ₹500, 50k -> ₹2,000, 100k -> ₹5,000.
const ladder: MilestoneRule[] = [
  { id: 'm1', minViews: 10_000, payoutPaise: rupees(500) },
  { id: 'm2', minViews: 50_000, payoutPaise: rupees(2_000) },
  { id: 'm3', minViews: 100_000, payoutPaise: rupees(5_000) },
];

const plenty = rupees(1_000_000);

describe('calculatePayout', () => {
  it('pays nothing below the first milestone', () => {
    const decision = calculatePayout({ views: 9_999, milestones: ladder, earnedPaise: 0, remainingBudgetPaise: plenty });
    expect(decision.outcome).toBe('no_milestone');
    expect(decision.awardPaise).toBe(0);
    expect(decision.qualifiedMilestone).toBeNull();
  });

  it('treats a threshold as inclusive: exactly 10,000 views earns ₹500', () => {
    const decision = calculatePayout({ views: 10_000, milestones: ladder, earnedPaise: 0, remainingBudgetPaise: plenty });
    expect(decision.outcome).toBe('awarded');
    expect(decision.awardPaise).toBe(rupees(500));
    expect(decision.qualifiedMilestone?.id).toBe('m1');
  });

  it('pays the highest milestone, not the sum, between milestones (75,000 views = ₹2,000)', () => {
    const decision = calculatePayout({ views: 75_000, milestones: ladder, earnedPaise: 0, remainingBudgetPaise: plenty });
    expect(decision.targetPaise).toBe(rupees(2_000));
    expect(decision.awardPaise).toBe(rupees(2_000));
  });

  it('jumping several milestones at once pays the top one (0 -> 120,000 = ₹5,000)', () => {
    const decision = calculatePayout({ views: 120_000, milestones: ladder, earnedPaise: 0, remainingBudgetPaise: plenty });
    expect(decision.awardPaise).toBe(rupees(5_000));
    expect(decision.qualifiedMilestone?.id).toBe('m3');
  });

  it('does not pay again when the same views are reported twice', () => {
    const decision = calculatePayout({
      views: 75_000,
      milestones: ladder,
      earnedPaise: rupees(2_000),
      remainingBudgetPaise: plenty,
    });
    expect(decision.outcome).toBe('up_to_date');
    expect(decision.awardPaise).toBe(0);
  });

  it('pays only the difference when a higher milestone is reached later', () => {
    const decision = calculatePayout({
      views: 100_000,
      milestones: ladder,
      earnedPaise: rupees(2_000),
      remainingBudgetPaise: plenty,
    });
    expect(decision.outcome).toBe('awarded');
    expect(decision.awardPaise).toBe(rupees(3_000));
  });

  it('refuses a partial payout when the budget cannot cover the whole increment', () => {
    const decision = calculatePayout({
      views: 100_000,
      milestones: ladder,
      earnedPaise: 0,
      remainingBudgetPaise: rupees(3_000),
    });
    expect(decision.outcome).toBe('insufficient_budget');
    expect(decision.awardPaise).toBe(0);
    expect(decision.blockedPaise).toBe(rupees(5_000));
  });

  it('awards when the remaining budget exactly equals the increment', () => {
    const decision = calculatePayout({
      views: 100_000,
      milestones: ladder,
      earnedPaise: 0,
      remainingBudgetPaise: rupees(5_000),
    });
    expect(decision.outcome).toBe('awarded');
    expect(decision.awardPaise).toBe(rupees(5_000));
  });

  it('is blocked by one paisa of shortfall', () => {
    const decision = calculatePayout({
      views: 100_000,
      milestones: ladder,
      earnedPaise: 0,
      remainingBudgetPaise: rupees(5_000) - 1,
    });
    expect(decision.outcome).toBe('insufficient_budget');
  });

  it('pays the incremental amount, not the full target, when the budget is short after an earlier payout', () => {
    const decision = calculatePayout({
      views: 100_000,
      milestones: ladder,
      earnedPaise: rupees(2_000),
      remainingBudgetPaise: rupees(3_000),
    });
    expect(decision.outcome).toBe('awarded');
    expect(decision.awardPaise).toBe(rupees(3_000));
  });

  it('returns no_milestone for a campaign whose milestones are all out of reach', () => {
    const decision = calculatePayout({
      views: 5,
      milestones: [{ id: 'far', minViews: 1_000_000, payoutPaise: rupees(10) }],
      earnedPaise: 0,
      remainingBudgetPaise: plenty,
    });
    expect(decision.outcome).toBe('no_milestone');
  });

  it('returns no_milestone for a campaign with no milestones at all', () => {
    const decision = calculatePayout({ views: 500_000, milestones: [], earnedPaise: 0, remainingBudgetPaise: plenty });
    expect(decision.outcome).toBe('no_milestone');
  });

  it('never claws back money when views fall below an already-earned milestone', () => {
    const decision = calculatePayout({
      views: 1_000,
      milestones: ladder,
      earnedPaise: rupees(2_000),
      remainingBudgetPaise: plenty,
    });
    expect(decision.outcome).toBe('up_to_date');
    expect(decision.awardPaise).toBe(0);
  });

  it('is independent of the order milestones are supplied in', () => {
    const shuffled = [ladder[2]!, ladder[0]!, ladder[1]!];
    const decision = calculatePayout({ views: 75_000, milestones: shuffled, earnedPaise: 0, remainingBudgetPaise: plenty });
    expect(decision.awardPaise).toBe(rupees(2_000));
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid view count %p', (views) => {
    expect(() => calculatePayout({ views, milestones: ladder, earnedPaise: 0, remainingBudgetPaise: plenty })).toThrow(
      RangeError,
    );
  });

  it('rejects negative earnings or budget', () => {
    expect(() => calculatePayout({ views: 1, milestones: ladder, earnedPaise: -1, remainingBudgetPaise: 0 })).toThrow(RangeError);
    expect(() => calculatePayout({ views: 1, milestones: ladder, earnedPaise: 0, remainingBudgetPaise: -5 })).toThrow(RangeError);
  });

  it('never moves more money than the remaining budget over a long sequence of updates', () => {
    let remaining = rupees(6_000);
    let earned = 0;
    for (const views of [10_000, 20_000, 55_000, 55_000, 120_000, 200_000]) {
      const decision = calculatePayout({ views, milestones: ladder, earnedPaise: earned, remainingBudgetPaise: remaining });
      earned += decision.awardPaise;
      remaining -= decision.awardPaise;
      expect(remaining).toBeGreaterThanOrEqual(0);
    }
    // 500 + 1,500 (to reach 2,000) + 3,000 (to reach 5,000) = 5,000; budget was 6,000.
    expect(earned).toBe(rupees(5_000));
    expect(remaining).toBe(rupees(1_000));
  });
});

describe('findHighestQualifiedMilestone / findNextMilestone', () => {
  it('finds the right rung', () => {
    expect(findHighestQualifiedMilestone(49_999, ladder)?.id).toBe('m1');
    expect(findHighestQualifiedMilestone(50_000, ladder)?.id).toBe('m2');
    expect(findNextMilestone(50_000, ladder)?.id).toBe('m3');
    expect(findNextMilestone(100_000, ladder)).toBeNull();
  });

  it('throws on negative views', () => {
    expect(() => findHighestQualifiedMilestone(-10, ladder)).toThrow(RangeError);
  });
});

describe('findLadderProblems', () => {
  it('accepts a well-formed ladder', () => {
    expect(findLadderProblems(ladder, rupees(10_000))).toEqual([]);
  });

  it('requires at least one milestone', () => {
    expect(findLadderProblems([])).toHaveLength(1);
  });

  it('rejects zero or negative thresholds and payouts', () => {
    expect(findLadderProblems([{ minViews: 0, payoutPaise: 100 }]).length).toBeGreaterThan(0);
    expect(findLadderProblems([{ minViews: 100, payoutPaise: -5 }]).length).toBeGreaterThan(0);
    expect(findLadderProblems([{ minViews: 1.5, payoutPaise: 100 }]).length).toBeGreaterThan(0);
  });

  it('rejects duplicate thresholds', () => {
    const problems = findLadderProblems([
      { minViews: 1_000, payoutPaise: 100 },
      { minViews: 1_000, payoutPaise: 200 },
    ]);
    expect(problems.join(' ')).toMatch(/same threshold/);
  });

  it('rejects payouts that do not increase with the threshold', () => {
    const problems = findLadderProblems([
      { minViews: 1_000, payoutPaise: 500 },
      { minViews: 2_000, payoutPaise: 500 },
    ]);
    expect(problems.join(' ')).toMatch(/increase/);
  });

  it('rejects a top payout larger than the budget', () => {
    const problems = findLadderProblems([{ minViews: 1_000, payoutPaise: 5_000 }], 4_999);
    expect(problems.join(' ')).toMatch(/budget/);
  });
});

describe('describePayoutProgress', () => {
  it('reports waiting_for_budget with the pending amount', () => {
    const progress = describePayoutProgress({
      views: 100_000,
      milestones: ladder,
      earnedPaise: 0,
      remainingBudgetPaise: rupees(3_000),
      campaignLive: true,
    });
    expect(progress.status).toBe('waiting_for_budget');
    expect(progress.pendingPaise).toBe(rupees(5_000));
  });

  it('reports progress toward the next milestone', () => {
    const progress = describePayoutProgress({
      views: 30_000,
      milestones: ladder,
      earnedPaise: rupees(500),
      remainingBudgetPaise: plenty,
      campaignLive: true,
    });
    expect(progress.status).toBe('earned');
    expect(progress.nextMilestone?.id).toBe('m2');
    expect(progress.progressToNext).toBeCloseTo(0.5, 5);
  });

  it('reports no_milestone_yet below the first rung', () => {
    const progress = describePayoutProgress({
      views: 100,
      milestones: ladder,
      earnedPaise: 0,
      remainingBudgetPaise: plenty,
      campaignLive: true,
    });
    expect(progress.status).toBe('no_milestone_yet');
    expect(progress.progressToNext).toBeCloseTo(0.01, 5);
  });

  it('reports a full bar at the top of the ladder', () => {
    const progress = describePayoutProgress({
      views: 500_000,
      milestones: ladder,
      earnedPaise: rupees(5_000),
      remainingBudgetPaise: plenty,
      campaignLive: true,
    });
    expect(progress.progressToNext).toBe(1);
    expect(progress.nextMilestone).toBeNull();
  });

  it('flags owed money on a campaign that is not live', () => {
    const progress = describePayoutProgress({
      views: 60_000,
      milestones: ladder,
      earnedPaise: 0,
      remainingBudgetPaise: plenty,
      campaignLive: false,
    });
    expect(progress.status).toBe('campaign_not_live');
  });
});
