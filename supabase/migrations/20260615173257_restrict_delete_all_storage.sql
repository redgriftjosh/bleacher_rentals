-- Deny DELETE on every storage bucket for authenticated users.
-- These RESTRICTIVE policies block deletion regardless of any permissive policies.

CREATE POLICY "bleacher-nvis: deny delete"
  ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
  USING (bucket_id != 'bleacher-nvis');
  
CREATE POLICY "driver-documents: deny delete"
  ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
  USING (bucket_id != 'driver-documents');
