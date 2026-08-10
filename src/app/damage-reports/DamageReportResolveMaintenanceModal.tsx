"use client";

import { useState, type ChangeEvent } from "react";
import { Loader2, Plus, FileText, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CentsInput from "@/components/CentsInput";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { createMaintenanceEvent } from "@/features/maintenanceEvents/db/createMaintenanceEvent";
import { useMaintenanceEventStore } from "@/features/maintenanceEvents/state/useMaintenanceEventStore";
import { useCurrentUserUuid } from "@/features/quotesAndBookings/hooks/useCurrentUserUuid";
import { createErrorToast } from "@/components/toasts/ErrorToast";

const BUCKET = "maintenance-photos";
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];
const MAX_SIZE_MB = 10;

type PendingFile = { file: File };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bleacherUuid: string;
  bleacherNumber: number;
  damageReportUuid: string;
  onResolved: () => void;
};

export function DamageReportResolveMaintenanceModal({
  open,
  onOpenChange,
  bleacherUuid,
  bleacherNumber,
  damageReportUuid,
  onResolved,
}: Props) {
  const supabase = useClerkSupabaseClient();
  const currentUserUuid = useCurrentUserUuid();

  const [eventName, setEventName] = useState("Maintenance / Repair");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [costCents, setCostCents] = useState<number | null>(null);
  const [costDisplay, setCostDisplay] = useState("");
  const [notes, setNotes] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [saving, setSaving] = useState(false);

  const resetLocal = () => {
    setEventName("Maintenance / Repair");
    setEventStart("");
    setEventEnd("");
    setCostCents(null);
    setCostDisplay("");
    setNotes("");
    setPendingFiles([]);
    setSaving(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetLocal();
    onOpenChange(next);
  };

  const handleFilePick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      createErrorToast(["Invalid file type", `Please upload: ${ACCEPTED_TYPES.join(", ")}`]);
      return;
    }
    if (file.size / (1024 * 1024) > MAX_SIZE_MB) {
      createErrorToast(["File too large", `Maximum size is ${MAX_SIZE_MB}MB`]);
      return;
    }

    setPendingFiles((prev) => [...prev, { file }]);
    e.target.value = "";
  };

  const uploadFiles = async (maintenanceEventUuid: string) => {
    for (const { file } of pendingFiles) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const storagePath = `${maintenanceEventUuid}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("MaintenancePhotos").insert({
        maintenance_event_uuid: maintenanceEventUuid,
        photo_path: storagePath,
      });
      if (insertError) throw insertError;
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const store = useMaintenanceEventStore.getState();
      store.resetForm();
      store.setField("eventName", eventName);
      store.setField("eventStart", eventStart);
      store.setField("eventEnd", eventEnd);
      store.setField("costCents", costCents);
      store.setField("bleacherUuids", [bleacherUuid]);
      store.setField("notes", notes);

      const maintenanceEventUuid = await createMaintenanceEvent(
        useMaintenanceEventStore.getState(),
        supabase,
        {
          createdByUserUuid: currentUserUuid,
          resolveDamageReportUuid: damageReportUuid,
        },
      );

      if (maintenanceEventUuid && pendingFiles.length > 0) {
        try {
          await uploadFiles(maintenanceEventUuid);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          createErrorToast(["Не вдалося завантажити файли", message]);
        }
      }

      store.resetForm();
      resetLocal();
      onResolved();
    } catch {
      // createMaintenanceEvent throws after its own error toast — keep modal open for retry.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto z-[1200]">
        <DialogHeader>
          <DialogTitle>Create Maintenance to Resolve</DialogTitle>
          <DialogDescription>
            A maintenance event is required to resolve this damage report. Bleacher #
            {bleacherNumber} is pre-selected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-sm text-gray-500 bg-gray-50 rounded-md px-3 py-2">
            Bleacher: <span className="font-medium">#{bleacherNumber}</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Event name</label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Start date</label>
              <input
                type="date"
                value={eventStart}
                onChange={(e) => setEventStart(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">End date</label>
              <input
                type="date"
                value={eventEnd}
                onChange={(e) => setEventEnd(e.target.value)}
                min={eventStart || undefined}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Cost</label>
            <CentsInput
              value={costDisplay}
              onChange={(display, cents) => {
                setCostDisplay(display);
                setCostCents(cents);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded-md text-sm resize-none"
              placeholder="Repair notes..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Photos / files</label>
            <div className="flex flex-wrap gap-2">
              {pendingFiles.map((pf, i) => {
                const name = pf.file.name;
                const isImage = pf.file.type.startsWith("image/");
                return (
                  <div
                    key={`${name}-${i}`}
                    className="relative w-20 h-20 rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center p-1"
                  >
                    {isImage ? (
                      <img
                        src={URL.createObjectURL(pf.file)}
                        alt=""
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <>
                        <FileText className="h-6 w-6 text-gray-400" />
                        <span className="text-[8px] text-gray-500 text-center line-clamp-2">
                          {name}
                        </span>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 rounded-full text-white cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              <label className="flex flex-col items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 hover:border-darkBlue cursor-pointer">
                <Plus className="h-4 w-4 text-gray-400" />
                <span className="text-[9px] text-gray-400 mt-0.5">Add file</span>
                <input
                  type="file"
                  className="hidden"
                  accept={ACCEPTED_TYPES.join(",")}
                  onChange={handleFilePick}
                />
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !eventStart || !eventEnd}
            className="px-4 py-2 bg-darkBlue text-white rounded-md hover:bg-lightBlue text-sm font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit maintenance
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
