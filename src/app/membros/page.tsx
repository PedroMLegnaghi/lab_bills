import { setMemberActive } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { PixKeyForm } from "@/components/pix-key";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";

const joinedFmt = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });

export default async function MembersPage() {
  const me = await requireMember();
  const members = await db.member.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  const activeCount = members.filter((m) => m.active).length;
  const myPixKey = members.find((m) => m.id === me.id)?.pixKey ?? null;

  return (
    <AppShell me={me} title="Membros">
      <PixKeyForm current={myPixKey} />
      <p className="text-sm text-muted">
        {activeCount} {activeCount === 1 ? "membro ativo" : "membros ativos"}. Só membros ativos entram na divisão
        de novas compras — desative quem saiu do lab. Compras já registradas não mudam.
      </p>
      <ul className="card divide-y divide-border py-0">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className={`truncate font-medium ${m.active ? "" : "text-muted line-through"}`}>
                {m.name} {m.id === me.id && <span className="text-xs font-normal text-muted">(você)</span>}
              </p>
              <p className="text-xs text-muted">
                desde {joinedFmt.format(m.createdAt)}
                {m.pixKey ? " · Pix cadastrado" : ""}
              </p>
            </div>
            <form action={setMemberActive}>
              <input type="hidden" name="memberId" value={m.id} />
              <input type="hidden" name="active" value={String(!m.active)} />
              <button
                type="submit"
                className={`rounded-full border px-3 py-1 text-sm ${m.active ? "border-border text-muted" : "border-accent text-accent"}`}
              >
                {m.active ? "Desativar" : "Reativar"}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
