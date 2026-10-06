"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { shrinkImage } from "@/lib/shrink-image";

// Mirrors MAX_RECEIPT_BYTES in src/lib/uploads.ts, which cannot be imported into the browser.
const MAX_BYTES = 4 * 1024 * 1024;

export function SubmitButton({ children, pending }: { children: React.ReactNode; pending: string }) {
  const { pending: isPending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={isPending}>
      {isPending ? pending : children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

/**
 * File picker styled as a large tap target, with a preview of the chosen photo. No `capture`
 * attribute on purpose: members often pick a Pix screenshot from the gallery, not the camera.
 */
export function ReceiptInput({ name, required, label }: { name: string; required?: boolean; label: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Revoke the last blob URL when it is replaced or the input unmounts.
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const picked = el.files?.[0] ?? null;
    if (!picked) {
      setFile(null);
      setPreview(null);
      return;
    }
    // Block submission while the photo is being shrunk, then swap the smaller file into the
    // input so a plain form submit sends it.
    el.setCustomValidity("Aguarde, otimizando a foto…");
    setBusy(true);
    const next = await shrinkImage(picked);
    if (next !== picked) {
      const dt = new DataTransfer();
      dt.items.add(next);
      el.files = dt.files;
    }
    el.setCustomValidity(next.size > MAX_BYTES ? "O arquivo passa de 4 MB." : "");
    setBusy(false);
    setFile(next);
    setPreview(next.type.startsWith("image/") ? URL.createObjectURL(next) : null);
  }

  return (
    <div>
      <span className="label">{label}</span>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-border bg-surface p-3 hover:border-accent">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview
          <img src={preview} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-bg text-2xl" aria-hidden>
            🧾
          </span>
        )}
        <span className="min-w-0 text-sm">
          <span className="block truncate font-medium">{file ? file.name : "Tirar foto ou escolher arquivo"}</span>
          <span className="text-muted">
            {busy
              ? "Otimizando a foto…"
              : file
                ? `${file.size > MAX_BYTES ? "Grande demais: " : ""}${(file.size / 1024 / 1024).toFixed(1)} MB`
                : "Imagem ou PDF, até 4 MB"}
          </span>
        </span>
        <input
          type="file"
          name={name}
          required={required}
          accept="image/*,application/pdf"
          className="sr-only"
          onChange={onChange}
        />
      </label>
    </div>
  );
}
