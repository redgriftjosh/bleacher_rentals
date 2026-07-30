import { db } from "@/components/providers/SystemProvider";
import { expect, typedExecute, typedGetAll } from "@/lib/powersync/typedQuery";

// ── Types ──

export type EmailTemplateRow = {
  id: string;
  name: string | null;
  subject: string | null;
  html_body: string | null;
  trigger_uuid: string | null;
  is_active: number | null;
  created_at: string | null;
  created_by_user_uuid: string | null;
  updated_at: string | null;
  edited_by_user_uuid: string | null;
  error_message: string | null;
};

export type EmailTriggerBindingRow = {
  id: string;
  sales_office_uuid: string | null;
  trigger: string | null;
};

export type EmailTemplateInput = {
  name: string;
  subject: string;
  htmlBody: string;
  /** The EmailTriggerBindings row this template belongs to. */
  triggerUuid: string;
};

export type EmailTemplateUpdateInput = {
  name: string;
  subject: string;
  htmlBody: string;
};

// ── Templates: reads ──

export const allEmailTemplatesQuery = db
  .selectFrom("EmailTemplates")
  .select([
    "id",
    "name",
    "subject",
    "html_body",
    "trigger_uuid",
    "is_active",
    "created_at",
    "created_by_user_uuid",
    "updated_at",
    "edited_by_user_uuid",
    "error_message",
  ])
  .where("deleted_at", "is", null)
  .orderBy("created_at", "desc")
  .compile();

export function buildFetchTemplateQuery(id: string) {
  return db
    .selectFrom("EmailTemplates")
    .select([
      "id",
      "name",
      "subject",
      "html_body",
      "trigger_uuid",
      "is_active",
      "created_at",
      "created_by_user_uuid",
      "updated_at",
      "edited_by_user_uuid",
      "error_message",
    ])
    .where("id", "=", id)
    .where("deleted_at", "is", null)
    .compile();
}

export async function fetchTemplate(id: string): Promise<EmailTemplateRow | null> {
  const rows = await typedGetAll(buildFetchTemplateQuery(id), expect<EmailTemplateRow>());
  return rows[0] ?? null;
}

// ── Templates: writes ──

export async function createTemplate(
  input: EmailTemplateInput,
  userUuid: string | null,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await typedExecute(
    db
      .insertInto("EmailTemplates")
      .values({
        id,
        name: input.name,
        subject: input.subject,
        html_body: input.htmlBody,
        trigger_uuid: input.triggerUuid,
        is_active: 0,
        created_at: now,
        created_by_user_uuid: userUuid,
        updated_at: now,
        edited_by_user_uuid: userUuid,
      } as any)
      .compile(),
  );
  return id;
}

export async function updateTemplate(
  id: string,
  input: EmailTemplateUpdateInput,
  userUuid: string | null,
): Promise<void> {
  await typedExecute(
    db
      .updateTable("EmailTemplates")
      .set({
        name: input.name,
        subject: input.subject,
        html_body: input.htmlBody,
        updated_at: new Date().toISOString(),
        edited_by_user_uuid: userUuid,
      } as any)
      .where("id", "=", id)
      .compile(),
  );
}

export async function softDeleteTemplate(id: string): Promise<void> {
  await typedExecute(
    db
      .updateTable("EmailTemplates")
      .set({ deleted_at: new Date().toISOString(), is_active: 0 } as any)
      .where("id", "=", id)
      .compile(),
  );
}

export async function updateTemplateErrorMessage(
  id: string,
  message: string | null,
): Promise<void> {
  await typedExecute(
    db
      .updateTable("EmailTemplates")
      .set({ error_message: message } as any)
      .where("id", "=", id)
      .compile(),
  );
}

// ── Bindings: reads ──

export const allEmailBindingsQuery = db
  .selectFrom("EmailTriggerBindings")
  .select(["id", "sales_office_uuid", "trigger"])
  .compile();

export async function fetchAllBindings(): Promise<EmailTriggerBindingRow[]> {
  return typedGetAll(allEmailBindingsQuery, expect<EmailTriggerBindingRow>());
}

/**
 * Returns the id of the (office, trigger) binding, creating the row if it
 * doesn't exist yet.
 */
export async function getOrCreateBinding(opts: {
  salesOfficeUuid: string;
  trigger: string;
}): Promise<string> {
  const existing = await typedGetAll(
    db
      .selectFrom("EmailTriggerBindings")
      .select(["id"])
      .where("sales_office_uuid", "=", opts.salesOfficeUuid)
      .where("trigger", "=", opts.trigger)
      .compile(),
    expect<{ id: string }>(),
  );

  if (existing[0]) return existing[0].id;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await typedExecute(
    db
      .insertInto("EmailTriggerBindings")
      .values({
        id,
        sales_office_uuid: opts.salesOfficeUuid,
        trigger: opts.trigger,
        created_at: now,
        updated_at: now,
      } as any)
      .compile(),
  );
  return id;
}

/**
 * Sets `is_active` on a template. When activating, all other templates in the
 * same binding are deactivated first to enforce the "at most one active"
 * constraint at the app level (mirroring the DB partial-unique index).
 */
export async function setTemplateActive(templateId: string, isActive: boolean): Promise<void> {
  const now = new Date().toISOString();

  if (isActive) {
    const rows = await typedGetAll(
      db
        .selectFrom("EmailTemplates")
        .select(["trigger_uuid"])
        .where("id", "=", templateId)
        .compile(),
      expect<{ trigger_uuid: string | null }>(),
    );
    const triggerUuid = rows[0]?.trigger_uuid;
    if (triggerUuid) {
      await typedExecute(
        db
          .updateTable("EmailTemplates")
          .set({ is_active: 0, updated_at: now } as any)
          .where("trigger_uuid", "=", triggerUuid)
          .where("id", "!=", templateId)
          .compile(),
      );
    }
  }

  await typedExecute(
    db
      .updateTable("EmailTemplates")
      .set({ is_active: isActive ? 1 : 0, updated_at: now } as any)
      .where("id", "=", templateId)
      .compile(),
  );
}

// ── Template attachments ──

export type EmailTemplateAttachmentRow = {
  id: string;
  template_id: string | null;
  file_name: string | null;
  storage_path: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  created_at: string | null;
  created_by_user_uuid: string | null;
};

export function buildTemplateAttachmentsQuery(templateId: string) {
  return db
    .selectFrom("EmailTemplateAttachments")
    .select([
      "id",
      "template_id",
      "file_name",
      "storage_path",
      "mime_type",
      "file_size_bytes",
      "created_at",
      "created_by_user_uuid",
    ])
    .where("template_id", "=", templateId)
    .orderBy("created_at", "asc")
    .compile();
}

export async function createTemplateAttachment(input: {
  templateId: string;
  fileName: string;
  storagePath: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  createdByUserUuid: string | null;
}): Promise<string> {
  const id = crypto.randomUUID();
  await typedExecute(
    db
      .insertInto("EmailTemplateAttachments")
      .values({
        id,
        template_id: input.templateId,
        file_name: input.fileName,
        storage_path: input.storagePath,
        mime_type: input.mimeType,
        file_size_bytes: input.fileSizeBytes,
        created_at: new Date().toISOString(),
        created_by_user_uuid: input.createdByUserUuid,
      } as any)
      .compile(),
  );
  return id;
}

export async function deleteTemplateAttachment(id: string): Promise<void> {
  await typedExecute(db.deleteFrom("EmailTemplateAttachments").where("id", "=", id).compile());
}
