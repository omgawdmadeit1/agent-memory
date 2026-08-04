import { createFileRoute } from "@tanstack/react-router";
import { getInventoryCounts, getSkill, SKILLS, toSlim } from "@/lib/catalog";

export const Route = createFileRoute("/api/catalog")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        const full = url.searchParams.get("full") === "1";
        const fields = url.searchParams.get("fields");

        if (id) {
          const skill = getSkill(id);
          if (!skill) {
            return Response.json(
              { error: "not_found", id },
              { status: 404, headers: { "Cache-Control": "public, max-age=30" } },
            );
          }
          return Response.json(
            { ok: true, skill: full ? skill : toSlim(skill) },
            { headers: { "Cache-Control": "public, max-age=60" } },
          );
        }

        const slim = fields !== "full" && !full;
        const skills = slim ? SKILLS.map(toSlim) : SKILLS;
        const inventory = getInventoryCounts();

        return Response.json(
          {
            site: "lvlltd-demo",
            product: "LVL LTD Agent Skill Market (improved host)",
            version: "2.0.0",
            catalog_mode: slim ? "slim" : "full",
            skill_count: skills.length,
            inventory,
            skills,
            note: slim
              ? "Default slim catalog. Append ?full=1 for detail fields."
              : "Full catalog payload.",
          },
          {
            headers: {
              "Cache-Control": "public, max-age=60",
              "X-LVL-Catalog-Mode": slim ? "slim" : "full",
            },
          },
        );
      },
    },
  },
});
