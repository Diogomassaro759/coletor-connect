ALTER TABLE public.profiles DROP CONSTRAINT profiles_created_by_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.catadores DROP CONSTRAINT catadores_updated_by_fkey;
ALTER TABLE public.catadores ADD CONSTRAINT catadores_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.associations DROP CONSTRAINT associations_created_by_fkey;
ALTER TABLE public.associations ADD CONSTRAINT associations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.associations DROP CONSTRAINT associations_updated_by_fkey;
ALTER TABLE public.associations ADD CONSTRAINT associations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.association_assessments DROP CONSTRAINT association_assessments_created_by_fkey;
ALTER TABLE public.association_assessments ADD CONSTRAINT association_assessments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.association_assessments DROP CONSTRAINT association_assessments_updated_by_fkey;
ALTER TABLE public.association_assessments ADD CONSTRAINT association_assessments_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;