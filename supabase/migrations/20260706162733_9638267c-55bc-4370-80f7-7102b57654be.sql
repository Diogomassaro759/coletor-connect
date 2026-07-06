
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS area public.operational_area;

CREATE OR REPLACE FUNCTION public.has_area(_user_id uuid, _area public.operational_area)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND area = _area) $$;

CREATE OR REPLACE FUNCTION public.get_user_area(_user_id uuid)
RETURNS public.operational_area LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT area FROM public.user_roles WHERE user_id = _user_id AND area IS NOT NULL LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.is_coordenador(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'coordenador'::public.app_role) $$;

UPDATE public.associations SET tipo = 'cooperativa' WHERE tipo = 'formal';
UPDATE public.associations SET tipo = 'coletivo'    WHERE tipo = 'informal';
