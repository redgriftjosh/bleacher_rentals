import { useCurrentEventStore } from "@/app/(dashboards)/bleachers-dashboard/_lib/useCurrentEventStore";

export default function AssignBleacherButton() {
  const setField = useCurrentEventStore((s) => s.setField);
  return (
    <div className="my-2">
      <button
        onClick={() => setField("isFormExpanded", true)}
        className="whitespace-nowrap ml-2 px-8 py-2 bg-darkBlue text-white text-sm font-semibold rounded shadow-md hover:bg-lightBlue transition cursor-pointer"
      >
        Assign Bleachers
      </button>
    </div>
  );
}
