import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/layout/app-shell";
import { InventoryBar } from "@/components/marketplace/inventory-bar";
import { SkillCard } from "@/components/marketplace/skill-card";
import {
  defaultHubVisible,
  getInventoryCounts,
  listCategories,
  SKILLS,
  toSlim,
} from "@/lib/catalog";

const searchSchema = z.object({
  buy: z.string().optional(),
  q: z.string().optional(),
  cat: z.string().optional(),
  depth: z.enum(["default", "all", "deep", "standard", "outline_only"]).optional(),
});

export const Route = createFileRoute("/marketplace")({
  validateSearch: searchSchema,
  component: MarketplacePage,
});

function MarketplacePage() {
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const [cat, setCat] = useState(search.cat ?? "All");
  const [depthMode, setDepthMode] = useState<
    "default" | "all" | "deep" | "standard" | "outline_only"
  >(search.depth ?? "default");

  const counts = getInventoryCounts();
  const categories = ["All", ...listCategories()];

  const filtered = useMemo(() => {
    let list = [...SKILLS];
    if (depthMode === "default") {
      list = list.filter(defaultHubVisible);
    } else if (depthMode !== "all") {
      list = list.filter((s) => s.depth === depthMode);
    }
    if (cat !== "All") list = list.filter((s) => s.category === cat);
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.summary.toLowerCase().includes(query) ||
          s.id.includes(query) ||
          s.category.toLowerCase().includes(query),
      );
    }
    return list
      .sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        if (a.depth !== b.depth) {
          const order = { deep: 0, standard: 1, outline_only: 2 };
          return order[a.depth] - order[b.depth];
        }
        return a.name.localeCompare(b.name);
      })
      .map(toSlim);
  }, [q, cat, depthMode]);

  const buyHighlight = search.buy;

  return (
    <AppShell title="Skill marketplace">
      <main className="mx-auto max-w-6xl space-y-8 overflow-x-hidden px-4 py-8 sm:px-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Browse · free outline · unlock with Base USDC
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            Default view shows Deep and Standard only. Outline-only packs are
            demoted by shelf rules and hidden until you opt in.
          </p>
        </div>

        <InventoryBar counts={counts} />

        {buyHighlight ? (
          <div className="rounded-xl border border-border bg-surface p-4 text-sm">
            <p className="font-medium">Start here — {buyHighlight}</p>
            <p className="mt-1 text-muted">
              Open the listing for free outline, then settle USDC on Base.
            </p>
            <Link
              to="/listings/$id"
              params={{ id: buyHighlight }}
              className="mt-3 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg"
            >
              Open listing
            </Link>
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search skills…"
              className="h-12 w-full rounded-md border border-border bg-surface pl-10 pr-3 text-sm outline-none focus:border-border-strong"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`h-10 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors ${
                  cat === c
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border bg-surface text-muted hover:text-fg"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["default", "Deep + Standard"],
                ["all", "All depths"],
                ["deep", "Deep"],
                ["standard", "Standard"],
                ["outline_only", "Outline only"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setDepthMode(value)}
                className={`h-9 rounded-md border px-3 text-xs font-medium ${
                  depthMode === value
                    ? "border-border-strong bg-surface-2 text-fg"
                    : "border-border bg-bg text-muted hover:text-fg"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-subtle">
          Showing{" "}
          <span className="font-mono text-fg tabular-nums">{filtered.length}</span>{" "}
          skills
          {depthMode === "default" ? " (outline-only hidden)" : null}
        </p>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <p className="text-sm font-medium">No skills match</p>
            <p className="mt-1 text-sm text-muted">
              Try another category or show All depths.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <SkillCard key={s.id} skill={s} />
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-border pt-6 text-sm">
          <a href="/api/catalog" className="text-muted underline-offset-4 hover:text-fg hover:underline">
            Slim catalog JSON
          </a>
          <a
            href="/api/catalog?full=1"
            className="text-muted underline-offset-4 hover:text-fg hover:underline"
          >
            Full catalog
          </a>
          <a href="/api/shop" className="text-muted underline-offset-4 hover:text-fg hover:underline">
            Agent shop
          </a>
          <a href="/api/inventory" className="text-muted underline-offset-4 hover:text-fg hover:underline">
            Inventory counts
          </a>
        </div>
      </main>
    </AppShell>
  );
}
