
-- ============================================================
-- JBL Trade Hub — Modelagem completa das entidades
-- ============================================================

-- ---------- ENUM TYPES (idempotentes) ----------
DO $$ BEGIN
  CREATE TYPE public.campanha_status AS ENUM ('planejada','em_andamento','concluida','cancelada');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.briefing_status AS ENUM ('rascunho','em_revisao','aprovado','arquivado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 1) FAMÍLIAS (agrupamento superior dos produtos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.familias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  descricao text,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.familias TO anon, authenticated;
GRANT ALL ON public.familias TO service_role;

ALTER TABLE public.familias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS familias_open ON public.familias;
CREATE POLICY familias_open ON public.familias FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS familias_updated_at ON public.familias;
CREATE TRIGGER familias_updated_at BEFORE UPDATE ON public.familias
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2) PRODUTOS — vínculo com Família + índices de escala
-- ============================================================
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS familia_id uuid REFERENCES public.familias(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_produtos_familia   ON public.produtos(familia_id);
CREATE INDEX IF NOT EXISTS idx_produtos_linha     ON public.produtos(linha_id);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON public.produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_produtos_status    ON public.produtos(status);
CREATE INDEX IF NOT EXISTS idx_produtos_nome      ON public.produtos(lower(nome));

CREATE INDEX IF NOT EXISTS idx_produtos_imagens_produto ON public.produtos_imagens(produto_id);
CREATE INDEX IF NOT EXISTS idx_materiais_fornecedor      ON public.materiais_pdv(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_materiais_tipo            ON public.materiais_pdv(tipo);
CREATE INDEX IF NOT EXISTS idx_arquivos_vinculos_ent     ON public.arquivos_vinculos(entidade_tipo, entidade_id);

-- ============================================================
-- 3) PROFILES (usuários da plataforma)
--    Referencia auth.users(id) para quando o auth for ligado.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text,
  email text,
  avatar_url text,
  cargo text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL    ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_open ON public.profiles;
CREATE POLICY profiles_open ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4) CAMPANHAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campanhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE,
  nome text NOT NULL,
  descricao text,
  status public.campanha_status NOT NULL DEFAULT 'planejada',
  data_inicio date,
  data_fim date,
  responsavel_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campanhas TO anon, authenticated;
GRANT ALL ON public.campanhas TO service_role;

ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campanhas_open ON public.campanhas;
CREATE POLICY campanhas_open ON public.campanhas FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS campanhas_updated_at ON public.campanhas;
CREATE TRIGGER campanhas_updated_at BEFORE UPDATE ON public.campanhas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_campanhas_status      ON public.campanhas(status);
CREATE INDEX IF NOT EXISTS idx_campanhas_data_inicio ON public.campanhas(data_inicio);
CREATE INDEX IF NOT EXISTS idx_campanhas_responsavel ON public.campanhas(responsavel_id);

-- ============================================================
-- 5) PROJETOS DE LANÇAMENTO
--    Reaproveita a tabela `lancamentos` já criada, adicionando
--    código, vínculo com campanha, responsável e prioridade.
-- ============================================================
ALTER TABLE public.lancamentos
  ADD COLUMN IF NOT EXISTS codigo text,
  ADD COLUMN IF NOT EXISTS campanha_id    uuid REFERENCES public.campanhas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES public.profiles(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prioridade smallint NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_lancamentos_codigo
  ON public.lancamentos(codigo) WHERE codigo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lancamentos_campanha    ON public.lancamentos(campanha_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_responsavel ON public.lancamentos(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_status      ON public.lancamentos(status);

CREATE INDEX IF NOT EXISTS idx_lancamentos_produtos_lanc ON public.lancamentos_produtos(lancamento_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_produtos_prod ON public.lancamentos_produtos(produto_id);

-- ============================================================
-- 6) MATERIAIS DO PROJETO (projeto ↔ material_pdv)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lancamentos_materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id uuid NOT NULL REFERENCES public.lancamentos(id)   ON DELETE CASCADE,
  material_id   uuid NOT NULL REFERENCES public.materiais_pdv(id) ON DELETE RESTRICT,
  quantidade int NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lancamento_id, material_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lancamentos_materiais TO anon, authenticated;
GRANT ALL ON public.lancamentos_materiais TO service_role;

ALTER TABLE public.lancamentos_materiais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lancamentos_materiais_open ON public.lancamentos_materiais;
CREATE POLICY lancamentos_materiais_open ON public.lancamentos_materiais
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_lanc_mat_lanc ON public.lancamentos_materiais(lancamento_id);
CREATE INDEX IF NOT EXISTS idx_lanc_mat_mat  ON public.lancamentos_materiais(material_id);

-- ============================================================
-- 7) COMPATIBILIDADES (produto ↔ material_pdv)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.compatibilidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id  uuid NOT NULL REFERENCES public.produtos(id)      ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materiais_pdv(id) ON DELETE CASCADE,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (produto_id, material_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compatibilidades TO anon, authenticated;
GRANT ALL ON public.compatibilidades TO service_role;

ALTER TABLE public.compatibilidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS compatibilidades_open ON public.compatibilidades;
CREATE POLICY compatibilidades_open ON public.compatibilidades
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_compat_produto  ON public.compatibilidades(produto_id);
CREATE INDEX IF NOT EXISTS idx_compat_material ON public.compatibilidades(material_id);

-- ============================================================
-- 8) BRIEFINGS (1 por projeto de lançamento)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id uuid NOT NULL UNIQUE REFERENCES public.lancamentos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  objetivo text,
  publico_alvo text,
  mensagem_chave text,
  conteudo jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.briefing_status NOT NULL DEFAULT 'rascunho',
  autor_id         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  aprovado_por_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  aprovado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefings TO anon, authenticated;
GRANT ALL ON public.briefings TO service_role;

ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS briefings_open ON public.briefings;
CREATE POLICY briefings_open ON public.briefings FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS briefings_updated_at ON public.briefings;
CREATE TRIGGER briefings_updated_at BEFORE UPDATE ON public.briefings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_briefings_status ON public.briefings(status);
CREATE INDEX IF NOT EXISTS idx_briefings_autor  ON public.briefings(autor_id);

-- ============================================================
-- 9) COMENTÁRIOS (polimórfico, encadeado)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_tipo text NOT NULL,   -- 'produto' | 'material' | 'lancamento' | 'campanha' | 'briefing' ...
  entidade_id   uuid NOT NULL,
  parent_id uuid REFERENCES public.comentarios(id) ON DELETE CASCADE,
  autor_id  uuid REFERENCES public.profiles(id)    ON DELETE SET NULL,
  corpo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comentarios TO anon, authenticated;
GRANT ALL ON public.comentarios TO service_role;

ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS comentarios_open ON public.comentarios;
CREATE POLICY comentarios_open ON public.comentarios FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS comentarios_updated_at ON public.comentarios;
CREATE TRIGGER comentarios_updated_at BEFORE UPDATE ON public.comentarios
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_comentarios_entidade
  ON public.comentarios(entidade_tipo, entidade_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comentarios_parent ON public.comentarios(parent_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_autor  ON public.comentarios(autor_id);

-- ============================================================
-- 10) HISTÓRICO (trilha de auditoria polimórfica)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_tipo text NOT NULL,
  entidade_id   uuid NOT NULL,
  acao text NOT NULL,          -- 'criado' | 'atualizado' | 'removido' | 'status_alterado' ...
  dados_antes  jsonb,
  dados_depois jsonb,
  autor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.historico TO anon, authenticated;
GRANT ALL ON public.historico TO service_role;

ALTER TABLE public.historico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS historico_read  ON public.historico;
DROP POLICY IF EXISTS historico_write ON public.historico;
CREATE POLICY historico_read  ON public.historico FOR SELECT USING (true);
CREATE POLICY historico_write ON public.historico FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_historico_entidade
  ON public.historico(entidade_tipo, entidade_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_historico_autor      ON public.historico(autor_id);
CREATE INDEX IF NOT EXISTS idx_historico_created_at ON public.historico(created_at DESC);
