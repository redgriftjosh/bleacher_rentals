"use client";

import { CheckCheck, CircleAlert, LoaderCircle } from "lucide-react";
import SelectRowsDropDown from "./dropdowns/selectRowsDropDown";
import SelectLinxupDeviceDropDown from "./dropdowns/selectLinxupDeviceDropDown";
import { Dropdown } from "@/components/DropDown";
import { FileUploadInput } from "@/features/manageTeam/components/inputs/FileUploadInput";
import type { BleacherFormState, StorageLocationOption } from "../hooks/useBleacherForm";

type BleacherTypeOption = { id: string; name: string | null; row_count: number | null };
type ZoneOption = { id: string; display_name: string | null };

const inputClass =
  "col-span-3 w-full rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2 text-sm font-medium text-gray-800 transition-colors placeholder:text-gray-400 focus:bg-white focus:border-darkBlue/40 focus:outline-none focus:ring-2 focus:ring-darkBlue/20";
const rowClass = "grid grid-cols-5 items-center gap-3";
const labelClass = "text-right text-xs font-medium text-gray-500 col-span-2";

type Props = {
  state: BleacherFormState;
  setField: <K extends keyof BleacherFormState>(key: K, value: BleacherFormState[K]) => void;
  bleacherTypes: BleacherTypeOption[];
  zones: ZoneOption[];
  storageLocations: StorageLocationOption[];
  isTakenNumber: boolean;
  numberLoading: boolean;
  /** Edit-only: render the read-only total towed distance row. */
  totalDistanceMeters?: number | null;
};

export function BleacherFormFields({
  state,
  setField,
  bleacherTypes,
  zones,
  storageLocations,
  isTakenNumber,
  numberLoading,
  totalDistanceMeters,
}: Props) {
  return (
    <>
      <div className={rowClass}>
        <label className={labelClass}>Bleacher Number</label>
        <div className="col-span-2">
          <div className="relative">
            <input
              type="number"
              value={state.bleacherNumber ?? ""}
              onChange={(e) => setField("bleacherNumber", Number(e.target.value))}
              className={`w-full rounded-lg border bg-gray-50/70 px-3 py-2 text-sm font-medium text-gray-800 transition-colors focus:bg-white focus:outline-none focus:ring-2 ${
                isTakenNumber
                  ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                  : "border-gray-200 focus:border-darkBlue/40 focus:ring-darkBlue/20"
              }`}
            />
            <div className="absolute -right-10 top-1/2 transform -translate-y-1/2">
              {isTakenNumber ? (
                <CircleAlert className="text-red-700" />
              ) : numberLoading ? (
                <LoaderCircle className="text-blue-700 animate-spin" />
              ) : (
                <CheckCheck className="text-green-700" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={rowClass}>
        <label className={labelClass}>Seats</label>
        <input
          type="number"
          value={state.seats ?? ""}
          onChange={(e) => setField("seats", Number(e.target.value))}
          className={inputClass}
        />
      </div>

      <div className={rowClass}>
        <label className={labelClass}>Rows</label>
        <SelectRowsDropDown
          onSelect={(e) => setField("rows", Number(e))}
          value={state.rows ?? undefined}
        />
      </div>

      <div className={rowClass}>
        <label className={labelClass}>Bleacher Type</label>
        <div className="col-span-3">
          <Dropdown
            options={[
              { label: "None", value: null },
              ...bleacherTypes.map((bt) => ({
                label: bt.name ?? `${bt.row_count}-Row`,
                value: bt.id,
              })),
            ]}
            selected={state.bleacherTypeUuid}
            onSelect={(v) => setField("bleacherTypeUuid", v)}
            placeholder="Select type (optional)"
          />
        </div>
      </div>

      <div className={rowClass}>
        <label className={labelClass}>Storage Location</label>
        <div className="col-span-3">
          <Dropdown
            options={[
              { label: "None", value: null },
              ...storageLocations.map((sl) => ({ label: sl.name ?? "Unnamed", value: sl.id })),
            ]}
            selected={state.storageLocationUuid}
            onSelect={(v) => setField("storageLocationUuid", v)}
            placeholder="Select location (optional)"
          />
        </div>
      </div>

      <div className={rowClass}>
        <label className={labelClass}>Zone</label>
        <div className="col-span-3">
          <Dropdown
            options={[
              { label: "None", value: null },
              ...zones.map((z) => ({ label: z.display_name ?? z.id, value: z.id })),
            ]}
            selected={state.zoneUuid}
            onSelect={(v) => setField("zoneUuid", v)}
            placeholder="Select zone (optional)"
          />
        </div>
      </div>

      <div className={rowClass}>
        <label className={labelClass}>Linxup Device</label>
        <SelectLinxupDeviceDropDown
          onSelect={(deviceId) => setField("linxupDeviceId", deviceId)}
          placeholder="Select Device (Optional)"
          value={state.linxupDeviceId ?? null}
        />
      </div>

      <div className={rowClass}>
        <label className={labelClass}>Manufacturer</label>
        <input
          type="text"
          value={state.manufacturer ?? ""}
          onChange={(e) => setField("manufacturer", e.target.value || null)}
          className={inputClass}
        />
      </div>

      <div className={rowClass}>
        <label className={labelClass}>VIN Number</label>
        <input
          type="text"
          value={state.vinNumber ?? ""}
          onChange={(e) => setField("vinNumber", e.target.value || null)}
          className={inputClass}
        />
      </div>

      <div className={rowClass}>
        <label className={labelClass}>Tag Number</label>
        <input
          type="text"
          value={state.tagNumber ?? ""}
          onChange={(e) => setField("tagNumber", e.target.value || null)}
          className={inputClass}
        />
      </div>

      <div className={rowClass}>
        <label className={labelClass}>Hitch Type</label>
        <input
          type="text"
          value={state.hitchType ?? ""}
          onChange={(e) => setField("hitchType", e.target.value || null)}
          className={inputClass}
        />
      </div>

      <div className={rowClass}>
        <label className={labelClass}>Trailer Height</label>
        <div className="col-span-3 flex gap-2">
          <FtInInput
            value={state.trailerHeightFt}
            unit="ft"
            onChange={(v) => setField("trailerHeightFt", v)}
          />
          <FtInInput
            value={state.trailerHeightIn}
            unit="in"
            max={11}
            onChange={(v) => setField("trailerHeightIn", v)}
          />
        </div>
      </div>

      <div className={rowClass}>
        <label className={labelClass}>Trailer Length</label>
        <div className="col-span-3 flex gap-2">
          <FtInInput
            value={state.trailerLengthFt}
            unit="ft"
            onChange={(v) => setField("trailerLengthFt", v)}
          />
          <FtInInput
            value={state.trailerLengthIn}
            unit="in"
            max={11}
            onChange={(v) => setField("trailerLengthIn", v)}
          />
        </div>
      </div>

      <div className={rowClass}>
        <label className={labelClass}>Opening Direction</label>
        <select
          value={state.openingDirection ?? ""}
          onChange={(e) =>
            setField("openingDirection", (e.target.value || null) as "driver" | "passenger" | null)
          }
          className={inputClass}
        >
          <option value="">Select direction</option>
          <option value="driver">Driver</option>
          <option value="passenger">Passenger</option>
        </select>
      </div>

      <div className={rowClass}>
        <label className={labelClass}>GVWR (lbs)</label>
        <input
          type="number"
          value={state.gvwr ?? ""}
          onChange={(e) => setField("gvwr", e.target.value ? Number(e.target.value) : null)}
          className={inputClass}
        />
      </div>

      {totalDistanceMeters != null && (
        <div className={rowClass}>
          <label className={labelClass}>Total Distance</label>
          <span className="col-span-3 px-3 py-2 text-sm font-medium text-gray-700">
            {(totalDistanceMeters / 1000).toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{" "}
            km
          </span>
        </div>
      )}

      <div className="grid grid-cols-5 items-start gap-4">
        <label className="text-right text-sm font-medium col-span-2 pt-2">NVIS PDF</label>
        <div className="col-span-3">
          <FileUploadInput
            label=""
            bucket="bleacher-nvis"
            storagePath={`bleacher-${state.bleacherNumber ?? "unknown"}/nvis-${Date.now()}`}
            value={state.nvisPdfPath}
            onChange={(v) => setField("nvisPdfPath", v)}
            acceptedTypes={["application/pdf"]}
            maxSizeMB={10}
          />
        </div>
      </div>
    </>
  );
}

function FtInInput({
  value,
  unit,
  max,
  onChange,
}: {
  value: number | null;
  unit: "ft" | "in";
  max?: number;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="relative flex-1">
      <input
        type="number"
        min={0}
        max={max}
        placeholder={unit}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2 text-sm font-medium text-gray-800 transition-colors placeholder:text-gray-400 focus:bg-white focus:border-darkBlue/40 focus:outline-none focus:ring-2 focus:ring-darkBlue/20"
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
        {unit}
      </span>
    </div>
  );
}
