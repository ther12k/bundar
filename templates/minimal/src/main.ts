/** Bootstrap: the app owns its error boundary (opaque 500s in production). */
import { ErrorBoundary } from "@bundar/core";
import { createApp } from "./app";
import { dialect } from "./dialect";

const app = createApp();
const boundary = new ErrorBoundary({
  development: process.env.NODE_ENV !== "production",
});
const server = Bun.serve({
  ...app.compile(),
  port: Number(process.env.PORT ?? 3000),
  error: (error: Error) => boundary.capture(error),
});
console.log(
  "bundar starter on http://localhost:" +
    server.port +
    " (dialect: " +
    dialect.id +
    ")",
);
