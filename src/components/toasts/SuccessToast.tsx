// components/toasts/ErrorToast.tsx
import React from "react";
import { toast } from "sonner"; // or wherever your toast comes from

type SuccessToastProps = {
  id: string | number;
  lines: string[];
};

export const SuccessToast = ({ id, lines }: SuccessToastProps) => (
  <div className="bg-green-100 text-xs border border-green-500 p-2 rounded shadow text-green-900 flex items-center justify-between">
    <div>
      <strong>Success</strong>
      <ul>
        {lines.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
    </div>
    <button
      onClick={() => toast.dismiss(id)}
      className="ml-4 px-3 py-1 text-xs bg-green-900 text-white rounded hover:bg-green-700 min-w-[90px] text-center"
    >
      Dismiss
    </button>
  </div>
);
