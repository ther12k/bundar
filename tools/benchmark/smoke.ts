import { parityCheck } from "./runner";

const results = await parityCheck();
if (results.length === 0)
  throw new Error("bench:smoke: no scenarios were exercised");
console.log(
  `bench:smoke: ${results.length} scenarios passed parity and response checks`,
);
