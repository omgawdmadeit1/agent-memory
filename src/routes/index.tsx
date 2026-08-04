import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Brain,
  Database,
  KeyRound,
  List,
  Loader2,
  Trash2,
  Wallet,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Copy,
  BookOpen,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: Home });

type Op = "remember" | "recall" | "list" | "forget";
type Scope = "private" | "shared" | "public";

const DEMO_WALLETS = [
  "0x1111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222",
] as const;

const PRICING_ROWS = [
  { op: "remember (≤1KB)", usd: "$0.002", atomic: "2000" },
  { op: "remember overage / KiB", usd: "$0.001", atomic: "1000" },
  { op: "recall", usd: "$0.001", atomic: "1000" },
  { op: "list", usd: "$0.0005", atomic: "500" },
  { op: "forget", usd: "$0.0005", atomic: "500" },
] as const;

function shortWallet(w: string) {
  return `${w.slice(0, 6)}…${w.slice(-4)}`;
}

function Home() {
  const [wallet, setWallet] = useState<string>(DEMO_WALLETS[0]);
  const [op, setOp] = useState<Op>("remember");
  const [key, setKey] = useState("prefs/theme");
  const [value, setValue] = useState("dark");
  const [prefix, setPrefix] = useState("prefs/");
  const [scope, setScope] = useState<Scope>("private");
  const [useDevPay, setUseDevPay] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [response, setResponse] = useState<string>("");
  const [pricingJson, setPricingJson] = useState<string>("");
  const [log, setLog] = useState<string[]>([]);

  const pushLog = useCallback((line: string) => {
    setLog((prev) => [line, ...prev].slice(0, 12));
  }, []);

  useEffect(() => {
    fetch("/api/memory/pricing")
      .then((r) => r.json())
      .then((j) => setPricingJson(JSON.stringify(j, null, 2)))
      .catch(() => setPricingJson("// pricing endpoint unavailable"));
  }, []);

  const body = useMemo(() => {
    if (op === "remember") return { key, value, scope };
    if (op === "list") return { prefix, scope, limit: 50 };
    return { key, scope };
  }, [op, key, value, prefix, scope]);

  async function runOp(withPayment: boolean) {
    setLoading(true);
    setStatus(null);
    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
        "x-wallet": wallet,
      };
      if (withPayment) {
        headers["x-payment"] = JSON.stringify(
          useDevPay
            ? { dev: true, op, skill: "agent-memory" }
            : { txHash: "0x" + "ab".repeat(32), skill: "agent-memory", op },
        );
      }
      const res = await fetch(`/api/memory/${op}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* raw */
      }
      setStatus(res.status);
      setResponse(pretty);
      pushLog(
        `${withPayment ? "paid" : "challenge"} ${op} → HTTP ${res.status} · ${shortWallet(wallet)}`,
      );
    } catch (e) {
      setStatus(0);
      setResponse(String(e));
      pushLog(`error ${op}: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  async function demoIsolation() {
    setLoading(true);
    try {
      await fetch("/api/memory/remember", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-wallet": DEMO_WALLETS[0],
          "x-payment": JSON.stringify({ dev: true, op: "remember" }),
        },
        body: JSON.stringify({
          key: "isolation/proof",
          value: "owned-by-wallet-1",
          scope: "private",
        }),
      });
      const r2 = await fetch("/api/memory/recall", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-wallet": DEMO_WALLETS[1],
          "x-payment": JSON.stringify({ dev: true, op: "recall" }),
        },
        body: JSON.stringify({ key: "isolation/proof", scope: "private" }),
      });
      const j2 = await r2.json();
      const r1 = await fetch("/api/memory/recall", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-wallet": DEMO_WALLETS[0],
          "x-payment": JSON.stringify({ dev: true, op: "recall" }),
        },
        body: JSON.stringify({ key: "isolation/proof", scope: "private" }),
      });
      const j1 = await r1.json();
      const report = {
        wallet1_recall: { status: r1.status, value: j1.value ?? null },
        wallet2_recall_same_key: {
          status: r2.status,
          error_code: j2.error_code ?? null,
          message: j2.message ?? null,
        },
        isolation_holds:
          r1.status === 200 &&
          j1.value === "owned-by-wallet-1" &&
          r2.status === 404,
      };
      setStatus(report.isolation_holds ? 200 : 500);
      setResponse(JSON.stringify(report, null, 2));
      pushLog(
        report.isolation_holds
          ? "isolation demo PASS — no cross-tenant leakage"
          : "isolation demo FAIL",
      );
    } catch (e) {
      setResponse(String(e));
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string) {
    void navigator.clipboard?.writeText(text);
  }

  return (
    <div className="min-h-[calc(100dvh-var(--grok-banner-h,0px))] overflow-x-hidden bg-bg text-fg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2">
              <Brain className="size-4 text-accent" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-subtle">
                LVL LTD · skill pack
              </p>
              <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
                agent-memory
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="rounded-full border border-border bg-surface px-2.5 py-1">
              x402 · Base USDC
            </span>
            <span className="rounded-full border border-border bg-surface px-2.5 py-1">
              per-call
            </span>
            <span className="rounded-full border border-border bg-surface px-2.5 py-1">
              best-effort
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 overflow-x-hidden px-4 py-8 sm:px-6 sm:py-12">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0 space-y-5">
            <p className="max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Persistent key-value memory for AI agents. Four ops —{" "}
              <span className="text-fg">remember</span>,{" "}
              <span className="text-fg">recall</span>,{" "}
              <span className="text-fg">list</span>,{" "}
              <span className="text-fg">forget</span> — wallet-scoped, metered
              per call in USDC on Base. No subscription.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#playground"
                className="inline-flex h-11 min-h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90"
              >
                Open playground
              </a>
              <a
                href="/api/memory/pricing"
                className="inline-flex h-11 min-h-11 items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
              >
                Live pricing JSON
              </a>
              <a
                href="/api/skills/agent-memory/outline"
                className="inline-flex h-11 min-h-11 items-center justify-center rounded-md border border-border bg-surface px-5 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
              >
                Outline
              </a>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-sm text-muted">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
              <p className="min-w-0">
                <strong className="font-medium text-fg">Honesty:</strong>{" "}
                best-effort storage — not SLA-backed. Trust scorecard badge is
                not claimed (scan pending). Pricing below is exact atomic USDC,
                not averages.
              </p>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium">
              <Database className="size-4 shrink-0 text-muted" />
              Exact per-call pricing
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[280px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-subtle">
                    <th className="pb-2 font-medium">Operation</th>
                    <th className="pb-2 font-medium">USD</th>
                    <th className="pb-2 font-medium">Atomic</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs sm:text-sm">
                  {PRICING_ROWS.map((row) => (
                    <tr key={row.op} className="border-b border-border/60">
                      <td className="py-2.5 pr-2 font-sans text-fg">{row.op}</td>
                      <td className="py-2.5 pr-2 text-info">{row.usd}</td>
                      <td className="py-2.5 text-muted">{row.atomic}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 break-all text-xs leading-relaxed text-subtle">
              Pay to <code className="text-muted">0xa008…A6ED</code> · USDC{" "}
              <code className="text-muted">0x8335…2913</code> · Base
            </p>
          </div>
        </section>

        <section id="playground" className="scroll-mt-8 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight">Playground</h2>
              <p className="mt-1 text-sm text-muted">
                Live API on this host. Demo payment uses{" "}
                <code className="break-all text-fg">X-PAYMENT: {"{dev:true}"}</code>{" "}
                — not mainnet settlement.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void demoIsolation()}
              disabled={loading}
              className="inline-flex h-11 min-h-11 items-center gap-2 rounded-md border border-border bg-surface-2 px-4 text-sm font-medium transition-colors hover:bg-surface-3 disabled:opacity-50"
            >
              <Shield className="size-4" />
              Run isolation demo
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="min-w-0 space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
              <label className="block space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-subtle">
                  <Wallet className="size-3.5" /> Caller wallet
                </span>
                <select
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  className="h-11 w-full max-w-full rounded-md border border-border bg-bg px-3 text-sm text-fg outline-none focus:border-border-strong"
                >
                  {DEMO_WALLETS.map((w) => (
                    <option key={w} value={w}>
                      {shortWallet(w)} — {w === DEMO_WALLETS[0] ? "Alice" : "Bob"}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  [
                    ["remember", Brain],
                    ["recall", BookOpen],
                    ["list", List],
                    ["forget", Trash2],
                  ] as const
                ).map(([name, Icon]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setOp(name)}
                    className={`flex h-11 min-h-11 items-center justify-center gap-1.5 rounded-md border text-sm font-medium transition-colors ${
                      op === name
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-border bg-bg text-muted hover:bg-surface-2 hover:text-fg"
                    }`}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="truncate">{name}</span>
                  </button>
                ))}
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-subtle">
                  Scope
                </span>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as Scope)}
                  className="h-11 w-full rounded-md border border-border bg-bg px-3 text-sm outline-none focus:border-border-strong"
                >
                  <option value="private">private (default)</option>
                  <option value="shared">shared (owner-bound v1)</option>
                  <option value="public">public (owner write)</option>
                </select>
              </label>

              {op !== "list" ? (
                <label className="block space-y-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-subtle">
                    <KeyRound className="size-3.5" /> Key
                  </span>
                  <input
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="h-11 w-full rounded-md border border-border bg-bg px-3 font-mono text-sm outline-none focus:border-border-strong"
                    spellCheck={false}
                  />
                </label>
              ) : (
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-subtle">
                    Prefix
                  </span>
                  <input
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    className="h-11 w-full rounded-md border border-border bg-bg px-3 font-mono text-sm outline-none focus:border-border-strong"
                    spellCheck={false}
                  />
                </label>
              )}

              {op === "remember" && (
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-subtle">
                    Value
                  </span>
                  <textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    rows={3}
                    className="w-full resize-y rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm outline-none focus:border-border-strong"
                  />
                </label>
              )}

              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={useDevPay}
                  onChange={(e) => setUseDevPay(e.target.checked)}
                  className="size-4 rounded border-border"
                />
                Use demo payment ({`{dev:true}`})
              </label>

              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void runOp(false)}
                  className="inline-flex h-11 min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-bg px-4 text-sm font-medium hover:bg-surface-2 disabled:opacity-50"
                >
                  Challenge (402)
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void runOp(true)}
                  className="inline-flex h-11 min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Execute with payment
                </button>
              </div>
            </div>

            <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface">
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-medium">
                  Response
                  {status !== null && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-mono ${
                        status === 200
                          ? "bg-success/15 text-success"
                          : status === 402
                            ? "bg-warn/15 text-warn"
                            : "bg-danger/15 text-danger"
                      }`}
                    >
                      HTTP {status}
                    </span>
                  )}
                </div>
                {response && (
                  <button
                    type="button"
                    onClick={() => copy(response)}
                    className="inline-flex shrink-0 items-center gap-1 text-xs text-muted hover:text-fg"
                  >
                    <Copy className="size-3.5" /> Copy
                  </button>
                )}
              </div>
              <pre className="max-h-[420px] flex-1 overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-xs leading-relaxed text-muted sm:text-[13px]">
                {response || "// Run an operation to see the JSON response"}
              </pre>
            </div>
          </div>

          {log.length > 0 && (
            <ul className="space-y-1 overflow-hidden rounded-lg border border-border bg-surface-2 p-3 font-mono text-xs text-muted">
              {log.map((line, i) => (
                <li key={`${i}-${line}`} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-subtle" />
                  <span className="min-w-0 break-all">{line}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="min-w-0 rounded-xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold">Catalog entry</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Ready for{" "}
              <code className="text-fg">catalog.json</code> on lvlltd.com —
              per-call pricing label, no fabricated trust score, scan status{" "}
              <code className="text-fg">planned</code>.
            </p>
            <ul className="mt-4 space-y-2 break-all text-sm text-muted">
              <li>
                id: <code className="text-fg">agent-memory</code>
              </li>
              <li>
                category: <code className="text-fg">Memory</code>
              </li>
              <li>
                price_label:{" "}
                <code className="text-fg">
                  $0.002 / remember · $0.001 / recall · $0.0005 list|forget
                </code>
              </li>
              <li>
                pack path:{" "}
                <code className="text-fg">skills/agent-memory/</code>
              </li>
            </ul>
          </div>
          <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold">Live pricing endpoint</h3>
            <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-md border border-border bg-bg p-3 font-mono text-[11px] leading-relaxed text-muted">
              {pricingJson || "loading…"}
            </pre>
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-xs text-subtle">
          <p className="break-words">
            agent-memory skill pack · x402 · ERC-7857 · Base USDC · Isolation
            tested · Roadmap: cross-agent shared pools (not shipped)
          </p>
        </footer>
      </main>
    </div>
  );
}
