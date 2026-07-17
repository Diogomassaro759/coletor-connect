DROP POLICY IF EXISTS "Admins and social coordinators can insert associations" ON public.associations;
DROP POLICY IF EXISTS "Admins and social coordinators can update associations" ON public.associations;

CREATE POLICY "Admins and social users can insert associations"
ON public.associations
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    public.is_coordenador(auth.uid())
    AND public.has_area(auth.uid(), 'social'::public.operational_area)
  )
  OR (
    public.is_field_consultant(auth.uid())
    AND public.has_area(auth.uid(), 'social'::public.operational_area)
  )
);

CREATE POLICY "Admins and social users can update associations"
ON public.associations
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    public.is_coordenador(auth.uid())
    AND public.has_area(auth.uid(), 'social'::public.operational_area)
  )
  OR (
    public.is_field_consultant(auth.uid())
    AND public.has_area(auth.uid(), 'social'::public.operational_area)
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    public.is_coordenador(auth.uid())
    AND public.has_area(auth.uid(), 'social'::public.operational_area)
  )
  OR (
    public.is_field_consultant(auth.uid())
    AND public.has_area(auth.uid(), 'social'::public.operational_area)
  )
);