-- Fix recursive RLS policies by introducing a SECURITY DEFINER helper
-- and rewriting admin policies to use it instead of self-referencing tables.

-- 1) Helper function to check if a user is admin.
-- Note: SECURITY DEFINER executes with table owner privileges and bypasses RLS,
-- which prevents recursion when policies on the same table are evaluated.
CREATE OR REPLACE FUNCTION public.is_admin(check_uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin BOOLEAN;
BEGIN
  SELECT p.is_admin
    INTO admin
  FROM public.profiles p
  WHERE p.user_id = check_uid;

  RETURN COALESCE(admin, false);
END;
$$;

-- Allow anon and authenticated roles to call the function in policy contexts
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated;

-- 2) Rewrite profiles policies to avoid recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

-- 3) Rewrite resumes policies to avoid recursion via profiles
DROP POLICY IF EXISTS "Admins can view all resumes" ON public.resumes;
CREATE POLICY "Admins can view all resumes"
  ON public.resumes FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all resumes" ON public.resumes;
CREATE POLICY "Admins can update all resumes"
  ON public.resumes FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- 4) Rewrite storage policies for resumes bucket (view all resume files)
DROP POLICY IF EXISTS "Admins can view all resume files" ON storage.objects;
CREATE POLICY "Admins can view all resume files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'resumes' AND public.is_admin(auth.uid())
  );
