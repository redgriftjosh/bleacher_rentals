import { Plus } from "lucide-react";

export default function AddNewActivity() {
  return (
    <button
      className="w-6 h-6 rounded-full flex items-center justify-center border border-gray-500 bg-gray-200 hover:bg-gray-300 transition-colors cursor-pointer"
      onClick={() => console.log("new activity")}
    >
      <Plus size={12} />
    </button>
  );
}
