"use client";
import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { Dropdown } from "@/components/DropDown";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useUsersStore } from "@/state/userStore";
import React from "react";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { Tab, Task } from "../types";
import { DEFAULT_STATUS, DEFAULT_TYPE, TASK_ADMIN_IDS } from "../constants";
import { checkDeleteTaskFormRules, checkInsertTaskFormRules, findUserId } from "../functions";
import { deleteTask, saveTask } from "../db";
import { Textarea } from "@/components/TextArea";
import { useTaskTypesStore } from "@/state/taskTypesStore";
import { useLayoutContext } from "@/contexts/LayoutContexts";
import { useTaskStatusesStore } from "@/state/taskStatusesStore";

export function SheetAddFeature({
  isOpen,
  setIsOpen,
  existingTask = null,
  setExistingTask,
  setSelectedTab,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  existingTask?: Task | null;
  setExistingTask: (task: Task | null) => void;
  setSelectedTab: (tab: Tab) => void;
}) {
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  if (!isLoaded) return null;
  const { scrollRef } = useLayoutContext();
  const users = useUsersStore((s) => s.users);
  const taskTypes = useTaskTypesStore((s) => s.taskTypes);
  const taskStatuses = useTaskStatusesStore((s) => s.taskStatuses);

  const [name, setName] = useState<string | null>(existingTask?.name ?? null);
  const [description, setDescription] = useState<string | null>(existingTask?.description ?? null);
  const [typeId, setTypeId] = useState<number>(
    existingTask?.task_type.task_type_id ?? DEFAULT_TYPE
  );
  const [statusId, setStatusId] = useState<number>(
    existingTask?.task_status.task_status_id ?? DEFAULT_STATUS
  );
  const [submitting, setSubmitting] = useState(false);

  const userId = findUserId(user, users);

  const isSavable = existingTask
    ? userId === existingTask.created_by_user.user_id || TASK_ADMIN_IDS.includes(userId ?? -1)
    : true;

  const isDeletable =
    !!existingTask &&
    (userId === existingTask.created_by_user.user_id || TASK_ADMIN_IDS.includes(userId ?? -1));

  const isEscalatable = TASK_ADMIN_IDS.includes(userId ?? -1);

  // useEffect to set all back to default
  useEffect(() => {
    if (!isOpen) {
      setName(null);
      setDescription(null);
      setTypeId(DEFAULT_TYPE);
      setStatusId(DEFAULT_STATUS);
      setExistingTask(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (existingTask) {
      setName(existingTask.name);
      setDescription(existingTask.description);
      setTypeId(existingTask.task_type.task_type_id);
      setStatusId(existingTask.task_status.task_status_id);
    }
  }, [existingTask]);

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedTab("backlog");

    // Scroll to bottom with smooth easing
    setTimeout(() => {
      if (scrollRef?.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 100); // delay to allow content to render
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const token = await getToken({ template: "supabase" });
    const errors = checkInsertTaskFormRules(
      existingTask?.task_id ?? null,
      existingTask?.created_by_user.user_id ?? null,
      name,
      description,
      typeId,
      user,
      users,
      token
    );
    if (errors) {
      setSubmitting(false);
      createErrorToast(errors);
    } else {
      await saveTask(
        existingTask?.task_id ?? null,
        name!,
        description!,
        typeId!,
        statusId!,
        user,
        users,
        token!,
        setSubmitting
      );
      setIsOpen(false);
    }
  };

  const handleDeleteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const token = await getToken({ template: "supabase" });
    const errors = checkDeleteTaskFormRules(
      existingTask?.task_id ?? null,
      existingTask?.created_by_user.user_id ?? null,
      user,
      users,
      token
    );
    if (errors) {
      setSubmitting(false);
      createErrorToast(errors);
    } else {
      await deleteTask(existingTask?.task_id!, token!, setSubmitting);
      setIsOpen(false);
    }
  };

  return (
    <>
      <PrimaryButton onClick={handleOpen}>+ Request a Feature</PrimaryButton>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Sheet */}
          <div className="fixed inset-y-0 right-0 w-full sm:max-w-sm bg-white shadow-xl flex flex-col animate-in slide-in-from-right">
            {/* Header */}
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">
                {existingTask ? "Make Changes to This Task" : "Propose a New Task"}
              </h2>
              <p className="text-sm text-gray-500">
                If you've identified a bug or have an idea for a new feature, let us know! And we'll
                use this list as talking points for our next software meeting.
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 flex flex-col">
              <div className="space-y-4">
                <div className="grid grid-cols-5 items-center gap-4">
                  <label htmlFor="name" className="text-right text-sm font-medium col-span-2">
                    Task Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name ?? ""}
                    onChange={(e) => setName(e.target.value)}
                    className="col-span-3 px-3 py-2 border rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-5 items-center gap-4">
                  <div className="text-right text-sm font-medium col-span-2 flex items-center justify-end gap-1">
                    <label htmlFor="name">Type</label>
                  </div>
                  <div className="col-span-3">
                    <Dropdown
                      options={taskTypes.map((type) => ({
                        label: type.label,
                        value: type.task_type_id,
                      }))}
                      selected={typeId}
                      onSelect={(id) => setTypeId(id)}
                      placeholder="Select Task Type"
                    />
                  </div>
                </div>
              </div>
              {isEscalatable && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-5 items-center gap-4">
                    <div className="text-right text-sm font-medium col-span-2 flex items-center justify-end gap-1">
                      <label htmlFor="name">Status</label>
                    </div>
                    <div className="col-span-3">
                      <Dropdown
                        options={taskStatuses.map((status) => ({
                          label: status.label,
                          value: status.task_status_id,
                        }))}
                        selected={statusId}
                        onSelect={(id) => setStatusId(id)}
                        placeholder="Select Status"
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-y-auto pt-2">
                <Textarea
                  className="w-full h-full resize-none"
                  placeholder="Describe your feature idea here! If you found a bug, describe the steps to reproduce it. And set the the type to Bug!"
                  value={description ?? ""}
                  disabled={!isSavable}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t flex justify-end">
              {isDeletable && (
                <div className="mr-2">
                  <PrimaryButton
                    className="bg-red-800 hover:bg-red-900"
                    loading={submitting}
                    loadingText="Ok..."
                    onClick={handleDeleteTask}
                  >
                    Delete
                  </PrimaryButton>
                </div>
              )}

              {isSavable && (
                <PrimaryButton loading={submitting} loadingText="Saving..." onClick={handleSubmit}>
                  Save
                </PrimaryButton>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
