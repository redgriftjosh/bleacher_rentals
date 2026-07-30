"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { PageHeaderWithBreadCrumbs } from "@/components/PageHeaderWithBreadCrumbs";
import { EmailBodyEditor } from "@/features/automaticEmails/components/EmailBodyEditor";
import { createErrorToastNoThrow } from "@/components/toasts/ErrorToast";
import { useUserAccess } from "@/features/userAccess/hooks/useUserAccess";
import {
  fetchTemplate,
  setTemplateActive,
  createTemplate,
  softDeleteTemplate,
} from "@/features/automaticEmails/db";
import { allSalesOfficesQuery, SalesOfficeRow } from "@/features/salesOffices/db/salesOfficesDb";
import { getTrigger } from "@/features/automaticEmails/triggers";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useAutoSaveTemplate } from "@/features/automaticEmails/hooks/useAutoSaveTemplate";
import { useTemplateValidation } from "@/features/automaticEmails/hooks/useTemplateValidation";
import { useTemplateConflictDetection } from "@/features/automaticEmails/hooks/useTemplateConflictDetection";
import { ActivateTemplateDialog } from "@/features/automaticEmails/components/ActivateTemplateDialog";
import { ActiveTemplateWarningDialog } from "@/features/automaticEmails/components/ActiveTemplateWarningDialog";
import { DeactivateTemplateDialog } from "@/features/automaticEmails/components/DeactivateTemplateDialog";
import { DeleteTemplateDialog } from "@/features/automaticEmails/components/DeleteTemplateDialog";
import { TemplateAttachmentsSection } from "@/features/automaticEmails/components/TemplateAttachmentsSection";

export default function TemplateEditorPage({
  params,
}: {
  params: Promise<{ salesOfficeId: string; triggerKey: string; templateId: string }>;
}) {
  const { salesOfficeId, triggerKey, templateId } = use(params);
  const router = useRouter();
  const access = useUserAccess();
  const userUuid = access.status === "active" ? access.userId : null;
  const triggerDef = getTrigger(triggerKey);

  const { data: offices = [] } = useTypedQuery(allSalesOfficesQuery, expect<SalesOfficeRow>());
  const officeName = offices.find((o) => o.id === salesOfficeId)?.name ?? "Sales Office";

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeWarningOpen, setActiveWarningOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const triggerUuidRef = useRef<string | null>(null);
  const updatedAtOnMount = useRef<string | null>(null);

  const saveState = useAutoSaveTemplate({
    templateId,
    name,
    subject,
    htmlBody,
    userUuid,
    enabled: !loading,
  });

  const validationErrors = useTemplateValidation({
    templateId,
    subject,
    htmlBody,
    variables: triggerDef?.variables ?? [],
    enabled: !loading,
  });

  useEffect(() => {
    fetchTemplate(templateId)
      .then((t) => {
        if (t) {
          setName(t.name ?? "");
          setSubject(t.subject ?? "");
          setHtmlBody(t.html_body ?? "");
          setIsActive(!!t.is_active);
          updatedAtOnMount.current = t.updated_at ?? null;
          triggerUuidRef.current = t.trigger_uuid ?? null;
          if (t.is_active) setActiveWarningOpen(true);
        }
      })
      .finally(() => setLoading(false));
  }, [templateId]);

  const { conflictDetected, dismiss } = useTemplateConflictDetection({
    templateId,
    userUuid,
    updatedAtOnMount: updatedAtOnMount.current,
  });

  const handleDeactivate = async () => {
    setTogglingActive(true);
    try {
      await setTemplateActive(templateId, false);
      setIsActive(false);
    } catch (err: any) {
      createErrorToastNoThrow([`Couldn't update active state: ${err?.message ?? "error"}`]);
    } finally {
      setTogglingActive(false);
    }
  };

  const handleActivate = async () => {
    await setTemplateActive(templateId, true);
    setIsActive(true);
  };

  const handleDelete = async () => {
    await softDeleteTemplate(templateId);
    router.push(triggerHref);
  };

  const handleDuplicate = async () => {
    const triggerUuid = triggerUuidRef.current;
    if (!triggerUuid) return;
    const newId = await createTemplate(
      {
        name: `${name} (copy)`,
        subject,
        htmlBody,
        triggerUuid,
      },
      userUuid,
    );
    router.push(
      `/sales-offices/${salesOfficeId}/email-automation/triggers/${triggerKey}/templates/${newId}`,
    );
  };

  const emailAutomationHref = `/sales-offices/${salesOfficeId}/email-automation`;
  const triggerHref = `/sales-offices/${salesOfficeId}/email-automation/triggers/${triggerKey}`;

  if (loading) {
    return <p className="text-gray-500 py-8">Loading template…</p>;
  }

  return (
    <div className="max-w-full">
      {validationErrors.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-md border border-red-400 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div>
            <p className="font-semibold">Invalid variables detected</p>
            <ul className="mt-1 space-y-0.5 text-xs text-red-700">
              {validationErrors.map((err, i) => (
                <li key={i}>&bull; {err}</li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs text-red-400">
              Fix the variables above to clear this warning.
            </p>
          </div>
        </div>
      )}
      {conflictDetected && (
        <div className="mb-4 flex items-start justify-between gap-4 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <span>
            <strong>Heads up:</strong> Someone else saved this template while you were editing. Your
            changes will overwrite theirs on the next auto-save.
          </span>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 font-medium underline hover:no-underline"
          >
            Got it
          </button>
        </div>
      )}
      <PageHeaderWithBreadCrumbs
        crumbs={[
          { label: "Sales Offices", href: "/sales-offices" },
          { label: officeName, href: emailAutomationHref },
          { label: "Email Automation", href: emailAutomationHref },
          { label: triggerDef?.label ?? triggerKey, href: triggerHref },
          { label: name || "Untitled template" },
        ]}
        rightSlot={
          <div className="flex items-center gap-3">
            {/* Auto-save indicator */}
            {saveState === "saving" ? (
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Saving
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                Saved
              </span>
            )}
            <button
              type="button"
              onClick={isActive ? () => setDeactivateOpen(true) : () => setConfirmOpen(true)}
              disabled={togglingActive}
              className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                isActive
                  ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${isActive ? "bg-green-500" : "bg-gray-300"}`}
              />
              {isActive ? "Active" : "Inactive"}
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-1.5 rounded border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 cursor-pointer"
            >
              Delete
            </button>
          </div>
        }
      />

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Template name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Quote signed — client confirmation"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-darkBlue"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Your quote has been signed!"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-darkBlue"
          />
        </div>

        <TemplateAttachmentsSection
          templateId={templateId}
          triggerKey={triggerKey}
          userUuid={userUuid}
        />

        <EmailBodyEditor
          value={htmlBody}
          onChange={setHtmlBody}
          variables={triggerDef?.variables}
        />
      </div>

      <ActivateTemplateDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleActivate}
        triggerLabel={triggerDef?.label ?? triggerKey}
      />

      <ActiveTemplateWarningDialog
        open={activeWarningOpen}
        onEditAnyway={() => setActiveWarningOpen(false)}
        onDuplicate={handleDuplicate}
      />

      <DeactivateTemplateDialog
        open={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        onConfirm={handleDeactivate}
        triggerLabel={triggerDef?.label ?? triggerKey}
      />

      <DeleteTemplateDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        templateName={name}
        isActive={isActive}
        onConfirm={handleDelete}
      />
    </div>
  );
}
