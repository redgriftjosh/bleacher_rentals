import { TRIGGERS, TriggerDef } from "../triggers";
import { EmailTriggerBindingRow, EmailTemplateRow } from "../db";

export type TriggerState = "coming_soon" | "inactive" | "misconfigured" | "success";

export type TriggerWithState = {
  trigger: TriggerDef;
  state: TriggerState;
  /** The active template id, when state is 'success'. */
  activeTemplateId: string | null;
  /** The binding id for this office+trigger, if one exists. */
  bindingId: string | null;
};

/**
 * Derives the display state for every trigger for a given sales office.
 *
 * Rules:
 *  - coming_soon → trigger.wired is false (not yet sending)
 *  - inactive    → wired, but no template with is_active = 1 exists for this office+trigger
 *  - success     → at least one template with is_active = 1 exists for this office+trigger
 *  - misconfigured → there's a template with is_active = 1 and error_message is not null
 */
export function getTriggerStates(
  salesOfficeId: string,
  bindings: EmailTriggerBindingRow[],
  templates: EmailTemplateRow[],
): TriggerWithState[] {
  const officeBindings = bindings.filter((b) => b.sales_office_uuid === salesOfficeId);

  return TRIGGERS.map((trigger) => {
    if (!trigger.wired) {
      return { trigger, state: "coming_soon", activeTemplateId: null, bindingId: null };
    }

    const binding = officeBindings.find((b) => b.trigger === trigger.key);
    if (!binding) {
      return { trigger, state: "inactive", activeTemplateId: null, bindingId: null };
    }

    const activeTemplate = templates.find(
      (t) => t.trigger_uuid === binding.id && t.is_active === 1,
    );

    if (!activeTemplate) {
      return { trigger, state: "inactive", activeTemplateId: null, bindingId: binding.id };
    }

    if (activeTemplate.error_message) {
      return {
        trigger,
        state: "misconfigured",
        activeTemplateId: activeTemplate.id,
        bindingId: binding.id,
      };
    }

    return {
      trigger,
      state: "success",
      activeTemplateId: activeTemplate.id,
      bindingId: binding.id,
    };
  });
}
