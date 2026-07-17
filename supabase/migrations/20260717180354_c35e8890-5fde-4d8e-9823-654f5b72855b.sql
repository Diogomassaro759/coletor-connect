
DROP POLICY IF EXISTS "Admins can update associations" ON public.associations;
DROP POLICY IF EXISTS "Admins can insert associations" ON public.associations;

CREATE POLICY "Admins and social coordinators can insert associations"
ON public.associations FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (is_coordenador(auth.uid()) AND has_area(auth.uid(), 'social'::operational_area))
);

CREATE POLICY "Admins and social coordinators can update associations"
ON public.associations FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (is_coordenador(auth.uid()) AND has_area(auth.uid(), 'social'::operational_area))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (is_coordenador(auth.uid()) AND has_area(auth.uid(), 'social'::operational_area))
);
