
CREATE POLICY "assets bucket auth read"   ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'assets'  AND auth.uid() IS NOT NULL);
CREATE POLICY "assets bucket auth insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assets' AND auth.uid() IS NOT NULL);
CREATE POLICY "assets bucket auth update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'assets'  AND auth.uid() IS NOT NULL);
CREATE POLICY "assets bucket auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'assets'  AND auth.uid() IS NOT NULL);
