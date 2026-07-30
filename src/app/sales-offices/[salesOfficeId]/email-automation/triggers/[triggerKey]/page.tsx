"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { db } from "@/components/providers/SystemProvider";
import {
  allEmailBindingsQuery,
  allEmailTemplatesQuery,
  createTemplate,
  getOrCreateBinding,
  EmailTriggerBindingRow,
  EmailTemplateRow,
} from "@/features/automaticEmails/db";
import { allSalesOfficesQuery, SalesOfficeRow } from "@/features/salesOffices/db/salesOfficesDb";
import { getTrigger } from "@/features/automaticEmails/triggers";
import { PageHeaderWithBreadCrumbs } from "@/components/PageHeaderWithBreadCrumbs";
import { useUserAccess } from "@/features/userAccess/hooks/useUserAccess";
import { createErrorToastNoThrow } from "@/components/toasts/ErrorToast";
import { validateTemplateVariables } from "@/features/automaticEmails/util/validateTemplateVariables";
import { updateTemplateErrorMessage } from "@/features/automaticEmails/db";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " at " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );
}

type UserRow = { id: string; first_name: string | null; last_name: string | null };
const allUsersQuery = db.selectFrom("Users").select(["id", "first_name", "last_name"]).compile();

export default function TriggerPage({
  params,
}: {
  params: Promise<{ salesOfficeId: string; triggerKey: string }>;
}) {
  const { salesOfficeId, triggerKey } = use(params);
  const router = useRouter();
  const triggerDef = getTrigger(triggerKey);
  const access = useUserAccess();
  const userUuid = access.status === "active" ? access.userId : null;
  const [creating, setCreating] = useState(false);

  const handleNewTemplate = async () => {
    setCreating(true);
    try {
      const bindingId = await getOrCreateBinding({
        salesOfficeUuid: salesOfficeId,
        trigger: triggerKey,
      });
      const templateId = await createTemplate(
        { name: "Untitled template", subject: "", htmlBody: "", triggerUuid: bindingId },
        userUuid,
      );
      router.push(
        `/sales-offices/${salesOfficeId}/email-automation/triggers/${triggerKey}/templates/${templateId}`,
      );
    } catch (err: any) {
      createErrorToastNoThrow([`Couldn't create template: ${err?.message ?? "error"}`]);
      setCreating(false);
    }
  };

  const { data: offices = [] } = useTypedQuery(allSalesOfficesQuery, expect<SalesOfficeRow>());
  const { data: allUsers = [] } = useTypedQuery(allUsersQuery, expect<UserRow>());
  const { data: allBindings = [] } = useTypedQuery(
    allEmailBindingsQuery,
    expect<EmailTriggerBindingRow>(),
  );
  const { data: allTemplates = [] } = useTypedQuery(
    allEmailTemplatesQuery,
    expect<EmailTemplateRow>(),
  );

  const officeName = offices.find((o) => o.id === salesOfficeId)?.name ?? "Sales Office";

  const userNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of allUsers) {
      const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
      if (name) map.set(u.id, name);
    }
    return map;
  }, [allUsers]);

  const binding = useMemo(
    () =>
      allBindings.find((b) => b.sales_office_uuid === salesOfficeId && b.trigger === triggerKey),
    [allBindings, salesOfficeId, triggerKey],
  );

  const templates = useMemo(
    () => allTemplates.filter((t) => t.trigger_uuid === binding?.id),
    [allTemplates, binding],
  );

  const emailAutomationHref = `/sales-offices/${salesOfficeId}/email-automation`;

  // One-time scan on load: validate every template in this trigger and sync
  // error_message to the DB if it's stale (changed since last editor session).
  const hasScannedRef = useRef(false);
  useEffect(() => {
    // Wait until binding + templates have loaded; run only once per page visit.
    if (hasScannedRef.current || !binding || !triggerDef) return;
    hasScannedRef.current = true;
    for (const t of templates) {
      const errs = validateTemplateVariables(
        t.subject ?? "",
        t.html_body ?? "",
        triggerDef.variables,
      );
      const newMessage = errs.length > 0 ? errs.join("\n") : null;
      const currentMessage = t.error_message ?? null;
      if (newMessage !== currentMessage) {
        updateTemplateErrorMessage(t.id, newMessage).catch(() => {});
      }
    }
  }, [templates, binding, triggerDef]);

  if (!triggerDef) {
    return (
      <div>
        <PageHeaderWithBreadCrumbs
          crumbs={[
            { label: "Sales Offices", href: "/sales-offices" },
            { label: officeName, href: emailAutomationHref },
            { label: "Email Automation", href: emailAutomationHref },
            { label: "Unknown Trigger" },
          ]}
        />
        <p className="text-sm text-red-500">Trigger &ldquo;{triggerKey}&rdquo; not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-full">
      <PageHeaderWithBreadCrumbs
        crumbs={[
          { label: "Sales Offices", href: "/sales-offices" },
          { label: officeName, href: emailAutomationHref },
          { label: "Email Automation", href: emailAutomationHref },
          { label: triggerDef.label },
        ]}
        description={triggerDef.description}
      />

      {!binding ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">No templates yet for this trigger.</p>
          <button
            type="button"
            onClick={handleNewTemplate}
            disabled={creating}
            className="px-3 py-1.5 text-sm font-medium bg-darkBlue text-white rounded hover:bg-lightBlue transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? "Creating…" : "+ New Template"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleNewTemplate}
              disabled={creating}
              className="px-3 py-1.5 text-sm font-medium bg-darkBlue text-white rounded hover:bg-lightBlue transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? "Creating…" : "+ New Template"}
            </button>
          </div>
          <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md overflow-hidden">
            {templates.length === 0 ? (
              <li className="px-4 py-6 text-sm text-gray-400 text-center">
                No templates yet for this trigger.
              </li>
            ) : (
              templates.map((t) => (
                <li
                  key={t.id}
                  onClick={() =>
                    router.push(
                      `/sales-offices/${salesOfficeId}/email-automation/triggers/${triggerKey}/templates/${t.id}`,
                    )
                  }
                  className="flex items-center justify-between gap-4 px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {t.name || "Untitled template"}
                      </p>
                      {t.error_message && (
                        <span className="shrink-0 flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                          <AlertCircle className="h-3 w-3" />
                          Errors
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.subject ? `Subject: ${t.subject}` : "No subject"}
                    </p>
                    <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-gray-400">
                      <span>
                        Created {formatDateTime(t.created_at)}
                        {t.created_by_user_uuid && userNameMap.has(t.created_by_user_uuid)
                          ? ` by ${userNameMap.get(t.created_by_user_uuid)}`
                          : ""}
                      </span>
                      <span>
                        Updated {formatDateTime(t.updated_at)}
                        {t.edited_by_user_uuid && userNameMap.has(t.edited_by_user_uuid)
                          ? ` by ${userNameMap.get(t.edited_by_user_uuid)}`
                          : ""}
                      </span>
                    </div>
                  </div>
                  {!!t.is_active && (
                    <span className="shrink-0 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                      Active
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
