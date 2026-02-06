-- Create a function to verify admin credentials
-- This bypasses RLS and runs with elevated privileges

CREATE OR REPLACE FUNCTION public.verify_admin_login(
  p_username TEXT,
  p_password TEXT
)
RETURNS TABLE (
  user_id TEXT,
  email TEXT,
  full_name TEXT,
  role TEXT,
  is_active BOOLEAN
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.is_active
  FROM admin_credentials ac
  JOIN users u ON u.id = ac.user_id
  WHERE ac.username = LOWER(TRIM(p_username))
    AND ac.password = p_password
    AND u.is_active = true
    AND u.role = 'admin'
  LIMIT 1;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.verify_admin_login(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_admin_login(TEXT, TEXT) TO authenticated;
