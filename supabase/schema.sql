-- ==============================================================================
-- Campus Lost & Found Intelligence System - Supabase Production Migration
-- ==============================================================================

-- Enable UUID & Crypto extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. USERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    student_id TEXT,
    phone TEXT,
    avatar_url TEXT,
    department TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'staff', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Automatic user sync trigger from auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_user_meta_data->>'role', 'student')
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Generic updated_at timestamp refresher
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 2. LOST ITEMS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.lost_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    distinctive_features TEXT,
    location_lost TEXT NOT NULL,
    building TEXT,
    room_or_area TEXT,
    date_lost DATE NOT NULL DEFAULT CURRENT_DATE,
    time_lost_range TEXT,
    image_urls TEXT[] DEFAULT '{}'::TEXT[],
    reward_amount NUMERIC(10, 2) DEFAULT 0.00,
    contact_email TEXT,
    contact_phone TEXT,
    status TEXT NOT NULL DEFAULT 'lost' CHECK (status IN ('lost', 'matched', 'claimed', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_lost_items_updated_at ON public.lost_items;
CREATE TRIGGER set_lost_items_updated_at
    BEFORE UPDATE ON public.lost_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 3. FOUND ITEMS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.found_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finder_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    location_found TEXT NOT NULL,
    building TEXT,
    room_or_area TEXT,
    date_found DATE NOT NULL DEFAULT CURRENT_DATE,
    image_urls TEXT[] DEFAULT '{}'::TEXT[],
    current_storage_location TEXT NOT NULL DEFAULT 'Campus Security / Lost & Found Office',
    finder_contact_info TEXT,
    status TEXT NOT NULL DEFAULT 'found' CHECK (status IN ('found', 'matched', 'claimed', 'returned', 'disposed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_found_items_updated_at ON public.found_items;
CREATE TRIGGER set_found_items_updated_at
    BEFORE UPDATE ON public.found_items
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 4. MATCHES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lost_item_id UUID NOT NULL REFERENCES public.lost_items(id) ON DELETE CASCADE,
    found_item_id UUID NOT NULL REFERENCES public.found_items(id) ON DELETE CASCADE,
    confidence_score NUMERIC(5, 2) NOT NULL CHECK (confidence_score >= 0.00 AND confidence_score <= 100.00),
    reasoning TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'resolved')),
    verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_lost_found_match UNIQUE (lost_item_id, found_item_id)
);

DROP TRIGGER IF EXISTS set_matches_updated_at ON public.matches;
CREATE TRIGGER set_matches_updated_at
    BEFORE UPDATE ON public.matches
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 5. CLAIMS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    found_item_id UUID NOT NULL REFERENCES public.found_items(id) ON DELETE CASCADE,
    claimant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    lost_item_id UUID REFERENCES public.lost_items(id) ON DELETE SET NULL,
    match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    proof_description TEXT NOT NULL,
    proof_image_urls TEXT[] DEFAULT '{}'::TEXT[],
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
    reviewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewer_notes TEXT,
    verified_at TIMESTAMPTZ,
    handover_location TEXT,
    handover_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_claims_updated_at ON public.claims;
CREATE TRIGGER set_claims_updated_at
    BEFORE UPDATE ON public.claims
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 6. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

CREATE INDEX IF NOT EXISTS idx_lost_items_user_id ON public.lost_items(user_id);
CREATE INDEX IF NOT EXISTS idx_lost_items_category ON public.lost_items(category);
CREATE INDEX IF NOT EXISTS idx_lost_items_status ON public.lost_items(status);
CREATE INDEX IF NOT EXISTS idx_lost_items_date_lost ON public.lost_items(date_lost DESC);
CREATE INDEX IF NOT EXISTS idx_lost_items_building ON public.lost_items(building);

CREATE INDEX IF NOT EXISTS idx_found_items_finder_id ON public.found_items(finder_id);
CREATE INDEX IF NOT EXISTS idx_found_items_category ON public.found_items(category);
CREATE INDEX IF NOT EXISTS idx_found_items_status ON public.found_items(status);
CREATE INDEX IF NOT EXISTS idx_found_items_date_found ON public.found_items(date_found DESC);
CREATE INDEX IF NOT EXISTS idx_found_items_building ON public.found_items(building);

CREATE INDEX IF NOT EXISTS idx_matches_lost_item_id ON public.matches(lost_item_id);
CREATE INDEX IF NOT EXISTS idx_matches_found_item_id ON public.matches(found_item_id);
CREATE INDEX IF NOT EXISTS idx_matches_confidence_score ON public.matches(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);

CREATE INDEX IF NOT EXISTS idx_claims_found_item_id ON public.claims(found_item_id);
CREATE INDEX IF NOT EXISTS idx_claims_claimant_id ON public.claims(claimant_id);
CREATE INDEX IF NOT EXISTS idx_claims_lost_item_id ON public.claims(lost_item_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.found_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Allow anonymous and authenticated access for campus client operations
DROP POLICY IF EXISTS "Public users access" ON public.users;
CREATE POLICY "Public users access" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public lost items access" ON public.lost_items;
CREATE POLICY "Public lost items access" ON public.lost_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public found items access" ON public.found_items;
CREATE POLICY "Public found items access" ON public.found_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public matches access" ON public.matches;
CREATE POLICY "Public matches access" ON public.matches FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public claims access" ON public.claims;
CREATE POLICY "Public claims access" ON public.claims FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 8. PRE-SEED DEMO PERSONAS
-- ==============================================================================
INSERT INTO public.users (id, email, full_name, student_id, phone, department, role)
VALUES 
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'alex.rivera@campus.edu', 'Alex Rivera', 'CS-2024-8901', '+1 (555) 234-5678', 'Computer Science', 'student'),
  ('b2c3d4e5-f6a7-4b6c-9d0e-1f2a3b4c5d6e', 'sarah.chen@campus.edu', 'Sarah Chen', 'BIO-2023-4512', '+1 (555) 345-6789', 'Biological Sciences', 'student'),
  ('c3d4e5f6-a7b8-4c7d-0e1f-2a3b4c5d6e7f', 'officer.johnson@campus.edu', 'Officer Mark Johnson', 'STAFF-9021', '+1 (555) 911-4321', 'Campus Security & Lost Property Office', 'staff')
ON CONFLICT (id) DO UPDATE
SET 
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  student_id = EXCLUDED.student_id,
  department = EXCLUDED.department,
  role = EXCLUDED.role;
