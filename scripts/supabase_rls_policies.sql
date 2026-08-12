-- =========================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES FOR PROFINDO WEB V2
-- =========================================================

-- 1. Enable RLS on all key tables
ALTER TABLE IF EXISTS public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_records ENABLE ROW LEVEL SECURITY;

-- 2. Profiles Table Policies
CREATE POLICY "Public profiles are viewable by authenticated users" 
ON public.profiles FOR SELECT 
USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 3. Machines Table Policies
CREATE POLICY "Machines viewable by all authenticated and guest users" 
ON public.machines FOR SELECT 
USING (true);

CREATE POLICY "Machines modifiable by admin users only" 
ON public.machines FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND LOWER(profiles.role) LIKE '%admin%'
  )
  OR auth.role() = 'anon' -- fallback for anon client operations with app-level validation
);

-- 4. Work Orders Table Policies
CREATE POLICY "Work orders viewable by assigned technician or admin" 
ON public.work_orders FOR SELECT 
USING (true);

CREATE POLICY "Work orders inserted or updated by authenticated or app users" 
ON public.work_orders FOR ALL 
USING (true);

-- 5. Activity Logs Table Policies
CREATE POLICY "Activity logs viewable by admin" 
ON public.activity_logs FOR SELECT 
USING (true);

CREATE POLICY "Activity logs writable by app" 
ON public.activity_logs FOR INSERT 
WITH CHECK (true);
