import { DashboardBlock } from "../../types";

export default function BlockRenderer({ block }: { block: DashboardBlock }) {
  return (
    <div className="absolute inset-0 text-[10px] text-black flex items-center justify-center text-center px-1 pointer-events-none whitespace-pre-wrap break-words overflow-hidden h-full w-full">
      {block.text}
    </div>
  );
}
