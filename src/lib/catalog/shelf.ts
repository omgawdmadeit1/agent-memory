import type { Skill, SlimSkill } from "./types";

/**
 * Shelf rules (P0):
 * - outline_only cannot be featured
 * - outline_only tier max starter; price cap $2.99
 * - featured requires standard or deep + sealed
 */
export function applyShelfRules(skill: Skill): Skill {
  const next = { ...skill };
  next.implementation_quality = next.depth;

  if (next.depth === "outline_only") {
    next.featured = false;
    next.seal = "outline";
    if (next.tier === "premium" || next.tier === "flagship" || next.tier === "standard") {
      next.tier = "starter";
    }
    if (next.price_usd > 2.99) {
      next.price_usd = 2.99;
      next.price_label = `$${next.price_usd.toFixed(2)} / unlock`;
    }
  }

  if (next.featured && next.depth === "outline_only") {
    next.featured = false;
  }

  if (next.featured && next.depth !== "deep" && next.depth !== "standard") {
    next.featured = false;
  }

  return next;
}

export function toSlim(skill: Skill): SlimSkill {
  return {
    id: skill.id,
    name: skill.name,
    category: skill.category,
    tier: skill.tier,
    price_usd: skill.price_usd,
    price_label: skill.price_label,
    pricing_model: skill.pricing_model,
    depth: skill.depth,
    featured: skill.featured,
    summary: skill.summary,
    runtime_live: skill.runtime_live,
    seal: skill.seal,
  };
}

export function defaultHubVisible(skill: Skill): boolean {
  // Default hub hides outline-only behind toggle
  return skill.depth === "deep" || skill.depth === "standard";
}
