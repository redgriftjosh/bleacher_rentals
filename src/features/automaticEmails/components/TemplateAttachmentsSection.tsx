"use client";

import { useRef, useState } from "react";
import { FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { createErrorToastNoThrow } from "@/components/toasts/ErrorToast";
import {
  buildTemplateAttachmentsQuery,
  createTemplateAttachment,
  deleteTemplateAttachment,
  type EmailTemplateAttachmentRow,
} from "@/features/automaticEmails/db";
import { QUOTE_SENT_CLIENT } from "@/features/automaticEmails/triggers";

const BUCKET = "email-attachments";
const MAX_SIZE_MB = 10;
const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  templateId: string;
  triggerKey: string;
  userUuid: string | null;
};

export function TemplateAttachmentsSection({ templateId, triggerKey, userUuid }: Props) {
  const supabase = useClerkSupabaseClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: attachments = [] } = useTypedQuery(
    buildTemplateAttachmentsQuery(templateId),
    expect<EmailTemplateAttachmentRow>(),
  );

  const isQuoteSent = triggerKey === QUOTE_SENT_CLIENT;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be re-selected after a failed upload
    e.target.value = "";

    if (!ACCEPTED_TYPES.includes(file.type)) {
      createErrorToastNoThrow(["Unsupported file type", `Accepted: PDF, images, Word documents`]);
      return;
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      createErrorToastNoThrow([`File too large`, `Maximum size is ${MAX_SIZE_MB} MB`]);
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const storagePath = `${templateId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      await createTemplateAttachment({
        templateId,
        fileName: file.name,
        storagePath,
        mimeType: file.type || null,
        fileSizeBytes: file.size,
        createdByUserUuid: userUuid,
      });
    } catch (err: any) {
      createErrorToastNoThrow([`Upload failed`, err?.message ?? "Unknown error"]);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachment: EmailTemplateAttachmentRow) => {
    setDeletingId(attachment.id);
    try {
      await deleteTemplateAttachment(attachment.id);
    } catch (err: any) {
      createErrorToastNoThrow([`Couldn't remove attachment`, err?.message ?? "Unknown error"]);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Attachments</label>

      <div className="rounded-md border border-gray-200 bg-gray-50 divide-y divide-gray-100">
        {/* Quote PDF notice — only shown for the quote_sent_client trigger */}
        {isQuoteSent && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-600">
            <FileText className="h-4 w-4 shrink-0 text-blue-500" />
            <span>
              <span className="font-medium">Quote PDF</span> — always included automatically
            </span>
          </div>
        )}

        {/* Uploaded attachments */}
        {attachments.map((a) => (
          <div key={a.id} className="flex items-center gap-2.5 px-3 py-2 text-sm">
            <Paperclip className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="flex-1 truncate text-gray-700">{a.file_name}</span>
            {a.file_size_bytes != null && (
              <span className="shrink-0 text-xs text-gray-400">
                {formatBytes(a.file_size_bytes)}
              </span>
            )}
            <button
              type="button"
              onClick={() => handleDelete(a)}
              disabled={deletingId === a.id}
              title="Remove attachment"
              className="shrink-0 rounded p-0.5 text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {/* Upload button row */}
        <div className="px-3 py-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            className="hidden"
            onChange={handleUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
          >
            {uploading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
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
                Uploading…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload attachment
              </>
            )}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Attached files are included with every email sent using this template. Max {MAX_SIZE_MB} MB
        per file.
      </p>
    </div>
  );
}
