/** Money is an integer number of paise everywhere. These helpers never use floating-point arithmetic. */

const rupeeFormatter = new Intl.NumberFormat('en-IN');

export function formatPaise(paise: number): string {
  const rupees = Math.trunc(paise / 100);
  const remainder = Math.abs(paise % 100);
  const fraction = remainder === 0 ? '' : `.${String(remainder).padStart(2, '0')}`;
  return `₹${rupeeFormatter.format(rupees)}${fraction}`;
}

/** Compact form for chart axes and tight spaces: ₹2.5K, ₹1.2L, ₹3Cr. */
export function formatPaiseCompact(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 1_00_00_000) return `₹${trimZero(rupees / 1_00_00_000)}Cr`;
  if (rupees >= 1_00_000) return `₹${trimZero(rupees / 1_00_000)}L`;
  if (rupees >= 1_000) return `₹${trimZero(rupees / 1_000)}K`;
  return `₹${Math.round(rupees)}`;
}

function trimZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}

/**
 * Converts what a person types ("5,000", "1250.5") into paise by string parsing, not by multiplying a
 * float. Returns null for anything that is not a plain amount with at most two decimal places.
 */
export function rupeesInputToPaise(input: string): number | null {
  const cleaned = input.replace(/[,\s₹]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole = '0', fraction = ''] = cleaned.split('.');
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(paise) ? paise : null;
}

/** Inverse of rupeesInputToPaise for pre-filling inputs. */
export function paiseToRupeesInput(paise: number): string {
  const whole = Math.trunc(paise / 100);
  const remainder = paise % 100;
  return remainder === 0 ? String(whole) : `${whole}.${String(remainder).padStart(2, '0')}`;
}
