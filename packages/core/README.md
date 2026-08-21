# @bundar/core

Bundar HTTP core package (GH-011 skeleton).

- Status: intentionally empty placeholder surface. No routing, app builder,
  context, middleware, or error behavior is implemented yet; M1 behavior lands
  with GH-012–GH-025.
- Runtime dependency policy: zero runtime dependencies
  (`decisions/0011-zero-runtime-deps.md`), enforced by `tests/skeleton.test.ts`,
  the architecture boundary check, and `bun run pack:inspect @bundar/core`.
- Package surface: `exports["."]`, `types`, and `main` point at
  `./src/index.ts`; published files are allow-listed in `files` and verified by
  packing.
- Publishing: stays `private` until the M6 packaging gates (GH-084–GH-086),
  which own the publish-time layout (built output, export-map variants).
