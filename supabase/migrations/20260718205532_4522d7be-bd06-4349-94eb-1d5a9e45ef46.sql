CREATE POLICY "Admins manage material prices"
ON public.material_prices
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Coordenador manages area material prices"
ON public.material_prices
FOR ALL
TO authenticated
USING (
  public.is_coordenador(auth.uid()) AND EXISTS (
    SELECT 1
    FROM public.association_assessments a
    JOIN public.user_roles cr ON cr.user_id = auth.uid()
    JOIN public.user_roles ur ON ur.user_id = a.consultant_id
    WHERE a.id = material_prices.assessment_id
      AND cr.role = 'coordenador'::public.app_role
      AND cr.area IS NOT NULL
      AND ur.area = cr.area
  )
)
WITH CHECK (
  public.is_coordenador(auth.uid()) AND EXISTS (
    SELECT 1
    FROM public.association_assessments a
    JOIN public.user_roles cr ON cr.user_id = auth.uid()
    JOIN public.user_roles ur ON ur.user_id = a.consultant_id
    WHERE a.id = material_prices.assessment_id
      AND cr.role = 'coordenador'::public.app_role
      AND cr.area IS NOT NULL
      AND ur.area = cr.area
  )
);

CREATE POLICY "Admins manage equipment"
ON public.association_equipment
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Coordenador manages area equipment"
ON public.association_equipment
FOR ALL
TO authenticated
USING (
  public.is_coordenador(auth.uid()) AND EXISTS (
    SELECT 1
    FROM public.association_assessments a
    JOIN public.user_roles cr ON cr.user_id = auth.uid()
    JOIN public.user_roles ur ON ur.user_id = a.consultant_id
    WHERE a.id = association_equipment.assessment_id
      AND cr.role = 'coordenador'::public.app_role
      AND cr.area IS NOT NULL
      AND ur.area = cr.area
  )
)
WITH CHECK (
  public.is_coordenador(auth.uid()) AND EXISTS (
    SELECT 1
    FROM public.association_assessments a
    JOIN public.user_roles cr ON cr.user_id = auth.uid()
    JOIN public.user_roles ur ON ur.user_id = a.consultant_id
    WHERE a.id = association_equipment.assessment_id
      AND cr.role = 'coordenador'::public.app_role
      AND cr.area IS NOT NULL
      AND ur.area = cr.area
  )
);

CREATE POLICY "Admins manage accounting books"
ON public.accounting_books
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Coordenador manages area accounting books"
ON public.accounting_books
FOR ALL
TO authenticated
USING (
  public.is_coordenador(auth.uid()) AND EXISTS (
    SELECT 1
    FROM public.association_assessments a
    JOIN public.user_roles cr ON cr.user_id = auth.uid()
    JOIN public.user_roles ur ON ur.user_id = a.consultant_id
    WHERE a.id = accounting_books.assessment_id
      AND cr.role = 'coordenador'::public.app_role
      AND cr.area IS NOT NULL
      AND ur.area = cr.area
  )
)
WITH CHECK (
  public.is_coordenador(auth.uid()) AND EXISTS (
    SELECT 1
    FROM public.association_assessments a
    JOIN public.user_roles cr ON cr.user_id = auth.uid()
    JOIN public.user_roles ur ON ur.user_id = a.consultant_id
    WHERE a.id = accounting_books.assessment_id
      AND cr.role = 'coordenador'::public.app_role
      AND cr.area IS NOT NULL
      AND ur.area = cr.area
  )
);

CREATE POLICY "Admins insert association evidence"
ON public.association_evidence
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Coordenador inserts area association evidence"
ON public.association_evidence
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_coordenador(auth.uid()) AND uploaded_by = auth.uid() AND EXISTS (
    SELECT 1
    FROM public.association_assessments a
    JOIN public.user_roles cr ON cr.user_id = auth.uid()
    JOIN public.user_roles ur ON ur.user_id = a.consultant_id
    WHERE a.id = association_evidence.assessment_id
      AND cr.role = 'coordenador'::public.app_role
      AND cr.area IS NOT NULL
      AND ur.area = cr.area
  )
);