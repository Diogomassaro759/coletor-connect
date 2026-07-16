
CREATE OR REPLACE FUNCTION public.is_coordenador_recenseador(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'coordenador_recenseador'::public.app_role
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_coordenador_recenseador(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_coordenador_recenseador(uuid) TO authenticated, service_role;

-- Permite ao coordenador recenseador VER e EDITAR (não excluir) qualquer catador.
CREATE POLICY "Coordenador recenseador pode ver catadores"
ON public.catadores
FOR SELECT
TO authenticated
USING (public.is_coordenador_recenseador(auth.uid()));

CREATE POLICY "Coordenador recenseador pode atualizar catadores"
ON public.catadores
FOR UPDATE
TO authenticated
USING (public.is_coordenador_recenseador(auth.uid()))
WITH CHECK (public.is_coordenador_recenseador(auth.uid()));
