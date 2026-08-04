---
skill_id: agent-memory
evaluation: free
pricing_model: per_call
price_usd_remember_base: 0.002
price_usd_recall: 0.001
price_usd_list: 0.0005
price_usd_forget: 0.0005
challenge: https://lvlltd.com/api/pay?skill=agent-memory
outline: https://lvlltd.com/skills/agent-memory/outline.json
standards: x402, ERC-7857
---

# Free sample — Agent Memory

**Skill ID:** `agent-memory`  
**Model:** per-call USDC on Base (x402) — not a one-time unlock SaaS  
**Outline:** https://lvlltd.com/skills/agent-memory/outline.json

## Summary

Persistent wallet-scoped key-value memory for agents: `remember`, `recall`,
`list`, `forget`. Usage-metered only. Best-effort durability — not SLA-backed
in this tier.

## Exact pricing

| Op | USD | Atomic (USDC 6 dec) |
| --- | ---: | ---: |
| remember (≤1KB) | 0.002 | 2000 |
| remember overage / KiB | 0.001 | 1000 |
| recall | 0.001 | 1000 |
| list | 0.0005 | 500 |
| forget | 0.0005 | 500 |

## Minimal agent loop

```
POST /api/memory/remember
  X-WALLET: 0xYourWallet
  X-PAYMENT: {txHash|dev}
  {"key":"session/last","value":"task-42","scope":"private"}

POST /api/memory/recall
  X-WALLET: 0xYourWallet
  X-PAYMENT: {txHash|dev}
  {"key":"session/last","scope":"private"}
```

## Isolation

Keys are stored as `mem:{scope}:{wallet}:{key}`. A second wallet cannot
`recall` or `list` another wallet's private keys. Covered by
`tests/isolation.test.ts`.

## What payment unlocks

Sealed pack: full `SKILL.md`, Next.js API routes, storage adapters, pricing
module, isolation tests. Runtime memory calls remain per-call metered.

## Honesty

- No fabricated trust scorecard — scan status is not claimed until real scan pass
- No durability SLA in this tier
- No cross-agent shared pools in v1
