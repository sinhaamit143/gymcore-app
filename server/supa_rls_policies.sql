-- SUPABASE POSTGRESQL RLS (MULTI-TENANT POLICIES)

-- Enable RLS on Models
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Post" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Nutrition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;

-- Security Policy: Users can only see data belonging to their specific Gym.
-- Super Admins are permitted to bypass this (gymId IS NULL logic).

CREATE POLICY gym_tenant_isolation ON "User"
  FOR ALL
  USING (
    -- If using Supabase Native Auth
    "gymId" = (SELECT "gymId" FROM "User" WHERE id = auth.uid())
    OR 
    -- If injecting JWT from Node API via executeRaw
    "gymId" = current_setting('app.current_tenant', true)
    OR
    current_setting('app.current_role', true) = 'SUPER_ADMIN'
  );

CREATE POLICY gym_post_isolation ON "Post"
  FOR ALL
  USING (
    "userId" IN (SELECT id FROM "User" WHERE "gymId" = current_setting('app.current_tenant', true))
  );

-- (Repeat for Workout, Nutrition, Product based on Foreign Key linking)
