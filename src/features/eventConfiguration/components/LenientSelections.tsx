import { Toggle } from "../../../components/Toggle";
import { useCurrentEventStore } from "../state/useCurrentEventStore";

export const LenientSelections = () => {
  const currentEventStore = useCurrentEventStore();

  return (
    <div>
      <div className="flex gap-4">
        <div className="mt-1">
          <Toggle
            label="Lenient"
            tooltip={true}
            checked={currentEventStore.lenient}
            onChange={(e) => currentEventStore.setField("lenient", e)}
          />
        </div>

        {currentEventStore.lenient ? (
          <div className="flex-1">
            <label className="block mt-1 text-sm font-medium text-gray-700">Total Seats</label>
            <input
              type="number"
              min="0"
              className="block w-full border rounded p-2"
              value={currentEventStore.seats ?? ""}
              onChange={(e) => currentEventStore.setField("seats", Number(e.target.value))}
              required
            />
          </div>
        ) : (
          <>
            <div className="flex-1">
              <label className="block mt-1 text-sm font-medium text-gray-700">7-Row</label>
              <input
                type="number"
                min="0"
                className="block w-full border rounded p-2"
                value={currentEventStore.sevenRow ?? ""}
                onChange={(e) => currentEventStore.setField("sevenRow", Number(e.target.value))}
                required
              />
            </div>
            <div className="flex-1">
              <label className="block mt-1 text-sm font-medium text-gray-700">10-Row</label>
              <input
                type="number"
                min="0"
                className="block w-full border rounded p-2"
                value={currentEventStore.tenRow ?? ""}
                onChange={(e) => currentEventStore.setField("tenRow", Number(e.target.value))}
                required
              />
            </div>
            <div className="flex-1">
              <label className="block mt-1 text-sm font-medium text-gray-700">15-Row</label>
              <input
                type="number"
                min="0"
                className="block w-full border rounded p-2"
                value={currentEventStore.fifteenRow ?? ""}
                onChange={(e) => currentEventStore.setField("fifteenRow", Number(e.target.value))}
                required
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
