
-- 1) Add area column to association_assessments
ALTER TABLE public.association_assessments
  ADD COLUMN IF NOT EXISTS area public.operational_area;

-- 2) Backfill area from the creator's user_roles.area
UPDATE public.association_assessments a
SET area = ur.area
FROM public.user_roles ur
WHERE a.area IS NULL
  AND a.created_by = ur.user_id
  AND ur.area IS NOT NULL;

-- 3) Delete duplicates keeping only the most recent per (association_id, area)
DELETE FROM public.association_assessments a
USING public.association_assessments b
WHERE a.association_id = b.association_id
  AND a.area IS NOT NULL
  AND a.area = b.area
  AND a.created_at < b.created_at;

-- 4) Unique constraint per entity + area (only when area is set)
CREATE UNIQUE INDEX IF NOT EXISTS association_assessments_entity_area_uniq
  ON public.association_assessments (association_id, area)
  WHERE area IS NOT NULL;

-- 5) Unique constraint on infrastructure_assessments per entity
CREATE UNIQUE INDEX IF NOT EXISTS infrastructure_assessments_entity_uniq
  ON public.infrastructure_assessments (association_id);
