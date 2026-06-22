import { Toggle } from "../../../components/Toggle";
import { useCurrentEventStore } from "../state/useCurrentEventStore";
import { useBleacherTypesActive } from "@/features/pricingMatrix/hooks/useBleacherTypesActive";

export const LenientSelections = () => {
  const currentEventStore = useCurrentEventStore();
  const { bleacherTypes } = useBleacherTypesActive();

  const requirements = currentEventStore.bleacherRequirements;

  const getQty = (btId: string) =>
    requirements.find((r) => r.bleacherTypeUuid === btId)?.quantity ?? 0;

  const setQty = (btId: string, qty: number) => {
    const filtered = requirements.filter((r) => r.bleacherTypeUuid !== btId);
    if (qty > 0) {
      filtered.push({ bleacherTypeUuid: btId, quantity: qty });
    }
    currentEventStore.setField("bleacherRequirements", filtered);
  };

  return (
    <div>
      <div className="flex gap-4 flex-wrap">
        <div className="mt-1">
          <Toggle
            label="Lenient"
            tooltip={true}
            checked={currentEventStore.lenient}
            onChange={(e) => currentEventStore.setField("lenient", e)}
          />
        </div>

        {currentEventStore.lenient ? (
          <div className="flex-1 min-w-[120px]">
            <label className="block mt-1 text-sm font-medium text-black/70">Total Seats</label>
            <input
              type="number"
              min="0"
              className="bg-white block w-full border rounded p-2"
              value={currentEventStore.seats ?? ""}
              onChange={(e) => currentEventStore.setField("seats", Number(e.target.value))}
              required
            />
          </div>
        ) : (
          <>
            {bleacherTypes.map((bt) => (
              <div key={bt.id} className="flex-1 min-w-[100px]">
                <label className="block mt-1 text-sm font-medium text-black/70">
                  {bt.name ?? `${bt.row_count}-Row`}
                </label>
                <input
                  type="number"
                  min="0"
                  className="bg-white block w-full border rounded p-2"
                  value={getQty(bt.id) || ""}
                  onChange={(e) => setQty(bt.id, Number(e.target.value))}
                />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
