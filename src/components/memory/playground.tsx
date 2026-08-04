import { useCallback, useMemo, useState } from "react";
import {
  BookOpen,
  Brain,
  CheckCircle2,
  Copy,
  KeyRound,
  List,
  Loader2,
  Shield,
  Trash2,
  Wallet,
} from "lucide-react";

type Op = "remember" | "recall" | "list" | "forget";
type Scope = "private" | "shared" | "public";

const DEMO_WALLETS = [
  "0x1111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222",
] as const;

function shortWallet(w: string) {
  return `${w.slice(0, 6)}…${w.slice(-4)}`;
}

export function MemoryPlayground() {
  const [wallet, setWallet] = useState<string>(DEMO_WALLETS[0]);
  const [op, setOp] = useState<Op>("remember");
  const [key, setKey] = useState("prefs/theme");
  const [value, setValue] = useState("dark");
  const [prefix, setPrefix] = useState("prefs/");
  const [scope, setScope] = useState<Scope>("private");
  const [useDevPay, setUseDevPay] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [response, setResponse] = useState("");
  const [log, setLog] = useState<string[]>([]);

  const pushLog = useCallback((line: string) => {
    setLog((prev) => [line, ...prev].slice(0, 12));
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">Live playground</h2>
          <p className="mt-1 text-sm text-muted">
            Demo payment uses{" "}
            <code className="break-all text-fg">X-PAYMENT: {"{dev:true}"}</code> — not
            mainnet settlement.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void demoIsolation()}
          disabled={loading}
          className="inline-flex h-11 min-h-11 items-center gap-2 rounded-md border border-border bg-surface-2 px-4 text-sm font-medium transition-colors hover:bg-surface-3 disabled:opacity-50"
        >
          <Shield className="size-4" />
          Isolation demo
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

          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <button
              type="button"
              disabled={loading}
              onClick={() => void runOp(false)}
              className="inline-flex h-11 min-h-11 flex-1 items-center justify-center rounded-md border border-border bg-bg px-4 text-sm font-medium hover:bg-surface-2 disabled:opacity-50"
            >
              Challenge (402)
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void runOp(true)}
              className="inline-flex h-11 min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
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
                  className={`rounded-full px-2 py-0.5 font-mono text-xs ${
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
            {response ? (
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(response)}
                className="inline-flex shrink-0 items-center gap-1 text-xs text-muted hover:text-fg"
              >
                <Copy className="size-3.5" /> Copy
              </button>
            ) : null}
          </div>
          <pre className="max-h-[420px] flex-1 overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-xs leading-relaxed text-muted">
            {response || "// Run an operation to see the JSON response"}
          </pre>
        </div>
      </div>

      {log.length > 0 ? (
        <ul className="space-y-1 overflow-hidden rounded-lg border border-border bg-surface-2 p-3 font-mono text-xs text-muted">
          {log.map((line, i) => (
            <li key={`${i}-${line}`} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-subtle" />
              <span className="min-w-0 break-all">{line}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
