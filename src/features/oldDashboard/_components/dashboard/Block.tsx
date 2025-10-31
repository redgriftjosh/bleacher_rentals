import { Check, Trash, Truck, X } from "lucide-react";
import { EditBlock } from "./MainScrollableGrid";
import { useAuth } from "@clerk/nextjs";
import { deleteBlock, saveBlock } from "../../../dashboard/db/client/db";
import { useEffect, useRef, useState } from "react";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { Tables } from "../../../../../database.types";

type BlockProps = {
  selectedBlock: EditBlock | null;
  setSelectedBlock: (block: EditBlock | null) => void;
  setWorkTracker: (workTracker: Tables<"WorkTrackers"> | null) => void;
  ROW_HEIGHT: number;
};

export default function Block({
  selectedBlock,
  setSelectedBlock,
  setWorkTracker,
  ROW_HEIGHT,
}: BlockProps) {
  const [currectBlock, setCurrectBlock] = useState<EditBlock | null>(selectedBlock);

  const { getToken } = useAuth();

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  //   useEffect(() => {
  //     // setCurrectBlock(selectedBlock);
  //     console.log("workTracker", workTracker);
  //   }, [workTracker]);

  const handleSelectWorkTracker = async () => {
    if (!currectBlock?.date) {
      createErrorToast(["Failed to select work tracker. No date provided."]);
    }
    if (!currectBlock?.bleacherId) {
      createErrorToast(["Failed to select work tracker. No bleacher id provided."]);
    }
    setWorkTracker({
      work_tracker_id: selectedBlock?.workTrackerId ?? -1,
      bleacher_id: currectBlock.bleacherId,
      created_at: "",
      date: currectBlock.date,
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
    });

    // console.log("workTracker", workTracker);
  };

  const handleSaveBlock = async () => {
    const token = await getToken({ template: "supabase" });
    try {
      await saveBlock(currectBlock, token);
      setSelectedBlock(null);
    } catch (error) {
      console.error("Failed to Save Block:", error);
    }
  };

  const handleDeleteBlock = async () => {
    const token = await getToken({ template: "supabase" });
    try {
      await deleteBlock(selectedBlock, token);
      setSelectedBlock(null);
    } catch (error) {
      console.error("Failed to Delete Block:", error);
    }
  };

  if (!selectedBlock || !currectBlock) return null;
  return (
    <>
      <div
        className="absolute inset-0 bg-white border border-gray-300 z-50 "
        onClick={(e) => e.stopPropagation()}
      >
        <textarea
          ref={textareaRef}
          className="w-full h-full px-2 py-1 outline-none text-[10px] text-center resize-none"
          value={currectBlock.text}
          onChange={(e) => setCurrectBlock({ ...currectBlock, text: e.target.value })}
          onKeyDown={(e) => {
            const isModifier = e.shiftKey || e.metaKey || e.ctrlKey || e.altKey;

            if (e.key === "Enter" && !isModifier) {
              e.preventDefault();
              handleSaveBlock();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setSelectedBlock(null);
            }
          }}
        />
      </div>
      <div
        className="absolute z-[10] flex m-1 gap-1"
        style={{
          top: ROW_HEIGHT, // push it 30px *below* the cell
          right: 0,
        }}
      >
        <div
          className="cursor-pointer white shadow rounded border p-1 bg-white hover:bg-gray-100 animate-scale-bounce-in"
          onClick={(e) => {
            e.stopPropagation();
            // setSelectedBlock(null);
            handleSelectWorkTracker();
          }}
        >
          <Truck className="h-4 w-4" color="darkBlue" />
        </div>
        <div
          className="cursor-pointer white shadow rounded border p-1 bg-white hover:bg-gray-100 animate-scale-bounce-in"
          onClick={(e) => {
            e.stopPropagation();
            handleSaveBlock();
          }}
        >
          <Check className="h-4 w-4" color="green" />
        </div>
        <div
          className="cursor-pointer white shadow rounded border p-1 bg-white hover:bg-gray-100 animate-scale-bounce-in"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedBlock(null);
          }}
        >
          <X className="h-4 w-4" color="#c40000" />
        </div>
        {currectBlock.blockId && (
          <div
            className="cursor-pointer white shadow rounded border p-1 bg-white hover:bg-gray-100 animate-scale-bounce-in"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteBlock();
              setSelectedBlock(null);
            }}
          >
            <Trash className="h-4 w-4" color="#c40000" />
          </div>
        )}
      </div>
    </>
  );
}
