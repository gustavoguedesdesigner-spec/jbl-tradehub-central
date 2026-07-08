
-- Enum de status
DO $$ BEGIN
  CREATE TYPE public.material_status AS ENUM ('rascunho','em_desenvolvimento','ativo','descontinuado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ampliação de materiais_pdv
ALTER TABLE public.materiais_pdv
  ADD COLUMN IF NOT EXISTS categoria_id uuid REFERENCES public.categorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status public.material_status NOT NULL DEFAULT 'rascunho',
  ADD COLUMN IF NOT EXISTS briefing text,
  ADD COLUMN IF NOT EXISTS observacoes text,
  ADD COLUMN IF NOT EXISTS imagem_principal_url text;

-- Galeria + fotos reais
CREATE TABLE IF NOT EXISTS public.materiais_imagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.materiais_pdv(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  url_publica text,
  legenda text,
  tipo text NOT NULL DEFAULT 'galeria', -- galeria | foto_real
  ordem int NOT NULL DEFAULT 0,
  principal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS materiais_imagens_material_idx ON public.materiais_imagens(material_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.materiais_imagens TO authenticated;
GRANT ALL ON public.materiais_imagens TO service_role;
ALTER TABLE public.materiais_imagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage materiais_imagens" ON public.materiais_imagens FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_materiais_imagens_updated BEFORE UPDATE ON public.materiais_imagens FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Documentos / downloads
CREATE TABLE IF NOT EXISTS public.materiais_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.materiais_pdv(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  storage_path text NOT NULL,
  mime_type text,
  tamanho_bytes bigint,
  categoria text, -- arte, dieline, manual, ficha_tecnica, outro
  versao text,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS materiais_documentos_material_idx ON public.materiais_documentos(material_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.materiais_documentos TO authenticated;
GRANT ALL ON public.materiais_documentos TO service_role;
ALTER TABLE public.materiais_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage materiais_documentos" ON public.materiais_documentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_materiais_documentos_updated BEFORE UPDATE ON public.materiais_documentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
