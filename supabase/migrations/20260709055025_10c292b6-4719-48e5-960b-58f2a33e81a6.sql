ALTER TABLE public.materiais_pdv
  ADD COLUMN IF NOT EXISTS material_construcao text,
  ADD COLUMN IF NOT EXISTS peso text,
  ADD COLUMN IF NOT EXISTS prazo_producao text,
  ADD COLUMN IF NOT EXISTS valor_estimado numeric(12,2),
  ADD COLUMN IF NOT EXISTS quantidade_minima integer,
  ADD COLUMN IF NOT EXISTS tipo_impressao text,
  ADD COLUMN IF NOT EXISTS acabamento text;