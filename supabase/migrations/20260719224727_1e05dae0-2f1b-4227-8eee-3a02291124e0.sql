
-- Backfill area for existing consultants that don't have one (default social)
UPDATE public.user_roles SET area = 'social'::public.operational_area
WHERE role = 'consultor'::public.app_role AND area IS NULL;

-- Update policies so consultants/coordenadores in the same area still see
-- assessments where the assessment's consultant has no area assigned (safety fallback).
DROP POLICY IF EXISTS "Consultants view area assessments" ON public.association_assessments;
CREATE POLICY "Consultants view area assessments"
  ON public.association_assessments FOR SELECT
  USING (
    is_field_consultant(auth.uid()) AND (
      EXISTS (
        SELECT 1 FROM public.user_roles cr
        LEFT JOIN public.user_roles ur ON ur.user_id = association_assessments.consultant_id
        WHERE cr.user_id = auth.uid()
          AND cr.area IS NOT NULL
          AND (ur.area = cr.area OR ur.area IS NULL)
      )
    )
  );

DROP POLICY IF EXISTS "Coordenador views area assessments" ON public.association_assessments;
CREATE POLICY "Coordenador views area assessments"
  ON public.association_assessments FOR SELECT
  USING (
    is_coordenador(auth.uid()) AND (
      EXISTS (
        SELECT 1 FROM public.user_roles cr
        LEFT JOIN public.user_roles ur ON ur.user_id = association_assessments.consultant_id
        WHERE cr.user_id = auth.uid()
          AND cr.role = 'coordenador'::public.app_role
          AND cr.area IS NOT NULL
          AND (ur.area = cr.area OR ur.area IS NULL)
      )
    )
  );
