
-- Helper: reset all public/anon policies on a table and add authenticated-only policies
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'arquivos','arquivos_vinculos','briefings','campanhas','comentarios',
    'familias','fornecedores','historico','lancamentos','lancamentos_checklist',
    'lancamentos_materiais','lancamentos_produtos','materiais_documentos',
    'materiais_especiais','materiais_imagens','materiais_pdv','produtos',
    'produtos_documentos','produtos_imagens','produtos_videos','profiles'
  ];
  pol record;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Drop all existing policies on the table
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    -- Ensure RLS is enabled
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Revoke any prior anon grants; keep authenticated + service_role
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);

    -- Authenticated read
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)',
      t || '_auth_select', t
    );
    -- Authenticated insert
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)',
      t || '_auth_insert', t
    );
    -- Authenticated update
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)',
      t || '_auth_update', t
    );
    -- Authenticated delete
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL)',
      t || '_auth_delete', t
    );
  END LOOP;
END $$;

-- Storage: lock down produtos buckets to authenticated users
DROP POLICY IF EXISTS "produtos_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "produtos_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "produtos_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "produtos_storage_delete" ON storage.objects;
DROP POLICY IF EXISTS "produtos_documentos_all" ON storage.objects;
DROP POLICY IF EXISTS "produtos_videos_all" ON storage.objects;

CREATE POLICY "produtos_buckets_auth_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('produtos','produtos-videos','produtos-documentos') AND auth.uid() IS NOT NULL);

CREATE POLICY "produtos_buckets_auth_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('produtos','produtos-videos','produtos-documentos') AND auth.uid() IS NOT NULL);

CREATE POLICY "produtos_buckets_auth_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('produtos','produtos-videos','produtos-documentos') AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id IN ('produtos','produtos-videos','produtos-documentos') AND auth.uid() IS NOT NULL);

CREATE POLICY "produtos_buckets_auth_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('produtos','produtos-videos','produtos-documentos') AND auth.uid() IS NOT NULL);

-- Storage: tighten materiais bucket policies (add auth.uid() check alongside bucket check)
DROP POLICY IF EXISTS "auth materiais read" ON storage.objects;
DROP POLICY IF EXISTS "auth materiais insert" ON storage.objects;
DROP POLICY IF EXISTS "auth materiais update" ON storage.objects;
DROP POLICY IF EXISTS "auth materiais delete" ON storage.objects;

CREATE POLICY "materiais_buckets_auth_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('materiais','materiais-documentos') AND auth.uid() IS NOT NULL);

CREATE POLICY "materiais_buckets_auth_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('materiais','materiais-documentos') AND auth.uid() IS NOT NULL);

CREATE POLICY "materiais_buckets_auth_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('materiais','materiais-documentos') AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id IN ('materiais','materiais-documentos') AND auth.uid() IS NOT NULL);

CREATE POLICY "materiais_buckets_auth_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('materiais','materiais-documentos') AND auth.uid() IS NOT NULL);
