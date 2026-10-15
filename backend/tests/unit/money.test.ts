import { formatPaiseAsRupees, isValidPaise, MAX_CAMPAIGN_BUDGET_PAISE } from '../../src/utils/money';

describe('money helpers', () => {
  it('formats whole rupees with Indian digit grouping', () => {
    expect(formatPaiseAsRupees(1_00_00_000 * 100)).toBe('₹1,00,00,000');
    expect(formatPaiseAsRupees(50_000)).toBe('₹500');
  });

  it('shows paise only when present', () => {
    expect(formatPaiseAsRupees(1_250_050)).toBe('₹12,500.50');
    expect(formatPaiseAsRupees(5)).toBe('₹0.05');
  });

  it('validates paise as non-negative safe integers', () => {
    expect(isValidPaise(0)).toBe(true);
    expect(isValidPaise(100)).toBe(true);
    expect(isValidPaise(-1)).toBe(false);
    expect(isValidPaise(1.5)).toBe(false);
    expect(isValidPaise('100')).toBe(false);
  });

  it('keeps the maximum budget inside a signed 32-bit integer column', () => {
    expect(MAX_CAMPAIGN_BUDGET_PAISE).toBeLessThanOrEqual(2_147_483_647);
  });
});
