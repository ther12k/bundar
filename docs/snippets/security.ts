/** Runnable snippet: CSRF verification fails closed (GH-061). */
import { composeMiddleware, createContext, text } from "@bundar/core";
import { createCsrfSecret, csrfMiddleware, CsrfError } from "@bundar/security";

const middleware = csrfMiddleware({ secret: createCsrfSecret() });
const chain = composeMiddleware([middleware], () => text("changed"));
const request = new Request("http://x/save", {
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    origin: "http://x",
  },
  body: "name=1",
});
try {
  await chain(createContext(request, {}));
  throw new Error("snippet security: tokenless mutation must fail");
} catch (error) {
  if (!(error instanceof CsrfError)) throw error;
}
