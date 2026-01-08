-- ============================================
-- ADD S.A.M. CAUSATION CHAINS TABLE
-- ============================================
--
-- This migration adds the sam_causation_chains table which stores
-- the causal relationships identified during the ARRIVE phase of
-- S.A.M. analysis. Each chain links an outcome to its root claims
-- and tracks the propagation path and authority accumulation.

-- Create the causation chains table
CREATE TABLE IF NOT EXISTS sam_causation_chains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    outcome_id UUID REFERENCES sam_outcomes(id) ON DELETE CASCADE,

    -- Chain data
    root_claims UUID[] DEFAULT '{}',          -- Claim IDs that originated the chain
    propagation_path UUID[] DEFAULT '{}',     -- Ordered list of propagation IDs
    authority_accumulation INTEGER DEFAULT 0,  -- Count of authority markers along path

    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_sam_causation_chains_case ON sam_causation_chains(case_id);
CREATE INDEX IF NOT EXISTS idx_sam_causation_chains_outcome ON sam_causation_chains(outcome_id);

-- Add comment for documentation
COMMENT ON TABLE sam_causation_chains IS 'S.A.M. ARRIVE phase causation chains linking outcomes to root claims';
COMMENT ON COLUMN sam_causation_chains.root_claims IS 'Array of claim_origins IDs that originated this causal chain';
COMMENT ON COLUMN sam_causation_chains.propagation_path IS 'Ordered array of claim_propagations IDs showing claim spread';
COMMENT ON COLUMN sam_causation_chains.authority_accumulation IS 'Count of authority_markers encountered along the propagation path';
