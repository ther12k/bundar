/**
 * GH-074 external type-consumer fixture: consumes @bundar/testing public
 * types through the workspace package name (as an external app would).
 */
import type {
  CookieJar,
  MatchResult,
  MultipartPart,
  RequestInitLike,
  TestClient,
  TestClientOptions,
  TestServer,
} from "@bundar/testing";

export type Surface = {
  client: TestClient;
  options: TestClientOptions;
  server: TestServer;
  jar: CookieJar;
  match: MatchResult;
  part: MultipartPart;
  init: RequestInitLike;
};

export const surface: Surface = null as unknown as Surface;
