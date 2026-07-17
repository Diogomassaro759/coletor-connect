CREATE OR REPLACE FUNCTION public.has_area(_user_id uuid, _area public.operational_area)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND area = _area
  )
$function$;

CREATE OR REPLACE FUNCTION public.get_user_area(_user_id uuid)
RETURNS public.operational_area
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT area
  FROM public.user_roles
  WHERE user_id = _user_id
    AND area IS NOT NULL
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.is_coordenador(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'coordenador'::public.app_role
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_coordenador_recenseador(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'coordenador_recenseador'::public.app_role
  )
$function$;

REVOKE EXECUTE ON FUNCTION public.has_area(uuid, public.operational_area) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_area(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_coordenador(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_coordenador_recenseador(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_area(uuid, public.operational_area) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_area(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_coordenador(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_coordenador_recenseador(uuid) TO authenticated, service_role;