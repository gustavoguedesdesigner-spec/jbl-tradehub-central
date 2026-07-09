
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS url_origem text;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_produtos_url_origem ON public.produtos(url_origem) WHERE url_origem IS NOT NULL;

ALTER TABLE public.produtos_imagens ADD COLUMN IF NOT EXISTS url_origem text;
CREATE INDEX IF NOT EXISTS idx_produtos_imagens_url_origem ON public.produtos_imagens(produto_id, url_origem);
