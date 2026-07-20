"use client";

import { useState, useMemo, useEffect } from "react";
import React from "react";
import { Trash2, Plus, Loader2, FileText, ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { ErrorToast } from "@/components/toasts/ErrorToast";
import { SuccessToast } from "@/components/toasts/SuccessToast";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const PHOTO_BUCKET = "damage-report-photos";
const ACCEPTED_PHOTO_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
];
const MAX_PHOTO_SIZE_MB = 10;

const isImagePath = (path: string) => {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "heic", "heif", "webp"].includes(ext);
};

type DamageSeverity = "none" | "minor" | "major";

type BleacherRow = {
  id: string;
  bleacher_number: number;
};

export type EditDamageReport = {
  id: string;
  bleacher_uuid: string;
  inspection_uuid: string | null;
  is_safe_to_sit: boolean;
  is_safe_to_haul: boolean;
  seat_damage: DamageSeverity;
  haul_damage: DamageSeverity;
  note: string | null;
  resolved_at: string | null;
  maintenance_event_uuid: string | null;
  bleacher: { bleacher_number: number } | null;
  created_by_user: { first_name: string; last_name: string } | null;
  photos: { id: string; photo_path: string }[];
};

const SEVERITY_OPTIONS: { value: DamageSeverity; label: string; color: string }[] = [
  { value: "none", label: "None", color: "bg-green-100 text-green-800 border-green-300" },
  { value: "minor", label: "Minor", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "major", label: "Major", color: "bg-red-100 text-red-800 border-red-300" },
];

function DamageSeverityField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DamageSeverity;
  onChange: (v: DamageSeverity) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        {SEVERITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border-2 transition cursor-pointer ${
              value === opt.value
                ? opt.color
                : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type DamageReportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  editReport?: EditDamageReport | null;
};

export function DamageReportModal({
  open,
  onOpenChange,
  onSaved,
  editReport,
}: DamageReportModalProps) {
  const supabase = useClerkSupabaseClient();
  const isEditing = !!editReport;

  const [selectedBleacherUuid, setSelectedBleacherUuid] = useState("");
  const [seatDamage, setSeatDamage] = useState<DamageSeverity>("none");
  const [haulDamage, setHaulDamage] = useState<DamageSeverity>("none");
  const [note, setNote] = useState("");
  const [isResolved, setIsResolved] = useState(false);
  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<{ id: string; photo_path: string }[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (open && editReport) {
      setSelectedBleacherUuid(editReport.bleacher_uuid);
      setSeatDamage(editReport.seat_damage ?? "none");
      setHaulDamage(editReport.haul_damage ?? "none");
      setNote(editReport.note ?? "");
      setIsResolved(!!editReport.resolved_at);
      setExistingPhotos(editReport.photos ?? []);
      setRemovedPhotoIds([]);
      setPhotoPaths([]);
    }
  }, [open, editReport]);

  // Fetch bleachers for selection
  const { data: bleachers = [], isLoading: loadingBleachers } = useQuery({
    queryKey: ["bleachers-for-damage-modal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Bleachers")
        .select("id, bleacher_number")
        .eq("deleted", false)
        .order("bleacher_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BleacherRow[];
    },
    enabled: !!supabase && open,
  });

  const resolvedBleacherUuid = isEditing ? editReport.bleacher_uuid : selectedBleacherUuid || null;

  const getPhotoUrl = (path: string) => {
    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      createErrorToast(["Invalid file type", `Please upload: ${ACCEPTED_PHOTO_TYPES.join(", ")}`]);
      return;
    }
    if (file.size / (1024 * 1024) > MAX_PHOTO_SIZE_MB) {
      createErrorToast(["File too large", `Maximum size is ${MAX_PHOTO_SIZE_MB}MB`]);
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const storagePath = `bleacher-${resolvedBleacherUuid || "unknown"}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(storagePath, file, { upsert: false });
      if (uploadError) throw uploadError;

      setPhotoPaths((prev) => [...prev, storagePath]);
    } catch (err: any) {
      createErrorToast(["Upload failed", err?.message ?? ""]);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveNewPhoto = (index: number) => {
    setPhotoPaths((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingPhoto = (photoId: string) => {
    setRemovedPhotoIds((prev) => [...prev, photoId]);
    setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const resetForm = () => {
    setSelectedBleacherUuid("");
    setComboboxOpen(false);
    setSeatDamage("none");
    setHaulDamage("none");
    setNote("");
    setIsResolved(false);
    setPhotoPaths([]);
    setExistingPhotos([]);
    setRemovedPhotoIds([]);
    setSaving(false);
  };

  const handleSubmit = async () => {
    if (isEditing) {
      await handleUpdate();
    } else {
      await handleCreate();
    }
  };

  const handleCreate = async () => {
    if (!resolvedBleacherUuid) {
      toast.custom(
        (t) =>
          React.createElement(ErrorToast, {
            id: t,
            lines: ["Please select a bleacher."],
          }),
        { duration: 5000 },
      );
      return;
    }

    setSaving(true);
    try {
      const { data: damageReport, error: drError } = await supabase
        .from("DamageReports")
        .insert({
          bleacher_uuid: resolvedBleacherUuid,
          seat_damage: seatDamage,
          haul_damage: haulDamage,
          is_safe_to_sit: seatDamage === "none",
          is_safe_to_haul: haulDamage === "none",
          note: note || null,
          // created_by_user_uuid intentionally omitted — the DB DEFAULT
          // public.get_current_user_uuid() autopopulates the creator. Sending
          // it explicitly (even null) would override that default.
        })
        .select("id")
        .single();

      if (drError || !damageReport) {
        throw new Error(drError?.message ?? "Failed to create damage report");
      }

      if (photoPaths.length > 0) {
        const photoInserts = photoPaths.map((photo_path) => ({
          damage_report_uuid: damageReport.id,
          photo_path,
        }));
        const { error: photoError } = await supabase
          .from("DamageReportPhotos")
          .insert(photoInserts);

        if (photoError) {
          console.warn("Photos linked partially:", photoError.message);
        }
      }

      toast.custom(
        (t) => React.createElement(SuccessToast, { id: t, lines: ["Damage report created."] }),
        { duration: 5000 },
      );
      resetForm();
      onSaved();
    } catch (err: any) {
      toast.custom(
        (t) =>
          React.createElement(ErrorToast, {
            id: t,
            lines: ["Failed to create damage report.", err?.message ?? ""],
          }),
        { duration: 10000 },
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editReport) return;

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("DamageReports")
        .update({
          seat_damage: seatDamage,
          haul_damage: haulDamage,
          is_safe_to_sit: seatDamage === "none",
          is_safe_to_haul: haulDamage === "none",
          note: note || null,
          resolved_at: isResolved ? (editReport.resolved_at ?? new Date().toISOString()) : null,
        })
        .eq("id", editReport.id);

      if (updateError) throw new Error(updateError.message);

      // Remove deleted photos
      if (removedPhotoIds.length > 0) {
        await supabase.from("DamageReportPhotos").delete().in("id", removedPhotoIds);
      }

      // Add new photos
      if (photoPaths.length > 0) {
        const photoInserts = photoPaths.map((photo_path) => ({
          damage_report_uuid: editReport.id,
          photo_path,
        }));
        await supabase.from("DamageReportPhotos").insert(photoInserts);
      }

      toast.custom(
        (t) => React.createElement(SuccessToast, { id: t, lines: ["Damage report updated."] }),
        { duration: 5000 },
      );
      resetForm();
      onSaved();
    } catch (err: any) {
      toast.custom(
        (t) =>
          React.createElement(ErrorToast, {
            id: t,
            lines: ["Failed to update damage report.", err?.message ?? ""],
          }),
        { duration: 10000 },
      );
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const displayBleacherNumber = isEditing
    ? editReport.bleacher?.bleacher_number
    : bleachers.find((b) => b.id === selectedBleacherUuid)?.bleacher_number;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto z-[1100]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Damage Report" : "Create Damage Report"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the damage report details below."
              : "Select a bleacher and describe the damage."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Bleacher selector — create mode only */}
          {!isEditing && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Bleacher <span className="text-red-500">*</span>
              </label>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="w-full flex items-center justify-between px-3 py-2 border rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-greenAccent cursor-pointer"
                  >
                    {selectedBleacherUuid
                      ? `#${bleachers.find((b) => b.id === selectedBleacherUuid)?.bleacher_number}`
                      : loadingBleachers
                        ? "Loading..."
                        : "Select bleacher..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by number..." />
                    <CommandList>
                      <CommandEmpty>No bleacher found.</CommandEmpty>
                      <CommandGroup>
                        {bleachers.map((b) => (
                          <CommandItem
                            key={b.id}
                            value={String(b.bleacher_number)}
                            onSelect={() => {
                              setSelectedBleacherUuid(b.id);
                              setComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${selectedBleacherUuid === b.id ? "opacity-100" : "opacity-0"}`}
                            />
                            #{b.bleacher_number}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Bleacher display — edit mode */}
          {isEditing && displayBleacherNumber != null && (
            <div className="text-sm text-gray-500 bg-gray-50 rounded-md px-3 py-2 flex items-center justify-between">
              <span>
                Bleacher: <span className="font-medium">#{displayBleacherNumber}</span>
              </span>
              {editReport.created_by_user && (
                <span>
                  Created by:{" "}
                  <span className="font-medium">
                    {editReport.created_by_user.first_name} {editReport.created_by_user.last_name}
                  </span>
                </span>
              )}
            </div>
          )}

          {/* Resolved toggle — edit mode only */}
          {isEditing && (
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Resolved</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsResolved(!isResolved)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${isResolved ? "bg-green-500" : "bg-gray-300"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isResolved ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
                <span className="text-sm text-gray-500 w-6">{isResolved ? "Yes" : "No"}</span>
              </div>
            </div>
          )}

          {/* Seating Configuration Damage */}
          <DamageSeverityField
            label="Seating Configuration Damage"
            value={seatDamage}
            onChange={setSeatDamage}
          />

          {/* Hauling Configuration Damage */}
          <DamageSeverityField
            label="Hauling Configuration Damage"
            value={haulDamage}
            onChange={setHaulDamage}
          />

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe the damage..."
              rows={3}
              className="w-full px-3 py-2 border rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0 resize-none"
            />
          </div>

          {/* Photos */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Photos</label>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {/* Existing photos (edit mode) */}
              {existingPhotos.map((photo) => {
                const url = getPhotoUrl(photo.photo_path);
                const isImage = isImagePath(photo.photo_path);
                const fileName = photo.photo_path.split("/").pop() ?? "file";
                return (
                  <div
                    key={photo.id}
                    className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 cursor-pointer flex-shrink-0"
                    onClick={() => (isImage ? setLightboxUrl(url) : window.open(url, "_blank"))}
                  >
                    {isImage ? (
                      <img src={url} alt="Damage photo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-full p-1">
                        <FileText className="h-6 w-6 text-gray-400" />
                        <span className="text-[8px] text-gray-500 mt-0.5 text-center leading-tight line-clamp-2 break-all">
                          {fileName}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveExistingPhoto(photo.id);
                      }}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              {/* New photos */}
              {photoPaths.map((path, i) => {
                const url = getPhotoUrl(path);
                const isImage = isImagePath(path);
                const fileName = path.split("/").pop() ?? "file";
                return (
                  <div
                    key={`new-${i}`}
                    className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 cursor-pointer flex-shrink-0"
                    onClick={() => (isImage ? setLightboxUrl(url) : window.open(url, "_blank"))}
                  >
                    {isImage ? (
                      <img src={url} alt="Damage photo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-full p-1">
                        <FileText className="h-6 w-6 text-gray-400" />
                        <span className="text-[8px] text-gray-500 mt-0.5 text-center leading-tight line-clamp-2 break-all">
                          {fileName}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveNewPhoto(i);
                      }}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              {/* Upload button */}
              <label
                className={`flex flex-col items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 hover:border-darkBlue hover:bg-gray-50 transition cursor-pointer flex-shrink-0 ${
                  uploading ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 text-gray-400" />
                    <span className="text-[9px] text-gray-400 mt-0.5">Add Photo</span>
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept={ACCEPTED_PHOTO_TYPES.join(",")}
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition cursor-pointer text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || (!isEditing && !resolvedBleacherUuid)}
            className="px-4 py-2 bg-darkBlue text-white rounded-md hover:bg-lightBlue transition cursor-pointer disabled:opacity-50 text-sm font-semibold"
          >
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Report"}
          </button>
        </DialogFooter>
      </DialogContent>

      {/* Lightbox */}
      <Dialog
        open={!!lightboxUrl}
        onOpenChange={(open) => {
          if (!open) setLightboxUrl(null);
        }}
      >
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 flex items-center justify-center bg-black/90 border-none z-[1200]">
          <VisuallyHidden>
            <DialogTitle>Photo preview</DialogTitle>
          </VisuallyHidden>
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="Damage photo"
              className="max-w-full max-h-[85vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
