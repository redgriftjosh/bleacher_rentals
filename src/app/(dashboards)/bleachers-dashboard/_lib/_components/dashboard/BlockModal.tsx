"use client";

import { useAuth } from "@clerk/nextjs";
import { EditBlock } from "./MainScrollableGrid";
import { deleteBlock, saveBlock } from "../../db";
import { X } from "lucide-react";

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
  if (!selectedBlock) return null;
  return (
    <>
      {selectedBlock && (
        <div
          onMouseDown={() => setSelectedBlock(null)}
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center"
        >
          <div
            onMouseDown={(e) => e.stopPropagation()} // 👈 prevent bubbling here
            className="bg-white p-4 rounded shadow w-[300px]"
          >
            <div className="flex flex-row justify-between items-start">
              <h2 className="text-sm font-semibold mb-2">Edit Block</h2>
              <X
                className="-mt-1 cursor-pointer text-gray-300 hover:text-black hover:drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)] transition-all duration-200"
                onClick={() => setSelectedBlock(null)}
              />
            </div>
            <textarea
              className="w-full text-sm border p-1 rounded"
              value={selectedBlock.text}
              onChange={(e) => setSelectedBlock({ ...selectedBlock, text: e.target.value })}
              rows={4}
            />
            <div className="mt-3 flex justify-end gap-2">
              {selectedBlock.blockId && (
                <button
                  className="text-sm text-gray-500 px-3 py-1 rounded bg-gray-200 cursor-pointer hover:bg-red-900/20 hover:text-red-700 hover:border-red-700 border-1 border-gray-200 transition-all duration-200"
                  onClick={handleDeleteBlock}
                >
                  Delete
                </button>
              )}
              <button
                className="text-sm px-3 py-1 rounded bg-darkBlue text-white cursor-pointer hover:bg-lightBlue transition-all duration-200"
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
