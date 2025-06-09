export default function BleacherActivityClean() {
  return (
    <button
      className="w-fit mb-1 h-6 rounded-full flex items-center justify-center border border-gray-500 bg-gray-200 hover:bg-gray-300 transition-colors cursor-pointer"
      onClick={() => console.log("new activity")}
    >
      <p className="text-xs px-2">
        Clean Bleacher. Assigned to [Driver]. start: [Time], end: [Time]
      </p>
    </button>
  );
}
