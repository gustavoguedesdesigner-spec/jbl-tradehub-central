
-- =========================================================
-- 1) ROLES INFRASTRUCTURE
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles self read" ON public.user_roles;
CREATE POLICY "user_roles self read" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.can_write()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','editor')
  );
$$;

DROP POLICY IF EXISTS "user_roles admin manage" ON public.user_roles;
CREATE POLICY "user_roles admin manage" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seed roles: existing users become admin; new users become editor
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'editor')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();

-- =========================================================
-- 2) PROFILES: own-row + admin
-- =========================================================
DROP POLICY IF EXISTS profiles_auth_select ON public.profiles;
DROP POLICY IF EXISTS profiles_auth_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_auth_update ON public.profiles;
DROP POLICY IF EXISTS profiles_auth_delete ON public.profiles;

CREATE POLICY profiles_select_own_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY profiles_insert_self_or_admin ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY profiles_update_own_or_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY profiles_delete_admin ON public.profiles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- 3) COMMENTS: only author (or admin) may edit/delete
-- =========================================================
DROP POLICY IF EXISTS comentarios_auth_update ON public.comentarios;
DROP POLICY IF EXISTS comentarios_auth_delete ON public.comentarios;
CREATE POLICY comentarios_update_author ON public.comentarios
  FOR UPDATE TO authenticated
  USING (autor_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (autor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY comentarios_delete_author ON public.comentarios
  FOR DELETE TO authenticated
  USING (autor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- asset_comentarios uses 'autor' (uuid)
DROP POLICY IF EXISTS "asset_comentarios auth update" ON public.asset_comentarios;
DROP POLICY IF EXISTS "asset_comentarios auth delete" ON public.asset_comentarios;
CREATE POLICY asset_comentarios_update_author ON public.asset_comentarios
  FOR UPDATE TO authenticated
  USING (autor = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (autor = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY asset_comentarios_delete_author ON public.asset_comentarios
  FOR DELETE TO authenticated
  USING (autor = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- =========================================================
-- 4) Public-open tables → authenticated-only, write=editor/admin
-- =========================================================
DROP POLICY IF EXISTS acesso_publico_categorias ON public.categorias;
DROP POLICY IF EXISTS acesso_publico_linhas ON public.linhas;
DROP POLICY IF EXISTS compatibilidades_open ON public.compatibilidades;

CREATE POLICY categorias_read ON public.categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY categorias_write ON public.categorias FOR ALL TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY linhas_read ON public.linhas FOR SELECT TO authenticated USING (true);
CREATE POLICY linhas_write ON public.linhas FOR ALL TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

CREATE POLICY compatibilidades_read ON public.compatibilidades FOR SELECT TO authenticated USING (true);
CREATE POLICY compatibilidades_write ON public.compatibilidades FOR ALL TO authenticated
  USING (public.can_write()) WITH CHECK (public.can_write());

-- =========================================================
-- 5) Business tables: read=authenticated, write=editor/admin
-- =========================================================
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'arquivos','arquivos_vinculos','asset_pastas','asset_vinculos','assets',
    'briefings','campanhas','familias','fornecedores','historico',
    'import_batches','import_items',
    'lancamentos','lancamentos_checklist','lancamentos_materiais','lancamentos_produtos',
    'materiais_documentos','materiais_especiais','materiais_imagens','materiais_pdv',
    'produtos','produtos_documentos','produtos_imagens','produtos_videos'
  ];
  pol record;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Drop all existing policies on the table
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename=t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t||'_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_write())', t||'_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.can_write()) WITH CHECK (public.can_write())', t||'_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.can_write())', t||'_delete', t);
  END LOOP;
END $$;

-- Re-apply author-specific comment policies (comentarios not in list above; keep as-is)
-- asset_comentarios: also needs read/insert
-- (asset_comentarios still has its old read/insert policies — untouched)

-- =========================================================
-- 6) STORAGE: writes require editor/admin
-- =========================================================
DROP POLICY IF EXISTS produtos_buckets_auth_select ON storage.objects;
DROP POLICY IF EXISTS produtos_buckets_auth_insert ON storage.objects;
DROP POLICY IF EXISTS produtos_buckets_auth_update ON storage.objects;
DROP POLICY IF EXISTS produtos_buckets_auth_delete ON storage.objects;
DROP POLICY IF EXISTS materiais_buckets_auth_select ON storage.objects;
DROP POLICY IF EXISTS materiais_buckets_auth_insert ON storage.objects;
DROP POLICY IF EXISTS materiais_buckets_auth_update ON storage.objects;
DROP POLICY IF EXISTS materiais_buckets_auth_delete ON storage.objects;
DROP POLICY IF EXISTS "assets bucket auth read" ON storage.objects;
DROP POLICY IF EXISTS "assets bucket auth insert" ON storage.objects;
DROP POLICY IF EXISTS "assets bucket auth update" ON storage.objects;
DROP POLICY IF EXISTS "assets bucket auth delete" ON storage.objects;

CREATE POLICY app_buckets_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('produtos','produtos-videos','produtos-documentos','materiais','materiais-documentos','assets'));

CREATE POLICY app_buckets_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('produtos','produtos-videos','produtos-documentos','materiais','materiais-documentos','assets')
    AND public.can_write()
  );

CREATE POLICY app_buckets_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('produtos','produtos-videos','produtos-documentos','materiais','materiais-documentos','assets')
    AND public.can_write()
  )
  WITH CHECK (
    bucket_id IN ('produtos','produtos-videos','produtos-documentos','materiais','materiais-documentos','assets')
    AND public.can_write()
  );

CREATE POLICY app_buckets_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('produtos','produtos-videos','produtos-documentos','materiais','materiais-documentos','assets')
    AND public.can_write()
  );
