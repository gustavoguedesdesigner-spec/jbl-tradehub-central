
CREATE POLICY "produtos_videos_all" ON storage.objects FOR ALL USING (bucket_id = 'produtos-videos') WITH CHECK (bucket_id = 'produtos-videos');
CREATE POLICY "produtos_documentos_all" ON storage.objects FOR ALL USING (bucket_id = 'produtos-documentos') WITH CHECK (bucket_id = 'produtos-documentos');
