/**
 * HttpError and error codes (GH-020).
 *
 * Expected HTTP failures carry a public envelope (code, message, status,
 * optional details/headers) safe to show to clients. Unexpected errors stay
 * opaque; the boundary decides exposure by environment.
 */

export type HttpErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "method_not_allowed"
  | "conflict"
  | "unprocessable"
  | "payload_too_large"
  | "unsupported_media_type"
  | "too_many_requests"
  | "internal";

const STATUS_BY_CODE: Record<HttpErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  method_not_allowed: 405,
  conflict: 409,
  unprocessable: 422,
  payload_too_large: 413,
  unsupported_media_type: 415,
  too_many_requests: 429,
  internal: 500,
};

/** Public, deterministic error envelope. */
export interface HttpErrorBody {
  readonly error: Readonly<{
    readonly code: HttpErrorCode;
    readonly message: string;
    readonly details?: unknown;
  }>;
}

export class HttpError extends Error {
  public readonly code: HttpErrorCode;
  public readonly status: number;
  public readonly details?: unknown;
  public readonly headers: Readonly<Record<string, string>>;

  public constructor(
    code: HttpErrorCode,
    message: string,
    options: {
      status?: number;
      details?: unknown;
      headers?: Record<string, string>;
      cause?: unknown;
    } = {},
  ) {
    super(
      message,
      options.cause !== undefined ? { cause: options.cause } : undefined,
    );
    this.name = "HttpError";
    this.code = code;
    this.status = options.status ?? STATUS_BY_CODE[code];
    this.details = options.details;
    this.headers = Object.freeze({ ...options.headers });
  }

  /** The deterministic public envelope for this error. */
  public toBody(): HttpErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details !== undefined ? { details: this.details } : {}),
      },
    };
  }

  /** A Response carrying the public envelope. */
  public toResponse(): Response {
    return new Response(JSON.stringify(this.toBody()), {
      status: this.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        ...this.headers,
      },
    });
  }
}

/** Convenience constructors for the common expected failures. */
export const httpErrors = {
  badRequest: (message = "Bad Request", details?: unknown) =>
    new HttpError("bad_request", message, { details }),
  unauthorized: (message = "Unauthorized") =>
    new HttpError("unauthorized", message),
  forbidden: (message = "Forbidden") => new HttpError("forbidden", message),
  notFound: (message = "Not Found") => new HttpError("not_found", message),
  methodNotAllowed: (message = "Method Not Allowed") =>
    new HttpError("method_not_allowed", message),
  conflict: (message = "Conflict") => new HttpError("conflict", message),
  unprocessable: (message = "Unprocessable Entity", details?: unknown) =>
    new HttpError("unprocessable", message, { details }),
  payloadTooLarge: (message = "Payload Too Large") =>
    new HttpError("payload_too_large", message),
  unsupportedMediaType: (contentType: string) =>
    new HttpError(
      "unsupported_media_type",
      `unsupported media type: ${contentType}`,
    ),
  tooManyRequests: (message = "Too Many Requests") =>
    new HttpError("too_many_requests", message),
};

export function isHttpError(value: unknown): value is HttpError {
  return value instanceof HttpError;
}

/** Client-disconnect / abort classification (separate from HTTP failures). */
export class ClientDisconnectError extends Error {
  public constructor(cause?: unknown) {
    super("client disconnected during response", cause ? { cause } : undefined);
    this.name = "ClientDisconnectError";
  }
}

export function isAbortLike(error: unknown): boolean {
  if (error instanceof ClientDisconnectError) return true;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  return false;
}
