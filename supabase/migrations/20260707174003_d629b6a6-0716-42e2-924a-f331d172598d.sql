
CREATE TABLE public.infrastructure_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id UUID NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consultant_name TEXT NOT NULL,
  data_visita DATE NOT NULL,
  horario_visita TIME NOT NULL,
  entrevistador TEXT,
  organizacao_nome TEXT,
  cidade TEXT,
  endereco_sede TEXT,
  regime_ocupacao TEXT,
  pessoas_total INTEGER,
  pessoas_homens INTEGER,
  pessoas_mulheres INTEGER,
  pessoas_especifique TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.infrastructure_assessments TO authenticated;
GRANT ALL ON public.infrastructure_assessments TO service_role;

ALTER TABLE public.infrastructure_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users can view infra assessments"
ON public.infrastructure_assessments FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_field_consultant(auth.uid()));

CREATE POLICY "Field consultants can insert infra assessments"
ON public.infrastructure_assessments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = consultant_id
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_field_consultant(auth.uid()))
);

CREATE POLICY "Consultants edit their own infra assessments"
ON public.infrastructure_assessments FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (public.is_field_consultant(auth.uid()) AND auth.uid() = consultant_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (public.is_field_consultant(auth.uid()) AND auth.uid() = consultant_id)
);

CREATE POLICY "Admins can delete infra assessments"
ON public.infrastructure_assessments FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.tg_infra_assessments_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_infrastructure_assessments_updated_at
BEFORE UPDATE ON public.infrastructure_assessments
FOR EACH ROW EXECUTE FUNCTION public.tg_infra_assessments_touch_updated_at();

CREATE INDEX idx_infra_assessments_association ON public.infrastructure_assessments(association_id);
CREATE INDEX idx_infra_assessments_consultant ON public.infrastructure_assessments(consultant_id);
