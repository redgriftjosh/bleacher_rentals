"use client";

import { saveSetupTeardownBlock } from "../../../dashboard/db/client/db";
import { X } from "lucide-react";
import { useEffect } from "react";
import { confirmedHsl, setupTeardownHsl } from "@/types/Constants";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";

export type SetupTeardownBlock = {
  bleacherEventId: number;
  bleacherId: number;
  text: string;
  confirmed: boolean;
  type: "setup" | "teardown";
};

type SetupTeardownBlockModalProps = {
  selectedBlock: SetupTeardownBlock | null;
  setSelectedBlock: (block: SetupTeardownBlock | null) => void;
};

export default function SetupBlockModal({
  selectedBlock,
  setSelectedBlock,
}: SetupTeardownBlockModalProps) {
  const supabase = useClerkSupabaseClient();
  const handleSaveBlock = async () => {
    try {
      await saveSetupTeardownBlock(selectedBlock, supabase);
      setSelectedBlock(null);
    } catch (error) {
      console.error("Failed to Save Block:", error);
    }
  };
  useEffect(() => {
    console.log("Selected Block:", selectedBlock);
  }, [selectedBlock]);

  if (!selectedBlock) return null;
  return (
    <>
      {selectedBlock && (
        <div
          onClick={() => setSelectedBlock(null)}
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center"
        >
          <div
            onClick={(e) => e.stopPropagation()} // 👈 prevent bubbling here
            className=" p-4 rounded shadow w-[300px] transition-colors duration-200"
            style={{
              backgroundColor: selectedBlock.confirmed ? confirmedHsl : setupTeardownHsl,
            }}
          >
            <div className="flex flex-row justify-between items-start">
              <h2 className="text-sm font-semibold mb-2">
                Edit {selectedBlock.type.charAt(0).toUpperCase() + selectedBlock.type.slice(1)}
              </h2>
              <X
                className="-mt-1 cursor-pointer text-black/30 hover:text-black hover:drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)] transition-all duration-200"
                onClick={() => setSelectedBlock(null)}
              />
            </div>
            <textarea
              className="w-full text-sm border p-1 rounded bg-white"
              value={selectedBlock.text}
              onChange={(e) => setSelectedBlock({ ...selectedBlock, text: e.target.value })}
              rows={4}
            />
            <div className="mt-3 flex justify-end items-center gap-2">
              <p className="text-xs">Confirmed?</p>
              <div className="flex flex-col">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    onChange={(e) =>
                      setSelectedBlock({ ...selectedBlock, confirmed: e.target.checked })
                    }
                    checked={selectedBlock.confirmed}
                  />
                  <div className="w-11 h-6 bg-black/30 peer-focus:outline-none peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-darkBlue"></div>
                </label>
              </div>
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
