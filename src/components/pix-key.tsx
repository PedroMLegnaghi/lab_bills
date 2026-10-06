"use client";

import { useActionState, useRef, useState } from "react";
import { updatePixKey } from "@/app/actions";
import { FormError, SubmitButton } from "./form-bits";

/** A buyer's Pix key with a copy button, shown where others contribute. */
export function PixKeyCopy({ owner, pixKey }: { owner: string; pixKey: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      // Only exists in secure contexts: absent on http://<lab IP>:3000.
      await navigator.clipboard.writeText(pixKey);
    } catch {
      input.current?.select();
      document.execCommand("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl bg-bg p-3">
      <p className="text-xs text-muted">Pix de {owner}</p>
      <div className="mt-1 flex items-center gap-2">
        <input
          ref={input}
          readOnly
          value={pixKey}
          aria-label={`Chave Pix de ${owner}`}
          className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none"
          onFocus={(e) => e.target.select()}
        />
        <button type="button" onClick={copy} className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg">
          {copied ? "Copiado ✓" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

/** Edits the signed-in member's own Pix key. */
export function PixKeyForm({ current }: { current: string | null }) {
  const [state, action] = useActionState(updatePixKey, undefined);
  return (
    <form action={action} className="card space-y-3">
      <div>
        <label className="label" htmlFor="pixKey">Sua chave Pix</label>
        <input
          id="pixKey"
          name="pixKey"
          className="field"
          autoComplete="off"
          maxLength={77}
          defaultValue={current ?? ""}
          placeholder="CPF, e-mail, telefone ou aleatória"
        />
        <p className="mt-1 text-xs text-muted">
          Aparece para quem contribuir nas suas compras. Deixe vazio para remover.
        </p>
      </div>
      <FormError message={state?.error} />
      {state?.saved && <p className="text-sm text-ok">Chave salva.</p>}
      <SubmitButton pending="Salvando…">Salvar chave</SubmitButton>
    </form>
  );
}
