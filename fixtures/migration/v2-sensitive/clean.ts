/** Fixture: neutral code — no findings expected. */
import { buildHtmxRequestHeaders } from "@bundar/htmx";
import { errorViewResponse } from "@bundar/htmx";

export const neutralHeaders = buildHtmxRequestHeaders({ trigger: "save" });
export const errorView = (request: Request) =>
  errorViewResponse(
    request,
    { status: 422, code: "unprocessable", message: "no" },
    { renderFragment: () => "no" },
  );
