export type ScenarioId =
  | "static-response"
  | "dynamic-text"
  | "parameterized-route"
  | "sync-middleware"
  | "async-middleware"
  | "escaped-jsx-fragment"
  | "async-jsx-component"
  | "page-fragment-negotiation"
  | "validated-form";

export type BenchmarkScenario = {
  id: ScenarioId;
  category: "micro" | "representative";
  description: string;
  request: () => Request;
};

export type AdapterName = "raw-bun" | "hono" | "bundar";

export type Adapter = {
  name: AdapterName;
  version: string;
  request: (
    request: Request,
    scenario: BenchmarkScenario,
  ) => Response | Promise<Response>;
};

export type ResponseSnapshot = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

export type ParityResult = {
  scenario: ScenarioId;
  adapters: Record<AdapterName, ResponseSnapshot>;
};

export type Distribution = {
  samplesNs: number[];
  count: number;
  minNs: number;
  maxNs: number;
  meanNs: number;
  p50Ns: number;
  p95Ns: number;
  p99Ns: number;
  standardDeviationNs: number;
  relativeStandardDeviation: number;
};

export type BenchmarkResult = {
  scenario: ScenarioId;
  category: BenchmarkScenario["category"];
  adapter: AdapterName;
  adapterVersion: string;
  distribution: Distribution;
};

export type StartupDistribution = {
  mode: "raw-bun" | "bundar";
  samples: number;
  readyMsMin: number;
  readyMsP50: number;
  rssBytesMin: number;
  rssBytesP50: number;
};

export type BenchmarkResources = {
  startup: readonly StartupDistribution[];
  note: string;
};

export type BenchmarkReport = {
  schemaVersion: 2;
  generatedAt: string;
  methodology: {
    timing: "in-process Request/Response; no localhost networking";
    warmupIterations: number;
    measuredIterations: number;
    parityCheckedBeforeTiming: true;
    rawSamplesIncluded: true;
  };
  environment: {
    bun: string;
    platform: string;
    arch: string;
    cpuCount: number;
    cpuModel: string;
  };
  scenarios: readonly BenchmarkScenario[];
  parity: readonly ParityResult[];
  results: readonly BenchmarkResult[];
  resources: BenchmarkResources;
};
