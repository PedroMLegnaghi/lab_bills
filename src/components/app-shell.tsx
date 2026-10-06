import { signOut } from "@/app/actions";
import type { CurrentMember } from "@/lib/auth";
import { BottomNav } from "./bottom-nav";

export function AppShell({ me, title, children }: { me: CurrentMember; title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg/90 px-4 py-3 backdrop-blur">
        <h1 className="truncate text-lg font-bold">{title}</h1>
        <form action={signOut} className="flex shrink-0 items-center gap-1">
          <span className="max-w-32 truncate text-sm text-muted">{me.name}</span>
          <button className="btn-ghost" type="submit">Sair</button>
        </form>
      </header>
      <main className="space-y-4 px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}
