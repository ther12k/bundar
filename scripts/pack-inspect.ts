/**
 * Fail-closed workspace package inspection.
 *
 * Packs a workspace package with `bun pm pack`, parses the tarball without
 * external tools, and verifies that the packed contents match the manifest's
 * `files` allow-list. Used by GH-011 for `bun run pack:inspect @bundar/core`.
 *
 * Fails (exit 1) on: unknown selector, missing or empty allow-list, missing
 * typed exports, runtime dependencies in zero-dependency packages, unexpected
 * packed files, stale allow-list entries, or pack errors. The generated
 * tarball is always removed, including on failure.
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { gunzipSync } from "node:zlib";

const repositoryRoot = join(import.meta.dir, "..");

/** Packages under the ADR-0011 zero-runtime-dependency policy. */
const ZERO_DEPENDENCY_PACKAGES = new Set(["@bundar/core", "@bundar/jsx"]);

/** npm always includes package.json regardless of the `files` allow-list. */
const ALWAYS_PACKED = new Set(["package.json"]);

class InspectionError extends Error {}

function fail(message: string): never {
  throw new InspectionError(message);
}

type Manifest = {
  name?: unknown;
  version?: unknown;
  files?: unknown;
  dependencies?: Record<string, string>;
  exports?: Record<string, { types?: unknown; default?: unknown }>;
  engines?: Record<string, string>;
};

type WorkspacePackage = {
  name: string;
  directory: string;
  manifest: Manifest;
};

function readJson(path: string): Manifest {
  return JSON.parse(readFileSync(path, "utf8")) as Manifest;
}

function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

function discoverWorkspacePackages(): WorkspacePackage[] {
  const root = readJson(join(repositoryRoot, "package.json")) as {
    workspaces?: unknown;
  };
  const patterns = Array.isArray(root.workspaces)
    ? (root.workspaces as string[])
    : [];
  const directories: string[] = [];
  for (const pattern of patterns) {
    if (pattern.endsWith("/*")) {
      const base = dirname(pattern);
      if (!isDirectory(join(repositoryRoot, base))) continue;
      for (const entry of readdirSync(join(repositoryRoot, base))) {
        directories.push(join(base, entry));
      }
    } else {
      directories.push(pattern);
    }
  }
  const packages: WorkspacePackage[] = [];
  for (const directory of directories) {
    const manifestPath = join(repositoryRoot, directory, "package.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = readJson(manifestPath);
    if (typeof manifest.name !== "string") continue;
    packages.push({ name: manifest.name, directory, manifest });
  }
  return packages;
}

type TarEntry = { name: string; size: number };

/**
 * Minimal tar reader for npm-style archives: regular files only, with GNU
 * longname support. Pax header path overrides are not interpreted (paths in
 * this repository stay short enough that npm does not emit them).
 */
function parseTar(archive: Buffer): TarEntry[] {
  const entries: TarEntry[] = [];
  let offset = 0;
  let longName: string | null = null;
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = header.toString("ascii", 0, 100).replace(/\0[\s\S]*$/, "");
    const sizeField = header
      .toString("ascii", 124, 136)
      .replace(/\0[\s\S]*$/, "")
      .trim();
    const size = sizeField === "" ? 0 : Number.parseInt(sizeField, 8);
    const typeFlag = header[156] ?? 0;
    const type = typeFlag === 0 ? "0" : String.fromCharCode(typeFlag);
    const dataStart = offset + 512;
    const paddedSize = Math.ceil(size / 512) * 512;
    if (type === "L") {
      longName = archive
        .subarray(dataStart, dataStart + size)
        .toString("ascii")
        .replace(/\0[\s\S]*$/, "");
    } else if (type === "0" || type === "7") {
      entries.push({ name: longName ?? name, size });
      longName = null;
    }
    offset = dataStart + paddedSize;
  }
  return entries;
}

async function runBunPack(
  directory: string,
): Promise<{ exitCode: number; output: string }> {
  const proc = Bun.spawn(["bun", "pm", "pack"], {
    cwd: join(repositoryRoot, directory),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { exitCode, output: `${stdout}${stderr}` };
}

async function main(): Promise<number> {
  let archivePath: string | null = null;
  let failure: string | null = null;
  try {
    const selector = process.argv[2];
    if (selector === undefined) {
      fail(
        "usage: bun run pack:inspect <package-selector> (e.g. @bundar/core)",
      );
    }

    const candidates = discoverWorkspacePackages().filter(
      (candidate) => candidate.name === selector,
    );
    if (candidates.length === 0) {
      fail(`no workspace package named "${selector}"`);
    }
    const pkg = candidates[0];
    if (pkg === undefined) {
      fail(`ambiguous selector "${selector}"`);
    }
    const { name, directory, manifest } = pkg;

    if (!Array.isArray(manifest.files)) {
      fail(`${name}: manifest has no "files" allow-list`);
    }
    const allowList = (manifest.files as unknown[]).filter(
      (entry): entry is string => typeof entry === "string" && entry.length > 0,
    );
    if (allowList.length === 0) {
      fail(`${name}: "files" allow-list is empty`);
    }

    const runtimeDependencies = Object.keys(manifest.dependencies ?? {});
    if (ZERO_DEPENDENCY_PACKAGES.has(name) && runtimeDependencies.length > 0) {
      fail(
        `${name}: zero-runtime-dependency policy (ADR-0011) violated by ${runtimeDependencies.join(", ")}`,
      );
    }

    const rootExport = manifest.exports?.["."];
    if (
      rootExport === undefined ||
      typeof rootExport.types !== "string" ||
      typeof rootExport.default !== "string"
    ) {
      fail(
        `${name}: exports["."] must declare string "types" and "default" paths`,
      );
    }
    for (const entryPath of [rootExport.types, rootExport.default]) {
      if (!existsSync(join(repositoryRoot, directory, entryPath))) {
        fail(`${name}: export target "${entryPath}" does not exist`);
      }
    }

    const before = new Set(readdirSync(join(repositoryRoot, directory)));
    const pack = await runBunPack(directory);
    if (pack.exitCode !== 0) {
      fail(`bun pm pack exited ${pack.exitCode}: ${pack.output.trim()}`);
    }
    const after = readdirSync(join(repositoryRoot, directory));
    const produced = after.filter(
      (entry) => entry.endsWith(".tgz") && !before.has(entry),
    );
    const tarball = produced[0];
    if (tarball === undefined) {
      fail("bun pm pack produced no new .tgz archive");
    }
    archivePath = join(repositoryRoot, directory, tarball);

    const entries = parseTar(gunzipSync(readFileSync(archivePath)));
    const packed = entries
      .map((entry) => entry.name.replace(/^package\//, ""))
      .filter((path) => path.length > 0)
      .sort();

    const extras = packed.filter(
      (path) =>
        !ALWAYS_PACKED.has(path) &&
        !allowList.some(
          (allowed) => path === allowed || path.startsWith(`${allowed}/`),
        ),
    );
    if (extras.length > 0) {
      fail(
        `${name}: packed files outside the allow-list: ${extras.join(", ")}`,
      );
    }

    const stale = allowList.filter(
      (allowed) =>
        !packed.some(
          (path) => path === allowed || path.startsWith(`${allowed}/`),
        ),
    );
    if (stale.length > 0) {
      fail(
        `${name}: allow-list entries with no packed files: ${stale.join(", ")}`,
      );
    }

    console.log(`pack:inspect: ${name} (${directory})`);
    console.log(
      `pack:inspect: runtime dependencies: ${runtimeDependencies.length}`,
    );
    console.log(`pack:inspect: files allow-list: ${allowList.join(", ")}`);
    console.log(`pack:inspect: packed ${packed.length} files:`);
    for (const path of packed) {
      console.log(`  - ${path}`);
    }
    console.log("pack:inspect: ok");
  } catch (error) {
    failure =
      error instanceof InspectionError
        ? error.message
        : `unexpected error: ${String(error)}`;
  } finally {
    if (archivePath !== null) {
      rmSync(archivePath, { force: true });
    }
  }
  if (failure !== null) {
    console.error(`pack:inspect: ${failure}`);
    return 1;
  }
  return 0;
}

process.exit(await main());
