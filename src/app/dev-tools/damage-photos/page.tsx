"use client";

import { useState } from "react";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Trash2, Upload, Loader2, ImageIcon } from "lucide-react";

const BUCKET = "damage-report-photos";

export default function DamagePhotosDevPage() {
  const supabase = useClerkSupabaseClient();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ path: string; status: "success" | "error"; message: string } | null>(null);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["dev-damage-photos"],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).list("", {
        limit: 500,
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error) throw error;
      // The top level may contain folders (bleacher-xxx), list recursively
      const allFiles: { name: string; fullPath: string; createdAt: string }[] = [];

      for (const item of data ?? []) {
        if (item.id) {
          // It's a file at root level
          allFiles.push({
            name: item.name,
            fullPath: item.name,
            createdAt: item.created_at,
          });
        } else {
          // It's a folder, list its contents
          const { data: folderFiles } = await supabase.storage.from(BUCKET).list(item.name, {
            limit: 500,
            sortBy: { column: "created_at", order: "desc" },
          });
          for (const f of folderFiles ?? []) {
            if (f.id) {
              allFiles.push({
                name: f.name,
                fullPath: `${item.name}/${f.name}`,
                createdAt: f.created_at,
              });
            }
          }
        }
      }

      return allFiles;
    },
    enabled: !!supabase,
  });

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const path = `dev-test/${crypto.randomUUID()}.${file.name.split(".").pop() ?? "jpg"}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["dev-damage-photos"] });
    } catch (err: any) {
      alert(`Upload failed: ${err?.message}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (path: string) => {
    setDeleteResult(null);
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      setDeleteResult({ path, status: "error", message: error.message });
    } else {
      setDeleteResult({ path, status: "success", message: "Delete succeeded (policy may not be blocking)" });
      queryClient.invalidateQueries({ queryKey: ["dev-damage-photos"] });
    }
  };

  return (
    <div>
      <PageHeader
        title="Damage Report Photos (Dev)"
        subtitle={`${files.length} photos in the ${BUCKET} bucket`}
        action={
          <label
            className={`flex items-center gap-2 px-4 py-2 bg-darkBlue text-white text-sm font-semibold rounded-md shadow-md hover:bg-lightBlue transition cursor-pointer ${
              uploading ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload Test Photo
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
          </label>
        }
      />

      {deleteResult && (
        <div
          className={`mb-4 rounded-md border px-4 py-3 text-sm ${
            deleteResult.status === "error"
              ? "bg-green-50 border-green-300 text-green-800"
              : "bg-red-50 border-red-300 text-red-800"
          }`}
        >
          <span className="font-semibold">
            {deleteResult.status === "error" ? "Delete blocked!" : "Delete went through!"}
          </span>{" "}
          <code className="text-xs">{deleteResult.path}</code> — {deleteResult.message}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-darkBlue" />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No photos in the bucket.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map((file) => (
            <div key={file.fullPath} className="group relative border rounded-lg overflow-hidden bg-white shadow-sm">
              <a href={getPublicUrl(file.fullPath)} target="_blank" rel="noopener noreferrer">
                <img
                  src={getPublicUrl(file.fullPath)}
                  alt={file.name}
                  className="w-full h-32 object-cover hover:opacity-80 transition"
                />
              </a>
              <div className="p-2">
                <p className="text-xs text-gray-500 truncate" title={file.fullPath}>
                  {file.fullPath}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(file.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(file.fullPath)}
                className="absolute top-1 right-1 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-red-700"
                title="Attempt delete (should fail after migration)"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
