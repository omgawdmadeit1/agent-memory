import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { getInventoryCounts, PROOF } from "@/lib/catalog";

export const Route = createFileRoute("/status")({ component: StatusPage });

function StatusPage() {
  const counts = getInventoryCounts();

  return (
    <AppShell title="Status">
      <main className="mx-auto max-w-3xl space-y-8 overflow-x-hidden px-4 py-8 sm:px-6">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Current site status
          </h1>
          <p className="text-base leading-relaxed text-muted">
            Authoritative identity: <strong className="text-fg">x402 Agent Skill Market</strong>{" "}
            on Base USDC. Not a print-on-demand merch shop. Stale search results about
            apparel are from a retired brand iteration.
          </p>
        </div>

        <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-fg">
          Loop status: verified live demo host · shelf rules enforced · slim catalog
          default
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-subtle">
            Inventory (single source)
          </h2>
          <dl className="grid gap-2 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-subtle">First-party skills</dt>
              <dd className="font-mono text-fg">{counts.first_party}</dd>
            </div>
            <div>
              <dt className="text-subtle">Open market</dt>
              <dd className="font-mono text-fg">{counts.open_market}</dd>
            </div>
            <div>
              <dt className="text-subtle">Total inventory</dt>
              <dd className="font-mono text-fg">{counts.total}</dd>
            </div>
            <div>
              <dt className="text-subtle">Deep / Standard / Outline</dt>
              <dd className="font-mono text-fg">
                {counts.deep} / {counts.standard} / {counts.outline_only}
              </dd>
            </div>
            <div>
              <dt className="text-subtle">Featured (post shelf rules)</dt>
              <dd className="font-mono text-fg">{counts.featured}</dd>
            </div>
            <div>
              <dt className="text-subtle">Live runtimes</dt>
              <dd className="font-mono text-fg">{counts.runtime_live}</dd>
            </div>
          </dl>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-subtle">
            Proof ledger (no invented volume)
          </h2>
          <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
            <p>
              Confirmed unlocks:{" "}
              <span className="font-mono text-fg">{PROOF.confirmed_unlocks}</span>
            </p>
            <p className="mt-1">
              Volume:{" "}
              <span className="font-mono text-fg">
                ${PROOF.confirmed_volume_usd.toFixed(2)} {PROOF.asset}
              </span>
            </p>
            <p className="mt-1 break-all">
              Last: {PROOF.last_skill_id} ·{" "}
              <span className="font-mono text-xs">{PROOF.last_tx}</span>
            </p>
          </div>
        </section>

        <section className="space-y-2 text-sm text-muted">
          <h2 className="text-sm font-semibold text-fg">P0 improvements shipped here</h2>
          <ul className="list-inside list-disc space-y-1">
            <li>Slim catalog by default (`/api/catalog`)</li>
            <li>Single mobile nav (one hamburger)</li>
            <li>Skill guide closed by default on home</li>
            <li>Shelf rules: outline-only not featured / not premium</li>
            <li>Listing H1 uses skill name, not when_to_use</li>
            <li>Inventory counters from one module</li>
          </ul>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/marketplace"
            className="inline-flex h-11 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg"
          >
            Marketplace
          </Link>
          <a
            href="/api/proof"
            className="inline-flex h-11 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium"
          >
            /api/proof
          </a>
        </div>
      </main>
    </AppShell>
  );
}
