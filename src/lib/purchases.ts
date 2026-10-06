import { expectedFromOthersCents, suggestedShareCents, sumCents } from "./money";

type PurchaseLike = {
  buyerId: string;
  amountCents: number;
  splitCount: number;
  createdAt: Date;
  contributions: readonly { memberId: string; amountCents: number }[];
};

export type MyStatus = "buyer" | "paid" | "pending" | "not-asked";

/** Everything a screen needs to know about one purchase, from one member's point of view. */
export function summarize(p: PurchaseLike, me: { id: string; createdAt: Date }) {
  const shareCents = suggestedShareCents(p.amountCents, p.splitCount);
  const expectedCents = expectedFromOthersCents(p.amountCents, p.splitCount);
  const receivedCents = sumCents(p.contributions);
  const myCents = sumCents(p.contributions.filter((c) => c.memberId === me.id));

  let myStatus: MyStatus;
  if (p.buyerId === me.id) myStatus = "buyer";
  else if (myCents > 0) myStatus = "paid";
  // A purchase posted before this member joined was never split with them.
  else if (p.createdAt < me.createdAt) myStatus = "not-asked";
  else myStatus = "pending";

  return {
    shareCents,
    expectedCents,
    receivedCents,
    remainingCents: Math.max(0, expectedCents - receivedCents),
    progress: expectedCents === 0 ? 1 : Math.min(1, receivedCents / expectedCents),
    myCents,
    myStatus,
  };
}

const dayFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** purchasedAt is stored at noon UTC, so it is formatted in UTC to keep the calendar day. */
export const formatDay = (d: Date) => dayFmt.format(d);
export const formatDateTime = (d: Date) => dateTimeFmt.format(d);

export function todayInput(): string {
  // en-CA formats as YYYY-MM-DD, which is what <input type="date"> expects.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}
