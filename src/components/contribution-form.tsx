"use client";

import { useActionState, useState } from "react";
import { createContribution } from "@/app/actions";
import { FormError, ReceiptInput, SubmitButton } from "./form-bits";

/**
 * The page renders this with `key={number of contributions}`, so a successful submit (which adds
 * one and revalidates the page) remounts the form empty — no reset logic needed here.
 */
export function ContributionForm({
  purchaseId,
  suggestion,
  quickPicks,
}: {
  purchaseId: string;
  /** Pre-filled value, in input format ("12,50"). */
  suggestion: string;
  quickPicks: { label: string; value: string }[];
}) {
  const [state, action] = useActionState(createContribution, undefined);
  const [amount, setAmount] = useState(suggestion);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="purchaseId" value={purchaseId} />
      <div>
        <label className="label" htmlFor="amount">Quanto você vai contribuir?</label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">R$</span>
          <input
            id="amount"
            name="amount"
            className="field pl-10 text-lg font-semibold tabular-nums"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {quickPicks.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => setAmount(q.value)}
              className={`rounded-full border px-3 py-1 text-sm ${amount === q.value ? "border-accent bg-accent/10 text-accent" : "border-border text-muted"}`}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>
      <ReceiptInput name="receipt" label="Comprovante do pagamento (opcional)" />
      <div>
        <label className="label" htmlFor="note">Observação (opcional)</label>
        <input id="note" name="note" className="field" maxLength={200} placeholder="Paguei por Pix" />
      </div>
      <FormError message={state?.error} />
      <SubmitButton pending="Registrando…">Registrar contribuição</SubmitButton>
    </form>
  );
}
