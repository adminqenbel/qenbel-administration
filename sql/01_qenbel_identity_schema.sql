-- ==============================================================================
-- QENBEL IDENTITY DATABASE SCHEMA v1
-- Run in: Supabase Dashboard -> db.dtkclyrypucngoenwncj -> SQL Editor
-- This DB is the SINGLE IDENTITY SOURCE OF TRUTH for all QenBel products.
-- Google OAuth Web Client: 976428818123-967r95km89gmvicai4et4l6csnt6mq8v.apps.googleusercontent.com
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. QENBEL USERS
CREATE TABLE IF NOT EXISTS public.qenbel_users (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email               TEXT UNIQUE NOT NULL,
    full_name           TEXT,
    avatar_url          TEXT,
    google_provider_id  TEXT,
    global_roles        TEXT[] NOT NULL DEFAULT '{}',
    status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deactivated')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at       TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. APPLICATIONS REGISTRY
CREATE TABLE IF NOT EXISTS public.applications (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT,
    status          TEXT NOT NULL DEFAULT 'operational',
    version         TEXT DEFAULT '1.0.0',
    supabase_url    TEXT,
    render_url      TEXT,
    user_count      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.applications (id, name, description, status, version, supabase_url)
VALUES
    ('myharur','MyHarur','Local community alerts platform for Harur, Tamil Nadu.','operational','1.0.0','https://qpuvhhvzygdbvlichbqs.supabase.co'),
    ('qenshar','QenShar','QenBel sharing platform.','offline','0.1.0',NULL)
ON CONFLICT (id) DO NOTHING;

-- 3. APPLICATION USER LINKING
CREATE TABLE IF NOT EXISTS public.application_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qenbel_uid      UUID NOT NULL REFERENCES public.qenbel_users(id) ON DELETE CASCADE,
    application_id  TEXT NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'active',
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(qenbel_uid, application_id)
);

-- 4. ADMIN AUDIT LOG
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_uid       UUID REFERENCES public.qenbel_users(id) ON DELETE SET NULL,
    admin_email     TEXT,
    action          TEXT NOT NULL,
    target_type     TEXT,
    target_id       TEXT,
    application_id  TEXT REFERENCES public.applications(id) ON DELETE SET NULL,
    metadata        JSONB DEFAULT '{}',
    ip_address      TEXT,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. SYSTEM EVENTS
CREATE TABLE IF NOT EXISTS public.system_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id  TEXT REFERENCES public.applications(id),
    event_type      TEXT NOT NULL,
    severity        TEXT NOT NULL DEFAULT 'info',
    title           TEXT NOT NULL,
    description     TEXT,
    metadata        JSONB DEFAULT '{}',
    resolved        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. GLOBAL ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,
    application_id  TEXT REFERENCES public.applications(id),
    status          TEXT NOT NULL DEFAULT 'draft',
    publish_at      TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_by      UUID REFERENCES public.qenbel_users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. RLS (service role only - admin backend uses service key server-side)
ALTER TABLE public.qenbel_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to see their own row (for login check)
CREATE POLICY "Users see own row" ON public.qenbel_users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Service role all qenbel_users" ON public.qenbel_users USING (auth.role() = 'service_role');
CREATE POLICY "Service role all applications" ON public.applications USING (auth.role() = 'service_role');
CREATE POLICY "Public read applications" ON public.applications FOR SELECT USING (true);
CREATE POLICY "Service role all app_users" ON public.application_users USING (auth.role() = 'service_role');
CREATE POLICY "Service role all audit" ON public.admin_audit_log USING (auth.role() = 'service_role');
CREATE POLICY "Service role all events" ON public.system_events USING (auth.role() = 'service_role');
CREATE POLICY "Service role all announcements" ON public.announcements USING (auth.role() = 'service_role');

-- 8. AUTO-SYNC: create qenbel_users row when auth.users row is created (via trigger)
CREATE OR REPLACE FUNCTION public.handle_new_qenbel_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.qenbel_users (id, email, full_name, avatar_url, global_roles)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'global_roles')),
            '{}'::text[]
        )
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.qenbel_users.full_name),
        last_login_at = now(),
        updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_qenbel_user();

-- 9. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER qenbel_users_updated_at BEFORE UPDATE ON public.qenbel_users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON public.applications
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 10. SEED ROOT SUPERADMIN
DO $$
DECLARE super_admin_uid UUID;
BEGIN
    SELECT id INTO super_admin_uid FROM auth.users WHERE email = 'admin.qenbel@gmail.com';
    IF super_admin_uid IS NOT NULL THEN
        UPDATE public.qenbel_users
        SET global_roles = ARRAY['superadmin'], status = 'active', updated_at = now()
        WHERE id = super_admin_uid;
    END IF;
END $$;
