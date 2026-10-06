import { getCurrentMember } from "@/lib/auth";
import { readReceipt } from "@/lib/uploads";

export async function GET(_req: Request, ctx: RouteContext<"/comprovantes/[file]">) {
  if (!(await getCurrentMember())) return new Response("Não autorizado", { status: 401 });
  const { file } = await ctx.params;
  const receipt = await readReceipt(file);
  if (!receipt) return new Response("Não encontrado", { status: 404 });
  return new Response(receipt.body, {
    headers: {
      "Content-Type": receipt.mime,
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      // Private: receipts must not land in a shared cache. Immutable: a name is never reused.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
