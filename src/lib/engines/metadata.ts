/**
 * FCIP Engine Registry - Metadata Only
 * 
 * This file must be safe to import in Client Components.
 * Do NOT import any server-side logic or execution code here.
 */

export const ENGINE_REGISTRY = {
    // Existing engines
    entity_resolution: {
        id: 'entity_resolution',
        name: 'Entity Resolution',
        greek: 'Ε',
        greekFull: 'ἔργον',
        tagline: 'Name/alias/pronoun → canonical ID',
        description: 'Resolves entity references across documents to canonical identities',
        keyQuestion: 'Who is actually being referred to?',
        priority: null,
        status: 'active'
    },
    temporal_parser: {
        id: 'temporal_parser',
        name: 'Temporal Parser',
        greek: 'Τ',
        greekFull: 'χρόνος',
        tagline: 'Deadlines, court calendars, working days',
        description: 'Parses and validates dates, deadlines, and temporal references',
        keyQuestion: 'Do the events align with the stated timeline?',
        priority: null,
        status: 'active'
    },
    argumentation: {
        id: 'argumentation',
        name: 'Argumentation',
        greek: 'Α',
        greekFull: 'ἐπιχείρημα',
        tagline: 'Toulmin structures + UK legal rules',
        description: 'Analyzes argument structures using Toulmin model',
        keyQuestion: 'Is the argument logically sound and supported?',
        priority: null,
        status: 'planned'
    },
    bias_detection: {
        id: 'bias_detection',
        name: 'Bias Detection',
        greek: 'Β',
        greekFull: 'προκατάληψη',
        tagline: 'Statistical z-score analysis',
        description: 'Detects systematic bias patterns using statistical analysis',
        keyQuestion: 'Is there systematic bias against a party?',
        priority: null,
        status: 'planned'
    },
    contradiction: {
        id: 'contradiction',
        name: 'Contradiction',
        greek: 'Κ',
        greekFull: 'ἀντίφασις',
        tagline: 'Claim comparison across documents',
        description: 'Identifies contradictory claims across document corpus',
        keyQuestion: 'Do statements contradict each other across documents?',
        priority: null,
        status: 'active'
    },
    accountability_audit: {
        id: 'accountability_audit',
        name: 'Accountability Audit',
        greek: 'Λ',
        greekFull: 'λογοδοσία',
        tagline: 'Statutory duty violations',
        description: 'Audits compliance with statutory duties and obligations',
        keyQuestion: 'Did the authority follow statutory procedures?',
        priority: null,
        status: 'planned'
    },
    professional_tracker: {
        id: 'professional_tracker',
        name: 'Professional Tracker',
        greek: 'Π',
        greekFull: 'πρόσωπον',
        tagline: 'Per-professional behavior patterns',
        description: 'Tracks individual professional conduct across case history',
        keyQuestion: 'Is this professional behaving consistently?',
        priority: null,
        status: 'planned'
    },

    // V6.0 Engines
    omission: {
        id: 'omission',
        name: 'Omission Detection',
        greek: 'Ο',
        greekFull: 'παράλειψις',
        tagline: 'What Was Left Out',
        description: 'Identifies systematic gaps in professional reports by comparing source documents against reports',
        keyQuestion: 'Did omissions systematically favor one narrative?',
        priority: 1,
        status: 'active'
    },
    expert_witness: {
        id: 'expert_witness',
        name: 'Expert Witness',
        greek: 'Ξ',
        greekFull: 'ἐπιστήμη',
        tagline: 'Expertise Boundaries',
        description: 'Evaluates expert reports for PD25B/CPR Part 35 compliance (UK) and scope exceedances',
        keyQuestion: 'Did the expert stay within their expertise boundaries?',
        priority: 2,
        status: 'active'
    },
    documentary: {
        id: 'documentary',
        name: 'Documentary Analysis',
        greek: 'Δ',
        greekFull: 'κριτική',
        tagline: 'Editorial Scrutiny',
        description: 'Analyzes documentary evidence for editorial manipulation and bias',
        keyQuestion: 'Was evidence edited to support a particular narrative?',
        priority: 3,
        status: 'active'
    },
    narrative: {
        id: 'narrative',
        name: 'Narrative Evolution',
        greek: 'Μ',
        greekFull: 'μεταμόρφωσις',
        tagline: 'Story Drift',
        description: 'Tracks how claims mutate across documents over time',
        keyQuestion: 'Did the story drift consistently toward one conclusion?',
        priority: 4,
        status: 'active'
    },
    coordination: {
        id: 'coordination',
        name: 'Cross-Institutional',
        greek: 'Σ',
        greekFull: 'σύμπλεξις',
        tagline: 'Hidden Coordination',
        description: 'Detects improper coordination between institutions that should operate independently',
        keyQuestion: 'Were "independent" sources actually independent?',
        priority: 5,
        status: 'active'
    }
} as const

export type EngineId = keyof typeof ENGINE_REGISTRY

/**
 * Get engine metadata
 */
export function getEngine(engineId: EngineId) {
    return ENGINE_REGISTRY[engineId]
}

/**
 * Get all active engines
 */
export function getActiveEngines() {
    return Object.values(ENGINE_REGISTRY).filter(e => e.status === 'active')
}

/**
 * Get new v6.0 engines
 */
export function getNewEngines() {
    return Object.values(ENGINE_REGISTRY).filter(e => e.priority !== null)
}
