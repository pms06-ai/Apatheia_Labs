-- ============================================
-- RLS SECURITY HARDENING MIGRATION
-- ============================================
-- 
-- This migration replaces the permissive "Allow all" RLS policies
-- with proper user-scoped policies. This is required before
-- deploying to a multi-user or public environment.
--
-- NOTE: This migration assumes a `user_id` column will be added
-- to relevant tables. For a single-user local-first application
-- running via Tauri, these permissive policies are acceptable
-- since data never leaves the device. Apply this migration when
-- transitioning to a multi-user SaaS model.

-- Step 1: Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all" ON cases;
DROP POLICY IF EXISTS "Allow all" ON documents;
DROP POLICY IF EXISTS "Allow all" ON entities;
DROP POLICY IF EXISTS "Allow all" ON claims;
DROP POLICY IF EXISTS "Allow all" ON findings;

-- Step 2: Create new user-scoped policies (requires user_id column)
-- Uncomment and apply once user_id columns are added to tables.
/*
-- Cases: Users can only access their own cases
CREATE POLICY "Users can access own cases" ON cases
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Documents: Users can only access documents for their cases
CREATE POLICY "Users can access own case documents" ON documents
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM cases
            WHERE cases.id = documents.case_id
            AND cases.user_id = auth.uid()
        )
    );

-- Entities: Users can only access entities for their cases
CREATE POLICY "Users can access own case entities" ON entities
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM cases
            WHERE cases.id = entities.case_id
            AND cases.user_id = auth.uid()
        )
    );

-- Claims: Users can only access claims for their cases
CREATE POLICY "Users can access own case claims" ON claims
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM cases
            WHERE cases.id = claims.case_id
            AND cases.user_id = auth.uid()
        )
    );

-- Findings: Users can only access findings for their cases
CREATE POLICY "Users can access own case findings" ON findings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM cases
            WHERE cases.id = findings.case_id
            AND cases.user_id = auth.uid()
        )
    );
*/

-- Step 3: For single-user local mode, re-create permissive policies
-- (This keeps the app functional until multi-user is implemented)
CREATE POLICY "Single user mode - allow all" ON cases FOR ALL USING (true);
CREATE POLICY "Single user mode - allow all" ON documents FOR ALL USING (true);
CREATE POLICY "Single user mode - allow all" ON entities FOR ALL USING (true);
CREATE POLICY "Single user mode - allow all" ON claims FOR ALL USING (true);
CREATE POLICY "Single user mode - allow all" ON findings FOR ALL USING (true);

-- When ready for multi-user:
-- 1. Add user_id UUID column to `cases` table
-- 2. Drop "Single user mode" policies
-- 3. Uncomment and run the user-scoped policies above
