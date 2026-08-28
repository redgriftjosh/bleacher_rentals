"use client";

import { useCallback, useMemo, useState } from "react";
import { Modal } from "./Modal";
import { FormGroup, FormRow } from "./form/FormGroup";
import { PillGroup } from "./form/PillGroup";
import { TextField } from "./form/TextField";
import { SaveStatusIndicator } from "@/components/SaveStatusIndicator";
import { PrimaryButton } from "@/components/PrimaryButton";
import { DestructiveButton } from "@/components/DestructiveButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { createErrorToastNoThrow } from "@/components/toasts/ErrorToast";
import { RichTextEditor } from "./RichTextEditor";
import { AttachmentList } from "./AttachmentList";
import { useFeature } from "../hooks/useFeatures";
import { useSprintsForQuarter } from "../hooks/useSprints";
import { useRoadmapCurrentUserUuid } from "../hooks/useRoadmapCurrentUserUuid";
import {
  discardFeatureDraft,
  restoreFeature,
  softDeleteFeature,
  updateFeature,
} from "../db/features";
import { hydrateFeatureForm, isEmptyFeatureDraft, type FeatureForm } from "../forms";
import { useAutosavedRecord, type AutosaveAdapter } from "@/lib/autosave";
import { sprintLabel } from "../types";
import { FEATURE_STATUS_OPTIONS } from "../constants";
import type { Feature, FeatureStatus } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
  featureId: string | null;
};

/**
 * The feature already exists by the time this opens — "+ New Feature" inserts a draft
 * first. So there is no create path here: every edit is an autosaved update.
 */
export function FeatureModal({ open, onClose, featureId }: Props) {
  const { feature } = useFeature(featureId);
  const { sprints } = useSprintsForQuarter(feature?.quarter_id ?? null);
  const { userUuid } = useRoadmapCurrentUserUuid();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const adapter = useMemo<AutosaveAdapter<FeatureForm>>(
    () => ({
      save: updateFeature,
      isEmptyDraft: isEmptyFeatureDraft,
      discard: discardFeatureDraft,
      softDelete: softDeleteFeature,
    }),
    [],
  );

  const handleError = useCallback((error: unknown) => {
    createErrorToastNoThrow([
      "Couldn't save this feature",
      error instanceof Error ? error.message : String(error),
    ]);
  }, []);

  const { form, saveState, patch, retry, softDelete, finalize } = useAutosavedRecord<
    Feature,
    FeatureForm
  >({
    id: featureId,
    row: feature,
    hydrate: hydrateFeatureForm,
    adapter,
    open,
    onError: handleError,
  });

  const handleClose = useCallback(async () => {
    await finalize();
    onClose();
  }, [finalize, onClose]);

  const handleDelete = async () => {
    await softDelete();
    setConfirmDeleteOpen(false);
    onClose();
  };

  const handleRestore = async () => {
    if (!featureId) return;
    await restoreFeature(featureId);
  };

  const isDeleted = !!feature?.deleted_at;

  const sprintOptions = useMemo(
    () => sprints.map((s) => ({ label: sprintLabel(s.sprint_number), value: s.id })),
    [sprints],
  );

  const toggleSprint = (sprintId: string) => {
    if (!form) return;
    patch({
      sprintIds: form.sprintIds.includes(sprintId)
        ? form.sprintIds.filter((id) => id !== sprintId)
        : [...form.sprintIds, sprintId],
    });
  };

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title="Feature"
        size="lg"
        bodyTone="grouped"
        footerLeft={
          featureId &&
          (isDeleted ? (
            <button
              type="button"
              onClick={handleRestore}
              className="cursor-pointer rounded-lg px-3 py-2 text-[15px] font-medium text-rm-accent transition-colors hover:bg-rm-accent-soft"
            >
              Restore
            </button>
          ) : (
            <DestructiveButton onClick={() => setConfirmDeleteOpen(true)}>Delete</DestructiveButton>
          ))
        }
        footer={
          <>
            <SaveStatusIndicator state={saveState} onRetry={retry} />
            <PrimaryButton onClick={handleClose}>Done</PrimaryButton>
          </>
        }
      >
        {!form ? (
          <FeatureFormSkeleton />
        ) : (
          <div className="space-y-5">
            {isDeleted && (
              <p className="rounded-xl bg-rm-danger-soft px-3.5 py-2.5 text-[13px] text-rm-danger">
                This feature is deleted. Restore it to bring it back to the quarter.
              </p>
            )}

            <FormGroup>
              <FormRow>
                <TextField
                  variant="title"
                  value={form.title}
                  onChange={(title) => patch({ title })}
                  placeholder="Untitled feature"
                  ariaLabel="Feature title"
                  autoFocus
                />
              </FormRow>
              <FormRow label="Status" stacked>
                <PillGroup
                  options={FEATURE_STATUS_OPTIONS}
                  selected={form.status}
                  onSelect={(status) => patch({ status: status as FeatureStatus })}
                />
              </FormRow>
              <FormRow label="Sprint labels" stacked>
                <PillGroup
                  multiple
                  options={sprintOptions}
                  selected={form.sprintIds}
                  onSelect={toggleSprint}
                  emptyHint="No sprints yet for this quarter."
                />
              </FormRow>
            </FormGroup>

            <FormGroup label="Description">
              <FormRow stacked>
                <RichTextEditor
                  value={form.description}
                  onChange={(description) => patch({ description })}
                  placeholder="Goals, acceptance criteria, links…"
                />
              </FormRow>
            </FormGroup>

            {featureId && (
              <FormGroup label="Attachments">
                <FormRow stacked>
                  <AttachmentList
                    parentType="feature"
                    parentId={featureId}
                    uploadedByUserUuid={userUuid}
                  />
                </FormRow>
              </FormGroup>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete this feature?"
        message="It stays recoverable — you can restore it from the deleted list."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
}

function FeatureFormSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="h-11 animate-pulse rounded-xl bg-white motion-reduce:animate-none" />
      <div className="h-28 animate-pulse rounded-xl bg-white motion-reduce:animate-none" />
    </div>
  );
}
