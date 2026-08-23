import { describe, expect, test } from "bun:test";
import * as forms from "../src/index";

describe("BR-013 @bundar/forms skeleton", () => {
  test("the frozen contract surface is exactly the skeleton exports", () => {
    expect(Object.keys(forms).sort()).toEqual(
      [
        "FORMS_CONTRACT_VERSION",
        "FormActionComposer", // type-only: absent at runtime
        "defineFormAction",
        "formsContractSummary",
      ].filter((name) => name !== "FormActionComposer"),
    );
  });

  test("placeholder factories fail loudly instead of forking behavior", () => {
    expect(() => forms.defineFormAction()).toThrow(/BR-014\/BR-015/);
  });

  test("the ownership statement matches ADR-0018 section 3", () => {
    const summary = forms.formsContractSummary();
    expect(summary).toContain("@bundar/core");
    expect(summary).toContain("@bundar/schema");
    expect(summary).toContain("never imports: @bundar/htmx");
    expect(summary).toContain("ships no validator");
  });
});
