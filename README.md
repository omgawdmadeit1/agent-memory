# LVL LTD — improved agent skill market (v2)

Demo host implementing the P0 quality / efficiency / appearance plan:

- **Slim catalog** — `/api/catalog` returns slim skills by default (`?full=1` for detail)
- **Shelf rules** — outline-only cannot be featured or premium-priced
- **Single inventory source** — home, hub, status, APIs share `getInventoryCounts()`
- **Mobile** — one hamburger, skill guide closed by default, one primary money CTA
- **Listings** — H1 is skill name (not `when_to_use`); path `/listings/$id` (avoids collision with skill pack files under `/skills/`)
- **Runtime** — agent-memory playground at `/listings/agent-memory`

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Home |
| `/marketplace` | Hub with depth filters |
| `/listings/$id` | Listing + memory playground |
| `/status` | Identity + counters |
| `/api/catalog` | Slim/full catalog |
| `/api/shop` | Agent entry |
| `/api/inventory` | Counts JSON |
| `/api/proof` | Honest proof ledger |
| `/api/memory/*` | Live per-call memory |

## Commands

```bash
npm run dev
npm run test:memory
npm run typecheck
npm run build
```
