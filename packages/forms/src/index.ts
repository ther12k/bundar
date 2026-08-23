/**
 * @bundar/forms public surface (BR-014/BR-015).
 *
 * Ownership per ADR-0018 §3: this package owns the progressive-form
 * workflow — bounded parsing orchestration, retained values, field-error
 * presentation models, and ordinary/enhanced action composition through an
 * injected response adapter. Parser primitives stay in `@bundar/core`;
 * HTMX delivery stays in `@bundar/htmx` behind `FormResponseAdapter`;
 * validation integrates via `@bundar/schema`. No validator ships or is
 * required.
 */
export {
  INVALID_SUBMISSION_STATUS,
  type FormActionDefinition,
  type FormActionOutcome,
  type FormResponseAdapter,
  type FormTransaction,
  type FormWorkflowContext,
  type InvalidFormRender,
  type InvalidSubmissionDelivery,
  type RetainedValues,
  type ValidSubmissionDelivery,
} from "./contracts";
export { executeFormAction } from "./run-form-action";
export {
  isStandardSchemaLike,
  resolveValidationAdapter,
  standardSchemaAdapter,
  type AnyStandardSchema,
  type FormValidationAdapter,
  type FormValidationOutcome,
} from "./validation";
export {
  validateForm,
  validateHeaders,
  validateJson,
  validateParams,
  validateQuery,
} from "./sources";

/** Contract version of this surface; bumps when a contract shape changes. */
export const FORMS_CONTRACT_VERSION = "1.1.0";
