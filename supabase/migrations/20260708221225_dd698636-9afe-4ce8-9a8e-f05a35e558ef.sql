
-- Enrich lancamentos_materiais with production workflow fields
ALTER TABLE public.lancamentos_materiais
  ADD COLUMN IF NOT EXISTS acao text NOT NULL DEFAULT 'produzir',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prazo date,
  ADD COLUMN IF NOT EXISTS briefing text,
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.lancamentos_materiais
  DROP CONSTRAINT IF EXISTS lancamentos_materiais_acao_check,
  ADD CONSTRAINT lancamentos_materiais_acao_check
    CHECK (acao IN ('produzir','atualizar','nao_utilizar','ja_existente'));

ALTER TABLE public.lancamentos_materiais
  DROP CONSTRAINT IF EXISTS lancamentos_materiais_status_check,
  ADD CONSTRAINT lancamentos_materiais_status_check
    CHECK (status IN ('pendente','em_producao','em_aprovacao','aprovado','entregue','bloqueado'));

ALTER TABLE public.lancamentos_materiais
  DROP CONSTRAINT IF EXISTS lancamentos_materiais_origem_check,
  ADD CONSTRAINT lancamentos_materiais_origem_check
    CHECK (origem IN ('auto','manual'));

-- Prevent duplicate rows when auto-loading obligatory materials
CREATE UNIQUE INDEX IF NOT EXISTS lancamentos_materiais_uniq
  ON public.lancamentos_materiais (lancamento_id, material_id, categoria);

DROP TRIGGER IF EXISTS trg_lancamentos_materiais_updated ON public.lancamentos_materiais;
CREATE TRIGGER trg_lancamentos_materiais_updated
  BEFORE UPDATE ON public.lancamentos_materiais
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
