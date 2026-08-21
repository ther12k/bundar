import { spawnSync } from "node:child_process";
import { join } from "node:path";

const result = spawnSync(
  "bunx",
  ["tsc", "--noEmit", "-p", "tests/consumer/jsx/tsconfig.json"],
  { cwd: join(import.meta.dir, "../.."), encoding: "utf8", stdio: "inherit" },
);
process.exit(result.status ?? 1);
