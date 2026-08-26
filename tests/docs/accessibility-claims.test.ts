/**
 * BR-101 (#153): documentation-claim guard — the accessibility guide must
 * never again describe SHIPPED behavior as "planned". Ties the guide's
 * no-JS paragraph to the implementation it describes
 * (renderInvalidDocument on form actions) so closing BR-088 while still
 * claiming otherwise would fail this test.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repositoryRoot = join(import.meta.dir, "..", "..");

describe("accessibility guide claim guard (BR-101)", () => {
  const guide = readFileSync(
    join(repositoryRoot, "docs", "guides", "accessibility.md"),
    "utf8",
  );

  test("guide does not mark the shipped 422 re-render as a planned improvement", () => {
    expect(guide).not.toMatch(/planned improvement \(BR-088/);
    expect(guide).not.toMatch(/planned.*renderInvalidDocument/i);
    expect(guide).toMatch(/Ordinary \(no-JS\) submissions.*re-render/i);
    expect(guide).not.toContain(
      "currently receive the framework default 422 document",
    );
  });

  test("the behavior the guide now claims actually exists in the framework", () => {
    const formAction = readFileSync(
      join(repositoryRoot, "packages", "htmx", "src", "form-action.ts"),
      "utf8",
    );
    expect(formAction).toContain("renderInvalidDocument");
  });
});
