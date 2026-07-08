
CREATE TABLE IF NOT EXISTS public.materiais_especiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id uuid NOT NULL REFERENCES public.lancamentos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  objetivo text,
  briefing text,
  fornecedor_sugerido text,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  valor_estimado numeric(12,2),
  status text NOT NULL DEFAULT 'ideia',
  observacoes text,
  imagem_referencia_path text,
  croqui_path text,
  homologado_material_id uuid REFERENCES public.materiais_pdv(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT materiais_especiais_status_check
    CHECK (status IN ('ideia','em_desenvolvimento','aguardando_aprovacao','aprovado','rejeitado','homologado'))
);

CREATE INDEX IF NOT EXISTS materiais_especiais_lancamento_idx
  ON public.materiais_especiais(lancamento_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.materiais_especiais TO authenticated;
GRANT ALL ON public.materiais_especiais TO service_role;
GRANT SELECT ON public.materiais_especiais TO anon;

ALTER TABLE public.materiais_especiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "materiais_especiais_all_read"
  ON public.materiais_especiais FOR SELECT
  USING (true);

CREATE POLICY "materiais_especiais_auth_write"
  ON public.materiais_especiais FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "materiais_especiais_auth_update"
  ON public.materiais_especiais FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "materiais_especiais_auth_delete"
  ON public.materiais_especiais FOR DELETE TO authenticated
  USING (true);

DROP TRIGGER IF EXISTS trg_materiais_especiais_updated ON public.materiais_especiais;
CREATE TRIGGER trg_materiais_especiais_updated
  BEFORE UPDATE ON public.materiais_especiais
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
