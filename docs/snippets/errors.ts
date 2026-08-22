/** Runnable snippet: expected errors and the production boundary (GH-020). */
import { ErrorBoundary, HttpError } from "@bundar/core";

const boundary = new ErrorBoundary({ development: false });
const forbidden = new HttpError("forbidden", "nope");
const response = boundary.capture(forbidden);
if (response.status !== 403) throw new Error("snippet errors: expected 403");
const unexpected = boundary.capture(new Error("boom"));
if (unexpected.status !== 500) throw new Error("snippet errors: expected 500");
const body = await unexpected.text();
if (body.includes("boom")) throw new Error("snippet errors: leaked internals");
