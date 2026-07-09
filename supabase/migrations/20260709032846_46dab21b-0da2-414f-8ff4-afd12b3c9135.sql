
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
  CREATE TYPE public.asset_tipo AS ENUM (
    'imagem','video','pdf','brand_book','guideline','powerpoint','excel','word',
    'ai','psd','indd','eps','stl','obj','zip','foto_loja','foto_pdv','mockup','render','outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.asset_status AS ENUM ('rascunho','ativo','arquivado','obsoleto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.asset_entidade AS ENUM (
    'produto','material','lancamento','campanha','guideline','categoria','familia','fornecedor'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.asset_pastas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  parent_id UUID REFERENCES public.asset_pastas(id) ON DELETE CASCADE,
  cor TEXT,
  icone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_pastas TO authenticated;
GRANT ALL ON public.asset_pastas TO service_role;
ALTER TABLE public.asset_pastas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asset_pastas auth read"   ON public.asset_pastas FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "asset_pastas auth insert" ON public.asset_pastas FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "asset_pastas auth update" ON public.asset_pastas FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "asset_pastas auth delete" ON public.asset_pastas FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo public.asset_tipo NOT NULL DEFAULT 'outro',
  categoria TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  autor TEXT,
  versao TEXT DEFAULT '1.0',
  formato TEXT,
  peso_bytes BIGINT,
  largura INTEGER,
  altura INTEGER,
  duracao_segundos NUMERIC,
  status public.asset_status NOT NULL DEFAULT 'ativo',
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  preview_path TEXT,
  downloads INTEGER NOT NULL DEFAULT 0,
  pasta_id UUID REFERENCES public.asset_pastas(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assets_tipo      ON public.assets(tipo);
CREATE INDEX IF NOT EXISTS idx_assets_status    ON public.assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_pasta     ON public.assets(pasta_id);
CREATE INDEX IF NOT EXISTS idx_assets_tags_gin  ON public.assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_assets_nome_trgm ON public.assets USING GIN (nome gin_trgm_ops);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets auth read"   ON public.assets FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "assets auth insert" ON public.assets FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "assets auth update" ON public.assets FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "assets auth delete" ON public.assets FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.asset_vinculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  entidade_tipo public.asset_entidade NOT NULL,
  entidade_id UUID NOT NULL,
  papel TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (asset_id, entidade_tipo, entidade_id)
);
CREATE INDEX IF NOT EXISTS idx_asset_vinculos_entidade ON public.asset_vinculos(entidade_tipo, entidade_id);
CREATE INDEX IF NOT EXISTS idx_asset_vinculos_asset    ON public.asset_vinculos(asset_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_vinculos TO authenticated;
GRANT ALL ON public.asset_vinculos TO service_role;
ALTER TABLE public.asset_vinculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asset_vinculos auth read"   ON public.asset_vinculos FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "asset_vinculos auth insert" ON public.asset_vinculos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "asset_vinculos auth update" ON public.asset_vinculos FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "asset_vinculos auth delete" ON public.asset_vinculos FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.asset_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  corpo TEXT NOT NULL,
  autor UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asset_comentarios_asset ON public.asset_comentarios(asset_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_comentarios TO authenticated;
GRANT ALL ON public.asset_comentarios TO service_role;
ALTER TABLE public.asset_comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asset_comentarios auth read"   ON public.asset_comentarios FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "asset_comentarios auth insert" ON public.asset_comentarios FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "asset_comentarios auth update" ON public.asset_comentarios FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "asset_comentarios auth delete" ON public.asset_comentarios FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_assets_updated
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_asset_pastas_updated
  BEFORE UPDATE ON public.asset_pastas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
