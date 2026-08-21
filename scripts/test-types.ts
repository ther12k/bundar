import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const result = spawnSync(
  "bun",
  ["test", "./packages/core/test/types/route-descriptor.test-d.ts"],
  { cwd: root, encoding: "utf8", stdio: "inherit" },
);
process.exit(result.status ?? 1);
