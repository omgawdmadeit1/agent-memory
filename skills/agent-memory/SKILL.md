---
name: agent-memory
description: >
  Persistent key-value memory for AI agents across sessions. Operations:
  remember, recall, list, forget. Wallet-scoped isolation, x402 per-call USDC
  on Base. Use when an agent needs durable state between runs without a
  subscription — usage-metered only.
metadata:
  skill_id: agent-memory
  version: "1.0.0"
  category: Memory
  tier: starter
  product_type: skill
  standards: [x402, ERC-7857]
  network: base
  asset: USDC
  pricing_model: per_call
  durability: best_effort
  trust_scan: not_yet_scanned
---

# agent-memory

Persistent key-value memory for autonomous agents. Write and read state across
sessions with **wallet-scoped isolation** and **per-call x402 metering** (USDC
on Base). No subscription wrapper. No fixed monthly fee.

## Honesty (read first)

| Claim | Reality |
| --- | --- |
| Durability | **Best-effort** persistent storage. Not SLA-backed. No multi-AZ durability guarantee in this tier. |
| Trust scorecard | **Not scanned yet.** Do not display a security/trust badge until the packaging scan layer has actually passed. |
| Isolation | **True and testable.** Private/shared keys are namespaced `mem:{scope}:{wallet}:{key}`. Cross-wallet private access is denied. Tests in `tests/isolation.test.ts`. |
| Pricing | **Exact USDC amounts below.** Not averages. Not "starting at". |
| Shared pools | **Out of scope.** Cross-agent shared memory pools are a roadmap item, not shipped. |

## When to use

- Agent needs durable facts between runs (preferences, last task id, session notes)
- You want usage-metered memory instead of a monthly host plan
- Multiple agent wallets must not see each other's private keys

## Operations

### 1. `remember(key, value, scope?)`

Write a string value under `key`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `key` | string | yes | 1–128 chars: `a-zA-Z0-9._\-:\/` |
| `value` | string | yes | max 64 KiB UTF-8 |
| `scope` | `"private"` \| `"shared"` \| `"public"` | no | default `private` |

**Scopes**

- `private` — only the calling wallet can read/write/list/delete
- `shared` — owner-bound in v1 (same as private isolation); reserved for future shared pools
- `public` — anyone who knows the owner path may read; only owner may write/delete

### 2. `recall(key, scope?)`

Read a value back. 404 if missing.

### 3. `list(prefix?, scope?)`

List keys under an optional prefix for the calling wallet.

### 4. `forget(key, scope?)`

Delete a key. Idempotent (`deleted: false` if already gone).

## Pricing (exact, live rates)

Currency: **USDC** · Network: **Base** (`eip155:8453`) · Decimals: **6**  
Pay to: `0xa00876513bAA433ce2B58A5341Fd06d2b6f9A6ED`  
Asset: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

| Operation | Price (USD) | Atomic (6 dec) | Notes |
| --- | ---: | ---: | --- |
| `remember` base | **0.002** | `2000` | Includes first **1024** bytes of value |
| `remember` overage | **0.001 / KiB** | `1000` per ceil(KiB) over 1 KiB | Ceil partial KB |
| `recall` | **0.001** | `1000` | Flat per read |
| `list` | **0.0005** | `500` | Flat per call |
| `forget` | **0.0005** | `500` | Flat per call |

Examples:

- remember 500 B → **$0.002** (`2000` atomic)
- remember 2500 B → base + 2 KiB overage → **$0.004** (`4000` atomic)
- recall → **$0.001** (`1000` atomic)

Quota: **2 MiB** total stored bytes per wallet (soft cap → `STORAGE_FULL`).

## HTTP API

Base path (marketplace host): `/api/memory/*`

| Method | Path | Op |
| --- | --- | --- |
| `POST` | `/api/memory/remember` | remember |
| `GET`/`POST` | `/api/memory/recall` | recall |
| `GET`/`POST` | `/api/memory/list` | list |
| `POST`/`DELETE` | `/api/memory/forget` | forget |
| `GET` | `/api/memory/pricing` | pricing table (free) |

### Headers (all paid ops)

| Header | Required | Description |
| --- | --- | --- |
| `X-WALLET` | yes | Caller wallet `0x` + 40 hex (identity + tenant scope) |
| `X-PAYMENT` | yes for success | JSON payment proof (see below) |
| `Content-Type` | yes on body | `application/json` |

### Payment flow (x402)

1. Call without `X-PAYMENT` → **HTTP 402** with `maxAmountRequired`, `payTo`, `assetContract`, `accepts[]`
2. Transfer exact atomic USDC on Base to `payTo`
3. Retry with:
   ```http
   X-PAYMENT: {"txHash":"0x…","skill":"agent-memory","op":"remember"}
   ```
4. Demo environments may accept `{"dev":true,"op":"remember"}` when `MEMORY_DEV_PAY` is enabled — **never claim demo receipts as mainnet settlement**

### Example: remember

```bash
curl -s -X POST https://lvlltd.com/api/memory/remember \
  -H 'content-type: application/json' \
  -H 'x-wallet: 0x1111111111111111111111111111111111111111' \
  -H 'x-payment: {"txHash":"0x…","skill":"agent-memory","op":"remember"}' \
  -d '{"key":"prefs/theme","value":"dark","scope":"private"}'
```

Success:

```json
{
  "ok": true,
  "op": "remember",
  "key": "prefs/theme",
  "scope": "private",
  "bytes": 4,
  "updated_at": "2026-08-04T12:00:00.000Z",
  "payment": {
    "mode": "onchain",
    "amount_usd": 0.002,
    "amount_atomic": "2000",
    "txHash": "0x…"
  }
}
```

### Example: recall

```bash
curl -s -X POST https://lvlltd.com/api/memory/recall \
  -H 'content-type: application/json' \
  -H 'x-wallet: 0x1111111111111111111111111111111111111111' \
  -H 'x-payment: {"txHash":"0x…","skill":"agent-memory","op":"recall"}' \
  -d '{"key":"prefs/theme","scope":"private"}'
```

### Example: list

```bash
curl -s -X POST https://lvlltd.com/api/memory/list \
  -H 'content-type: application/json' \
  -H 'x-wallet: 0x1111111111111111111111111111111111111111' \
  -H 'x-payment: {"txHash":"0x…","skill":"agent-memory","op":"list"}' \
  -d '{"prefix":"prefs/","scope":"private"}'
```

### Example: forget

```bash
curl -s -X POST https://lvlltd.com/api/memory/forget \
  -H 'content-type: application/json' \
  -H 'x-wallet: 0x1111111111111111111111111111111111111111' \
  -H 'x-payment: {"txHash":"0x…","skill":"agent-memory","op":"forget"}' \
  -d '{"key":"prefs/theme","scope":"private"}'
```

## Input / output schemas

### remember

**Input**

```json
{
  "type": "object",
  "required": ["key", "value"],
  "properties": {
    "key": { "type": "string", "minLength": 1, "maxLength": 128 },
    "value": { "type": "string", "maxLength": 65536 },
    "scope": { "type": "string", "enum": ["private", "shared", "public"] }
  }
}
```

**Output** — `{ ok, op, key, scope, bytes, updated_at, payment, pricing? }`

### recall

**Input** — `{ key, scope? }`  
**Output** — `{ ok, op, key, scope, value, bytes, updated_at, payment }`

### list

**Input** — `{ prefix?, scope?, limit? }`  
**Output** — `{ ok, op, keys: [{key, scope, bytes, updated_at, owner}], count, payment }`

### forget

**Input** — `{ key, scope? }`  
**Output** — `{ ok, op, deleted, key, scope, payment }`

## Error codes

| Code | HTTP | When |
| --- | ---: | --- |
| `PAYMENT_REQUIRED` | 402 | Missing `X-PAYMENT` (body is full x402 challenge) |
| `PAYMENT_FAILURE` | 402 | Malformed or failed payment proof |
| `INVALID_WALLET` | 400 | Missing/invalid `X-WALLET` |
| `MALFORMED_KEY` | 400 | Key fails pattern/length |
| `MALFORMED_VALUE` | 400 | Value not string or over size |
| `MALFORMED_PREFIX` | 400 | Bad list prefix |
| `INVALID_SCOPE` | 400 | Scope not in enum |
| `NOT_FOUND` | 404 | Key missing on recall |
| `FORBIDDEN` | 403 | Cross-tenant access attempt |
| `RATE_LIMITED` | 429 | Per-wallet throttle |
| `STORAGE_FULL` | 507 | Wallet byte quota exceeded |
| `STORAGE_ERROR` | 500 | Unexpected backend failure |
| `METHOD_NOT_ALLOWED` | 405 | Wrong HTTP method |
| `BAD_REQUEST` | 400 | Invalid JSON body |

## Rate limits (defaults)

| Op | Limit |
| --- | --- |
| remember | 60 / min / wallet |
| recall | 120 / min / wallet |
| list | 60 / min / wallet |
| forget | 60 / min / wallet |

## Storage

- Logical store: wallet-namespaced KV
- Production host: plug into existing Vercel KV / R2 / Postgres wiring — **do not invent a separate storage island**
- Schema: see `migrations/0002_agent_memory.sql` and `lib/storage.ts` (`MemoryStore` interface)
- Isolation test: `tests/isolation.test.ts`

## Sealed pack contents

| Path | Role |
| --- | --- |
| `SKILL.md` | This spec |
| `outline.json` | Free evaluation outline |
| `sample.md` | Free sample |
| `agent-install.json` | Agent install meta |
| `catalog-entry.json` | Drop-in `/catalog.json` skill entry |
| `lib/*` | Pricing, scope, x402, storage, handlers |
| `nextjs/app/api/memory/**/route.ts` | Next.js App Router routes for lvlltd.com |
| `schemas/*` | JSON schemas |
| `tests/*` | Isolation + pricing tests |

## Agent install

```
1. GET  /skills/agent-memory/outline.json
2. GET  /api/memory/pricing          (free — verify live rates)
3. POST /api/memory/remember         → 402 challenge
4. Transfer maxAmountRequired USDC on Base to payTo
5. Retry with X-PAYMENT + X-WALLET
6. Use recall/list/forget the same way
```

## Roadmap (not in this build)

- Cross-agent shared memory pools
- Admin dashboard
- SLA durability tier
- Security scan + trust scorecard badge (only after real scan pass)

## Standards

- **x402** — HTTP 402 payment required, Base USDC
- **ERC-7857** — sealed skill pack model for marketplace distribution
