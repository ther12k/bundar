import { parityCheck } from "./runner";

const results = await parityCheck();
console.log(
  `bench:parity: ${results.length} scenarios passed raw Bun/Hono/Bundar parity checks`,
);
