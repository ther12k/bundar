/**
 * @bundar/cli programmatic API (GH-070).
 */
export { BUNDAR_VERSION, parseArgs, registerCommand, runCli } from "./cli";

export type { CommandContext, CommandDefinition, CommandHandler } from "./cli";
export type { CliEnvelopeV1, ExitCode } from "./machine";
export { buildEnvelope, EXIT, printEnvelope, stripAnsi } from "./machine";
