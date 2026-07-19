CREATE POLICY "Consultants view area assessments"
ON public.association_assessments
FOR SELECT
USING (
  is_field_consultant(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.user_roles cr
    JOIN public.user_roles ur ON ur.user_id = association_assessments.consultant_id
    WHERE cr.user_id = auth.uid()
      AND cr.area IS NOT NULL
      AND ur.area = cr.area
  )
);