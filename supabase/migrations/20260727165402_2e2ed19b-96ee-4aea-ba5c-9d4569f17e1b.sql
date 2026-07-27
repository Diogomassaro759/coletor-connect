DROP POLICY IF EXISTS "Consultants update area assessments" ON public.association_assessments;
CREATE POLICY "Consultants update own area assessments"
  ON public.association_assessments
  FOR UPDATE
  TO authenticated
  USING (
    public.is_field_consultant(auth.uid())
    AND consultant_id = auth.uid()
    AND (area IS NULL OR public.has_area(auth.uid(), area))
  )
  WITH CHECK (
    public.is_field_consultant(auth.uid())
    AND consultant_id = auth.uid()
    AND (area IS NULL OR public.has_area(auth.uid(), area))
  );

DROP POLICY IF EXISTS "Coordenador updates area assessments" ON public.association_assessments;
CREATE POLICY "Coordenador updates assessments in own area"
  ON public.association_assessments
  FOR UPDATE
  TO authenticated
  USING (
    public.is_coordenador(auth.uid())
    AND (area IS NULL OR public.has_area(auth.uid(), area))
  )
  WITH CHECK (
    public.is_coordenador(auth.uid())
    AND (area IS NULL OR public.has_area(auth.uid(), area))
  );

DROP POLICY IF EXISTS "Coordenador manages area accounting books" ON public.accounting_books;
CREATE POLICY "Coordenador manages accounting books in own area"
  ON public.accounting_books
  FOR ALL
  TO authenticated
  USING (
    public.is_coordenador(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.association_assessments a
      WHERE a.id = accounting_books.assessment_id
        AND (a.area IS NULL OR public.has_area(auth.uid(), a.area))
    )
  )
  WITH CHECK (
    public.is_coordenador(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.association_assessments a
      WHERE a.id = accounting_books.assessment_id
        AND (a.area IS NULL OR public.has_area(auth.uid(), a.area))
    )
  );

DROP POLICY IF EXISTS "Coordenador manages area equipment" ON public.association_equipment;
CREATE POLICY "Coordenador manages equipment in own area"
  ON public.association_equipment
  FOR ALL
  TO authenticated
  USING (
    public.is_coordenador(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.association_assessments a
      WHERE a.id = association_equipment.assessment_id
        AND (a.area IS NULL OR public.has_area(auth.uid(), a.area))
    )
  )
  WITH CHECK (
    public.is_coordenador(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.association_assessments a
      WHERE a.id = association_equipment.assessment_id
        AND (a.area IS NULL OR public.has_area(auth.uid(), a.area))
    )
  );

DROP POLICY IF EXISTS "Coordenador manages area material prices" ON public.material_prices;
CREATE POLICY "Coordenador manages material prices in own area"
  ON public.material_prices
  FOR ALL
  TO authenticated
  USING (
    public.is_coordenador(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.association_assessments a
      WHERE a.id = material_prices.assessment_id
        AND (a.area IS NULL OR public.has_area(auth.uid(), a.area))
    )
  )
  WITH CHECK (
    public.is_coordenador(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.association_assessments a
      WHERE a.id = material_prices.assessment_id
        AND (a.area IS NULL OR public.has_area(auth.uid(), a.area))
    )
  );