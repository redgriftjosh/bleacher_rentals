import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/../database.types";

type TypedSupabaseClient = SupabaseClient<Database>;

/**
 * Upload a document file to Supabase storage
 */
export async function uploadDriverDocument(
  supabase: TypedSupabaseClient,
  file: File,
  driverId: number
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    // Create a unique file path: driver-documents/{driverId}/{timestamp}_{filename}
    const timestamp = Date.now();
    const filePath = `${driverId}/${timestamp}_${file.name}`;

    console.log("Uploading file to:", filePath);

    const { data, error } = await supabase.storage.from("driver-documents").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      console.error("Upload error:", error);
      throw error;
    }

    console.log("Upload successful:", data);
    return { success: true, path: data.path };
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a document file from Supabase storage
 */
export async function deleteDriverDocument(
  supabase: TypedSupabaseClient,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage.from("driver-documents").remove([filePath]);

    if (error) {
      console.error("Delete error:", error);
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error("Delete error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
