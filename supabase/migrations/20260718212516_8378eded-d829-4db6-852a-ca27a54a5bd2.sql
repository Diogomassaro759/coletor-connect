
-- CATADORES: apenas Recenseador, Coordenador do Recenseamento e Admin
DROP POLICY IF EXISTS "Coordenadores podem ver catadores" ON public.catadores;

DROP POLICY IF EXISTS "Coordenador recenseador pode inserir catadores" ON public.catadores;
CREATE POLICY "Coordenador recenseador pode inserir catadores"
  ON public.catadores FOR INSERT TO authenticated
  WITH CHECK (public.is_coordenador_recenseador(auth.uid()));

-- ASSOCIATION_ASSESSMENTS: consultor/coordenador só na própria área
DROP POLICY IF EXISTS "Consultants can insert own assessments" ON public.association_assessments;
CREATE POLICY "Consultants can insert own assessments"
  ON public.association_assessments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_field_consultant(auth.uid())
    AND consultant_id = auth.uid()
    AND (area IS NULL OR public.has_area(auth.uid(), area))
  );

DROP POLICY IF EXISTS "Coordenador insert assessments" ON public.association_assessments;
CREATE POLICY "Coordenador insert assessments"
  ON public.association_assessments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_coordenador(auth.uid())
    AND consultant_id = auth.uid()
    AND (area IS NULL OR public.has_area(auth.uid(), area))
  );

-- INFRASTRUCTURE_ASSESSMENTS: apenas quem tem área infraestrutura (ou admin)
DROP POLICY IF EXISTS "Field consultants can insert infra assessments" ON public.infrastructure_assessments;
CREATE POLICY "Field consultants can insert infra assessments"
  ON public.infrastructure_assessments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = consultant_id
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR (public.is_field_consultant(auth.uid())
          AND public.has_area(auth.uid(), 'infraestrutura'::public.operational_area))
    )
  );

DROP POLICY IF EXISTS "Consultants edit their own infra assessments" ON public.infrastructure_assessments;
CREATE POLICY "Consultants edit their own infra assessments"
  ON public.infrastructure_assessments FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (public.is_field_consultant(auth.uid())
        AND auth.uid() = consultant_id
        AND public.has_area(auth.uid(), 'infraestrutura'::public.operational_area))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (public.is_field_consultant(auth.uid())
        AND auth.uid() = consultant_id
        AND public.has_area(auth.uid(), 'infraestrutura'::public.operational_area))
  );

DROP POLICY IF EXISTS "Coordenador updates infra assessments in area" ON public.infrastructure_assessments;
CREATE POLICY "Coordenador updates infra assessments in area"
  ON public.infrastructure_assessments FOR UPDATE TO authenticated
  USING (
    public.is_coordenador(auth.uid())
    AND public.has_area(auth.uid(), 'infraestrutura'::public.operational_area)
  )
  WITH CHECK (
    public.is_coordenador(auth.uid())
    AND public.has_area(auth.uid(), 'infraestrutura'::public.operational_area)
  );
