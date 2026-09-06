\set ON_ERROR_STOP on
-- Test only a disposable database. No schema or roles are created by this script.
DO $$ BEGIN
  IF current_database() NOT LIKE 'padipps\_fde\_%' ESCAPE '\' THEN
    RAISE EXCEPTION 'Use a new disposable padipps_fde_* database';
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'padipps_app' AND (rolsuper OR rolbypassrls)) THEN
    RAISE EXCEPTION 'Test role must not be superuser or BYPASSRLS';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fde_contacts' AND tableowner = 'padipps_app') THEN
    RAISE EXCEPTION 'Application role must not own the table';
  END IF;
END $$;
SELECT version();
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'padipps_app';

BEGIN;
SET LOCAL ROLE padipps_app;
SELECT set_config('app.tenant_id', 'tenant-a', true);
INSERT INTO public.fde_contacts VALUES ('tenant-a', 'fixture-contact-1', 'Aster fixture');
SELECT set_config('app.tenant_id', 'tenant-b', true);
INSERT INTO public.fde_contacts VALUES ('tenant-b', 'fixture-contact-1', 'Birch fixture');
SELECT set_config('app.tenant_id', 'tenant-a', true);
DO $$ DECLARE changed integer; BEGIN
  IF (SELECT count(*) FROM public.fde_contacts WHERE contact_id = 'fixture-contact-1') <> 1 THEN
    RAISE EXCEPTION 'Unfiltered tenant query exposed the wrong row count';
  END IF;
  IF EXISTS (SELECT FROM public.fde_contacts WHERE tenant_id = 'tenant-b') THEN
    RAISE EXCEPTION 'Cross-tenant read leaked';
  END IF;
  UPDATE public.fde_contacts SET display_name = 'cross-tenant edit' WHERE tenant_id = 'tenant-b';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 0 THEN RAISE EXCEPTION 'Cross-tenant update changed rows'; END IF;
  BEGIN
    INSERT INTO public.fde_contacts VALUES ('tenant-b', 'forged-contact', 'forged');
    RAISE EXCEPTION 'Cross-tenant insert was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.fde_contacts SET tenant_id = 'tenant-b', contact_id = 'moved-contact' WHERE tenant_id = 'tenant-a';
    RAISE EXCEPTION 'Tenant-changing update was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
SELECT set_config('app.tenant_id', '', true);
DO $$ BEGIN
  IF EXISTS (SELECT FROM public.fde_contacts) THEN RAISE EXCEPTION 'Missing tenant context exposed rows'; END IF;
END $$;
ROLLBACK;

-- The same physical connection must not inherit the previous transaction's context.
BEGIN;
SET LOCAL ROLE padipps_app;
DO $$ BEGIN
  IF COALESCE(current_setting('app.tenant_id', true), '') <> '' THEN
    RAISE EXCEPTION 'Transaction-local tenant context leaked across pool reuse';
  END IF;
  BEGIN
    INSERT INTO public.fde_contacts VALUES ('tenant-a', 'no-context', 'forged');
    RAISE EXCEPTION 'Missing-context write was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
ROLLBACK;
