"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import {
  allEmailBindingsQuery,
  allEmailTemplatesQuery,
  EmailTriggerBindingRow,
  EmailTemplateRow,
} from "@/features/automaticEmails/db";
import { TRIGGERS } from "@/features/automaticEmails/triggers";
import { AppTooltip } from "@/components/AppTooltip";

const TOTAL = TRIGGERS.length;
const RADIUS = 9;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function CircleProgress({ configured, hasError }: { configured: number; hasError: boolean }) {
  const progress = TOTAL === 0 ? 0 : configured / TOTAL;
  const offset = CIRCUMFERENCE * (1 - progress);
  const allDone = configured === TOTAL;
  const strokeColor = hasError ? "#ef4444" : allDone ? "#16a34a" : "#3b82f6";
  const size = RADIUS * 2 + 4;

  if (allDone && !hasError) {
    return (
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
        <Check className="h-3 w-3 text-green-600" strokeWidth={3} />
      </span>
    );
  }

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={RADIUS}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={2.5}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={RADIUS}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2.5}
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

type Props = {
  officeId: string | null;
};

export function AutoEmailsForSalesOfficeBtn({ officeId }: Props) {
  const router = useRouter();
  const { data: allBindings = [] } = useTypedQuery(
    allEmailBindingsQuery,
    expect<EmailTriggerBindingRow>(),
  );
  const { data: allTemplates = [] } = useTypedQuery(
    allEmailTemplatesQuery,
    expect<EmailTemplateRow>(),
  );

  const { configured, hasMisconfiguration } = useMemo(() => {
    const officeBindings = allBindings.filter((b) => b.sales_office_uuid === officeId);
    let configured = 0;
    let hasMisconfiguration = false;
    for (const trigger of TRIGGERS) {
      if (!trigger.wired) continue;
      const b = officeBindings.find((b) => b.trigger === trigger.key);
      if (!b) continue;
      const hasActiveTemplate = allTemplates.some(
        (t) => t.trigger_uuid === b.id && t.is_active === 1,
      );
      if (hasActiveTemplate) configured++;
      else hasMisconfiguration = true;
    }
    return { configured, hasMisconfiguration };
  }, [allBindings, allTemplates, officeId]);

  const needsAttention = !!officeId && (hasMisconfiguration || configured < TOTAL);

  const label = !officeId
    ? "Save office first to configure emails"
    : hasMisconfiguration
      ? `${configured}/${TOTAL} active — misconfiguration detected`
      : configured === TOTAL
        ? `${TOTAL}/${TOTAL} triggers configured`
        : configured === 0
          ? "No email triggers configured"
          : `${configured}/${TOTAL} triggers configured`;

  const tooltip = !officeId
    ? "Save the office first, then configure its email triggers."
    : hasMisconfiguration
      ? "We've found a problem with one or more of your email templates!"
      : configured === TOTAL
        ? `${TOTAL}/${TOTAL} automated emails have been set up. Nicely done!`
        : configured === 0
          ? "No automated emails have been set up yet."
          : `${configured}/${TOTAL} automated emails have been set up.`;

  return (
    <AppTooltip content={tooltip} side="top">
      <button
        type="button"
        onClick={
          officeId ? () => router.push(`/sales-offices/${officeId}/email-automation`) : undefined
        }
        disabled={!officeId}
        className="w-full h-[40px] flex items-center justify-between px-2 border rounded text-sm font-medium text-left bg-white hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <span
          className={
            needsAttention
              ? "text-red-500"
              : configured === TOTAL
                ? "text-gray-700"
                : "text-gray-400"
          }
        >
          {label}
        </span>
        <CircleProgress configured={configured} hasError={needsAttention} />
      </button>
    </AppTooltip>
  );
}
