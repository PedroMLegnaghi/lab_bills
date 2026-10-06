// All amounts are integer cents. Strings exist only at the edges: parsing what a member typed,
// and formatting for display.

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/** Value for an `<input>`: "12,50", no currency symbol, no thousands separator. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * Parses what a member typed into cents. Accepts "12", "12,5", "12,50", "1.234,56",
 * "R$ 12,50", "12.50" and "1.234". Returns null for anything else, and for zero or less.
 *
 * With a comma present, the comma is the decimal separator and dots group thousands (pt-BR).
 * Without one, a dot followed by exactly three digits per group is a thousands separator,
 * otherwise it is the decimal point (what a phone keyboard in English locale produces).
 */
export function parseBRL(input: string): number | null {
  const s = input.replace(/R\$|\s/g, "");
  let normalized: string;
  if (s.includes(",")) {
    if (!/^\d{1,3}(\.\d{3})*,\d{1,2}$|^\d+,\d{1,2}$/.test(s)) return null;
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    normalized = s.replace(/\./g, "");
  } else if (/^\d+(\.\d{1,2})?$/.test(s)) {
    normalized = s;
  } else {
    return null;
  }
  const [whole, frac = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

/** What each person is asked to put in: the total split evenly, rounded up to the cent. */
export function suggestedShareCents(totalCents: number, splitCount: number): number {
  return Math.ceil(totalCents / Math.max(1, splitCount));
}

/**
 * How much the buyer should get back from everyone else. The buyer is one of the shares, so
 * this is every share but theirs, capped at the total (rounding up must never ask for more
 * than was spent).
 */
export function expectedFromOthersCents(totalCents: number, splitCount: number): number {
  const others = Math.max(0, splitCount - 1);
  return Math.min(totalCents, suggestedShareCents(totalCents, splitCount) * others);
}

export function sumCents(items: readonly { amountCents: number }[]): number {
  return items.reduce((acc, i) => acc + i.amountCents, 0);
}
