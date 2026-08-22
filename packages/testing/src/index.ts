/**
 * @bundar/testing public surface (GH-074).
 *
 * In-process test client, request builders, cookie jar, and the
 * real-server opt-in. Imports public package APIs only: @bundar/core
 * (compilation), @bundar/htmx (dialect-correct request headers). Nothing
 * here is imported by production packages — the framework never depends
 * on its test tooling.
 */
export {
  createTestClient,
  compileForTest,
  inject,
  type TestClient,
  type TestClientOptions,
  type TestClientTarget,
} from "./client";
export { CookieJar, responseCookies } from "./cookies";
export {
  matchRoute,
  requestWithParams,
  type CompiledTableLike,
  type MatchResult,
  type RouteTableEntry,
} from "./match";
export {
  enhancedRequest,
  fileFixture,
  formRequest,
  jsonRequest,
  multipartRequest,
  TEST_ORIGIN,
  type EnhancedRequestOptions,
  type MultipartPart,
  type RequestInitLike,
} from "./request";
export {
  startTestServer,
  stopAllTestServers,
  withRealServer,
  type TestServer,
} from "./server";
