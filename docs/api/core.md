# @bundar/core API reference

<sub>Generated from the live public surface by `bun run docs:generate` (GH-079). Drift fails the build — regenerate and commit together with the source change.</sub>

Routing, context, middleware, errors, budgets — zero runtime dependencies.

## Runtime exports (90)

- `App`
- `BodyConsumedError`
- `BodyLimitError`
- `BudgetPolicyError`
- `ClientDisconnectError`
- `CookieMutations`
- `DEFAULT_BODY_LIMITS`
- `DEFAULT_BUDGET_MAXIMUMS`
- `DEFAULT_UPLOAD_POLICY`
- `DoubleNextError`
- `ErrorBoundary`
- `HTTP_METHODS`
- `HttpError`
- `InvalidCookieNameError`
- `Lifecycle`
- `LifecycleStartError`
- `MalformedBodyError`
- `MissingResponseError`
- `REQUEST_BUDGET`
- `RequestTimeoutError`
- `ResponseMutationError`
- `RouteConflictError`
- `RoutePathValidationError`
- `RouteValidationError`
- `STATIC_ROUTE_FORBIDDEN_META_KEYS`
- `STATUS_BY_CODE`
- `StaticRouteMetadataError`
- `UnsupportedMediaTypeError`
- `UploadPolicyError`
- `assertRouteConflictsFree`
- `bodyLimitToHttpError`
- `buildRouteManifest`
- `classifyRequestOutcome`
- `cleanupAllUploads`
- `cloneRouteDescriptor`
- `compileRoutes`
- `composeMiddleware`
- `createContext`
- `createRequestBudget`
- `defaultNotFound`
- `defineModule`
- `empty`
- `encodePath`
- `file`
- `freezeManifest`
- `generateErrorId`
- `generateRoutesModule`
- `getRequestBudget`
- `handleUploads`
- `html`
- `httpErrors`
- `intParam`
- `isAbortLike`
- `isContext`
- `isHttpError`
- `isHttpMethod`
- `isStale`
- `isSyncChain`
- `joinRoutePath`
- `json`
- `middlewareName`
- `normalizeRouteDescriptor`
- `normalizeRouteDescriptors`
- `normalizeRoutePath`
- `param`
- `parseForm`
- `parseFormCached`
- `parseJson`
- `parseText`
- `pathParams`
- `queryAdapter`
- `redactDetails`
- `redirect`
- `requestBudget`
- `requiredParam`
- `resolveBudget`
- `routeConflictKey`
- `sanitizeClientName`
- `sanitizeStack`
- `seeOther`
- `serializeCookie`
- `text`
- `uploadFileExists`
- `validateRouteConflicts`
- `withCookies`
- `withHeader`
- `withHeaderEntries`
- `withHeaders`
- `withSetCookie`
- `withoutHeader`

## Type exports (6)

- `CookieOptions`
- `HeaderMode`
- `LifecycleHooks`
- `LifecycleOptions`
- `LifecycleResource`
- `LifecycleState`
