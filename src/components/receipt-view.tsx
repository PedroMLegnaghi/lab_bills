import { isImageReceipt } from "@/lib/uploads";

export function ReceiptView({ file }: { file: string }) {
  const href = `/comprovantes/${file}`;
  if (!isImageReceipt(file)) {
    return (
      <a href={href} target="_blank" rel="noopener" className="btn-ghost border border-border">
        📄 Abrir comprovante
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener" className="block overflow-hidden rounded-xl border border-border">
      {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated route, not optimizable */}
      <img src={href} alt="Comprovante" className="max-h-80 w-full bg-bg object-contain" />
    </a>
  );
}

export function ReceiptLink({ file }: { file: string }) {
  return (
    <a href={`/comprovantes/${file}`} target="_blank" rel="noopener" className="text-sm font-medium text-accent">
      comprovante
    </a>
  );
}
