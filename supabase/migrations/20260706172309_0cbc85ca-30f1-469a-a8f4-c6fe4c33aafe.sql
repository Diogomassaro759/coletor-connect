REVOKE EXECUTE ON FUNCTION public.has_area(uuid, public.operational_area) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_area(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_coordenador(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_area(uuid, public.operational_area) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_area(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_coordenador(uuid) TO authenticated, service_role;