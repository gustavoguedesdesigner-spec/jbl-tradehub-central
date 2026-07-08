
-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============ CATEGORIAS ============
CREATE TABLE public.categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO anon, authenticated;
GRANT ALL ON public.categorias TO service_role;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
-- Fase inicial sem login. Substituir por policies com has_role() ao adicionar autenticacao.
CREATE POLICY "acesso_publico_categorias" ON public.categorias FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_categorias_updated_at BEFORE UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ LINHAS ============
CREATE TABLE public.linhas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.linhas TO anon, authenticated;
GRANT ALL ON public.linhas TO service_role;
ALTER TABLE public.linhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso_publico_linhas" ON public.linhas FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_linhas_updated_at BEFORE UPDATE ON public.linhas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ FORNECEDORES (stub) ============
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT,
  contato_nome TEXT,
  contato_email TEXT,
  contato_telefone TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO anon, authenticated;
GRANT ALL ON public.fornecedores TO service_role;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso_publico_fornecedores" ON public.fornecedores FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PRODUTOS ============
CREATE TYPE public.produto_status AS ENUM ('ativo', 'inativo', 'descontinuado', 'lancamento');

CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  linha_id UUID REFERENCES public.linhas(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  status public.produto_status NOT NULL DEFAULT 'ativo',
  preco_sugerido NUMERIC(12,2),
  ean TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_produtos_linha ON public.produtos(linha_id);
CREATE INDEX idx_produtos_categoria ON public.produtos(categoria_id);
CREATE INDEX idx_produtos_status ON public.produtos(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO anon, authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso_publico_produtos" ON public.produtos FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_produtos_updated_at BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PRODUTOS_IMAGENS ============
CREATE TABLE public.produtos_imagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url_publica TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  principal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_produtos_imagens_produto ON public.produtos_imagens(produto_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos_imagens TO anon, authenticated;
GRANT ALL ON public.produtos_imagens TO service_role;
ALTER TABLE public.produtos_imagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso_publico_produtos_imagens" ON public.produtos_imagens FOR ALL USING (true) WITH CHECK (true);

-- ============ ARQUIVOS (biblioteca central / DAM) ============
CREATE TABLE public.arquivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  url_publica TEXT,
  mime_type TEXT,
  tamanho_bytes BIGINT,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.arquivos TO anon, authenticated;
GRANT ALL ON public.arquivos TO service_role;
ALTER TABLE public.arquivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso_publico_arquivos" ON public.arquivos FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_arquivos_updated_at BEFORE UPDATE ON public.arquivos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Vinculos polimorficos de arquivos a qualquer entidade
CREATE TABLE public.arquivos_vinculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  arquivo_id UUID NOT NULL REFERENCES public.arquivos(id) ON DELETE CASCADE,
  entidade_tipo TEXT NOT NULL,
  entidade_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_arquivos_vinculos_entidade ON public.arquivos_vinculos(entidade_tipo, entidade_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.arquivos_vinculos TO anon, authenticated;
GRANT ALL ON public.arquivos_vinculos TO service_role;
ALTER TABLE public.arquivos_vinculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso_publico_arquivos_vinculos" ON public.arquivos_vinculos FOR ALL USING (true) WITH CHECK (true);

-- ============ MATERIAIS PDV (stub) ============
CREATE TABLE public.materiais_pdv (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  tipo TEXT,
  descricao TEXT,
  dimensoes TEXT,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materiais_pdv TO anon, authenticated;
GRANT ALL ON public.materiais_pdv TO service_role;
ALTER TABLE public.materiais_pdv ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso_publico_materiais_pdv" ON public.materiais_pdv FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_materiais_pdv_updated_at BEFORE UPDATE ON public.materiais_pdv FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ LANCAMENTOS (stub) ============
CREATE TYPE public.lancamento_status AS ENUM ('planejado', 'em_andamento', 'lancado', 'cancelado');

CREATE TABLE public.lancamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  data_prevista DATE,
  data_lancamento DATE,
  status public.lancamento_status NOT NULL DEFAULT 'planejado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos TO anon, authenticated;
GRANT ALL ON public.lancamentos TO service_role;
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso_publico_lancamentos" ON public.lancamentos FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_lancamentos_updated_at BEFORE UPDATE ON public.lancamentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lancamentos_produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lancamento_id UUID NOT NULL REFERENCES public.lancamentos(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lancamento_id, produto_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos_produtos TO anon, authenticated;
GRANT ALL ON public.lancamentos_produtos TO service_role;
ALTER TABLE public.lancamentos_produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso_publico_lancamentos_produtos" ON public.lancamentos_produtos FOR ALL USING (true) WITH CHECK (true);
