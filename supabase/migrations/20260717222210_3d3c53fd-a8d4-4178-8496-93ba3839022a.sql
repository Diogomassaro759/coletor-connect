DROP POLICY IF EXISTS "Recenseadores can update catadores" ON public.catadores;
CREATE POLICY "Recenseadores can update own catadores"
ON public.catadores
FOR UPDATE
USING (is_recenseador(auth.uid()) AND created_by = auth.uid())
WITH CHECK (is_recenseador(auth.uid()) AND created_by = auth.uid());