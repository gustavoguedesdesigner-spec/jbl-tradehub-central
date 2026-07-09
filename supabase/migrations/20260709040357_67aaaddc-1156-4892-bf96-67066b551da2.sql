
CREATE TABLE public.import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT 'Importação',
  origem TEXT,
  usuario TEXT,
  status TEXT NOT NULL DEFAULT 'analisando',
  total_arquivos INT NOT NULL DEFAULT 0,
  total_imagens INT NOT NULL DEFAULT 0,
  total_videos INT NOT NULL DEFAULT 0,
  total_pdf INT NOT NULL DEFAULT 0,
  total_powerpoint INT NOT NULL DEFAULT 0,
  total_excel INT NOT NULL DEFAULT 0,
  total_adobe INT NOT NULL DEFAULT 0,
  total_3d INT NOT NULL DEFAULT 0,
  total_desconhecidos INT NOT NULL DEFAULT 0,
  criados_produtos INT NOT NULL DEFAULT 0,
  criados_materiais INT NOT NULL DEFAULT 0,
  criados_assets INT NOT NULL DEFAULT 0,
  relacionamentos INT NOT NULL DEFAULT 0,
  ignorados INT NOT NULL DEFAULT 0,
  duplicados INT NOT NULL DEFAULT 0,
  tempo_ms INT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_batches TO authenticated;
GRANT ALL ON public.import_batches TO service_role;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read import_batches" ON public.import_batches FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth write import_batches" ON public.import_batches FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER import_batches_updated BEFORE UPDATE ON public.import_batches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.import_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  pasta TEXT,
  caminho_original TEXT,
  storage_path TEXT,
  mime TEXT,
  tamanho BIGINT,
  tipo_detectado TEXT,
  produto_sugerido TEXT,
  material_sugerido TEXT,
  categoria_sugerida TEXT,
  familia_sugerida TEXT,
  destino TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  asset_id UUID,
  produto_id UUID,
  material_id UUID,
  erro TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_items TO authenticated;
GRANT ALL ON public.import_items TO service_role;
ALTER TABLE public.import_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read import_items" ON public.import_items FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth write import_items" ON public.import_items FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER import_items_updated BEFORE UPDATE ON public.import_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_import_items_batch ON public.import_items(batch_id);
CREATE INDEX idx_import_batches_created ON public.import_batches(created_at DESC);
