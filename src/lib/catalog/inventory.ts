import { OPEN_MARKET_COUNT, PROOF, SKILLS } from "./data";
import type { InventoryCounts } from "./types";

/** Single source of truth for all UI counters (home, hub, status). */
export function getInventoryCounts(skills = SKILLS): InventoryCounts {
  const first_party = skills.length;
  const list_value_usd = Number(
    skills.reduce((sum, s) => sum + (s.price_usd || 0), 0).toFixed(2),
  );

  return {
    first_party,
    open_market: OPEN_MARKET_COUNT,
    total: first_party + OPEN_MARKET_COUNT,
    deep: skills.filter((s) => s.depth === "deep").length,
    standard: skills.filter((s) => s.depth === "standard").length,
    outline_only: skills.filter((s) => s.depth === "outline_only").length,
    featured: skills.filter((s) => s.featured).length,
    per_call: skills.filter((s) => s.pricing_model === "per_call").length,
    runtime_live: skills.filter((s) => s.runtime_live).length,
    confirmed_unlocks: PROOF.confirmed_unlocks,
    confirmed_volume_usd: PROOF.confirmed_volume_usd,
    list_value_usd,
  };
}
