// components/toasts/ErrorToast.tsx
import React from "react";
import { toast } from "sonner"; // or wherever your toast comes from

type ErrorToastProps = {
  id: string | number;
  lines: string[];
};

export const ErrorToast = ({ id, lines }: ErrorToastProps) => (
  <div className="bg-red-100 text-xs border border-red-600 p-2 rounded shadow text-red-900 flex items-center justify-between">
    <div>
      <strong>Error:</strong> {lines[0]}
      {lines.length > 1 && (
        <ul>
          {lines.slice(1).map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
      )}
    </div>
    <button
      onClick={() => toast.dismiss(id)}
      className="ml-4 px-3 py-1 text-xs bg-red-900 text-white rounded hover:bg-red-700 min-w-[90px] text-center"
    >
      Dismiss
    </button>
  </div>
);
