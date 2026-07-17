ALTER TABLE public.associations
  ADD COLUMN IF NOT EXISTS consultor_nome text,
  ADD COLUMN IF NOT EXISTS data_visita date,
  ADD COLUMN IF NOT EXISTS horario_visita time;