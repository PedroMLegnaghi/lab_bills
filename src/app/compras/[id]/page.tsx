import { notFound } from "next/navigation";
import { deleteContribution, deletePurchase } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { ContributionForm } from "@/components/contribution-form";
import { PixKeyCopy } from "@/components/pix-key";
import { Progress, StatusBadge } from "@/components/progress";
import { ReceiptLink, ReceiptView } from "@/components/receipt-view";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { centsToInput, formatBRL } from "@/lib/money";
import { formatDateTime, formatDay, summarize } from "@/lib/purchases";

export default async function PurchasePage({ params }: PageProps<"/compras/[id]">) {
  const me = await requireMember();
  const { id } = await params;
  const purchase = await db.purchase.findUnique({
    where: { id },
    include: {
      buyer: { select: { name: true, pixKey: true } },
      contributions: { orderBy: { createdAt: "asc" }, include: { member: { select: { name: true } } } },
    },
  });
  if (!purchase) notFound();

  const s = summarize(purchase, me);
  const isBuyer = purchase.buyerId === me.id;
  const quickPicks = [
    { label: `Sugestão ${formatBRL(s.shareCents)}`, value: centsToInput(s.shareCents) },
    ...(s.remainingCents > s.shareCents
      ? [{ label: `Tudo que falta ${formatBRL(s.remainingCents)}`, value: centsToInput(s.remainingCents) }]
      : []),
    ...[500, 1000].filter((c) => c !== s.shareCents).map((c) => ({ label: formatBRL(c), value: centsToInput(c) })),
  ];

  return (
    <AppShell me={me} title="Compra">
      <section className="card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{purchase.description}</h2>
            <p className="text-sm text-muted">
              {purchase.buyer.name} · {formatDay(purchase.purchasedAt)}
            </p>
          </div>
          <StatusBadge status={s.myStatus} />
        </div>
        <p className="text-3xl font-bold tabular-nums">{formatBRL(purchase.amountCents)}</p>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-bg p-3">
            <dt className="text-muted">Sugestão por pessoa</dt>
            <dd className="font-semibold tabular-nums">{formatBRL(s.shareCents)}</dd>
            <dd className="text-xs text-muted">÷ {purchase.splitCount} membros</dd>
          </div>
          <div className="rounded-xl bg-bg p-3">
            <dt className="text-muted">Falta arrecadar</dt>
            <dd className="font-semibold tabular-nums">{formatBRL(s.remainingCents)}</dd>
            <dd className="text-xs text-muted">de {formatBRL(s.expectedCents)}</dd>
          </div>
        </dl>
        <Progress value={s.progress} />
        <ReceiptView file={purchase.receiptFile} />
        {isBuyer && purchase.contributions.length === 0 && (
          <form action={deletePurchase}>
            <input type="hidden" name="purchaseId" value={purchase.id} />
            <button type="submit" className="btn-ghost w-full text-danger">Excluir compra</button>
          </form>
        )}
      </section>

      {!isBuyer && (
        <section className="card">
          <h2 className="mb-3 font-semibold">{s.myCents > 0 ? "Contribuir de novo" : "Contribuir"}</h2>
          <div className="mb-4">
            {purchase.buyer.pixKey ? (
              <PixKeyCopy owner={purchase.buyer.name} pixKey={purchase.buyer.pixKey} />
            ) : (
              <p className="rounded-xl bg-bg p-3 text-sm text-muted">
                {purchase.buyer.name} ainda não cadastrou uma chave Pix — combine direto com a pessoa.
              </p>
            )}
          </div>
          <ContributionForm
            key={purchase.contributions.length}
            purchaseId={purchase.id}
            suggestion={centsToInput(s.shareCents)}
            quickPicks={quickPicks}
          />
        </section>
      )}

      <section className="card">
        <h2 className="mb-3 font-semibold">
          Contribuições <span className="font-normal text-muted">({purchase.contributions.length})</span>
        </h2>
        {purchase.contributions.length === 0 ? (
          <p className="text-sm text-muted">Ninguém contribuiu ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {purchase.contributions.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium">{c.member.name}</p>
                  <p className="text-xs text-muted">{formatDateTime(c.createdAt)}</p>
                  {c.note && <p className="mt-1 text-sm text-muted">{c.note}</p>}
                  <div className="mt-1 flex items-center gap-3">
                    {c.receiptFile && <ReceiptLink file={c.receiptFile} />}
                    {c.memberId === me.id && (
                      <form action={deleteContribution}>
                        <input type="hidden" name="contributionId" value={c.id} />
                        <button type="submit" className="text-sm text-danger">desfazer</button>
                      </form>
                    )}
                  </div>
                </div>
                <p className="shrink-0 font-semibold tabular-nums">{formatBRL(c.amountCents)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
