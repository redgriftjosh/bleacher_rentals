"use client";

import { useMemo } from "react";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import {
  allEmailBindingsQuery,
  allEmailTemplatesQuery,
  EmailTriggerBindingRow,
  EmailTemplateRow,
} from "../db";
import { getTriggerStates, TriggerWithState } from "../util/getTriggerStates";

export function useEmailAutomationState(salesOfficeId: string): TriggerWithState[] {
  const { data: allBindings = [] } = useTypedQuery(
    allEmailBindingsQuery,
    expect<EmailTriggerBindingRow>(),
  );
  const { data: allTemplates = [] } = useTypedQuery(
    allEmailTemplatesQuery,
    expect<EmailTemplateRow>(),
  );

  return useMemo(
    () => getTriggerStates(salesOfficeId, allBindings, allTemplates),
    [salesOfficeId, allBindings, allTemplates],
  );
}
