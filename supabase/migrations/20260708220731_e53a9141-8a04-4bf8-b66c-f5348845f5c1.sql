
-- Extend lancamentos with production/approval/deploy stages and PDV Ready flag
ALTER TABLE public.lancamentos
  ADD COLUMN IF NOT EXISTS pdv_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS producao_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS aprovacao_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS implantacao_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS producao_nota text,
  ADD COLUMN IF NOT EXISTS aprovacao_nota text,
  ADD COLUMN IF NOT EXISTS implantacao_nota text;

-- Categoria dos materiais no lançamento
ALTER TABLE public.lancamentos_materiais
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'existente';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lancamentos_materiais_categoria_chk'
  ) THEN
    ALTER TABLE public.lancamentos_materiais
      ADD CONSTRAINT lancamentos_materiais_categoria_chk
      CHECK (categoria IN ('existente','obrigatorio','especial'));
  END IF;
END $$;

-- Checklist do lançamento
CREATE TABLE IF NOT EXISTS public.lancamentos_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id uuid NOT NULL REFERENCES public.lancamentos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  feito boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  categoria text NOT NULL DEFAULT 'geral',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos_checklist TO anon, authenticated;
GRANT ALL ON public.lancamentos_checklist TO service_role;

ALTER TABLE public.lancamentos_checklist ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lancamentos_checklist' AND policyname='lancamentos_checklist_open') THEN
    CREATE POLICY lancamentos_checklist_open ON public.lancamentos_checklist
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE TRIGGER lancamentos_checklist_set_updated_at
  BEFORE UPDATE ON public.lancamentos_checklist
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_lancamentos_checklist_lancamento ON public.lancamentos_checklist(lancamento_id);
