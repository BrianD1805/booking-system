-- Ver-0.028 Clients extended profile foundation
-- Adds richer admin-only client profile fields, family member listing and document storage metadata/content.

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS id_passport_info TEXT DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS medical_insurance_name TEXT DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notification_app_push BOOLEAN DEFAULT TRUE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT TRUE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notification_sms BOOLEAN DEFAULT TRUE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS allergies_medical_alerts TEXT DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS preferred_contact_time TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS public.customer_family_members (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  relationship TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_family_members_customer_idx
  ON public.customer_family_members(practice_id, customer_id, full_name);

CREATE TABLE IF NOT EXISTS public.customer_documents (
  id TEXT PRIMARY KEY,
  practice_id TEXT NOT NULL REFERENCES public.practices(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT DEFAULT '',
  file_size INTEGER DEFAULT 0,
  file_data_base64 TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_documents_customer_idx
  ON public.customer_documents(practice_id, customer_id, uploaded_at DESC);
