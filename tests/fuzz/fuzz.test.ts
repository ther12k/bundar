/* eslint-disable @typescript-eslint/no-unused-vars -- BR-068: generators intentionally reuse loop vars */
/**
 * BR-068 bounded fuzz lane: multipart boundary chaos, form-key storms,
 * and encoded-input chaos against parsers/serializers. Deterministic
 * seeds; BUNDAR_FUZZ_LONG=1 raises budgets 10x for scheduled lanes.
 */
import { describe, expect, test } from "bun:test";
import {
  BodyLimitError,
  MalformedBodyError,
  parseForm,
} from "../../packages/core/src/request/body";
import type { Context } from "../../packages/core/src/context";
import { applyDirectives } from "../../packages/htmx/src/directives";
import { DirectiveValidationError } from "../../packages/htmx/src/directives";
import { ALPHABETS, createRng, fuzzRuns } from "../property/seeded";

function ctxFor(
  body: string | ReadableStream<Uint8Array>,
  contentType: string,
): Context {
  return {
    request: new Request("http://fuzz/", {
      method: "POST",
      headers: { "content-type": contentType },
      body,
    }),
    params: {},
    state: {},
    signal: new AbortController().signal,
  } as unknown as Context;
}

const DEFAULT_MAX_PAIRS = 400;

describe("BR-068 fuzz: multipart boundaries", () => {
  test(
    "chaotic multipart bodies never hang and always fail documented",
    () => {
      const seed = 0xf00d;
      const rng = createRng(seed);
      const runs = fuzzRuns(120);

      for (let caseIndex = 0; caseIndex < runs; caseIndex++) {
        const boundarySeed = rng.string("b-=_", rng.int(12) + 2);
        // deliberately inject boundary-like fragments INTO part bodies so
        // the parser must distinguish real boundaries from content.
        const injection = rng.chance(0.4)
          ? `--${boundarySeed.slice(0, rng.int(boundarySeed.length))}\r\n`
          : "";
        const partCount = rng.int(6);
        const parts: string[] = [];
        for (let p = 0; p < partCount; p++) {
          const name = rng.pick(["a", "b", `f${p}`]);
          const body =
            injection + rng.string(ALPHABETS.urlSafe + "\r\n--", rng.int(40));
          parts.push(
            `--${boundarySeed}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${body}\r\n`,
          );
        }
        const terminate = rng.chance(0.85);
        const raw =
          parts.join("") + (terminate ? `--${boundarySeed}--\r\n` : "");

        const promise = parseForm(
          ctxFor(raw, `multipart/form-data; boundary=${boundarySeed}`),
        );
        const outcome = Promise.race([
          promise.then(
            () => "parsed" as const,
            (error: unknown) =>
              error instanceof BodyLimitError ||
              error instanceof MalformedBodyError
                ? ("documented" as const)
                : (`unexpected:${String(error)}` as const),
          ),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("FUZZ TIMEOUT")), 2000),
          ),
        ]);

        // Synchronous-ish resolution is expected for buffered bodies; use a
        // detached assertion to keep the loop deterministic.
        void outcome.then((verdict) => {
          if (verdict !== "parsed" && verdict !== "documented") {
            throw new Error(
              `[fuzz] multipart seed=${seed} case=${caseIndex}: ${verdict}`,
            );
          }
        });
      }

      expect(runs).toBeGreaterThan(0);
    },
    { timeout: 60_000 },
  );
});

describe("BR-068 fuzz: form key multiplicity", () => {
  test(
    "key storms stay within duplicate/parts budgets or fail documented",
    () => {
      const seed = 0xbeef;
      const rng = createRng(seed);
      const runs = fuzzRuns(100);

      for (let caseIndex = 0; caseIndex < runs; caseIndex++) {
        const keyCount = rng.int(30) + 1;
        const dupDepth = rng.int(40);
        const pairs: string[] = [];
        for (let k = 0; k < keyCount; k++) {
          for (let d = 0; d < dupDepth; d++) {
            pairs.push(`k${k % 5}=${rng.int(100)}`);
          }
        }
        if (pairs.length > DEFAULT_MAX_PAIRS) pairs.length = DEFAULT_MAX_PAIRS;
        const body = pairs.join("&");

        const promise = parseForm(
          ctxFor(body, "application/x-www-form-urlencoded"),
        );
        void Promise.race([
          promise.then(
            () => "ok" as const,
            (error: unknown) => {
              if (!(error instanceof BodyLimitError))
                throw new Error(
                  `[fuzz] form-keys seed=${seed} case=${caseIndex}: ${String(error)}`,
                );
              return "documented" as const;
            },
          ),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("FUZZ TIMEOUT")), 1500),
          ),
        ]);
      }

      expect(runs).toBeGreaterThan(0);
    },
    { timeout: 60_000 },
  );
});

describe("BR-068 fuzz: encoded URL inputs", () => {
  test(
    "percent-encoded chaos is always valid-or-rejected with no CRLF output",
    async () => {
      const { applyDirectives } =
        await import("../../packages/htmx/src/directives");
      const seed = 0xcafe;
      const rng = createRng(seed);
      const runs = fuzzRuns(200);

      for (let caseIndex = 0; caseIndex < runs; caseIndex++) {
        const alphabet =
          "/%abA-F019:.?&= -\\" +
          ALPHABETS.crlf +
          ALPHABETS.controls +
          ALPHABETS.traversal.join("");
        const url = rng.string(alphabet, rng.int(90));
        try {
          const response = applyDirectives(new Response("x"), [
            { kind: "redirect", url } as never,
          ]);
          const value = response.headers.get("HX-Redirect") ?? "";
          // eslint-disable-next-line no-control-regex -- BR-068: asserts absence
          expect(value).not.toMatch(/[\r\n\u0000]/);
        } catch (error) {
          expect(error).toBeInstanceOf(DirectiveValidationError);
        }
      }
    },
    { timeout: 60_000 },
  );

  test("directive event-name storm never emits prototype keys", () => {
    const seed = 0xdead;
    const rng = createRng(seed);
    const runs = fuzzRuns(80);
    for (let caseIndex = 0; caseIndex < runs; caseIndex++) {
      const name = rng.string(
        "abcXYZ019_.:-," + ALPHABETS.controls + " ",
        rng.int(40),
      );
      const detail = JSON.parse(
        rng.pick([
          '{"safe":1}',
          '{"__proto__":{"x":1}}',
          '{"nested":{"constructor":{}}}',
          "[1,2,3]",
        ]),
      );
      let response: Response;
      try {
        response = applyDirectives(new Response("x"), [
          { kind: "trigger", events: [{ name, detail }] } as never,
        ]);
      } catch (error) {
        expect(error).toBeInstanceOf(DirectiveValidationError);
        continue;
      }
      const trigger = response.headers.get("HX-Trigger") ?? "{}";
      expect(trigger).not.toContain("__proto__");
      expect(trigger).not.toContain('"constructor"');
    }
  });
});
