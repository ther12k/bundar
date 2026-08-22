#!/usr/bin/env bun
/**
 * create-bundar entry point (GH-071).
 */
import { runCreateBundar } from "./cli";

const exitCode = await runCreateBundar({
  args: process.argv.slice(2),
  flags: {},
  interactive: process.stdin.isTTY && process.argv.slice(2).length === 0,
});
process.exit(exitCode);
