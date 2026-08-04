import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  Terminal,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MemoryPlayground } from "@/components/memory/playground";
import { getSkill } from "@/lib/catalog";

export const Route = createFileRoute("/listings/$id")({
  component: SkillListingPage,
});

function SkillListingPage() {
  const { id } = Route.useParams();
  const skill = getSkill(id);
  if (!skill) {
    throw notFound();
  }

  // Proper listing H1 = name (never when_to_use)
  const title = skill.name;

  return (
    <AppShell title="Skill listing">
      <main className="mx-auto max-w-6xl space-y-8 overflow-x-hidden px-4 py-8 sm:px-6">
        <Link
          to="/marketplace"
          className="inline-flex h-10 items-center gap-2 text-sm text-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" />
          Marketplace
        </Link>

        <header className="space-y-4 border-b border-border pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              {skill.depth === "outline_only" ? "Outline" : skill.depth}
            </span>
            <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-medium text-muted">
              {skill.category}
            </span>
            {skill.runtime_live ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-medium text-fg">
                <Zap className="size-3" />
                Runtime live
              </span>
            ) : null}
            {skill.featured ? (
              <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-medium text-muted">
                Featured
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted">
              {skill.summary}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-lg text-fg">{skill.price_label}</p>
              <p className="text-xs text-subtle">
                {skill.pricing_model === "per_call"
                  ? "Exact per-call atomic USDC — no subscription"
                  : "One-time unlock · free outline first"}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {skill.runtime_live ? (
                <a
                  href="#playground"
                  className="inline-flex h-11 min-h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg"
                >
                  Open playground
                </a>
              ) : (
                <button
                  type="button"
                  className="inline-flex h-11 min-h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg"
                >
                  {skill.depth === "outline_only"
                    ? "Outline only — no sealed unlock"
                    : "Unlock (demo)"}
                </button>
              )}
              <a
                href={
                  skill.id === "agent-memory"
                    ? "/api/skills/agent-memory/outline"
                    : `/api/catalog?id=${skill.id}`
                }
                className="inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-5 text-sm font-medium"
              >
                <FileText className="size-4" />
                Free outline
              </a>
            </div>
          </div>

          <p className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted">
            <span className="font-medium text-fg">When to use: </span>
            {skill.when_to_use}
          </p>
        </header>

        {skill.honesty ? (
          <div className="flex items-start gap-2 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
            <p>
              <strong className="font-medium text-fg">Honesty: </strong>
              durability {skill.honesty.durability ?? "unspecified"}
              {skill.honesty.sla === false ? " · no SLA" : null}
              {skill.honesty.trust_scan_passed === false
                ? " · trust scan not claimed"
                : null}
              .
            </p>
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold">Listing contract</h2>
            <ul className="mt-3 space-y-2 break-all text-sm text-muted">
              <li>
                id: <code className="text-fg">{skill.id}</code>
              </li>
              <li>
                seal: <code className="text-fg">{skill.seal}</code>
              </li>
              <li>
                tier: <code className="text-fg">{skill.tier}</code>
              </li>
              <li>
                implementation:{" "}
                <code className="text-fg">{skill.implementation_quality}</code>
              </li>
              <li>
                sample:{" "}
                <code className="text-fg">
                  {skill.sample_available ? "available" : "none"}
                </code>
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Terminal className="size-4" />
              Agent recipe
            </h2>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-border bg-bg p-3 font-mono text-[11px] leading-relaxed text-muted">
{`# 1 free outline
curl -s /api/catalog?id=${skill.id}

# 2 shop entry
curl -s /api/shop | jq .next_action

# 3 ${skill.runtime_live ? "runtime (memory)" : "pay challenge (demo host)"}
${
  skill.runtime_live
    ? `curl -si -X POST /api/memory/pricing`
    : `# Settle USDC on Base then POST payment proof`
}`}
            </pre>
          </div>
        </section>

        {skill.id === "agent-memory" ? (
          <section id="playground" className="scroll-mt-20 space-y-4 border-t border-border pt-8">
            <MemoryPlayground />
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}
