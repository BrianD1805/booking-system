-- ZipBook Ver-0.062 — concurrency-safe, tenant-scoped public bookings.
-- Requires the existing Ver-0.056 tenant RLS migration.
-- Safe to re-run. Does not change existing bookings or automatically open any business.
-- This is a BEFORE trigger: no extension and no historical-data rewrite needed.
BEGIN;

CREATE OR REPLACE FUNCTION public.zipbook_guard_booking_overlap_062()
RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path = pg_catalog, public
AS $zipbook$
BEGIN
  -- Historical records can lack practitioners. New booking API requests cannot.
  IF NEW.status = 'cancelled' OR NEW.practitioner_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'An appointment must have a positive duration.';
  END IF;

  -- All writers for the SAME practice, practitioner and day use a single
  -- transaction-scoped lock. Different businesses cannot block one another
  -- except for a harmless 64-bit hash collision.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      NEW.practice_id || ':' || NEW.practitioner_id || ':' || NEW.booking_date::text, 0
    )
  );

  -- Executed as the existing restricted runtime role with practice RLS.
  -- A fresh read after the advisory lock observes the previous committed insert.
  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.practice_id = NEW.practice_id
      AND b.practitioner_id = NEW.practitioner_id
      AND b.booking_date = NEW.booking_date
      AND b.id <> NEW.id
      AND b.status <> 'cancelled'
      AND b.start_time < NEW.end_time
      AND NEW.start_time < b.end_time
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23P01',
      MESSAGE = 'The requested appointment time is no longer available.';
  END IF;
  RETURN NEW;
END;
$zipbook$;

REVOKE ALL ON FUNCTION public.zipbook_guard_booking_overlap_062() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.zipbook_guard_booking_overlap_062() TO zipbook_tenant_runtime;

DROP TRIGGER IF EXISTS zipbook_guard_booking_overlap_062 ON public.bookings;
CREATE TRIGGER zipbook_guard_booking_overlap_062
BEFORE INSERT OR UPDATE OF practice_id, practitioner_id, booking_date, start_time, end_time, status
ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.zipbook_guard_booking_overlap_062();

COMMIT;
