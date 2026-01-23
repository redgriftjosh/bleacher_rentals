"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Dropdown } from "@/components/DropDown";
import { PrimaryButton } from "@/components/PrimaryButton";
import React from "react";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { Tab, Task } from "../types";
import {
  DEFAULT_STATUS,
  DEFAULT_TYPE,
  TASK_ADMIN_IDS,
  TASK_STATUS_OPTIONS,
  TASK_TYPE_OPTIONS,
  type TaskStatus,
  type TaskType,
} from "../constants";
import { checkDeleteTaskFormRules, checkInsertTaskFormRules } from "../functions";
import { deleteTask, saveTask } from "../db";
import { Textarea } from "@/components/TextArea";
import { useLayoutContext } from "@/contexts/LayoutContexts";
import { useRoadmapCurrentUserUuid } from "../hooks/useRoadmapCurrentUserUuid";

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
  const { user, isLoaded } = useUser();
  const { scrollRef } = useLayoutContext();
  const { userUuid, isLoading: isUserUuidLoading } = useRoadmapCurrentUserUuid();

  const [name, setName] = useState<string | null>(existingTask?.name ?? null);
  const [description, setDescription] = useState<string | null>(existingTask?.description ?? null);
  const [type, setType] = useState<TaskType>(existingTask?.type ?? DEFAULT_TYPE);
  const [status, setStatus] = useState<TaskStatus>(existingTask?.status ?? DEFAULT_STATUS);

  const [submitting, setSubmitting] = useState(false);

  const isSavable = existingTask
    ? userUuid === existingTask.created_by_user_uuid || TASK_ADMIN_IDS.includes(userUuid ?? "-1")
    : true;

  const isDeletable =
    !!existingTask &&
    (userUuid === existingTask.created_by_user_uuid || TASK_ADMIN_IDS.includes(userUuid ?? "-1"));

  const isEscalatable = TASK_ADMIN_IDS.includes(userUuid ?? "-1");

  // useEffect to set all back to default
  useEffect(() => {
    if (!isOpen) {
      setName(null);
      setDescription(null);
      setType(DEFAULT_TYPE);
      setStatus(DEFAULT_STATUS);
      setExistingTask(null);
    }
  }, [isOpen, setExistingTask]);

  useEffect(() => {
    if (existingTask) {
      setName(existingTask.name);
      setDescription(existingTask.description);
      setType(existingTask.type ?? DEFAULT_TYPE);
      setStatus(existingTask.status ?? DEFAULT_STATUS);
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
    const errors = checkInsertTaskFormRules(
      existingTask?.id ?? null,
      existingTask?.created_by_user_uuid ?? null,
      name,
      description,
      type,
      userUuid
    );
    if (errors) {
      setSubmitting(false);
      createErrorToast(errors);
    } else {
      if (!userUuid) {
        setSubmitting(false);
        createErrorToast(["Cannot link authenticated user to database."]);
        return;
      }

      await saveTask({
        taskUuid: existingTask?.id ?? null,
        name: name!,
        description: description!,
        type,
        status,
        createdByUserUuid: userUuid,
      });
      setSubmitting(false);

      setIsOpen(false);
    }
  };

  const handleDeleteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const errors = checkDeleteTaskFormRules(
      existingTask?.id ?? null,
      existingTask?.created_by_user_uuid ?? null,
      userUuid
    );
    if (errors) {
      setSubmitting(false);
      createErrorToast(errors);
    } else {
      await deleteTask(existingTask?.id!);
      setSubmitting(false);
      setIsOpen(false);
    }
  };

  // Never early-return before hooks; gate rendering here instead.
  if (!isLoaded || isUserUuidLoading) return null;

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
                        options={TASK_TYPE_OPTIONS}
                        selected={type}
                        onSelect={(value) => setType(value as TaskType)}
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
                        options={TASK_STATUS_OPTIONS}
                        selected={status}
                        onSelect={(value) => setStatus(value as TaskStatus)}
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
