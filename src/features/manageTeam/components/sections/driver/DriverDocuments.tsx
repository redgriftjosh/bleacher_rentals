"use client";
import { useCurrentUserStore } from "../../../state/useCurrentUserStore";
import { Upload, FileCheck, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { uploadDriverDocument, deleteDriverDocument } from "../../../db/documentOperations";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { createSuccessToast } from "@/components/toasts/SuccessToast";

interface DocumentUploadProps {
  label: string;
  value: string | null;
  onChange: (path: string | null) => void;
  accept?: string;
  driverId?: number;
}

function DocumentUpload({
  label,
  value,
  onChange,
  accept = "image/*,application/pdf",
  driverId,
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const supabase = useClerkSupabaseClient();

  // Load the image URL when value changes
  useEffect(() => {
    if (value) {
      const { data } = supabase.storage.from("driver-documents").getPublicUrl(value);
      setImageUrl(data.publicUrl);
    } else {
      setImageUrl(null);
    }
  }, [value, supabase]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!driverId) {
      createErrorToast(["Cannot upload document", "Driver ID not found"]);
      return;
    }

    setUploading(true);
    try {
      const result = await uploadDriverDocument(supabase, file, driverId);

      if (!result.success || !result.path) {
        throw new Error(result.error || "Upload failed");
      }

      onChange(result.path);
      createSuccessToast(["Document uploaded successfully"]);
    } catch (error) {
      console.error("Upload error:", error);
      createErrorToast([
        "Failed to upload document",
        error instanceof Error ? error.message : String(error),
      ]);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!value) return;

    try {
      const result = await deleteDriverDocument(supabase, value);

      if (!result.success) {
        throw new Error(result.error || "Delete failed");
      }

      onChange(null);
      createSuccessToast(["Document removed"]);
    } catch (error) {
      console.error("Delete error:", error);
      createErrorToast([
        "Failed to remove document",
        error instanceof Error ? error.message : String(error),
      ]);
    }
  };

  const handleDownload = async () => {
    if (!value) return;

    try {
      const { data, error } = await supabase.storage.from("driver-documents").download(value);

      if (error) throw error;

      // Create a download link
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = value.split("/").pop() || "document";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      createErrorToast([
        "Failed to download document",
        error instanceof Error ? error.message : String(error),
      ]);
    }
  };

  const isPdf = value?.toLowerCase().endsWith(".pdf");

  return (
    <div className="grid grid-cols-5 items-start gap-4">
      <label className="col-span-2 text-right text-sm font-medium pt-2">{label}</label>
      <div className="col-span-3 flex flex-col gap-2">
        {value ? (
          <>
            <div
              className="relative w-full border rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity group"
              onClick={handleDownload}
            >
              {isPdf ? (
                <div className="w-full aspect-[3/4] bg-gray-100 flex flex-col items-center justify-center">
                  <FileCheck className="h-12 w-12 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">PDF Document</span>
                  <span className="text-xs text-gray-500 mt-1">Click to download</span>
                </div>
              ) : (
                imageUrl && (
                  <img src={imageUrl} alt={label} className="w-full h-auto object-contain" />
                )
              )}
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
            </div>
            <button
              onClick={handleRemove}
              className="self-start flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
              type="button"
            >
              <X className="h-4 w-4" />
              Remove
            </button>
          </>
        ) : (
          <label className="w-full flex items-center justify-center gap-2 px-3 py-2 border rounded cursor-pointer hover:bg-gray-50 transition-colors">
            <Upload className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {uploading ? "Uploading..." : "Upload File"}
            </span>
            <input
              type="file"
              accept={accept}
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
          </label>
        )}
      </div>
    </div>
  );
}

export function DriverDocuments() {
  const licensePhotoPath = useCurrentUserStore((s) => s.licensePhotoPath);
  const insurancePhotoPath = useCurrentUserStore((s) => s.insurancePhotoPath);
  const medicalCardPhotoPath = useCurrentUserStore((s) => s.medicalCardPhotoPath);
  const existingDriverId = useCurrentUserStore((s) => s.existingDriverId);
  const setField = useCurrentUserStore((s) => s.setField);

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-700">Documents</h4>

      <DocumentUpload
        label="Driver's License"
        value={licensePhotoPath}
        onChange={(path) => setField("licensePhotoPath", path)}
        driverId={existingDriverId ?? undefined}
      />

      <DocumentUpload
        label="Insurance"
        value={insurancePhotoPath}
        onChange={(path) => setField("insurancePhotoPath", path)}
        driverId={existingDriverId ?? undefined}
      />

      <DocumentUpload
        label="Medical Card"
        value={medicalCardPhotoPath}
        onChange={(path) => setField("medicalCardPhotoPath", path)}
        driverId={existingDriverId ?? undefined}
      />

      <div className="text-xs text-gray-500 mt-2 pl-[40%]">
        Accepted formats: JPG, PNG, PDF (max 10MB)
      </div>
    </div>
  );
}
