
DO $$ BEGIN
  ALTER TABLE public.compatibilidades ADD CONSTRAINT compatibilidades_produto_material_uniq UNIQUE (produto_id, material_id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS compatibilidades_material_idx ON public.compatibilidades(material_id);
CREATE INDEX IF NOT EXISTS compatibilidades_produto_idx ON public.compatibilidades(produto_id);
