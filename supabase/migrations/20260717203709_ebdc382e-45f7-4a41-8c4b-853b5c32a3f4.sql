
DROP POLICY IF EXISTS "Admins and social users can update associations" ON public.associations;

CREATE POLICY "Admins and social users can update associations"
ON public.associations
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (is_coordenador(auth.uid()) AND has_area(auth.uid(), 'social'::operational_area))
  OR (
    is_field_consultant(auth.uid())
    AND has_area(auth.uid(), 'social'::operational_area)
    AND created_by = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (is_coordenador(auth.uid()) AND has_area(auth.uid(), 'social'::operational_area))
  OR (
    is_field_consultant(auth.uid())
    AND has_area(auth.uid(), 'social'::operational_area)
    AND created_by = auth.uid()
  )
);
