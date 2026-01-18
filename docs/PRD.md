# Phronesis FCIP - Product Requirements Document

**Version:** 1.0
**Date:** January 2026
**Status:** Active Development
**Classification:** Internal

---

## Executive Summary

### Product Vision

Phronesis is a free, local-first document analysis platform that gives everyday people and independent journalists the investigative tools that institutions use—but have never made accessible to the public.

### The Problem

When individuals face institutional power—fighting a medical malpractice case, documenting workplace discrimination, investigating local corruption, or challenging a wrongful custody decision—they encounter a fundamental asymmetry:

| Institutions Have                    | Individuals Have          |
| ------------------------------------ | ------------------------- |
| Dedicated legal teams                | Google and hope           |
| $150k/year document review platforms | Manual PDF reading        |
| Trained investigators                | YouTube tutorials         |
| Months of preparation time           | Desperation and deadlines |

The tools that could level this playing field exist—but they cost $10,000-$150,000/year and require specialized training. The result: individuals either hire lawyers they can't afford, or give up.

### The Solution

Phronesis democratizes document analysis by providing:

- **AI-assisted contradiction detection** across hundreds of documents
- **Automatic timeline construction** from scattered dates and events
- **Entity resolution** mapping who said what, when, and to whom
- **Structured methodology** (S.A.M.) guiding non-experts through forensic analysis
- **Professional exports** (PDF/DOCX) for sharing with lawyers, journalists, and regulators
- **Complete privacy** via local-first architecture—documents never leave the user's machine

### Strategic Position

**We are not competing with enterprise forensics tools.** We are creating a category that doesn't exist: professional-grade document analysis for people who currently have nothing.

| Segment                   | Tools Available                 | Phronesis Position |
| ------------------------- | ------------------------------- | ------------------ |
| Enterprise Legal          | Relativity, Concordance, Nuix   | Not competing      |
| Law Enforcement           | HOLMES2, i2 Analyst's Notebook  | Not competing      |
| Large Newsrooms           | Datashare, Aleph, DocumentCloud | Complementary      |
| **Freelance Journalists** | **Nothing affordable**          | **Primary target** |
| **Citizen Investigators** | **Nothing**                     | **Primary target** |

---

## Target Users

### Primary Persona: The Citizen Investigator

**Name:** Sarah, 42
**Situation:** Fighting a medical malpractice case after her mother's death
**Documents:** 200+ pages of medical records, correspondence, billing statements
**Technical skill:** Can use Word and email; no legal or investigative training
**Budget:** $0-500 for tools; already spent savings on initial legal consultation
**Time:** Evenings and weekends; works full-time
**Goal:** Find evidence that standard of care was violated; present organized findings to contingency lawyer to take the case

**Pain points:**

- Doesn't know what to look for in medical records
- Can't afford $400/hour document review
- Overwhelmed by volume and medical terminology
- Needs to present findings professionally to be taken seriously

**Success looks like:** Lawyer says "This is well-organized. You've identified real issues. I'll take the case."

---

### Primary Persona: The Freelance Investigative Journalist

**Name:** Marcus, 34
**Situation:** Investigating a local housing authority for corruption
**Documents:** 500+ FOIA documents, meeting minutes, contracts, emails
**Technical skill:** Comfortable with technology; no formal investigative training
**Budget:** $0-200/month; pays out of pocket, hopes to sell story
**Time:** Full-time on story for 2-3 months
**Goal:** Find pattern of contract steering to connected developers; build airtight narrative with documented evidence chain

**Pain points:**

- Drowning in documents; can't see the pattern
- Needs to track who knew what, when
- Must have bulletproof sourcing for publication
- Working alone without institutional support

**Success looks like:** Story published with clear evidence trail; no successful legal challenges.

---

### Secondary Persona: The Whistleblower

**Name:** David, 51
**Situation:** Documenting fraud at employer before reporting to regulators
**Documents:** Internal emails, financial reports, policy documents (legally obtained)
**Technical skill:** Expert in his field; not in investigation
**Budget:** $0; cannot leave paper trail of purchases
**Time:** Nights; must maintain normal work appearance
**Goal:** Organize evidence for SEC/OSHA/OIG complaint that can't be ignored

**Pain points:**

- Extreme privacy concerns; cannot use cloud tools
- Needs to show pattern, not just single incident
- Must present as credible, not disgruntled employee
- Fear of retaliation

**Success looks like:** Regulator opens formal investigation based on complaint.

---

### Secondary Persona: The Pro Se Litigant

**Name:** Jennifer, 38
**Situation:** Representing herself in custody modification hearing
**Documents:** Court filings, correspondence, school records, communication logs
**Technical skill:** Basic computer literacy
**Budget:** $0; already lost home in divorce
**Time:** All of it; children are everything
**Goal:** Demonstrate pattern of co-parent's violations of custody order

**Pain points:**

- Doesn't know legal standards or what evidence matters
- Emotional involvement clouds analysis
- Must appear organized and credible to judge
- Opposing counsel will exploit any weakness

**Success looks like:** Judge grants modification based on documented pattern.

---

## Core Requirements

### R1: Document Management

| ID    | Requirement                                         | Priority | Status  |
| ----- | --------------------------------------------------- | -------- | ------- |
| R1.1  | Upload documents via drag-drop or file picker       | P0       | Done    |
| R1.2  | Support PDF, DOCX, TXT, MD, HTML, CSV, JSON         | P0       | Done    |
| R1.3  | Extract text from PDFs (including scanned via OCR)  | P0       | Done    |
| R1.4  | Store documents locally with SHA-256 integrity hash | P0       | Done    |
| R1.5  | Organize documents by case                          | P0       | Done    |
| R1.6  | Document metadata (date, author, type) extraction   | P1       | Done    |
| R1.7  | Bulk import from Google Drive folder                | P1       | Done    |
| R1.8  | Document deduplication by content hash              | P2       | Done    |
| R1.9  | Full-text search within documents                   | P1       | Partial |
| R1.10 | Document viewer with highlighting                   | P2       | Planned |

### R2: Analysis Engines

| ID    | Requirement                                 | Priority | Status |
| ----- | ------------------------------------------- | -------- | ------ |
| R2.1  | Contradiction detection across documents    | P0       | Done   |
| R2.2  | Timeline extraction and construction        | P0       | Done   |
| R2.3  | Entity extraction and resolution            | P0       | Done   |
| R2.4  | Bias detection in document framing          | P1       | Done   |
| R2.5  | Omission detection (source vs. report gaps) | P1       | Done   |
| R2.6  | Accountability mapping (who had what duty)  | P1       | Done   |
| R2.7  | Professional conduct tracking               | P1       | Done   |
| R2.8  | Argumentation structure analysis            | P2       | Done   |
| R2.9  | Expert witness analysis (FJC compliance)    | P2       | Done   |
| R2.10 | Media reporting analysis                    | P2       | Done   |
| R2.11 | Narrative evolution tracking                | P2       | Done   |

### R3: S.A.M. Methodology

| ID   | Requirement                                | Priority | Status |
| ---- | ------------------------------------------ | -------- | ------ |
| R3.1 | ANCHOR phase: Identify claim origins       | P0       | Done   |
| R3.2 | INHERIT phase: Track claim propagation     | P0       | Done   |
| R3.3 | COMPOUND phase: Map authority accumulation | P0       | Done   |
| R3.4 | ARRIVE phase: Link to outcomes             | P0       | Done   |
| R3.5 | Progress tracking with phase timestamps    | P1       | Done   |
| R3.6 | Pause/resume capability for long analyses  | P1       | Done   |
| R3.7 | Cancel running analysis                    | P1       | Done   |

### R4: Results and Findings

| ID   | Requirement                                                                  | Priority | Status  |
| ---- | ---------------------------------------------------------------------------- | -------- | ------- |
| R4.1 | Findings with severity classification                                        | P0       | Done    |
| R4.2 | Source citations with page references                                        | P0       | Done    |
| R4.3 | Confidence scores for AI-generated findings                                  | P1       | Done    |
| R4.4 | Filter findings by engine, severity, date                                    | P1       | Done    |
| R4.5 | Link findings to source documents                                            | P0       | Done    |
| R4.6 | User can confirm/reject AI findings                                          | P0       | Partial |
| R4.7 | Add manual notes to findings                                                 | P2       | Planned |
| R4.8 | Audit trail showing reasoning chain                                          | P1       | Done    |
| R4.9 | Unverified findings are clearly flagged and excluded from exports by default | P0       | Planned |

### R5: Visualization

| ID   | Requirement                      | Priority | Status  |
| ---- | -------------------------------- | -------- | ------- |
| R5.1 | Timeline visualization of events | P1       | Done    |
| R5.2 | Entity relationship graph        | P1       | Done    |
| R5.3 | Contradiction network view       | P2       | Planned |
| R5.4 | Document similarity clustering   | P2       | Planned |
| R5.5 | Dashboard with case statistics   | P1       | Done    |

### R6: Export and Sharing

| ID   | Requirement                                                        | Priority | Status  |
| ---- | ------------------------------------------------------------------ | -------- | ------- |
| R6.1 | Export findings to PDF with citations                              | P0       | Done    |
| R6.2 | Export findings to DOCX (editable)                                 | P0       | Done    |
| R6.3 | Include methodology statement in exports                           | P1       | Done    |
| R6.4 | Include audit trail in exports                                     | P1       | Done    |
| R6.5 | Customizable export sections                                       | P2       | Done    |
| R6.6 | Export timeline as standalone document                             | P2       | Planned |
| R6.7 | Export entity map as image                                         | P2       | Planned |
| R6.8 | Include methodology version and engine versions in export metadata | P1       | Planned |

### R7: Privacy and Security

| ID   | Requirement                                 | Priority | Status  |
| ---- | ------------------------------------------- | -------- | ------- |
| R7.1 | All documents stored locally only           | P0       | Done    |
| R7.2 | API keys stored in OS keyring               | P0       | Done    |
| R7.3 | No telemetry or usage tracking              | P0       | Done    |
| R7.4 | Optional: fully offline mode with local LLM | P2       | Planned |
| R7.5 | Secure delete of case data                  | P1       | Planned |
| R7.6 | Export case for backup/transfer             | P2       | Planned |

### R8: User Experience

| ID   | Requirement                               | Priority | Status  |
| ---- | ----------------------------------------- | -------- | ------- |
| R8.1 | Onboarding flow explaining methodology    | P1       | Planned |
| R8.2 | Contextual help explaining legal concepts | P2       | Planned |
| R8.3 | Progress indicators for long operations   | P1       | Done    |
| R8.4 | Error messages with actionable guidance   | P1       | Partial |
| R8.5 | Dark mode                                 | P2       | Done    |
| R8.6 | Keyboard navigation                       | P2       | Partial |

---

## User Stories

### Document Management

```
US-001: Upload Documents
AS a citizen investigator
I WANT to upload documents by dragging them into the app
SO THAT I can quickly add my collected evidence
ACCEPTANCE CRITERIA:
- Drag-drop works for single and multiple files
- Progress indicator shows upload status
- Unsupported file types show clear error message
- Documents appear in list immediately after upload
```

```
US-002: Organize by Case
AS a freelance journalist
I WANT to organize documents into separate cases
SO THAT I can work on multiple investigations simultaneously
ACCEPTANCE CRITERIA:
- Can create new case with name and description
- Can move documents between cases
- Cases are isolated (analysis doesn't cross cases)
- Can delete case with confirmation
```

```
US-003: Import from Google Drive
AS a whistleblower
I WANT to bulk import documents from a Google Drive folder
SO THAT I can quickly ingest documents I've collected
ACCEPTANCE CRITERIA:
- OAuth flow opens in system browser
- Can browse Drive folders
- Can select folder for bulk import
- Progress shows files importing
- Documents downloaded locally, not synced
```

### Analysis

```
US-010: Find Contradictions
AS a citizen investigator
I WANT to automatically find contradictions across my documents
SO THAT I can identify where stories don't match
ACCEPTANCE CRITERIA:
- Can select which documents to analyze
- Analysis shows progress with estimated time
- Results show both contradicting statements with sources
- Can click through to view in original document
- Results explain why statements contradict
```

```
US-011: Build Timeline
AS a pro se litigant
I WANT to automatically extract a timeline from my documents
SO THAT I can see the sequence of events clearly
ACCEPTANCE CRITERIA:
- Extracts dates and associated events
- Shows source document for each event
- Timeline is sortable and filterable
- Can manually add events not detected
- Can export timeline as standalone document
```

```
US-012: Map Entities
AS a freelance journalist
I WANT to see all people and organizations mentioned across documents
SO THAT I can understand who the players are
ACCEPTANCE CRITERIA:
- Extracts names of people and organizations
- Resolves variations ("Dr. Smith", "John Smith", "Smith")
- Shows which documents mention each entity
- Can merge incorrectly split entities
- Can view entity relationship graph
```

```
US-013: Run Full Investigation
AS a citizen investigator
I WANT to run a complete S.A.M. analysis
SO THAT I get a comprehensive view of my case
ACCEPTANCE CRITERIA:
- Single button starts full analysis
- Progress shows current phase
- Can pause and resume later
- Can cancel if taking too long
- Results organized by category
```

### Review and Verification

```
US-020: Verify AI Findings
AS a careful user
I WANT to review and confirm AI-generated findings
SO THAT I don't include errors in my final report
ACCEPTANCE CRITERIA:
- Each finding shows confidence score
- Can mark finding as "verified" or "rejected"
- Can add notes explaining my verification
- Rejected findings hidden but not deleted
- Export only includes verified findings (optional)
```

```
US-021: View Audit Trail
AS a freelance journalist
I WANT to see how each finding was derived
SO THAT I can explain my methodology to editors
ACCEPTANCE CRITERIA:
- Each finding links to audit trail
- Audit trail shows source documents consulted
- Shows reasoning steps taken
- Includes confidence at each step
- Can export audit trail with finding
```

### Export

```
US-030: Generate Report
AS a citizen investigator
I WANT to export my findings as a professional PDF
SO THAT I can share with my lawyer
ACCEPTANCE CRITERIA:
- Professional formatting with cover page
- Table of contents
- Findings with citations
- Timeline section
- Entity reference section
- Methodology explanation
- Page numbers and timestamps
```

```
US-031: Generate Editable Report
AS a freelance journalist
I WANT to export to Word format
SO THAT I can edit and integrate into my article
ACCEPTANCE CRITERIA:
- Standard DOCX format opens in Word/Google Docs
- Headings are proper heading styles
- Tables are editable
- Citations are formatted consistently
- Can select which sections to include
```

---

## Technical Requirements

### Platform

| Requirement        | Specification                                            |
| ------------------ | -------------------------------------------------------- |
| Desktop OS         | macOS 12+, Windows 10+, Linux (Ubuntu 22.04+)            |
| Architecture       | Tauri 2.x (Rust backend, WebView frontend)               |
| Frontend           | React 18, TypeScript, Tailwind CSS                       |
| Database           | SQLite with sqlx                                         |
| AI Providers       | Claude, GPT-4, Gemini (user provides key)                |
| Offline Capability | Core features work offline; AI features require internet |

### Performance

| Metric                           | Target                     |
| -------------------------------- | -------------------------- |
| App startup                      | < 3 seconds                |
| Document upload (10MB PDF)       | < 5 seconds                |
| OCR processing (10 pages)        | < 30 seconds               |
| Contradiction analysis (50 docs) | < 5 minutes                |
| Memory usage                     | < 500MB baseline           |
| Database size                    | < 100MB per 1000 documents |

### Security

| Requirement      | Implementation                                          |
| ---------------- | ------------------------------------------------------- |
| API key storage  | OS keyring (Keychain/Credential Manager/Secret Service) |
| Document storage | Local filesystem, never transmitted                     |
| Network requests | Only to AI provider APIs, only during analysis          |
| Update mechanism | User-initiated only; no auto-update                     |

### Accessibility

| Requirement           | Status           |
| --------------------- | ---------------- |
| Keyboard navigation   | Partial          |
| Screen reader support | Planned          |
| High contrast mode    | Via system theme |
| Font size adjustment  | Planned          |

---

## Success Metrics

### Adoption Metrics

| Metric               | 6-Month Target | 12-Month Target |
| -------------------- | -------------- | --------------- |
| Downloads            | 5,000          | 25,000          |
| Monthly active users | 500            | 2,500           |
| Cases created        | 1,000          | 10,000          |
| Documents analyzed   | 50,000         | 500,000         |

### Engagement Metrics

| Metric                         | Target |
| ------------------------------ | ------ |
| Documents per case (median)    | 25+    |
| Analyses run per case (median) | 3+     |
| Reports exported per case      | 1+     |
| Return usage (30-day)          | 40%+   |

### Quality Metrics

| Metric                                        | Target             |
| --------------------------------------------- | ------------------ |
| Crash rate                                    | < 0.1% of sessions |
| Analysis completion rate                      | > 95%              |
| Export success rate                           | > 99%              |
| User-reported bugs (P0/P1)                    | < 5/month          |
| Findings with direct quotes + page references | > 90%              |

### Outcome Metrics (Qualitative)

- User testimonials of successful outcomes
- Media mentions of Phronesis-assisted investigations
- Regulatory complaints citing Phronesis analysis
- Legal cases using Phronesis-generated evidence

---

## Roadmap

### Phase 1: Foundation (Completed)

- [x] Core document management
- [x] PDF text extraction and OCR
- [x] SQLite database with case organization
- [x] Basic analysis engines (contradiction, temporal, entity)
- [x] PDF/DOCX export
- [x] Settings and API key management

### Phase 2: Analysis Depth (Current)

- [x] Full 11-engine suite
- [x] S.A.M. methodology implementation
- [x] Audit trail generation
- [x] Entity relationship visualization
- [x] Timeline visualization
- [x] Google Drive import
- [ ] Finding verification workflow
- [ ] Manual annotation capability

### Phase 3: User Experience (Q2 2026)

- [ ] Onboarding tutorial
- [ ] Contextual help system
- [ ] Document viewer with highlighting
- [ ] Improved error messaging
- [ ] Keyboard shortcuts
- [ ] Search within results

### Phase 4: Advanced Features (Q3 2026)

- [ ] Local LLM support (Ollama/llama.cpp)
- [ ] Collaboration (shared case export/import)
- [ ] Template investigations (medical malpractice, discrimination, etc.)
- [ ] Regulatory body complaint generators
- [ ] Witness statement comparison

### Phase 5: Ecosystem (Q4 2026)

- [ ] Obsidian plugin for research integration
- [ ] MCP server for Claude integration
- [ ] API for custom integrations
- [ ] Community-contributed analysis templates

---

## Constraints and Assumptions

### Constraints

1. **Budget**: Development is self-funded; no enterprise sales team
2. **AI Costs**: Users must provide their own API keys
3. **Legal**: Cannot provide legal advice; tool only assists analysis
4. **Support**: Community support only; no paid support tier
5. **File Size**: 50MB per file limit (no video/audio processing yet)
6. **Scale**: Not optimized for 100,000+ document discovery sets

### Assumptions

1. Users have basic computer literacy (can install apps, manage files)
2. Users have access to their documents in digital form
3. Users have internet access for AI-powered analysis
4. Users will verify AI findings before acting on them
5. Target users are motivated by personal stakes in outcomes

### Dependencies

1. Anthropic/OpenAI/Google AI APIs remain accessible and affordable
2. Tauri framework continues development and security updates
3. PDF extraction libraries remain maintained
4. Target OS platforms maintain WebView compatibility

---

## Risks and Mitigations

| Risk                              | Impact | Likelihood | Mitigation                                                   |
| --------------------------------- | ------ | ---------- | ------------------------------------------------------------ |
| AI hallucination causes user harm | High   | Medium     | Verification workflow, confidence scores, prominent warnings |
| AI API costs become prohibitive   | High   | Low        | Local LLM support roadmap                                    |
| User creates defamatory report    | Medium | Medium     | Methodology warnings, audit trail shows AI-assisted          |
| Legal challenge to tool           | Medium | Low        | Clear disclaimers, no legal advice, user responsibility      |
| Enterprise copies features        | Low    | Medium     | Stay focused on underserved market, community goodwill       |

---

## Trust and Safety

- AI-assisted findings must be verified by the user before inclusion in exports.
- Every finding should include source quotes and page references when available.
- Clear warnings: Phronesis is not legal advice and does not replace professional counsel.
- Confidence scores are explanatory, not evidentiary; users must validate against originals.

---

## Appendix A: Competitive Landscape

### Enterprise Tools (Not Competing)

| Tool                  | Price         | Market                           |
| --------------------- | ------------- | -------------------------------- |
| Relativity            | $150k+/year   | Large law firms, corporations    |
| Nuix                  | $100k+/year   | Government, large investigations |
| Concordance           | $50k+/year    | Mid-size law firms               |
| i2 Analyst's Notebook | $10k+/license | Law enforcement, intelligence    |

### Journalism Tools (Complementary)

| Tool           | Price | Market                             |
| -------------- | ----- | ---------------------------------- |
| ICIJ Datashare | Free  | Large collaborative investigations |
| Aleph (OCCRP)  | Free  | Investigative newsrooms            |
| DocumentCloud  | Free  | Newsrooms with IT support          |
| Overview       | Free  | Newsrooms                          |

### Consumer Tools (Adjacent)

| Tool          | Price     | Gap                               |
| ------------- | --------- | --------------------------------- |
| Adobe Acrobat | $180/year | No analysis, just PDF editing     |
| Notion        | $96/year  | Organization only, no analysis    |
| Obsidian      | Free      | Note-taking, no document analysis |

### Phronesis Position

**Only tool providing**: Free + Local + AI-assisted analysis + Structured methodology + Professional export

---

## Appendix B: Glossary

| Term        | Definition                                                         |
| ----------- | ------------------------------------------------------------------ |
| S.A.M.      | Systematic Adversarial Methodology - four-phase analysis framework |
| ANCHOR      | S.A.M. phase: Identify origin points of claims                     |
| INHERIT     | S.A.M. phase: Track claim propagation without verification         |
| COMPOUND    | S.A.M. phase: Map authority accumulation through repetition        |
| ARRIVE      | S.A.M. phase: Link claim chains to outcomes                        |
| Finding     | An identified issue (contradiction, omission, bias, etc.)          |
| Entity      | A person or organization mentioned in documents                    |
| Audit Trail | Step-by-step record of how a finding was derived                   |

---

## Document History

| Version | Date       | Author        | Changes     |
| ------- | ---------- | ------------- | ----------- |
| 1.0     | 2026-01-17 | Apatheia Labs | Initial PRD |
