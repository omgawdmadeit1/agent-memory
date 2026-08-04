# agent-memory

**LVL LTD x402 skill** — persistent wallet-scoped key-value memory for AI agents.

- Skill pack: [`skills/agent-memory/`](./skills/agent-memory/)
- Live API: `/api/memory/{remember,recall,list,forget,pricing}`
- Playground UI: `/`
- Catalog entry: `skills/agent-memory/catalog-entry.json`

## Quick start

```bash
npm install
npm run dev          # 0.0.0.0:8080
npm run test:memory  # isolation + pricing
npm run typecheck
npm run build
```

## Agent loop

```http
POST /api/memory/remember
X-WALLET: 0x…
X-PAYMENT: {"dev":true,"op":"remember"}   # demo only
Content-Type: application/json

{"key":"prefs/theme","value":"dark","scope":"private"}
```

Without `X-PAYMENT` → HTTP **402** with exact Base USDC amount.

## Pricing (exact)

| Op | USD | Atomic |
| --- | ---: | ---: |
| remember ≤1KB | 0.002 | 2000 |
| remember overage/KiB | 0.001 | 1000 |
| recall | 0.001 | 1000 |
| list / forget | 0.0005 | 500 |

## Honesty

Best-effort storage (no SLA). Trust scan badge not claimed until real scan pass.
No cross-agent shared pools in v1.
