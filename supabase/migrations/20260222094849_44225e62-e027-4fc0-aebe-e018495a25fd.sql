-- Create a public bucket for mission images
INSERT INTO storage.buckets (id, name, public)
VALUES ('mission-images', 'mission-images', true);

-- Allow anyone to view mission images (public bucket)
CREATE POLICY "Mission images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'mission-images');

-- Only admins can upload mission images
CREATE POLICY "Admins can upload mission images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mission-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Only admins can update mission images
CREATE POLICY "Admins can update mission images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'mission-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Only admins can delete mission images
CREATE POLICY "Admins can delete mission images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mission-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
