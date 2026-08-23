import type {
  FormResponseAdapter,
  InvalidSubmissionDelivery,
  ValidSubmissionDelivery,
} from "../src/index";

/** Records every delivery without composing real responses. */
export function recordingAdapter(): FormResponseAdapter & {
  invalids: InvalidSubmissionDelivery[];
  valids: ValidSubmissionDelivery[];
} {
  const invalids: InvalidSubmissionDelivery[] = [];
  const valids: ValidSubmissionDelivery[] = [];
  return {
    invalids,
    valids,
    invalid: async (_request, delivery) => {
      invalids.push(delivery);
      return new Response("invalid", { status: delivery.status });
    },
    valid: async (_request, delivery) => {
      valids.push(delivery);
      return new Response("valid");
    },
  };
}

/** An adapter whose composition always fails (for error-path testing). */
export function failingAdapter(): FormResponseAdapter {
  return {
    invalid: () => new Response("invalid", { status: 422 }),
    valid: () => {
      throw new Error("adapter composition failed");
    },
  };
}
