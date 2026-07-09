
-- Helper: any assigned role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

REVOKE ALL ON FUNCTION public.has_any_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid) TO authenticated, service_role;

-- Lock down SECURITY DEFINER helpers: not callable by anonymous users
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.can_write() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.assign_default_role() FROM PUBLIC, anon, authenticated;

-- Tighten SELECT policies on business tables: require signed-in user with a role
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'arquivos','arquivos_vinculos','asset_pastas','asset_vinculos','assets',
    'briefings','campanhas','familias','fornecedores','historico',
    'import_batches','import_items','lancamentos','lancamentos_checklist',
    'lancamentos_materiais','lancamentos_produtos','materiais_documentos',
    'materiais_especiais','materiais_imagens','materiais_pdv',
    'produtos','produtos_documentos','produtos_imagens','produtos_videos'
  ];
  policy_name text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    policy_name := t || '_read';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()))',
      policy_name, t
    );
  END LOOP;
END $$;

-- Tighten comments: only users with an assigned role
DROP POLICY IF EXISTS comentarios_auth_select ON public.comentarios;
CREATE POLICY comentarios_auth_select ON public.comentarios
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "asset_comentarios auth read" ON public.asset_comentarios;
CREATE POLICY "asset_comentarios auth read" ON public.asset_comentarios
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));
