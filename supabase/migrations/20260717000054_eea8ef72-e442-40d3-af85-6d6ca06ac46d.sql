
-- Coordenador area-based scoping for assessments

-- association_assessments
DROP POLICY IF EXISTS "Internal users can view assessments" ON public.association_assessments;

CREATE POLICY "Admins view all assessments"
ON public.association_assessments FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Consultants view own assessments"
ON public.association_assessments FOR SELECT
USING (public.is_field_consultant(auth.uid()) AND consultant_id = auth.uid());

CREATE POLICY "Coordenador views area assessments"
ON public.association_assessments FOR SELECT
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
);

CREATE POLICY "Coordenador insert assessments"
ON public.association_assessments FOR INSERT
WITH CHECK (public.is_coordenador(auth.uid()) AND consultant_id = auth.uid());

CREATE POLICY "Coordenador updates area assessments"
ON public.association_assessments FOR UPDATE
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
WITH CHECK (public.is_coordenador(auth.uid()));

-- infrastructure_assessments
DROP POLICY IF EXISTS "Internal users can view infra assessments" ON public.infrastructure_assessments;

CREATE POLICY "Admins view all infra assessments"
ON public.infrastructure_assessments FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Consultants view own infra assessments"
ON public.infrastructure_assessments FOR SELECT
USING (public.is_field_consultant(auth.uid()) AND consultant_id = auth.uid());

CREATE POLICY "Coordenador views infra assessments in area"
ON public.infrastructure_assessments FOR SELECT
USING (
  public.is_coordenador(auth.uid())
  AND public.has_area(auth.uid(), 'infraestrutura'::public.operational_area)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = infrastructure_assessments.consultant_id
      AND ur.area = 'infraestrutura'::public.operational_area
  )
);

CREATE POLICY "Coordenador insert infra assessments"
ON public.infrastructure_assessments FOR INSERT
WITH CHECK (
  public.is_coordenador(auth.uid())
  AND consultant_id = auth.uid()
  AND public.has_area(auth.uid(), 'infraestrutura'::public.operational_area)
);

CREATE POLICY "Coordenador updates infra assessments in area"
ON public.infrastructure_assessments FOR UPDATE
USING (
  public.is_coordenador(auth.uid())
  AND public.has_area(auth.uid(), 'infraestrutura'::public.operational_area)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = infrastructure_assessments.consultant_id
      AND ur.area = 'infraestrutura'::public.operational_area
  )
)
WITH CHECK (public.is_coordenador(auth.uid()));

-- Helper to preserve "Aguardando Social" gate for consultants of other areas
CREATE OR REPLACE FUNCTION public.associations_with_social_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT association_id FROM public.association_assessments
$$;

REVOKE ALL ON FUNCTION public.associations_with_social_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.associations_with_social_ids() TO authenticated;
