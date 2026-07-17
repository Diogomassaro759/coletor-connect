DROP POLICY IF EXISTS "Internal users can view associations" ON public.associations;
CREATE POLICY "Internal users can view associations"
ON public.associations FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_field_consultant(auth.uid())
  OR is_recenseador(auth.uid())
  OR is_coordenador(auth.uid())
  OR is_coordenador_recenseador(auth.uid())
);