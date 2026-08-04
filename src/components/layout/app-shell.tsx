import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, Activity, BookOpen, Brain, LayoutGrid, Home } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type NavItem =
  | { kind: "path"; to: "/"; label: string; icon: typeof Home }
  | { kind: "path"; to: "/marketplace"; label: string; icon: typeof LayoutGrid }
  | { kind: "path"; to: "/status"; label: string; icon: typeof Activity }
  | {
      kind: "skill";
      id: string;
      label: string;
      icon: typeof Brain;
      matchPrefix: string;
    };

const NAV: NavItem[] = [
  { kind: "path", to: "/", label: "Home", icon: Home },
  { kind: "path", to: "/marketplace", label: "Marketplace", icon: LayoutGrid },
  {
    kind: "skill",
    id: "agent-memory",
    label: "Agent Memory",
    icon: Brain,
    matchPrefix: "/listings/agent-memory",
  },
  { kind: "path", to: "/status", label: "Status", icon: Activity },
];

export function AppShell({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function isActive(item: NavItem) {
    if (item.kind === "skill") {
      return pathname === item.matchPrefix || pathname.startsWith(item.matchPrefix + "/");
    }
    if (item.to === "/") return pathname === "/";
    return pathname === item.to || pathname.startsWith(item.to + "/");
  }

  return (
    <div className="min-h-[calc(100dvh-var(--grok-banner-h,0px))] overflow-x-hidden bg-bg text-fg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex size-11 items-center justify-center rounded-md border border-border bg-surface text-fg sm:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <Link to="/" className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-xs font-semibold tracking-wide">
                LVL
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold tracking-tight">
                  LVL LTD
                </span>
                <span className="hidden truncate text-xs text-subtle sm:block">
                  x402 agent skill market
                </span>
              </span>
            </Link>
          </div>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV.map((item) => {
              const active = isActive(item);
              const className = `inline-flex h-10 items-center rounded-md px-3 text-sm font-medium transition-colors ${
                active
                  ? "bg-surface-2 text-fg"
                  : "text-muted hover:bg-surface hover:text-fg"
              }`;
              if (item.kind === "skill") {
                return (
                  <Link
                    key={item.id}
                    to="/listings/$id"
                    params={{ id: item.id }}
                    className={className}
                  >
                    {item.label}
                  </Link>
                );
              }
              return (
                <Link key={item.to} to={item.to} className={className}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted sm:inline-flex">
              <span className="size-1.5 rounded-full bg-success" aria-hidden />
              Live · Base USDC
            </span>
            <Link
              to="/listings/$id"
              params={{ id: "agent-x402-first-buy" }}
              className="inline-flex h-10 min-h-10 items-center justify-center rounded-md bg-accent px-3.5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 sm:px-4"
            >
              $0.05 canary
            </Link>
          </div>
        </div>

        {open && (
          <div className="border-t border-border bg-surface md:hidden">
            <nav
              className="mx-auto flex max-w-6xl flex-col gap-1 px-3 py-3"
              aria-label="Mobile"
            >
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                const className = `flex h-12 min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium ${
                  active
                    ? "bg-surface-2 text-fg"
                    : "text-muted hover:bg-surface-2 hover:text-fg"
                }`;
                if (item.kind === "skill") {
                  return (
                    <Link
                      key={item.id}
                      to="/listings/$id"
                      params={{ id: item.id }}
                      className={className}
                    >
                      <Icon className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                }
                return (
                  <Link key={item.to} to={item.to} className={className}>
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
              <a
                href="/api/catalog"
                className="flex h-12 min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg"
              >
                <BookOpen className="size-4 shrink-0" />
                catalog.json (slim)
              </a>
            </nav>
          </div>
        )}
      </header>

      {title ? (
        <div className="border-b border-border bg-surface/40">
          <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
            <p className="text-xs font-medium uppercase tracking-wider text-subtle">
              {title}
            </p>
          </div>
        </div>
      ) : null}

      {children}
    </div>
  );
}
