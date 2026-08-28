"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "./Modal";
import { FormGroup, FormRow } from "./form/FormGroup";
import { PillGroup } from "./form/PillGroup";
import { TextField } from "./form/TextField";
import { SaveStatusIndicator } from "@/components/SaveStatusIndicator";
import { DestructiveButton } from "@/components/DestructiveButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Dropdown } from "@/components/DropDown";
import { createErrorToastNoThrow } from "@/components/toasts/ErrorToast";
import { RichTextEditor } from "./RichTextEditor";
import { AttachmentList } from "./AttachmentList";
import { TaskChat } from "./TaskChat";
import { useTask } from "../hooks/useTasks";
import { useFeaturesForQuarter } from "../hooks/useFeatures";
import { useQuarters } from "../hooks/useQuarters";
import { useSprint, useSprintsForQuarter } from "../hooks/useSprints";
import { useRoadmapCurrentUserUuid } from "../hooks/useRoadmapCurrentUserUuid";
import { useRoadmapAccessLevel } from "../hooks/useRoadmapAccessLevel";
import { useRoadmapDevelopers } from "../hooks/useRoadmapDevelopers";
import { useRoadmapUsers, displayName } from "../hooks/useRoadmapUsers";
import { deleteTask, discardTaskDraft, restoreTask, updateTask } from "../db/tasks";
import { announceTaskChanged, announceTaskCreated } from "../db/taskActivity";
import {
  applyTaskPermissions,
  hydrateTaskForm,
  isEmptyTaskDraft,
  visibleTaskChanges,
  type TaskForm,
} from "../forms";
import { useAutosavedRecord, type AutosaveAdapter } from "@/lib/autosave";
import { TASK_STATUS_OPTIONS } from "../constants";
import type { TaskRow, TaskStatus } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Quarter of the page the modal was opened from, used to seed the sprint picker. */
  quarterId: string | null;
  taskId: string | null;
  readOnly?: boolean;
};

/**
 * The task already exists by the time this opens — "+ New Task" / "+ Submit Ticket"
 * insert a draft first. Every edit autosaves; the notification side effects are
 * deliberately not per-save (see `db/taskActivity`).
 */
export function TaskModal({ open, onClose, quarterId, taskId, readOnly }: Props) {
  const { task } = useTask(taskId);
  const { userUuid } = useRoadmapCurrentUserUuid();
  const { isDeveloper } = useRoadmapAccessLevel();
  const developers = useRoadmapDevelopers();
  const { userMap } = useRoadmapUsers();
  const { quarters } = useQuarters();
  const { sprint: taskSprint } = useSprint(task?.sprint_id ?? null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // The quarter is a picker for narrowing sprints, not a stored field.
  const [selectedQuarterId, setSelectedQuarterId] = useState(quarterId ?? "");
  useEffect(() => {
    if (!open) return;
    setSelectedQuarterId(taskSprint?.quarter_id ?? quarterId ?? "");
  }, [open, taskSprint?.quarter_id, quarterId]);

  const { sprints } = useSprintsForQuarter(selectedQuarterId || null);
  const { features } = useFeaturesForQuarter(selectedQuarterId || null);

  const actor = useMemo(
    () => ({ uuid: userUuid, name: displayName(userUuid ? userMap.get(userUuid) : undefined) }),
    [userUuid, userMap],
  );

  const adapter = useMemo<AutosaveAdapter<TaskForm>>(
    () => ({
      save: (id, form) => updateTask(id, applyTaskPermissions(form, isDeveloper)),
      isEmptyDraft: isEmptyTaskDraft,
      discard: discardTaskDraft,
      softDelete: deleteTask,
      onFirstCommit: (id, form) =>
        announceTaskCreated({
          taskId: id,
          actor,
          isBacklog: applyTaskPermissions(form, isDeveloper).isBacklog,
        }),
    }),
    [isDeveloper, actor],
  );

  const handleError = useCallback((error: unknown) => {
    createErrorToastNoThrow([
      "Couldn't save this ticket",
      error instanceof Error ? error.message : String(error),
    ]);
  }, []);

  const { form, saveState, patch, retry, softDelete, finalize } = useAutosavedRecord<
    TaskRow,
    TaskForm
  >({
    id: taskId,
    row: task,
    hydrate: hydrateTaskForm,
    adapter,
    open,
    onError: handleError,
  });

  const handleClose = useCallback(async () => {
    const { discarded, firstCommitted, changedKeys } = await finalize();

    // One notice per editing session, and never on top of the "created" notice.
    if (taskId && !discarded && !firstCommitted && visibleTaskChanges(changedKeys).length > 0) {
      await announceTaskChanged({ taskId, actor });
    }
    onClose();
  }, [finalize, onClose, taskId, actor]);

  const handleDelete = async () => {
    await softDelete();
    setConfirmDeleteOpen(false);
    onClose();
  };

  const handleRestore = async () => {
    if (!taskId) return;
    await restoreTask(taskId);
  };

  const isDeleted = !!task?.deleted_at;
  const isBacklogContext = !form?.sprintId;
  const canEdit = !readOnly;

  const quarterOptions = useMemo(
    () => [
      { label: "(none)", value: "" },
      ...quarters.map((q) => ({ label: `Q${q.quarter} ${q.year}`, value: q.id })),
    ],
    [quarters],
  );
  const sprintOptions = useMemo(
    () => [
      { label: "(none)", value: "" },
      ...sprints.map((s) => ({ label: `Sprint ${s.sprint_number}`, value: s.id })),
    ],
    [sprints],
  );
  const featureOptions = useMemo(
    () => [
      { label: "(none)", value: "" },
      ...features.map((f) => ({ label: f.title || "Untitled feature", value: f.id })),
    ],
    [features],
  );
  const developerOptions = useMemo(
    () => [
      { label: "(unassigned)", value: "" },
      ...developers.map((d) => ({ label: d.label, value: d.userUuid })),
    ],
    [developers],
  );

  const showChat = !!taskId;

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title={isBacklogContext ? "Backlog Ticket" : "Task"}
        size={showChat ? "2xl" : "lg"}
        bodyTone="grouped"
        contentClassName={showChat ? "overflow-hidden flex flex-col" : undefined}
        footerLeft={
          canEdit &&
          taskId &&
          isDeveloper &&
          (isDeleted ? (
            <button
              type="button"
              onClick={handleRestore}
              className="cursor-pointer rounded-lg px-3 py-2 text-[15px] font-medium text-[#007AFF] transition-colors hover:bg-[#007AFF]/10"
            >
              Restore
            </button>
          ) : (
            <DestructiveButton onClick={() => setConfirmDeleteOpen(true)}>Delete</DestructiveButton>
          ))
        }
        footer={
          <>
            {canEdit && <SaveStatusIndicator state={saveState} onRetry={retry} />}
            <button
              type="button"
              onClick={handleClose}
              className="cursor-pointer rounded-lg bg-[#007AFF] px-4 py-2 text-[15px] font-medium text-white transition-colors hover:bg-[#0066DB]"
            >
              Done
            </button>
          </>
        }
      >
        <div className={`flex gap-6 ${showChat ? "min-h-0 flex-1 overflow-hidden" : ""}`}>
          {/* Left: form */}
          <div className={`min-w-0 flex-1 space-y-5 ${showChat ? "overflow-y-auto pr-1" : ""}`}>
            {!form ? (
              <TaskFormSkeleton />
            ) : (
              <>
                {isDeleted && (
                  <p className="rounded-xl bg-[#FF3B30]/10 px-3.5 py-2.5 text-[13px] text-[#FF3B30]">
                    This ticket is deleted. Restore it to bring it back.
                  </p>
                )}

                <FormGroup>
                  <FormRow>
                    <TextField
                      variant="title"
                      value={form.title}
                      onChange={(title) => patch({ title })}
                      placeholder={isBacklogContext ? "Untitled ticket" : "Untitled task"}
                      ariaLabel="Task title"
                      disabled={readOnly}
                      autoFocus={canEdit}
                    />
                  </FormRow>

                  {isDeveloper && canEdit && (
                    <FormRow label="Status" stacked>
                      <PillGroup
                        options={TASK_STATUS_OPTIONS}
                        selected={form.status}
                        onSelect={(status) => patch({ status: status as TaskStatus })}
                      />
                    </FormRow>
                  )}
                </FormGroup>

                {readOnly ? (
                  <p className="rounded-xl bg-white px-3.5 py-2.5 text-[13px] text-[#8E8E93] ring-1 ring-black/[0.06]">
                    You are viewing this ticket in read-only mode.
                  </p>
                ) : isDeveloper ? (
                  <FormGroup label="Placement">
                    <FormRow label="Quarter">
                      <Dropdown
                        options={quarterOptions}
                        selected={selectedQuarterId}
                        onSelect={(v) => {
                          setSelectedQuarterId(v);
                          patch({ sprintId: null });
                        }}
                        placeholder="(none)"
                      />
                    </FormRow>
                    <FormRow label="Sprint">
                      <Dropdown
                        options={sprintOptions}
                        selected={form.sprintId ?? ""}
                        onSelect={(v) =>
                          patch({ sprintId: v || null, isBacklog: v ? form.isBacklog : true })
                        }
                        placeholder={selectedQuarterId ? "(none)" : "Select a quarter first"}
                      />
                    </FormRow>
                    <FormRow label="Linked feature">
                      <Dropdown
                        options={featureOptions}
                        selected={form.featureId ?? ""}
                        onSelect={(v) => patch({ featureId: v || null })}
                        placeholder="(none)"
                      />
                    </FormRow>
                    {developers.length > 0 && (
                      <FormRow label="Developer">
                        <Dropdown
                          options={developerOptions}
                          selected={form.developerUuid ?? ""}
                          onSelect={(v) => patch({ developerUuid: v || null })}
                          placeholder="(unassigned)"
                        />
                      </FormRow>
                    )}
                    <FormRow label="Show in backlog">
                      <label className="flex cursor-pointer items-center gap-2 text-[15px] text-gray-900">
                        <input
                          type="checkbox"
                          checked={form.isBacklog}
                          onChange={(e) => patch({ isBacklog: e.target.checked })}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#007AFF]"
                        />
                        Keep this visible in the backlog
                      </label>
                    </FormRow>
                  </FormGroup>
                ) : (
                  <p className="rounded-xl bg-[#007AFF]/10 px-3.5 py-2.5 text-[13px] text-[#0066DB]">
                    Your ticket will be added to the backlog for a developer to review and
                    prioritise.
                  </p>
                )}

                <FormGroup label="Description">
                  <FormRow stacked>
                    <RichTextEditor
                      value={form.description}
                      onChange={(description) => patch({ description })}
                      placeholder={
                        isBacklogContext
                          ? "What's needed? Steps to reproduce, screenshots, etc."
                          : "Notes, links, acceptance criteria…"
                      }
                      disabled={readOnly}
                    />
                  </FormRow>
                </FormGroup>

                {taskId && (
                  <FormGroup label="Attachments">
                    <FormRow stacked>
                      <AttachmentList
                        parentType="task"
                        parentId={taskId}
                        uploadedByUserUuid={userUuid}
                      />
                    </FormRow>
                  </FormGroup>
                )}
              </>
            )}
          </div>

          {/* Right: chat panel */}
          {showChat && (
            <div className="flex min-h-0 w-[450px] flex-shrink-0 flex-col border-l border-[#E5E5EA] pl-6">
              <TaskChat taskId={taskId} compact />
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={isBacklogContext ? "Delete this ticket?" : "Delete this task?"}
        message="It stays recoverable — you can restore it from the deleted list."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
}

function TaskFormSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="h-11 animate-pulse rounded-xl bg-white motion-reduce:animate-none" />
      <div className="h-28 animate-pulse rounded-xl bg-white motion-reduce:animate-none" />
    </div>
  );
}
