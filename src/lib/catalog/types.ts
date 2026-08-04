export type Depth = "deep" | "standard" | "outline_only";
export type Tier = "flagship" | "premium" | "standard" | "starter" | "tripwire";
export type PricingModel = "unlock" | "per_call";

export type Skill = {
  id: string;
  name: string;
  summary: string;
  category: string;
  tier: Tier;
  price_usd: number;
  price_label: string;
  pricing_model: PricingModel;
  depth: Depth;
  implementation_quality: Depth;
  featured: boolean;
  runtime_live?: boolean;
  when_to_use: string;
  seal: "sealed" | "outline";
  sample_available: boolean;
  honesty?: {
    durability?: string;
    sla?: boolean;
    trust_scan_passed?: boolean;
  };
};

export type SlimSkill = {
  id: string;
  name: string;
  category: string;
  tier: Tier;
  price_usd: number;
  price_label: string;
  pricing_model: PricingModel;
  depth: Depth;
  featured: boolean;
  summary: string;
  runtime_live?: boolean;
  seal: "sealed" | "outline";
};

export type InventoryCounts = {
  first_party: number;
  open_market: number;
  total: number;
  deep: number;
  standard: number;
  outline_only: number;
  featured: number;
  per_call: number;
  runtime_live: number;
  confirmed_unlocks: number;
  confirmed_volume_usd: number;
  list_value_usd: number;
};
