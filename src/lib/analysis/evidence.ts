export interface CoordinationEvidence {
  phrase?: string
  documents?: Array<{ institution?: string; documentName?: string }>
  source?: string
  target?: string
  type?: string
  institutions?: string[]
}

export interface OmissionEvidence {
  sourceContent?: string
  reportContent?: string
  omittedContent?: string
}

export interface ContradictionEvidence {
  claim1?: { text?: string; author?: string }
  claim2?: { text?: string; author?: string }
  implication?: string
  explanation?: string
}

export interface NarrativeEvidence {
  date?: string
  driftDirection?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function asCoordinationEvidence(evidence: unknown): CoordinationEvidence {
  if (!isRecord(evidence)) return {}
  const documents = Array.isArray(evidence.documents)
    ? evidence.documents.flatMap((doc) => {
        if (!isRecord(doc)) return []
        return [
          {
            institution:
              typeof doc.institution === 'string' ? doc.institution : undefined,
            documentName:
              typeof doc.documentName === 'string' ? doc.documentName : undefined,
          },
        ]
      })
    : undefined
  return {
    phrase: typeof evidence.phrase === 'string' ? evidence.phrase : undefined,
    source: typeof evidence.source === 'string' ? evidence.source : undefined,
    target: typeof evidence.target === 'string' ? evidence.target : undefined,
    type: typeof evidence.type === 'string' ? evidence.type : undefined,
    institutions: Array.isArray(evidence.institutions)
      ? evidence.institutions.filter((value): value is string => typeof value === 'string')
      : undefined,
    documents,
  }
}

export function asOmissionEvidence(evidence: unknown): OmissionEvidence {
  if (!isRecord(evidence)) return {}
  return {
    sourceContent:
      typeof evidence.sourceContent === 'string' ? evidence.sourceContent : undefined,
    reportContent:
      typeof evidence.reportContent === 'string' ? evidence.reportContent : undefined,
    omittedContent:
      typeof evidence.omittedContent === 'string' ? evidence.omittedContent : undefined,
  }
}

export function asContradictionEvidence(evidence: unknown): ContradictionEvidence {
  if (!isRecord(evidence)) return {}
  const claim1 = isRecord(evidence.claim1) ? evidence.claim1 : null
  const claim2 = isRecord(evidence.claim2) ? evidence.claim2 : null
  return {
    claim1: claim1
      ? {
          text: typeof claim1.text === 'string' ? claim1.text : undefined,
          author: typeof claim1.author === 'string' ? claim1.author : undefined,
        }
      : undefined,
    claim2: claim2
      ? {
          text: typeof claim2.text === 'string' ? claim2.text : undefined,
          author: typeof claim2.author === 'string' ? claim2.author : undefined,
        }
      : undefined,
    implication: typeof evidence.implication === 'string' ? evidence.implication : undefined,
    explanation: typeof evidence.explanation === 'string' ? evidence.explanation : undefined,
  }
}

export function asNarrativeEvidence(evidence: unknown): NarrativeEvidence {
  if (!isRecord(evidence)) return {}
  return {
    date: typeof evidence.date === 'string' ? evidence.date : undefined,
    driftDirection:
      typeof evidence.driftDirection === 'string' ? evidence.driftDirection : undefined,
  }
}
