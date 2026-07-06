
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coordenador';

DO $$ BEGIN
  CREATE TYPE public.operational_area AS ENUM ('social','juridico','contabil','infraestrutura');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
