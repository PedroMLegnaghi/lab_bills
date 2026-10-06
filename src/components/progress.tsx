export function Progress({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="h-2 overflow-hidden rounded-full bg-border"
    >
      <div className={`h-full rounded-full ${pct >= 100 ? "bg-ok" : "bg-accent"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const STATUS = {
  buyer: { text: "Você comprou", cls: "bg-accent/15 text-accent" },
  paid: { text: "Você contribuiu", cls: "bg-ok-soft text-ok" },
  pending: { text: "Pendente", cls: "bg-warn-soft text-warn" },
  "not-asked": { text: "Antes de você entrar", cls: "bg-border/60 text-muted" },
} as const;

export function StatusBadge({ status }: { status: keyof typeof STATUS }) {
  const s = STATUS[status];
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.text}</span>;
}
