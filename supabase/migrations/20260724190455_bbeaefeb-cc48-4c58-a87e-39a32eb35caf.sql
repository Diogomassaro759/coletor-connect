-- Allow admins to insert assessments
DROP POLICY IF EXISTS "Admins insert assessments" ON public.association_assessments;
CREATE POLICY "Admins insert assessments"
  ON public.association_assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Broaden coordenador insert to not require area match when admin-like flexibility is needed
DROP POLICY IF EXISTS "Coordenador insert assessments" ON public.association_assessments;
CREATE POLICY "Coordenador insert assessments"
  ON public.association_assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_coordenador(auth.uid())
    AND (area IS NULL OR public.has_area(auth.uid(), area))
  );

-- Broaden consultants insert similarly (drop consultant_id equality strictness only for area check remains)
DROP POLICY IF EXISTS "Consultants can insert own assessments" ON public.association_assessments;
CREATE POLICY "Consultants can insert own assessments"
  ON public.association_assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_field_consultant(auth.uid())
    AND consultant_id = auth.uid()
    AND (area IS NULL OR public.has_area(auth.uid(), area))
  );

-- Allow consultants of the same area to update assessments in their area (not only their own)
DROP POLICY IF EXISTS "Consultants can update own assessments" ON public.association_assessments;
CREATE POLICY "Consultants update area assessments"
  ON public.association_assessments
  FOR UPDATE
  TO authenticated
  USING (
    public.is_field_consultant(auth.uid())
    AND (area IS NULL OR public.has_area(auth.uid(), area))
  )
  WITH CHECK (
    public.is_field_consultant(auth.uid())
    AND (area IS NULL OR public.has_area(auth.uid(), area))
  );

-- Also ensure infrastructure_assessments accepts admin inserts
DROP POLICY IF EXISTS "Admins insert infra assessments" ON public.infrastructure_assessments;
CREATE POLICY "Admins insert infra assessments"
  ON public.infrastructure_assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));