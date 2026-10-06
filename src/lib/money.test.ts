import { describe, expect, it } from "vitest";
import {
  centsToInput,
  expectedFromOthersCents,
  formatBRL,
  parseBRL,
  suggestedShareCents,
  sumCents,
} from "./money";

describe("parseBRL", () => {
  it.each([
    ["12", 1200],
    ["12,5", 1250],
    ["12,50", 1250],
    ["0,99", 99],
    ["1.234,56", 123456],
    ["1234,56", 123456],
    ["R$ 12,50", 1250],
    ["12.50", 1250],
    ["12.5", 1250],
    ["1.234", 123400],
    [" 7 ", 700],
  ])("%s -> %i cents", (input, cents) => {
    expect(parseBRL(input)).toBe(cents);
  });

  it.each(["", "abc", "0", "0,00", "-5", "12,345", "1,2,3", "12.", ",50", "1.23.4"])(
    "rejects %j",
    (input) => {
      expect(parseBRL(input)).toBeNull();
    },
  );
});

describe("formatting", () => {
  it("formats cents as BRL", () => {
    // Intl uses a non-breaking space between the symbol and the number.
    expect(formatBRL(123456).replace(/\s/g, " ")).toBe("R$ 1.234,56");
  });

  it("round-trips through the input format", () => {
    for (const cents of [1, 99, 100, 1250, 123456]) {
      expect(parseBRL(centsToInput(cents))).toBe(cents);
    }
  });
});

describe("split", () => {
  it("rounds the suggested share up to the cent", () => {
    expect(suggestedShareCents(1000, 3)).toBe(334);
    expect(suggestedShareCents(900, 3)).toBe(300);
  });

  it("treats a zero split as the buyer alone", () => {
    expect(suggestedShareCents(1000, 0)).toBe(1000);
    expect(expectedFromOthersCents(1000, 0)).toBe(0);
  });

  it("expects every share but the buyer's", () => {
    expect(expectedFromOthersCents(900, 3)).toBe(600);
    expect(expectedFromOthersCents(1000, 1)).toBe(0);
  });

  it("never expects more than the total", () => {
    // 1 cent split 3 ways: share rounds up to 1, two others would owe 2 > total.
    expect(expectedFromOthersCents(1, 3)).toBe(1);
  });

  it("sums amounts", () => {
    expect(sumCents([{ amountCents: 100 }, { amountCents: 250 }])).toBe(350);
    expect(sumCents([])).toBe(0);
  });
});
