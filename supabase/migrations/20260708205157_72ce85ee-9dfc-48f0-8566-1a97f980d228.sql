
CREATE POLICY "produtos_storage_select" ON storage.objects FOR SELECT USING (bucket_id = 'produtos');
CREATE POLICY "produtos_storage_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'produtos');
CREATE POLICY "produtos_storage_update" ON storage.objects FOR UPDATE USING (bucket_id = 'produtos') WITH CHECK (bucket_id = 'produtos');
CREATE POLICY "produtos_storage_delete" ON storage.objects FOR DELETE USING (bucket_id = 'produtos');
