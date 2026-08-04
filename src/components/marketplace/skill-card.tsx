import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Zap } from "lucide-react";
import type { SlimSkill } from "@/lib/catalog";

const depthClass: Record<string, string> = {
  deep: "border-success/30 bg-success/10 text-success",
  standard: "border-info/30 bg-info/10 text-info",
  outline_only: "border-border bg-surface-2 text-subtle",
};

export function SkillCard({ skill }: { skill: SlimSkill }) {
  return (
    <Link
      to="/listings/$id"
      params={{ id: skill.id }}
      className="group flex min-h-[168px] min-w-0 flex-col justify-between rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-2 sm:p-5"
    >
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${depthClass[skill.depth] ?? depthClass.outline_only}`}
          >
            {skill.depth === "outline_only" ? "Outline" : skill.depth}
          </span>
          {skill.runtime_live ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg px-2 py-0.5 text-[11px] font-medium text-fg">
              <Zap className="size-3" />
              Runtime
            </span>
          ) : null}
          {skill.featured ? (
            <span className="rounded-full border border-border bg-bg px-2 py-0.5 text-[11px] font-medium text-muted">
              Featured
            </span>
          ) : null}
        </div>
        <h3 className="truncate text-base font-semibold tracking-tight text-fg group-hover:text-fg">
          {skill.name}
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted">
          {skill.summary}
        </p>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm text-fg">{skill.price_label}</p>
          <p className="truncate text-xs text-subtle">
            {skill.category} · {skill.pricing_model === "per_call" ? "per-call" : "unlock"}
          </p>
        </div>
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-bg text-muted transition-colors group-hover:text-fg">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}
