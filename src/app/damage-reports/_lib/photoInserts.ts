export type DamageReportPhotoInsert = {
  damage_report_uuid: string;
  photo_path: string;
  upload_status: "uploaded";
};

/**
 * Builds DamageReportPhotos insert payloads for the admin modal.
 *
 * The admin uploads the file to the bucket synchronously (supabase.storage
 * .upload) before this row is ever inserted, so upload_status: "uploaded" is
 * simply recording the truth at insert time — not a workaround. Without it,
 * these rows land as the column default ("pending" — see
 * 20260605100000_damage_report_standalone.sql / the photo-upload-queue
 * migration), which the DamageReports.photos_uploaded trigger would then read
 * as "still uploading" forever, since nothing in the admin ever advances it.
 */
export function buildPhotoInserts(
  damageReportUuid: string,
  photoPaths: string[],
): DamageReportPhotoInsert[] {
  return photoPaths.map((photo_path) => ({
    damage_report_uuid: damageReportUuid,
    photo_path,
    upload_status: "uploaded" as const,
  }));
}
