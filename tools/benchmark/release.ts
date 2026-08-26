/**
 * bench:release (GH-083): run the full benchmark suite into
 * artifacts/bench/alpha.json and archive the environment manifest
 * (artifacts/bench/environment.json) — every number in the report is
 * bound to the exact runtime, hardware, packages, dialect pins, and
 * commit that produced it. Results are environment-specific
 * measurements, never universal claims.
 *
 * Packed-candidate note: the benchmark executes the workspace source
 * that `test:pack-consumers` verifies byte-for-byte into tarballs and
 * the GH-081 cleanroom installs; packing status is asserted here so
 * the measured source and the release candidates cannot drift silently.
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { cpus, totalmem } from "node:os";
import { join } from "node:path";

const REPO = join(import.meta.dir, "..", "..");
const OUT = join(REPO, "artifacts", "bench", "alpha.json");

mkdirSync(join(REPO, "artifacts", "bench"), { recursive: true });

// 1. packed-candidate guard: the measured source is the packable source
const pack = spawnSync("bun", ["run", "test:pack-consumers"], {
  cwd: REPO,
  stdio: "inherit",
});
if (pack.status !== 0) {
  console.error("bench:release: packed-candidate guard failed");
  process.exit(1);
}

// 2. the full suite (parity checks included — behavior parity is a
//    precondition, not an afterthought)
const bench = spawnSync("bun", ["run", "bench", "--", "--output", OUT], {
  cwd: REPO,
  stdio: "inherit",
});
if (bench.status !== 0) {
  console.error("bench:release: benchmark suite failed");
  process.exit(1);
}

// 3. environment manifest — binds every number to its context
const commit = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: REPO,
  encoding: "utf8",
}).stdout?.trim();
const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));
const { htmx2 } = await import("@bundar/htmx/2");
const { htmx4Experimental } = await import("@bundar/htmx/4");
const stable = htmx2.describeAsset();
const beta = htmx4Experimental.describeAsset();

const environment = {
  generatedAt: new Date().toISOString(),
  commit,
  runtime: {
    bun: Bun.version,
    platform: process.platform,
    arch: process.arch,
    kernel: (cpus()[0] ?? {}).model ?? "unknown",
    cores: cpus().length,
    totalMemMb: Math.round(totalmem() / 1024 / 1024),
  },
  packages: {
    typescript: pkg.devDependencies.typescript,
    honoParityFixture: pkg.devDependencies.hono,
    carnoReferenceFixture: pkg.devDependencies["@carno.js/core"],
  },
  dialectPins: {
    htmx2: { version: stable.version, integrity: stable.integrity },
    htmx4: {
      version: beta.version,
      integrity: beta.integrity,
      maturity: "experimental",
    },
  },
  notes: [
    "All numbers are measurements on THIS environment (see docs/performance/alpha.md).",
    "Parity checks run as part of the suite; unsafe shortcuts fail the run.",
  ],
};
writeFileSync(
  join(REPO, "artifacts", "bench", "environment.json"),
  JSON.stringify(environment, null, 2) + "\n",
);

// keep a copy for the parity fixture comparison trail
const paritySource = join(REPO, "artifacts", "bench.json");
if (existsSync(paritySource)) {
  copyFileSync(
    paritySource,
    join(REPO, "artifacts", "bench", "raw-latest.json"),
  );
}

console.log("bench:release: wrote alpha.json + environment.json");
