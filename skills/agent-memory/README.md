# agent-memory

LVL LTD skill pack: persistent wallet-scoped KV memory for AI agents, metered per call via x402 (USDC on Base).

## Drop into lvlltd.com

1. Copy this folder into the skills catalog tree as `agent-memory/`.
2. Merge `catalog-entry.json` into `/catalog.json` `skills[]`.
3. Mount `nextjs/app/api/memory/**` routes (or re-export handlers from `lib/handler.ts`).
4. Point `MemoryStore` at existing Vercel KV / R2 / Postgres — see `lib/storage.ts` (`SqlMemoryStore`, `InMemoryStore`).
5. Set `MEMORY_DEV_PAY=0` and `MEMORY_REQUIRE_ONCHAIN=1` + verifier URL in production.
6. Publish free outline at `/skills/agent-memory/outline.json` from `outline.json`.

## Test

```bash
npm run test:memory
```

## Honesty

- Best-effort durability only
- No trust badge until real scan pass
- Exact atomic USDC prices in `lib/pricing.ts`
