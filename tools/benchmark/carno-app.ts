/**
 * Shared Carno.js benchmark fixture (BR-076 / GH-127), pinned to
 * @carno.js/core 1.7.0 (MIT; Bun-native, NestJS-style controllers, DI,
 * zod validation). Kept free of hono, harness, and @bundar imports —
 * payload constants live in payloads.ts — so the startup probe can load
 * this module in a fresh process and measure Carno's bootstrap (DI
 * container construction + controller JIT compilation) in isolation.
 *
 * Documented Carno semantics that shape the comparison:
 * - Implicit response normalization: a handler returning a plain string
 *   becomes a PRE-BUILT static Response with `text/plain`; an object
 *   becomes JSON. The parity contract for these scenarios requires exact
 *   `text/html; charset=utf-8` / `text/plain; charset=utf-8` content
 *   types, so fixture handlers construct Response objects explicitly —
 *   the same primitive the raw-Bun adapter uses. Consequence: Carno's
 *   pre-built static fast path (which only applies to implicitly
 *   normalized string returns) cannot produce parity-faithful HTML and
 *   is therefore NOT exercised by the static-response scenario.
 * - DI: @Service classes resolve once at bootstrap; per-request service
 *   access is a property read on the controller instance.
 * - Validation failures throw ValidationException that Carno's global
 *   error handler normalizes to JSON — an error shape the other adapters
 *   do not share, so the validated-json scenario times the valid path
 *   where every adapter produces byte-equal responses.
 */
import "reflect-metadata";
import { z } from "zod";
import {
  Body,
  Carno,
  Controller,
  Get,
  Middleware,
  Param,
  Post,
  Query,
  Schema,
  Service,
  ZodAdapter,
} from "@carno.js/core";
import type { CarnoClosure, CarnoMiddleware, Context } from "@carno.js/core";
import {
  FORM_HTML,
  FRAGMENT_HTML,
  INVALID_HTML,
  PAGE_HTML,
  response,
  STATIC_HTML,
} from "./payloads";

const TEXT = "text/plain; charset=utf-8";

@Service()
class BenchmarkService {
  owner(): string {
    return "Bundar";
  }
}

class SyncPass implements CarnoMiddleware {
  // Synchronous step: the body only forwards (no await), mirroring the
  // sync middleware scenario in the other adapters.
  handle(_context: Context, next: CarnoClosure): Promise<Response> {
    return next();
  }
}

class AsyncPass implements CarnoMiddleware {
  async handle(_context: Context, next: CarnoClosure): Promise<Response> {
    await Promise.resolve();
    return next();
  }
}

@Schema(z.object({ name: z.string().min(1), email: z.string().min(3) }))
class JsonSubmission {
  name!: string;
  email!: string;
}

@Controller()
class BenchController {
  constructor(private readonly service: BenchmarkService) {}

  @Get("/static")
  staticPage(): Response {
    return response(STATIC_HTML);
  }

  @Get("/dynamic")
  dynamic(@Query("value") value: string | undefined): Response {
    return new Response(`dynamic:${value ?? ""}`, {
      headers: { "content-type": TEXT },
    });
  }

  @Get("/users/:id")
  user(@Param("id") id: string): Response {
    return response(`<p data-user="${id}">user</p>`);
  }

  @Get("/middleware/sync")
  @Middleware(SyncPass)
  syncStep(): Response {
    return new Response("sync-middleware", {
      headers: { "content-type": TEXT },
    });
  }

  @Get("/middleware/async")
  @Middleware(AsyncPass)
  asyncStep(): Response {
    return new Response("async-middleware", {
      headers: { "content-type": TEXT },
    });
  }

  @Get("/negotiated")
  negotiated(context: Context): Response {
    const fragment = context.headers.get("HX-Request") === "true";
    return response(fragment ? FRAGMENT_HTML : PAGE_HTML, 200, {
      vary: "HX-Request",
    });
  }

  @Post("/form")
  async form(context: Context): Promise<Response> {
    const values = (await context.parseBody()) as Record<string, string>;
    const valid =
      values["name"] === "Bundar" && values["email"] === "team@bundar.invalid";
    return response(valid ? FORM_HTML : INVALID_HTML, valid ? 200 : 422);
  }

  @Post("/json")
  async json(@Body() submission: JsonSubmission): Promise<Response> {
    // Carno validated the body against JsonSubmission's schema before
    // this handler ran; reaching the handler means the submission passed.
    void submission;
    return response(FORM_HTML);
  }

  @Get("/service")
  serviceOwner(): Response {
    return response(`<p data-service="${this.service.owner()}">service</p>`);
  }
}

type RouteHandler = (request: Request) => Response | Promise<Response>;
type RouteTable = Record<string, Record<string, RouteHandler | Response>>;

// Bun's native dispatch re-sends a static route's Response for every
// request at the C++ layer; the JS Response body is one-shot, so the
// in-process harness clones to model that per-request re-send — the
// same convention as the Bundar adapter's static entries.
function cloneStatic(canonical: Response): Response {
  return canonical.clone() as Response;
}

export async function buildCarnoApp(): Promise<{
  serve: (request: Request) => Response | Promise<Response>;
}> {
  const app = new Carno({
    disableStartupLog: true,
    validation: new ZodAdapter(),
  });
  app.services([BenchmarkService, SyncPass, AsyncPass]);
  app.controllers([BenchController]);
  // Public lifecycle only: listen(0) constructs the DI container, runs
  // init hooks, JIT-compiles controllers, and binds an ephemeral port;
  // stop() releases the listener and keeps the compiled route table.
  await app.listen(0);
  await app.stop();

  // `routes` is private in @carno.js/core 1.7.0; the version is pinned
  // and the read below is validated by the parity gate on every run.
  const table = (app as unknown as { routes: RouteTable }).routes;

  const serve = (request: Request): Response | Promise<Response> => {
    const path = new URL(request.url).pathname;
    const pattern = path.startsWith("/users/") ? "/users/:id" : path;
    const entry = table[pattern];
    if (entry === undefined)
      return new Response("not-found", {
        status: 404,
        headers: { "content-type": TEXT },
      });
    const handler = entry[request.method] ?? entry["GET"];
    if (handler === undefined)
      return new Response("not-found", {
        status: 404,
        headers: { "content-type": TEXT },
      });
    if (handler instanceof Response) return cloneStatic(handler);
    if (pattern === "/users/:id") {
      const patched = request as Request & { params: Record<string, string> };
      patched.params = { id: path.split("/").pop() ?? "" };
    }
    return handler(request);
  };
  return { serve };
}
