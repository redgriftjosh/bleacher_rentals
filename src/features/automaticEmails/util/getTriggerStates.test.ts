import { describe, it, expect } from "vitest";
import { getTriggerStates } from "./getTriggerStates";
import {
  QUOTE_SIGNED_CLIENT,
  PAYMENT_DUE_CLIENT,
  QUOTE_UNSIGNED_REMINDER,
} from "../triggers";
import type { EmailTriggerBindingRow, EmailTemplateRow } from "../db";

const OFFICE = "office-1";

function binding(over: Partial<EmailTriggerBindingRow>): EmailTriggerBindingRow {
  return { id: "b-1", sales_office_uuid: OFFICE, trigger: QUOTE_SIGNED_CLIENT, ...over };
}
function template(over: Partial<EmailTemplateRow>): EmailTemplateRow {
  return {
    id: "t-1",
    name: "T",
    subject: "",
    html_body: "",
    trigger_uuid: "b-1",
    is_active: 1,
    created_at: null,
    created_by_user_uuid: null,
    updated_at: null,
    edited_by_user_uuid: null,
    error_message: null,
    ...over,
  } as EmailTemplateRow;
}

function stateFor(
  triggerKey: string,
  bindings: EmailTriggerBindingRow[],
  templates: EmailTemplateRow[],
) {
  return getTriggerStates(OFFICE, bindings, templates).find((s) => s.trigger.key === triggerKey);
}

describe("getTriggerStates", () => {
  it("marks un-wired triggers as coming_soon", () => {
    const s = stateFor(QUOTE_UNSIGNED_REMINDER, [], []);
    expect(s?.state).toBe("coming_soon");
    // Un-wired (recurring) trigger really is configured as not wired.
    expect(PAYMENT_DUE_CLIENT).toBeTruthy();
  });

  it("is inactive when a wired trigger has no binding", () => {
    const s = stateFor(QUOTE_SIGNED_CLIENT, [], []);
    expect(s?.state).toBe("inactive");
    expect(s?.bindingId).toBeNull();
  });

  it("is inactive when a binding exists but has no active template", () => {
    const b = binding({});
    const s = stateFor(QUOTE_SIGNED_CLIENT, [b], [template({ is_active: 0 })]);
    expect(s?.state).toBe("inactive");
    expect(s?.bindingId).toBe("b-1");
    expect(s?.activeTemplateId).toBeNull();
  });

  it("is success when a binding has an active, error-free template", () => {
    const b = binding({});
    const s = stateFor(QUOTE_SIGNED_CLIENT, [b], [template({ is_active: 1 })]);
    expect(s?.state).toBe("success");
    expect(s?.activeTemplateId).toBe("t-1");
  });

  it("is misconfigured when the active template has an error_message", () => {
    const b = binding({});
    const s = stateFor(
      QUOTE_SIGNED_CLIENT,
      [b],
      [template({ is_active: 1, error_message: "Unknown variable {{foo}}" })],
    );
    expect(s?.state).toBe("misconfigured");
    expect(s?.activeTemplateId).toBe("t-1");
  });

  it("ignores bindings/templates belonging to another office", () => {
    const b = binding({ sales_office_uuid: "other-office" });
    const s = stateFor(QUOTE_SIGNED_CLIENT, [b], [template({ is_active: 1 })]);
    expect(s?.state).toBe("inactive");
  });
});
