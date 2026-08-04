import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { InventoryBar } from "@/components/marketplace/inventory-bar";
import { SkillCard } from "@/components/marketplace/skill-card";
import { getInventoryCounts, SKILLS, toSlim } from "@/lib/catalog";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  const [guideOpen, setGuideOpen] = useState(false);
  const counts = getInventoryCounts();
  const featured = SKILLS.filter((s) => s.featured).slice(0, 6).map(toSlim);

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl space-y-12 overflow-x-hidden px-4 py-8 sm:px-6 sm:py-12">
        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="min-w-0 space-y-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
              <span className="size-1.5 rounded-full bg-success" aria-hidden />
              Live on Base · USDC · x402
            </p>
            <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-fg sm:text-4xl sm:leading-tight">
              x402 AI agent skills.
              <span className="block text-muted">Free outline. Honest depth.</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Free outlines before you spend. One-time USDC unlocks on Base — same
              rails for humans and agents shopping over HTTP. Outline-only packs
              are never featured.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/marketplace"
                className="inline-flex h-12 min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-6 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90"
              >
                Browse marketplace
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/listings/$id"
                params={{ id: "agent-x402-first-buy" }}
                className="inline-flex h-12 min-h-11 items-center justify-center rounded-md border border-border bg-surface px-6 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
              >
                $0.05 canary unlock
              </Link>
            </div>
            <p className="text-sm text-subtle">
              Path: free outline → pay USDC on Base → sealed pack · same prices forever
            </p>
          </div>

          <div className="min-w-0 space-y-3">
            <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2">
                  <Brain className="size-4 text-fg" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Flagship runtime</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Agent Memory is live — per-call x402, wallet isolation, exact
                    atomic pricing. Best-effort durability, no fake SLA.
                  </p>
                  <Link
                    to="/listings/$id"
                    params={{ id: "agent-memory" }}
                    className="mt-3 inline-flex h-10 items-center gap-1.5 text-sm font-medium text-fg underline-offset-4 hover:underline"
                  >
                    Open runtime playground
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <button
                type="button"
                onClick={() => setGuideOpen((v) => !v)}
                className="flex h-12 w-full items-center justify-between gap-3 px-4 text-left text-sm font-medium"
                aria-expanded={guideOpen}
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="size-4 text-muted" />
                  Skill guide
                  <span className="text-xs font-normal text-subtle">
                    humans · free outline first
                  </span>
                </span>
                {guideOpen ? (
                  <ChevronUp className="size-4 text-muted" />
                ) : (
                  <ChevronDown className="size-4 text-muted" />
                )}
              </button>
              {guideOpen ? (
                <div className="space-y-3 border-t border-border px-4 py-4 text-sm text-muted">
                  <p>
                    1. Read the free outline. 2. Pay exact USDC on Base. 3. Download
                    the sealed pack or call a live runtime.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to="/marketplace"
                      className="inline-flex h-10 items-center rounded-md border border-border bg-bg px-3 text-xs font-medium text-fg"
                    >
                      Marketplace
                    </Link>
                    <Link
                      to="/status"
                      className="inline-flex h-10 items-center rounded-md border border-border bg-bg px-3 text-xs font-medium text-fg"
                    >
                      Status / identity
                    </Link>
                    <a
                      href="/api/shop"
                      className="inline-flex h-10 items-center rounded-md border border-border bg-bg px-3 text-xs font-medium text-fg"
                    >
                      /api/shop
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <InventoryBar counts={counts} />

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Featured deep skills</h2>
              <p className="mt-1 text-sm text-muted">
                Featured requires sealed runtime or useful sealed pack — outline-only
                never appears here.
              </p>
            </div>
            <Link
              to="/marketplace"
              className="inline-flex h-10 items-center text-sm font-medium text-muted hover:text-fg"
            >
              View all
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((s) => (
              <SkillCard key={s.id} skill={s} />
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "Honest shelf",
              body: "Outline-only demoted from premium/featured. Depth badges mean sealed content.",
            },
            {
              icon: Zap,
              title: "Slim catalog",
              body: "Agents fetch /api/catalog (slim by default) — not a multi-megabyte dump.",
            },
            {
              icon: Wallet,
              title: "One counter source",
              body: "Inventory, unlocks, and depth counts share one module across every page.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <card.icon className="size-4 text-muted" />
              <h3 className="mt-3 text-sm font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{card.body}</p>
            </div>
          ))}
        </section>

        <footer className="border-t border-border pt-6 text-xs text-subtle">
          <p>
            LVL LTD · x402 · Base USDC · agent commerce · not a merch store · confirmed
            volume only on the proof ledger
          </p>
        </footer>
      </main>
    </AppShell>
  );
}
