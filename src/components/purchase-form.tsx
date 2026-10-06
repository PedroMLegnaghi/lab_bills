"use client";

import { useActionState } from "react";
import { createPurchase } from "@/app/actions";
import { FormError, ReceiptInput, SubmitButton } from "./form-bits";

export function PurchaseForm({ today, activeMembers }: { today: string; activeMembers: number }) {
  const [state, action] = useActionState(createPurchase, undefined);
  return (
    <form action={action} className="card space-y-4">
      <div>
        <label className="label" htmlFor="description">O que você comprou?</label>
        <input
          id="description"
          name="description"
          className="field"
          placeholder="Café, bolachas e balas"
          maxLength={200}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="amount">Valor total</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">R$</span>
            <input
              id="amount"
              name="amount"
              className="field pl-10 tabular-nums"
              inputMode="decimal"
              placeholder="0,00"
              autoComplete="off"
              required
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="purchasedAt">Data</label>
          <input id="purchasedAt" name="purchasedAt" type="date" className="field" defaultValue={today} max={today} required />
        </div>
      </div>
      <ReceiptInput name="receipt" label="Comprovante da compra" required />
      <p className="text-xs text-muted">
        O valor será dividido entre os {activeMembers} membros ativos (você incluso) como sugestão —
        cada um contribui com quanto quiser.
      </p>
      <FormError message={state?.error} />
      <SubmitButton pending="Enviando…">Registrar compra</SubmitButton>
    </form>
  );
}
