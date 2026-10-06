import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Progress, StatusBadge } from "@/components/progress";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatBRL } from "@/lib/money";
import { formatDay, summarize } from "@/lib/purchases";

export default async function Home() {
  const me = await requireMember();
  const purchases = await db.purchase.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      buyer: { select: { name: true } },
      contributions: { select: { memberId: true, amountCents: true } },
    },
  });

  const rows = purchases.map((p) => ({ p, s: summarize(p, me) }));
  const pending = rows.filter((r) => r.s.myStatus === "pending");
  const pendingCents = pending.reduce((acc, r) => acc + r.s.shareCents, 0);

  return (
    <AppShell me={me} title="Compras">
      {pending.length > 0 && (
        <div className="card border-warn/40 bg-warn-soft">
          <p className="text-sm text-warn">
            Você ainda não contribuiu em <strong>{pending.length}</strong>{" "}
            {pending.length === 1 ? "compra" : "compras"} — sugestão total de{" "}
            <strong>{formatBRL(pendingCents)}</strong>.
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card text-center">
          <p className="text-4xl" aria-hidden>🍪</p>
          <p className="mt-2 font-medium">Nenhuma compra registrada ainda</p>
          <p className="mt-1 text-sm text-muted">Comprou café ou bolacha? Registre e o pessoal contribui.</p>
          <Link href="/compras/nova" className="btn mt-4">Registrar compra</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ p, s }) => (
            <li key={p.id}>
              <Link href={`/compras/${p.id}`} className="card block space-y-3 active:bg-bg">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.description}</p>
                    <p className="text-sm text-muted">
                      {p.buyer.name} · {formatDay(p.purchasedAt)}
                    </p>
                  </div>
                  <p className="shrink-0 text-lg font-bold tabular-nums">{formatBRL(p.amountCents)}</p>
                </div>
                <Progress value={s.progress} />
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted tabular-nums">
                    {formatBRL(s.receivedCents)} de {formatBRL(s.expectedCents)}
                  </span>
                  {s.myStatus === "pending" ? (
                    <span className="font-medium text-warn">Sugestão {formatBRL(s.shareCents)}</span>
                  ) : (
                    <StatusBadge status={s.myStatus} />
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
