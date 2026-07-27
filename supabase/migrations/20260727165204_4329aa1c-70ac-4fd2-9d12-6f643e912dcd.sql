DROP POLICY IF EXISTS "Consultants can delete own accounting books" ON public.accounting_books;
CREATE POLICY "Consultants can delete own accounting books"
  ON public.accounting_books
  FOR DELETE
  TO authenticated
  USING (
    public.is_field_consultant(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.association_assessments a
      WHERE a.id = accounting_books.assessment_id
        AND a.consultant_id = auth.uid()
        AND (a.area IS NULL OR public.has_area(auth.uid(), a.area))
    )
  );

DROP POLICY IF EXISTS "Consultants can delete own material prices" ON public.material_prices;
CREATE POLICY "Consultants can delete own material prices"
  ON public.material_prices
  FOR DELETE
  TO authenticated
  USING (
    public.is_field_consultant(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.association_assessments a
      WHERE a.id = material_prices.assessment_id
        AND a.consultant_id = auth.uid()
        AND (a.area IS NULL OR public.has_area(auth.uid(), a.area))
    )
  );

DROP POLICY IF EXISTS "Consultants can delete own equipment" ON public.association_equipment;
CREATE POLICY "Consultants can delete own equipment"
  ON public.association_equipment
  FOR DELETE
  TO authenticated
  USING (
    public.is_field_consultant(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.association_assessments a
      WHERE a.id = association_equipment.assessment_id
        AND a.consultant_id = auth.uid()
        AND (a.area IS NULL OR public.has_area(auth.uid(), a.area))
    )
  );