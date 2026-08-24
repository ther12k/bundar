/**
 * BR-068 property suite: escaping, directive URLs, cookies, route
 * normalization — deterministic seeds, replayable failures.
 */
import { describe, expect, test } from "bun:test";
import { renderPrimitive } from "../../packages/jsx/src/escape";
import { DirectiveValidationError } from "../../packages/htmx/src/directives";
import { serializeCookie } from "../../packages/core/src/response-mutate";
import { normalizeRoutePath } from "../../packages/core/src/routing/path";
import { ALPHABETS, CI_DEFAULT_SEED, property } from "./seeded";

describe("BR-068 property invariants", () => {
  test(
    "escaping: untrusted text never renders executable markup",
    () =>
      property(
        "renderPrimitive neutralizes markup",
        { seed: CI_DEFAULT_SEED, runs: 300 },
        (rng) => {
          const alphabet =
            "<>\"'&/scriptimg onerror=alert javascript:`" + ALPHABETS.urlSafe;
          const hostile = rng.string(alphabet, rng.int(80));
          const rendered = renderPrimitive(hostile);
          expect(rendered.includes("<script")).toBe(false);
          expect(rendered.includes("<img")).toBe(false);
        },
      ),
    { timeout: 30_000 },
  );

  test(
    "directive URLs: valid-or-throw, never control characters on output",
    async () => {
      const { applyDirectives } =
        await import("../../packages/htmx/src/directives");
      await property(
        "redirect URL corpus is safe or rejected",
        { seed: CI_DEFAULT_SEED + 1, runs: 300 },
        (rng) => {
          const alphabet =
            "/?&=%.:aAbBcCdDeEfFhijlmnoprstuvx0123456789 -\\" +
            ALPHABETS.crlf +
            ALPHABETS.controls;
          const url = rng.string(alphabet, rng.int(120));
          let response: Response;
          try {
            response = applyDirectives(new Response("x"), [
              { kind: "redirect", url } as never,
            ]);
          } catch (error) {
            expect(error).toBeInstanceOf(DirectiveValidationError);
            return;
          }
          const value = response.headers.get("HX-Redirect") ?? "";
          // eslint-disable-next-line no-control-regex -- BR-068: asserts absence
          expect(value).not.toMatch(/[\r\n\u0000]/);
          expect(value.toLowerCase()).not.toStartWith("javascript:");
        },
      );
    },
    { timeout: 30_000 },
  );

  test(
    "cookies: serialization never emits control characters",
    () =>
      property(
        "serializeCookie rejects or sanitizes hostile input",
        { seed: CI_DEFAULT_SEED + 2, runs: 300 },
        (rng, caseIndex) => {
          const alphabet =
            "abcXYZ019=; ,\\" + ALPHABETS.crlf + ALPHABETS.controls;
          const name = rng.string(
            alphabet.replace(/[;,=\s]/g, ""),
            rng.int(20) + 1,
          );
          const value = rng.string(alphabet, rng.int(60));
          let serialized: string | undefined;
          let rejected = false;
          try {
            serialized = serializeCookie(name, value);
          } catch (error) {
            rejected = true;
            if (caseIndex % 7 === 0)
              expect((error as Error).name).toBe("ResponseMutationError");
            void error;
          }
          if (!rejected && serialized !== undefined) {
            // eslint-disable-next-line no-control-regex -- BR-068: asserts absence
            expect(serialized).not.toMatch(/[\r\n\u0000]/);
          }
        },
      ),
    { timeout: 30_000 },
  );

  test(
    "route normalization always yields a canonical absolute path",
    () =>
      property(
        "normalizeRoutePath output contract",
        { seed: CI_DEFAULT_SEED + 3, runs: 300 },
        (rng) => {
          const alphabet = "abcXYZ019-._~/:{}" + ALPHABETS.crlf;
          const input = rng.string(alphabet, rng.int(40));
          let result: string | undefined;
          try {
            result = normalizeRoutePath(input);
          } catch {
            return; // documented rejection for non-route inputs
          }
          expect(result.startsWith("/")).toBe(true);
          expect(result.includes("//")).toBe(false);
          expect(result).not.toMatch(/[\r\n]/);
        },
      ),
    { timeout: 30_000 },
  );
});
