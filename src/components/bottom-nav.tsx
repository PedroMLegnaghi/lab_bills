"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Compras", icon: "🛒" },
  { href: "/compras/nova", label: "Nova", icon: "＋", primary: true },
  { href: "/resumo", label: "Resumo", icon: "📊" },
  { href: "/membros", label: "Membros", icon: "👥" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || (pathname.startsWith("/compras/") && pathname !== "/compras/nova") : pathname === href;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-xs ${isActive(item.href) ? "font-semibold text-accent" : "text-muted"}`}
            >
              <span
                aria-hidden
                className={
                  "primary" in item
                    ? "flex h-8 w-8 items-center justify-center rounded-full bg-accent text-lg text-accent-fg"
                    : "text-xl leading-8"
                }
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
