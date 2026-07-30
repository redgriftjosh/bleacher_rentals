"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useEmailAutomationState } from "@/features/automaticEmails/hooks/useEmailAutomationState";
import { TriggerState } from "@/features/automaticEmails/util/getTriggerStates";
import { PageHeaderWithBreadCrumbs } from "@/components/PageHeaderWithBreadCrumbs";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { allSalesOfficesQuery, SalesOfficeRow } from "@/features/salesOffices/db/salesOfficesDb";

const STATE_BADGE: Record<TriggerState, { label: string; className: string }> = {
  coming_soon: {
    label: "Coming Soon",
    className: "text-amber-600 bg-amber-50 border-amber-200",
  },
  inactive: {
    label: "Inactive",
    className: "text-gray-500 bg-gray-50 border-gray-200",
  },
  misconfigured: {
    label: "Misconfigured",
    className: "text-red-600 bg-red-50 border-red-200",
  },
  success: {
    label: "Active",
    className: "text-green-700 bg-green-50 border-green-200",
  },
};

export default function EmailAutomationPage({
  params,
}: {
  params: Promise<{ salesOfficeId: string }>;
}) {
  const { salesOfficeId } = use(params);
  const router = useRouter();
  const triggerStates = useEmailAutomationState(salesOfficeId);

  const { data: offices = [] } = useTypedQuery(allSalesOfficesQuery, expect<SalesOfficeRow>());
  const officeName = offices.find((o) => o.id === salesOfficeId)?.name ?? "Sales Office";

  return (
    <div className="max-w-full">
      <PageHeaderWithBreadCrumbs
        crumbs={[
          { label: "Sales Offices", href: "/sales-offices" },
          { label: officeName, href: `/sales-offices` },
          { label: "Email Automation" },
        ]}
      />
      <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md overflow-hidden">
        {triggerStates.map(({ trigger, state }) => {
          const badge = STATE_BADGE[state];
          return (
            <li
              key={trigger.key}
              onClick={() =>
                router.push(
                  `/sales-offices/${salesOfficeId}/email-automation/triggers/${trigger.key}`,
                )
              }
              className="flex items-start justify-between gap-4 px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{trigger.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{trigger.description}</p>
              </div>
              <span
                className={`shrink-0 text-xs border rounded px-1.5 py-0.5 mt-0.5 ${badge.className}`}
              >
                {badge.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
