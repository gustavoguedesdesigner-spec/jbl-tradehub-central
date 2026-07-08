
-- Novo valor de status
ALTER TYPE public.produto_status ADD VALUE IF NOT EXISTS 'em_desenvolvimento';

-- Enums novos
DO $$ BEGIN
  CREATE TYPE public.produto_posicionamento AS ENUM ('entrada','intermediario','premium','hero');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.campanha_tamanho AS ENUM ('P','M','G');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Colunas novas em produtos
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS codigo_jbl text,
  ADD COLUMN IF NOT EXISTS familia_id uuid REFERENCES public.familias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS posicionamento public.produto_posicionamento,
  ADD COLUMN IF NOT EXISTS campanha_tamanho public.campanha_tamanho,
  ADD COLUMN IF NOT EXISTS data_lancamento date,
  ADD COLUMN IF NOT EXISTS hero_product boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS descricao_curta text,
  ADD COLUMN IF NOT EXISTS features text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS diferenciais text,
  ADD COLUMN IF NOT EXISTS observacoes text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_produtos_codigo_jbl
  ON public.produtos(codigo_jbl) WHERE codigo_jbl IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_produtos_familia ON public.produtos(familia_id);
CREATE INDEX IF NOT EXISTS idx_produtos_hero    ON public.produtos(hero_product);

-- Imagens: legenda e tipo
ALTER TABLE public.produtos_imagens
  ADD COLUMN IF NOT EXISTS legenda text,
  ADD COLUMN IF NOT EXISTS tipo text;

-- ============ PRODUTOS_VIDEOS ============
CREATE TABLE IF NOT EXISTS public.produtos_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  origem text NOT NULL CHECK (origem IN ('upload','youtube','vimeo')),
  titulo text,
  url text,
  storage_path text,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_produtos_videos_produto ON public.produtos_videos(produto_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos_videos TO anon, authenticated;
GRANT ALL ON public.produtos_videos TO service_role;
ALTER TABLE public.produtos_videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS produtos_videos_open ON public.produtos_videos;
CREATE POLICY produtos_videos_open ON public.produtos_videos FOR ALL USING (true) WITH CHECK (true);

-- ============ PRODUTOS_DOCUMENTOS ============
CREATE TABLE IF NOT EXISTS public.produtos_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  categoria text,
  descricao text,
  versao text,
  autor text,
  storage_path text NOT NULL,
  mime_type text,
  tamanho_bytes bigint,
  guideline boolean NOT NULL DEFAULT false,
  data_documento date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_produtos_documentos_produto ON public.produtos_documentos(produto_id);
CREATE INDEX IF NOT EXISTS idx_produtos_documentos_guideline ON public.produtos_documentos(guideline);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos_documentos TO anon, authenticated;
GRANT ALL ON public.produtos_documentos TO service_role;
ALTER TABLE public.produtos_documentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS produtos_documentos_open ON public.produtos_documentos;
CREATE POLICY produtos_documentos_open ON public.produtos_documentos FOR ALL USING (true) WITH CHECK (true);
