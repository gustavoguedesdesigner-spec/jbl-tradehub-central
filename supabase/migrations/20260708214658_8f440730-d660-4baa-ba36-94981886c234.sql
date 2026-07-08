
CREATE POLICY "auth materiais read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id IN ('materiais','materiais-documentos'));
CREATE POLICY "auth materiais insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('materiais','materiais-documentos'));
CREATE POLICY "auth materiais update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('materiais','materiais-documentos'));
CREATE POLICY "auth materiais delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('materiais','materiais-documentos'));
