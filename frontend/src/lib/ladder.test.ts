import { findLadderProblems, highestRungReached, sumOfRungsReached } from './ladder';

const rupees = (n: number) => n * 100;
const ladder = [
  { minViews: 10_000, payoutPaise: rupees(500) },
  { minViews: 50_000, payoutPaise: rupees(2_000) },
  { minViews: 100_000, payoutPaise: rupees(5_000) },
];

describe('highestRungReached', () => {
  it('returns null below the first rung', () => {
    expect(highestRungReached(9_999, ladder)).toBeNull();
  });

  it('is inclusive at the threshold', () => {
    expect(highestRungReached(10_000, ladder)?.payoutPaise).toBe(rupees(500));
  });

  it('pays the highest rung, not the sum: 75,000 views is ₹2,000, not ₹2,500', () => {
    expect(highestRungReached(75_000, ladder)?.payoutPaise).toBe(rupees(2_000));
    expect(sumOfRungsReached(75_000, ladder)).toBe(rupees(2_500));
  });
});

describe('findLadderProblems (client-side mirror of the server rules)', () => {
  it('accepts a good ladder', () => {
    expect(findLadderProblems(ladder, rupees(10_000))).toEqual([]);
  });

  it('flags empty, duplicate, non-increasing and over-budget ladders', () => {
    expect(findLadderProblems([])).toHaveLength(1);
    expect(findLadderProblems([{ minViews: 5, payoutPaise: 1 }, { minViews: 5, payoutPaise: 2 }]).join(' ')).toMatch(/same view threshold/);
    expect(findLadderProblems([{ minViews: 5, payoutPaise: 9 }, { minViews: 6, payoutPaise: 9 }]).join(' ')).toMatch(/increase/);
    expect(findLadderProblems([{ minViews: 5, payoutPaise: 900 }], 800).join(' ')).toMatch(/budget/);
  });
});
