
-- 1) Adicionar bucket + asset_id nas tabelas de arquivos legadas
ALTER TABLE public.produtos_imagens
  ADD COLUMN IF NOT EXISTS bucket text,
  ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL;

ALTER TABLE public.produtos_videos
  ADD COLUMN IF NOT EXISTS bucket text,
  ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL;

ALTER TABLE public.produtos_documentos
  ADD COLUMN IF NOT EXISTS bucket text,
  ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL;

ALTER TABLE public.materiais_imagens
  ADD COLUMN IF NOT EXISTS bucket text,
  ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL;

ALTER TABLE public.materiais_documentos
  ADD COLUMN IF NOT EXISTS bucket text,
  ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL;

-- 2) View de auditoria de legado
CREATE OR REPLACE VIEW public.biblioteca_auditoria_legado AS
  SELECT 'produtos'::text                  AS bucket_origem,
         'produto_imagem'::text            AS tipo,
         COUNT(*) FILTER (WHERE asset_id IS NULL)::bigint AS legado,
         COUNT(*) FILTER (WHERE asset_id IS NOT NULL)::bigint AS migrado,
         COUNT(*)::bigint                  AS total
    FROM public.produtos_imagens
  UNION ALL
  SELECT 'produtos-videos', 'produto_video',
         COUNT(*) FILTER (WHERE asset_id IS NULL),
         COUNT(*) FILTER (WHERE asset_id IS NOT NULL),
         COUNT(*)
    FROM public.produtos_videos WHERE storage_path IS NOT NULL
  UNION ALL
  SELECT 'produtos-documentos', 'produto_documento',
         COUNT(*) FILTER (WHERE asset_id IS NULL),
         COUNT(*) FILTER (WHERE asset_id IS NOT NULL),
         COUNT(*)
    FROM public.produtos_documentos
  UNION ALL
  SELECT 'materiais', 'material_imagem',
         COUNT(*) FILTER (WHERE asset_id IS NULL),
         COUNT(*) FILTER (WHERE asset_id IS NOT NULL),
         COUNT(*)
    FROM public.materiais_imagens
  UNION ALL
  SELECT 'materiais-documentos', 'material_documento',
         COUNT(*) FILTER (WHERE asset_id IS NULL),
         COUNT(*) FILTER (WHERE asset_id IS NOT NULL),
         COUNT(*)
    FROM public.materiais_documentos;

GRANT SELECT ON public.biblioteca_auditoria_legado TO authenticated, service_role;
