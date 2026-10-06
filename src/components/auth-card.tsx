export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <div className="text-5xl" aria-hidden>☕</div>
        <h1 className="mt-2 text-2xl font-bold">Caixinha do Lab</h1>
        <p className="text-sm text-muted">{title}</p>
      </div>
      <div className="card">{children}</div>
    </main>
  );
}
