CREATE POLICY "Admins update all assessments"
ON public.association_assessments
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Coordenador updates area assessments" ON public.association_assessments;
CREATE POLICY "Coordenador updates area assessments"
ON public.association_assessments
FOR UPDATE
TO authenticated
USING (
  public.is_coordenador(auth.uid()) AND EXISTS (
    SELECT 1
    FROM public.user_roles cr
    JOIN public.user_roles ur ON ur.user_id = association_assessments.consultant_id
    WHERE cr.user_id = auth.uid()
      AND cr.role = 'coordenador'::public.app_role
      AND cr.area IS NOT NULL
      AND ur.area = cr.area
  )
)
WITH CHECK (
  public.is_coordenador(auth.uid()) AND EXISTS (
    SELECT 1
    FROM public.user_roles cr
    JOIN public.user_roles ur ON ur.user_id = association_assessments.consultant_id
    WHERE cr.user_id = auth.uid()
      AND cr.role = 'coordenador'::public.app_role
      AND cr.area IS NOT NULL
      AND ur.area = cr.area
  )
);