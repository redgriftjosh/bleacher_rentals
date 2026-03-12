"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Upload } from "lucide-react";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { createErrorToast } from "@/components/toasts/ErrorToast";
import { db } from "@/components/providers/SystemProvider";
import { typedExecute } from "@/lib/powersync/typedQuery";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { SelectQboVendorSimple } from "@/features/manageTeam/components/inputs/SelectQboVendorSimple";
import { EinInput } from "@/features/manageTeam/components/inputs/EinInput";
import { HstInput } from "@/features/manageTeam/components/inputs/HstInput";
import { fetchQboConnections, QboConnection } from "@/features/quickbooks-integration/api";
import { useQuery } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type EditVendorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (vendorId: string) => void;
  vendorId?: string | null;
  existingVendor?: {
    id: string;
    displayName: string;
    logoUrl: string | null;
    qboVendorId: string | null;
    qboConnectionUuid: string | null;
    ein: string | null;
    hst: string | null;
  } | null;
};

export function EditVendorModal({
  isOpen,
  onClose,
  onSave,
  vendorId,
  existingVendor,
}: EditVendorModalProps) {
  const supabase = useClerkSupabaseClient();
  const [displayName, setDisplayName] = useState("");
  const [qboVendorId, setQboVendorId] = useState<string | null>(null);
  const [qboConnectionUuid, setQboConnectionUuid] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [ein, setEin] = useState("");
  const [hst, setHst] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [logoInputMethod, setLogoInputMethod] = useState<"upload" | "url">("upload");

  const isEditMode = !!existingVendor;

  const { data: qboConnections = [] } = useQuery({
    queryKey: ["qbo-connections"],
    queryFn: fetchQboConnections,
  });

  // Initialize form with existing vendor data
  useEffect(() => {
    if (existingVendor) {
      setDisplayName(existingVendor.displayName);
      setQboVendorId(existingVendor.qboVendorId);
      setQboConnectionUuid(existingVendor.qboConnectionUuid);
      setLogoUrl(existingVendor.logoUrl);
      setLogoPreview(existingVendor.logoUrl);
      setEin(existingVendor.ein || "");
      setHst(existingVendor.hst || "");
    } else {
      setDisplayName("");
      setQboVendorId(null);
      setQboConnectionUuid(null);
      setLogoUrl(null);
      setLogoPreview(null);
      setLogoFile(null);
      setEin("");
      setHst("");
    }
  }, [existingVendor, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      createErrorToast(["Invalid file type", "Please upload a JPG, PNG, or WebP image"]);
      return;
    }

    // Validate file size (5MB)
    const maxSizeMB = 5;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      createErrorToast(["File too large", `File size must be less than ${maxSizeMB}MB`]);
      return;
    }

    setLogoFile(file);
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoUrl(null);
    setLogoPreview(null);
  };

  const handleSave = async (assignToDriver: boolean = false) => {
    if (!displayName.trim()) {
      createErrorToast(["Display name required", "Please enter a display name"]);
      return;
    }

    const einDigits = ein.replace(/\D/g, "");
    if (einDigits && !/^\d{9}$/.test(einDigits)) {
      createErrorToast(["Invalid EIN", "EIN must be exactly 9 digits (e.g. 12-3456789)"]);
      return;
    }

    if (hst && !/^\d{9}[A-Z]{2}\d{4}$/.test(hst)) {
      createErrorToast([
        "Invalid HST number",
        "HST must be 9 digits, 2 letters, then 4 digits (e.g. 123456789RT0001)",
      ]);
      return;
    }

    setIsSaving(true);

    try {
      let finalLogoUrl = logoUrl;

      // Upload file if we have one
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `vendor-logos/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("vendor-logos")
          .upload(filePath, logoFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("vendor-logos").getPublicUrl(filePath);

        finalLogoUrl = publicUrl;
      }

      if (isEditMode && existingVendor) {
        // Update existing vendor
        const updateQuery = db
          .updateTable("Vendors")
          .set({
            display_name: displayName,
            qbo_vendor_id: qboVendorId,
            qbo_connection_uuid: qboConnectionUuid,
            logo_url: finalLogoUrl,
            ein: ein.replace(/\D/g, "") || null,
            hst: hst || null,
          })
          .where("id", "=", existingVendor.id)
          .compile();

        await typedExecute(updateQuery);
        createSuccessToast([`Vendor "${displayName}" updated successfully`]);

        if (assignToDriver && onSave) {
          onSave(existingVendor.id);
        }
      } else {
        // Create new vendor - generate UUID and include all required fields
        const newId = crypto.randomUUID();
        const insertQuery = db
          .insertInto("Vendors")
          .values({
            id: newId,
            display_name: displayName,
            qbo_vendor_id: qboVendorId,
            qbo_connection_uuid: qboConnectionUuid,
            logo_url: finalLogoUrl,
            is_active: 1,
            created_at: new Date().toISOString(),
            ein: ein.replace(/\D/g, "") || null,
            hst: hst || null,
          })
          .compile();

        await typedExecute(insertQuery);
        createSuccessToast([`Vendor "${displayName}" created successfully`]);

        // Use the generated ID for assignment
        if (assignToDriver && onSave) {
          onSave(newId);
        }
      }

      onClose();
    } catch (error) {
      console.error("Error saving vendor:", error);
      createErrorToast(["Failed to save vendor", String(error)]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingVendor) return;

    try {
      const deleteQuery = db
        .updateTable("Vendors")
        .set({ is_active: 0 })
        .where("id", "=", existingVendor.id)
        .compile();

      await typedExecute(deleteQuery);
      createSuccessToast([`Vendor "${existingVendor.displayName}" deleted`]);
      onClose();
    } catch (error) {
      console.error("Error deleting vendor:", error);
      createErrorToast(["Failed to delete vendor", String(error)]);
    }
  };

  const firstLetter = displayName.charAt(0).toUpperCase() || "?";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Vendor" : "Create New Vendor"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Display Name */}
            <div className="space-y-2">
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                Display Name *
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDisplayName(e.target.value)
                }
                placeholder="Enter company name"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-greenAccent"
              />
            </div>

            {/* QuickBooks Connection + Vendor Mapping */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                QuickBooks Connection{" "}
                <span className="text-amber-600 font-semibold text-xs">
                  ⚠ Strongly recommended — required for bill creation
                </span>
              </label>
              <select
                value={qboConnectionUuid || ""}
                onChange={(e) => {
                  setQboConnectionUuid(e.target.value || null);
                  setQboVendorId(null); // reset vendor when connection changes
                }}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-greenAccent"
              >
                <option value="">Select a connection...</option>
                {qboConnections.map((conn) => (
                  <option key={conn.id} value={conn.id}>
                    {conn.display_name}
                  </option>
                ))}
              </select>
              {!qboConnectionUuid && (
                <p className="text-xs text-amber-600">
                  Without a QuickBooks connection, bills cannot be created for this vendor's
                  drivers.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">QuickBooks Vendor</label>
              <SelectQboVendorSimple
                value={qboVendorId}
                onChange={setQboVendorId}
                connectionId={qboConnectionUuid}
              />
              {qboConnectionUuid && !qboVendorId && (
                <p className="text-xs text-amber-600">
                  Without a QuickBooks vendor, bills cannot be created for this vendor's drivers.
                </p>
              )}
            </div>

            {/* Tax ID Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EinInput value={ein} onChange={setEin} />
              <HstInput value={hst} onChange={setHst} />
            </div>

            {/* Logo Section */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Logo (Optional)</label>

              {/* Logo Preview */}
              <div className="flex items-center gap-4 mb-3">
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0 bg-greenAccent/20">
                  {logoPreview ? (
                    // Use regular img tag to support any external URL without next.config.js restrictions
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-greenAccent font-bold text-2xl">
                      {firstLetter}
                    </div>
                  )}
                </div>
                {logoPreview && (
                  <Button type="button" variant="outline" size="sm" onClick={handleRemoveLogo}>
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                )}
              </div>

              {/* Logo Input Methods */}
              <Tabs
                value={logoInputMethod}
                onValueChange={(v) => setLogoInputMethod(v as "upload" | "url")}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                  <TabsTrigger value="url">Image URL</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-greenAccent/10 file:text-greenAccent hover:file:bg-greenAccent/20"
                    />
                    <Upload className="w-4 h-4 text-gray-500" />
                  </div>
                  <p className="text-xs text-gray-500">JPG, PNG, or WebP. Max 5MB.</p>
                </TabsContent>
                <TabsContent value="url" className="space-y-2">
                  <input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={logoUrl || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setLogoUrl(e.target.value);
                      setLogoPreview(e.target.value);
                      setLogoFile(null);
                    }}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-greenAccent"
                  />
                  <p className="text-xs text-gray-500">Paste a URL to an image hosted elsewhere.</p>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div>
              {isEditMode && (
                <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => handleSave(false)} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
              {onSave && (
                <Button
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  className="bg-greenAccent hover:bg-greenAccent/90"
                >
                  {isSaving ? "Saving..." : "Save & Assign"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{existingVendor?.displayName}"? This won't remove the
              vendor from QuickBooks, but will hide it from this list. Drivers assigned to this
              vendor will keep their assignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete Vendor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
