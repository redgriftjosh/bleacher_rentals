"use client";

import { useAuth } from "@clerk/nextjs";
import { EditBlock } from "./MainScrollableGrid";
import { saveBlock } from "../../db";

type BlockModalProps = {
  selectedBlock: EditBlock | null;
  setSelectedBlock: (block: EditBlock | null) => void;
};

export default function BlockModal({ selectedBlock, setSelectedBlock }: BlockModalProps) {
  const { getToken } = useAuth();
  const handleSaveBlock = async () => {
    const token = await getToken({ template: "supabase" });
    try {
      await saveBlock(selectedBlock, token);
      setSelectedBlock(null);
    } catch (error) {
      console.error("Failed to create event:", error);
    }
  };
  if (!selectedBlock) return null;
  return (
    <>
      {selectedBlock && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow w-[300px]">
            <h2 className="text-sm font-semibold mb-2">Edit Block</h2>
            <textarea
              className="w-full text-sm border p-1 rounded"
              value={selectedBlock.text}
              onChange={(e) => setSelectedBlock({ ...selectedBlock, text: e.target.value })}
              rows={4}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                className="text-sm px-3 py-1 rounded bg-gray-200"
                onClick={() => setSelectedBlock(null)}
              >
                Cancel
              </button>
              <button
                className="text-sm px-3 py-1 rounded bg-blue-500 text-white"
                onClick={handleSaveBlock}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
