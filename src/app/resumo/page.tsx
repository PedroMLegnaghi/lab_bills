import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/money";
import { formatDay, summarize } from "@/lib/purchases";

export default async function SummaryPage() {
  const me = await requireMember();
  const [members, purchases] = await Promise.all([
    db.member.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.purchase.findMany({
      orderBy: { createdAt: "desc" },
      include: { contributions: { select: { memberId: true, amountCents: true } } },
    }),
  ]);

  // Per member: what they spent buying, got back from others, and gave to others' purchases.
  const totals = new Map(members.map((m) => [m.id, { spent: 0, received: 0, contributed: 0 }]));
  for (const p of purchases) {
    const buyer = totals.get(p.buyerId)!;
    buyer.spent += p.amountCents;
    for (const c of p.contributions) {
      buyer.received += c.amountCents;
      totals.get(c.memberId)!.contributed += c.amountCents;
    }
  }
  const outOfPocket = (t: { spent: number; received: number; contributed: number }) =>
    t.spent - t.received + t.contributed;

  const mine = totals.get(me.id)!;
  const pending = purchases.map((p) => ({ p, s: summarize(p, me) })).filter((r) => r.s.myStatus === "pending");
  const grandTotal = purchases.reduce((acc, p) => acc + p.amountCents, 0);

  return (
    <AppShell me={me} title="Resumo">
      <section className="card space-y-3">
        <h2 className="font-semibold">Você</h2>
        <dl className="grid grid-cols-3 gap-2 text-center text-sm">
          {[
            ["Comprou", mine.spent],
            ["Recebeu", mine.received],
            ["Contribuiu", mine.contributed],
          ].map(([label, cents]) => (
            <div key={label} className="rounded-xl bg-bg p-2">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-semibold tabular-nums">{formatBRL(cents as number)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted">
          Do seu bolso, no total: <strong className="text-fg">{formatBRL(outOfPocket(mine))}</strong>
        </p>
      </section>

      {pending.length > 0 && (
        <section className="card">
          <h2 className="mb-2 font-semibold">Pendentes para você</h2>
          <ul className="divide-y divide-border">
            {pending.map(({ p, s }) => (
              <li key={p.id}>
                <Link href={`/compras/${p.id}`} className="flex justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    {p.description} <span className="text-muted">· {formatDay(p.purchasedAt)}</span>
                  </span>
                  <span className="shrink-0 font-medium text-warn tabular-nums">{formatBRL(s.shareCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2 className="font-semibold">Lab</h2>
        <p className="mb-3 text-sm text-muted">
          {purchases.length} {purchases.length === 1 ? "compra" : "compras"} · {formatBRL(grandTotal)} no total
        </p>
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-1 font-medium">Membro</th>
                <th className="py-1 text-right font-medium">Comprou</th>
                <th className="py-1 text-right font-medium">Contribuiu</th>
                <th className="py-1 text-right font-medium">Do bolso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((m) => {
                const t = totals.get(m.id)!;
                return (
                  <tr key={m.id} className={m.id === me.id ? "font-semibold" : ""}>
                    <td className="max-w-24 truncate py-2">{m.name}</td>
                    <td className="py-2 text-right tabular-nums">{formatBRL(t.spent)}</td>
                    <td className="py-2 text-right tabular-nums">{formatBRL(t.contributed)}</td>
                    <td className="py-2 text-right tabular-nums">{formatBRL(outOfPocket(t))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">“Do bolso” = comprou − recebeu + contribuiu.</p>
      </section>
    </AppShell>
  );
}
