/**
 * All money in Meme'd is an integer number of paise (1 rupee = 100 paise).
 * Integers are exact in JavaScript up to 2^53, so no rounding error can creep in.
 */

export const PAISE_PER_RUPEE = 100;

/** Hard ceiling for a single campaign budget: ₹1 crore. Keeps every amount inside a 32-bit INTEGER column. */
export const MAX_CAMPAIGN_BUDGET_PAISE = 1_00_00_000 * PAISE_PER_RUPEE;

export function isValidPaise(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/** Formats paise as an Indian-grouped rupee string, e.g. 1250050 -> "₹12,500.50". */
export function formatPaiseAsRupees(paise: number): string {
  const negative = paise < 0;
  const absolute = Math.abs(paise);
  const rupees = Math.floor(absolute / PAISE_PER_RUPEE);
  const remainder = absolute % PAISE_PER_RUPEE;
  const grouped = new Intl.NumberFormat('en-IN').format(rupees);
  const fraction = remainder === 0 ? '' : `.${String(remainder).padStart(2, '0')}`;
  return `${negative ? '-' : ''}₹${grouped}${fraction}`;
}
