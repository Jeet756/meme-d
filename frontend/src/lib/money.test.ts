import { formatPaise, formatPaiseCompact, paiseToRupeesInput, rupeesInputToPaise } from './money';

describe('rupeesInputToPaise', () => {
  it.each([
    ['5000', 500_000],
    ['5,000', 500_000],
    ['₹ 1,25,000', 12_500_000],
    ['0.5', 50],
    ['1250.05', 125_005],
    ['19.99', 1_999],
  ])('parses %p exactly', (input, expected) => {
    expect(rupeesInputToPaise(input)).toBe(expected);
  });

  it('avoids the classic floating-point trap (19.99 * 100 = 1998.9999...)', () => {
    expect(19.99 * 100).not.toBe(1999);
    expect(rupeesInputToPaise('19.99')).toBe(1999);
  });

  it.each([[''], ['abc'], ['-5'], ['1.234'], ['1e5'], ['.5']])('rejects %p', (input) => {
    expect(rupeesInputToPaise(input)).toBeNull();
  });
});

describe('formatting', () => {
  it('formats paise with Indian grouping', () => {
    expect(formatPaise(500_000)).toBe('₹5,000');
    expect(formatPaise(12_500_050)).toBe('₹1,25,000.50');
    expect(formatPaise(0)).toBe('₹0');
  });

  it('formats compact amounts', () => {
    expect(formatPaiseCompact(250_000)).toBe('₹2.5K');
    expect(formatPaiseCompact(1_20_00_000)).toBe('₹1.2L');
    expect(formatPaiseCompact(5_000)).toBe('₹50');
  });

  it('round-trips through the input helper', () => {
    expect(paiseToRupeesInput(125_005)).toBe('1250.05');
    expect(rupeesInputToPaise(paiseToRupeesInput(125_005))).toBe(125_005);
    expect(paiseToRupeesInput(500_000)).toBe('5000');
  });
});
