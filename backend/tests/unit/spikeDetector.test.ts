import { isSuspiciousViewSpike, SPIKE_RULES } from '../../src/modules/payouts/spikeDetector';

const now = new Date('2026-03-01T12:00:00Z');
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

describe('isSuspiciousViewSpike', () => {
  it('flags a huge jump from zero shortly after the last update', () => {
    expect(isSuspiciousViewSpike({ previousViews: 0, newViews: 80_000, previousUpdatedAt: minutesAgo(10), now })).toBe(true);
  });

  it('ignores small jumps even when the growth multiple is large', () => {
    expect(isSuspiciousViewSpike({ previousViews: 10, newViews: 5_000, previousUpdatedAt: minutesAgo(1), now })).toBe(false);
  });

  it('ignores large absolute jumps that are small relative to the existing audience', () => {
    expect(isSuspiciousViewSpike({ previousViews: 500_000, newViews: 540_000, previousUpdatedAt: minutesAgo(30), now })).toBe(false);
  });

  it('flags a tripling above the minimum jump', () => {
    expect(isSuspiciousViewSpike({ previousViews: 10_000, newViews: 30_000, previousUpdatedAt: minutesAgo(60), now })).toBe(true);
  });

  it('does not flag when the previous update is outside the time window', () => {
    const old = new Date(now.getTime() - SPIKE_RULES.windowMs - 1);
    expect(isSuspiciousViewSpike({ previousViews: 0, newViews: 80_000, previousUpdatedAt: old, now })).toBe(false);
  });

  it('does not flag decreases', () => {
    expect(isSuspiciousViewSpike({ previousViews: 90_000, newViews: 100, previousUpdatedAt: minutesAgo(5), now })).toBe(false);
  });
});
