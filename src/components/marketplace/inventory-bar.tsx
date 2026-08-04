import type { InventoryCounts } from "@/lib/catalog";

export function InventoryBar({ counts }: { counts: InventoryCounts }) {
  const items = [
    {
      label: "Inventory",
      value: String(counts.total),
      hint: `${counts.open_market} open · ${counts.first_party} first-party`,
    },
    {
      label: "Confirmed unlocks",
      value: String(counts.confirmed_unlocks),
      hint: `$${counts.confirmed_volume_usd.toFixed(2)} on-chain`,
    },
    {
      label: "Deep + Standard",
      value: String(counts.deep + counts.standard),
      hint: `${counts.outline_only} outline hidden by default`,
    },
    {
      label: "Live runtimes",
      value: String(counts.runtime_live),
      hint: `${counts.per_call} per-call skills`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 rounded-xl border border-border bg-surface p-4"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-subtle">
            {item.label}
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight">
            {item.value}
          </p>
          <p className="mt-1 truncate text-xs text-muted">{item.hint}</p>
        </div>
      ))}
    </div>
  );
}
