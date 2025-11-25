"use client";

import { Check, Trash, Truck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSelectedBlockStore } from "../state/useSelectedBlock";
import { Tables } from "../../../../database.types";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { useQueryClient } from "@tanstack/react-query";
import { deleteBlock, saveBlock } from "../db/client/db";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";

type CellEditorProps = {
  onWorkTrackerOpen?: (workTracker: Tables<"WorkTrackers">) => void;
};

export default function CellEditor({ onWorkTrackerOpen }: CellEditorProps) {
  const qc = useQueryClient();
  const supabase = useClerkSupabaseClient();
  const { isOpen, key, blockId, bleacherId, date, text, workTrackerId, setField, resetForm } =
    useSelectedBlockStore();

  const [currentText, setCurrentText] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setCurrentText(text);
  }, [text]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleSave = async () => {
    setCurrentText("");
    try {
      const editBlock = {
        key,
        blockId,
        bleacherId,
        date,
        text: currentText,
        workTrackerId,
      };
      await saveBlock(editBlock, supabase);
      // Refresh bleachers store directly so Pixi updates without remounting
      try {
        const { FetchDashboardBleachers } = await import(
          "@/features/dashboard/db/client/bleachers"
        );
        await FetchDashboardBleachers(supabase);
      } catch {}
      resetForm();
    } catch (error) {
      console.error("Failed to Save Block:", error);
    }
  };

  const handleDelete = async () => {
    if (!blockId) return;

    try {
      const editBlock = {
        key,
        blockId,
        bleacherId,
        date,
        text: currentText,
        workTrackerId,
      };
      await deleteBlock(editBlock, supabase);
      // Refresh bleachers store directly so Pixi updates without remounting
      try {
        const { FetchDashboardBleachers } = await import(
          "@/features/dashboard/db/client/bleachers"
        );
        await FetchDashboardBleachers(supabase);
      } catch {}
      resetForm();
    } catch (error) {
      console.error("Failed to Delete Block:", error);
    }
  };

  const handleOpenWorkTracker = () => {
    if (!date || !bleacherId) {
      createErrorToast(["Failed to open work tracker. Missing date or bleacher id."]);
      return;
    }

    const workTracker: Tables<"WorkTrackers"> = {
      work_tracker_id: workTrackerId ?? -1,
      bleacher_id: bleacherId,
      created_at: "",
      date: date,
      dropoff_address_id: null,
      dropoff_poc: null,
      dropoff_time: null,
      notes: null,
      pay_cents: null,
      pickup_address_id: null,
      pickup_poc: null,
      pickup_time: null,
      user_id: null,
      internal_notes: null,
    };

    onWorkTrackerOpen?.(workTracker);
  };

  // Track whether the initial mousedown began on the backdrop so we only close when both down & up occur there
  const mouseDownOnBackdrop = useRef(false);

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    mouseDownOnBackdrop.current = e.target === e.currentTarget; // only true if directly on backdrop
  };

  const handleBackdropMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mouseDownOnBackdrop.current && e.target === e.currentTarget) {
      handleClose();
    }
    mouseDownOnBackdrop.current = false;
  };

  const handleClose = () => {
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div
      // onMouseDown={handleClose}
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
      className="fixed inset-0 z-[1000] bg-black/30 backdrop-blur-xs flex items-center justify-center"
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="bg-white p-4 rounded shadow w-[400px]"
      >
        <div className="flex flex-row justify-between items-start mb-4">
          <h2 className="text-sm font-semibold">Edit Cell</h2>
          <X
            className="-mt-1 cursor-pointer text-gray-300 hover:text-black hover:drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)] transition-all duration-200"
            onClick={handleClose}
          />
        </div>

        <textarea
          ref={textareaRef}
          className="w-full text-sm border p-2 rounded mb-4"
          value={currentText}
          onChange={(e) => setCurrentText(e.target.value)}
          onKeyDown={(e) => {
            const isModifier = e.shiftKey || e.metaKey || e.ctrlKey || e.altKey;

            if (e.key === "Enter" && !isModifier) {
              e.preventDefault();
              handleSave();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              handleClose();
            }
          }}
          rows={4}
          placeholder="Enter block text..."
        />

        <div className="flex justify-between gap-2">
          <div className="flex gap-2">
            <button
              className="flex items-center gap-1 text-xs underline text-gray-500 cursor-pointer hover:text-black transition-all duration-200"
              onClick={handleOpenWorkTracker}
            >
              <Truck className="h-4 w-4" />
              Work Tracker
            </button>
          </div>

          <div className="flex gap-2">
            {blockId && (
              <button
                className="flex items-center gap-1 text-sm text-gray-500 px-3 py-1 rounded bg-gray-200 cursor-pointer hover:bg-red-900/20 hover:text-red-700 hover:border-red-700 border-1 border-gray-200 transition-all duration-200"
                onClick={handleDelete}
              >
                <Trash className="h-4 w-4" />
                Delete
              </button>
            )}
            <button
              className="flex items-center gap-1 text-sm px-3 py-1 rounded bg-darkBlue text-white cursor-pointer hover:bg-lightBlue transition-all duration-200"
              onClick={handleSave}
            >
              <Check className="h-4 w-4" />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
