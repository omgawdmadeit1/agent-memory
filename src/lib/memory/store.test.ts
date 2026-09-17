import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allowInMemoryFallback } from "./fallback.ts";

describe("allowInMemoryFallback", () => {
  it("fails closed when Neon is configured so remembers cannot land in RAM", () => {
    assert.equal(allowInMemoryFallback("neon"), false);
  });

  it("still allows the process Map when preview is on PGLite", () => {
    assert.equal(allowInMemoryFallback("pglite"), true);
  });
});
