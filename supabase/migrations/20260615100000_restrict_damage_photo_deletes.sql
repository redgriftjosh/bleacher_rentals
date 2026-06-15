-- Drop the bucket-specific delete and update policies (these are redundant
-- with the global "Allow All for Auth" policy, but clean them up anyway).
DROP POLICY IF EXISTS "damage-report-photos: delete" ON storage.objects;
DROP POLICY IF EXISTS "damage-report-photos: update" ON storage.objects;

-- The global "Allow All for Auth" policy on storage.objects grants all
-- operations (including DELETE) to every authenticated user on every bucket.
-- We can't remove it without breaking other buckets, so instead we add a
-- RESTRICTIVE policy. Restrictive policies are AND-ed with permissive ones:
-- even though the global permissive policy says "yes", this restrictive
-- policy says "no" for deletes on damage-report-photos, so the delete is blocked.
CREATE POLICY "damage-report-photos: deny delete"
ON storage.objects
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (bucket_id != 'damage-report-photos');

CREATE POLICY "damage-report-photos: deny update"
ON storage.objects
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (bucket_id != 'damage-report-photos');
