import { parityCheck } from "./runner";

const results = await parityCheck();
console.log(
  `bench:parity: ${results.length} scenarios passed parity checks across all participating adapters (raw Bun, Hono, Bundar, Carno where applicable)`,
);
