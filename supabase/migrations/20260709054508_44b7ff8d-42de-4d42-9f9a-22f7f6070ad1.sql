
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS marca text;
CREATE INDEX IF NOT EXISTS idx_produtos_marca ON public.produtos(marca);
