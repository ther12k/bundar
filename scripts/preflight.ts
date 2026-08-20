/**
 * Runtime preflight for the Bundar workspace.
 *
 * Bundar targets Bun only (decisions/0002-bun-only-runtime.md). This script is
 * wired to `preinstall` and CI so unsupported runtimes fail installation with a
 * clear message instead of failing later with obscure errors.
 */
const MINIMUM_BUN_VERSION = "1.4.0";

type Version = readonly [major: number, minor: number, patch: number];

function parseVersion(raw: string): Version | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(raw);
  if (match === null) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (
    !Number.isInteger(major) ||
    !Number.isInteger(minor) ||
    !Number.isInteger(patch)
  ) {
    return null;
  }
  return [major, minor, patch];
}

function isAtLeast(current: Version, minimum: Version): boolean {
  const [currentMajor, currentMinor, currentPatch] = current;
  const [minimumMajor, minimumMinor, minimumPatch] = minimum;
  if (currentMajor !== minimumMajor) return currentMajor > minimumMajor;
  if (currentMinor !== minimumMinor) return currentMinor > minimumMinor;
  return currentPatch >= minimumPatch;
}

function fail(message: string): never {
  console.error(`bundar preflight: ${message}`);
  process.exit(1);
}

if (typeof Bun === "undefined") {
  const detected = `${process.release.name ?? "unknown runtime"} ${process.version}`;
  fail(
    `this runtime is not Bun.\n` +
      `  detected: ${detected}\n` +
      `  required: Bun >= ${MINIMUM_BUN_VERSION}\n` +
      `Bundar supports Bun only (decisions/0002-bun-only-runtime.md).`,
  );
}

const currentVersion = parseVersion(Bun.version);
const minimumVersion = parseVersion(MINIMUM_BUN_VERSION);

if (currentVersion === null || minimumVersion === null) {
  fail(
    `could not parse Bun version "${Bun.version}" against required "${MINIMUM_BUN_VERSION}".`,
  );
}

if (!isAtLeast(currentVersion, minimumVersion)) {
  fail(
    `unsupported Bun ${Bun.version}; Bundar requires Bun >= ${MINIMUM_BUN_VERSION} ` +
      `(project/charter.md, Runtime constraints).`,
  );
}

console.log(
  `bundar preflight: ok (bun ${Bun.version}, minimum ${MINIMUM_BUN_VERSION})`,
);
