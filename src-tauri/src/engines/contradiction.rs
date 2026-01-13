//! CONTRADICTION ENGINE (Κ)
//!
//! "Claim Comparison Across Documents"
//!
//! Detects contradictions, inconsistencies, and evolving claims
//! across multiple documents in a case.
//!
//! Core Question: Do statements contradict each other across documents?

use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::ai::AIClient;

/// Types of contradictions detected
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ContradictionType {
    /// Explicit opposite statements ("X happened" vs "X did not happen")
    Direct,
    /// Logically incompatible claims (timing, location, presence)
    Implicit,
    /// Timeline inconsistencies (dates, sequences, durations)
    Temporal,
    /// Number/measurement discrepancies
    Quantitative,
    /// Different people credited for same action
    Attributional,
}

impl ContradictionType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ContradictionType::Direct => "direct",
            ContradictionType::Implicit => "implicit",
            ContradictionType::Temporal => "temporal",
            ContradictionType::Quantitative => "quantitative",
            ContradictionType::Attributional => "attributional",
        }
    }
}

/// Severity of a contradiction
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Critical,
    High,
    Medium,
    Low,
}

impl Severity {
    pub fn as_str(&self) -> &'static str {
        match self {
            Severity::Critical => "critical",
            Severity::High => "high",
            Severity::Medium => "medium",
            Severity::Low => "low",
        }
    }
}

/// A reference to a claim in a document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaimReference {
    pub document_id: String,
    pub document_name: String,
    pub text: String,
    pub date: Option<String>,
    pub author: Option<String>,
    pub page_ref: Option<i32>,
}

/// A detected contradiction between two claims
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContradictionFinding {
    pub id: String,
    #[serde(rename = "type")]
    pub contradiction_type: ContradictionType,
    pub severity: Severity,
    pub claim1: ClaimReference,
    pub claim2: ClaimReference,
    pub explanation: String,
    pub implication: String,
    pub suggested_resolution: Option<String>,
}

/// A cluster of claims on the same topic
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaimCluster {
    pub topic: String,
    pub claims: Vec<ClusterClaim>,
    pub consensus: bool,
}

/// A single claim within a cluster
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterClaim {
    pub doc_id: String,
    pub text: String,
    pub stance: String,
}

/// Credibility impact assessment
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CredibilityImpact {
    Severe,
    Moderate,
    Minor,
    None,
}

/// Summary of contradiction analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisSummary {
    pub total_contradictions: usize,
    pub critical_count: usize,
    pub most_contradicted_topics: Vec<String>,
    pub credibility_impact: CredibilityImpact,
}

/// Complete result of contradiction analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContradictionAnalysisResult {
    pub contradictions: Vec<ContradictionFinding>,
    pub claim_clusters: Vec<ClaimCluster>,
    pub summary: AnalysisSummary,
}

/// Document info for analysis
#[derive(Debug, Clone)]
pub struct DocumentInfo {
    pub id: String,
    pub name: String,
    pub doc_type: String,
    pub date: Option<String>,
    pub content: String,
}

/// AI response format for contradiction detection
#[derive(Debug, Deserialize)]
struct AIContradictionResponse {
    contradictions: Vec<AIContradiction>,
    #[serde(rename = "claimClusters", default)]
    claim_clusters: Vec<AIClaimCluster>,
}

#[derive(Debug, Deserialize)]
struct AIContradiction {
    #[serde(rename = "type")]
    contradiction_type: String,
    severity: String,
    claim1: AIClaim,
    claim2: AIClaim,
    explanation: String,
    implication: String,
    #[serde(rename = "suggestedResolution")]
    suggested_resolution: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AIClaim {
    #[serde(rename = "documentId")]
    document_id: String,
    text: String,
    date: Option<String>,
    author: Option<String>,
    #[serde(rename = "pageRef")]
    page_ref: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct AIClaimCluster {
    topic: String,
    claims: Vec<AIClusterClaim>,
    consensus: bool,
}

#[derive(Debug, Deserialize)]
struct AIClusterClaim {
    #[serde(rename = "docId")]
    doc_id: String,
    text: String,
    stance: String,
}

/// AI response for claim comparison
#[derive(Debug, Deserialize)]
struct AIComparisonResponse {
    contradicts: bool,
    #[serde(rename = "type")]
    contradiction_type: Option<String>,
    explanation: String,
    severity: Option<String>,
}

/// The Contradiction Engine
pub struct ContradictionEngine {
    pool: SqlitePool,
    ai_client: Option<AIClient>,
    mock_mode: bool,
}

impl ContradictionEngine {
    /// Create a new contradiction engine with database connection
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            pool,
            ai_client: None,
            mock_mode: false,
        }
    }

    /// Configure with AI client
    pub fn with_ai_client(mut self, client: AIClient) -> Self {
        self.ai_client = Some(client);
        self
    }

    /// Enable mock mode for testing
    pub fn with_mock_mode(mut self, mock: bool) -> Self {
        self.mock_mode = mock;
        self
    }

    /// Try to initialize AI client from environment
    pub fn try_init_ai(&mut self) -> Result<(), String> {
        match AIClient::from_env() {
            Ok(client) => {
                self.ai_client = Some(client);
                Ok(())
            }
            Err(e) => {
                log::warn!("AI client not available: {}", e);
                self.mock_mode = true;
                Err(e)
            }
        }
    }

    /// Detect contradictions across a set of documents
    pub async fn detect_contradictions(
        &self,
        documents: Vec<DocumentInfo>,
        case_id: &str,
    ) -> Result<ContradictionAnalysisResult, String> {
        if documents.is_empty() {
            return Err("No documents provided for analysis".to_string());
        }

        // If in mock mode or no AI client, return mock data
        if self.mock_mode || self.ai_client.is_none() {
            return self.mock_detect_contradictions(&documents, case_id).await;
        }

        let ai_client = self.ai_client.as_ref().unwrap();

        // Format documents for prompt
        let formatted_docs = documents
            .iter()
            .map(|d| {
                format!(
                    "=== DOCUMENT: {} (ID: {}, Type: {}) ===\n{}",
                    d.name,
                    d.id,
                    d.doc_type,
                    &d.content[..d.content.len().min(50000)]
                )
            })
            .collect::<Vec<_>>()
            .join("\n\n---\n\n");

        let prompt = format!(
            r#"Find all contradictions between statements in these documents. Types of contradictions:
1. DIRECT: Explicit opposite statements ("X happened" vs "X did not happen")
2. IMPLICIT: Logically incompatible claims (timing, location, presence)
3. TEMPORAL: Timeline inconsistencies (dates, sequences, durations)
4. QUANTITATIVE: Number/measurement discrepancies
5. ATTRIBUTIONAL: Different people credited for same action

For each contradiction found:
- Quote the exact conflicting text from each document
- Identify the document source and page if available
- Explain why these statements contradict
- Rate severity based on impact on case
- Suggest how to resolve (if possible)

Focus on contradictions that affect:
- Credibility of witnesses/parties
- Timeline of events
- Presence or absence of people
- Actions taken or not taken
- Professional assessments

DOCUMENTS TO ANALYZE:
{}

Respond in JSON:
{{
  "contradictions": [
    {{
      "type": "direct|implicit|temporal|quantitative|attributional",
      "severity": "critical|high|medium|low",
      "claim1": {{
        "documentId": "...",
        "text": "...",
        "date": "...",
        "author": "...",
        "pageRef": number
      }},
      "claim2": {{
        "documentId": "...",
        "text": "...",
        "date": "...",
        "author": "...",
        "pageRef": number
      }},
      "explanation": "...",
      "implication": "...",
      "suggestedResolution": "..."
    }}
  ],
  "claimClusters": [
    {{
      "topic": "...",
      "claims": [{{"docId": "...", "text": "...", "stance": "..."}}],
      "consensus": true/false
    }}
  ]
}}"#,
            formatted_docs
        );

        let system = "You are a forensic document analyst specializing in detecting contradictions across legal documents.";

        let response: AIContradictionResponse = ai_client
            .prompt_json_with_system(system, &prompt)
            .await?;

        // Convert AI response to our types
        let contradictions = response
            .contradictions
            .into_iter()
            .enumerate()
            .map(|(idx, c)| {
                let doc1_name = documents
                    .iter()
                    .find(|d| d.id == c.claim1.document_id)
                    .map(|d| d.name.clone())
                    .unwrap_or_else(|| "Unknown".to_string());

                let doc2_name = documents
                    .iter()
                    .find(|d| d.id == c.claim2.document_id)
                    .map(|d| d.name.clone())
                    .unwrap_or_else(|| "Unknown".to_string());

                ContradictionFinding {
                    id: format!("contradiction-{}-{}", &case_id[..8.min(case_id.len())], idx),
                    contradiction_type: parse_contradiction_type(&c.contradiction_type),
                    severity: parse_severity(&c.severity),
                    claim1: ClaimReference {
                        document_id: c.claim1.document_id,
                        document_name: doc1_name,
                        text: c.claim1.text,
                        date: c.claim1.date,
                        author: c.claim1.author,
                        page_ref: c.claim1.page_ref,
                    },
                    claim2: ClaimReference {
                        document_id: c.claim2.document_id,
                        document_name: doc2_name,
                        text: c.claim2.text,
                        date: c.claim2.date,
                        author: c.claim2.author,
                        page_ref: c.claim2.page_ref,
                    },
                    explanation: c.explanation,
                    implication: c.implication,
                    suggested_resolution: c.suggested_resolution,
                }
            })
            .collect::<Vec<_>>();

        let claim_clusters = response
            .claim_clusters
            .into_iter()
            .map(|c| ClaimCluster {
                topic: c.topic,
                claims: c
                    .claims
                    .into_iter()
                    .map(|claim| ClusterClaim {
                        doc_id: claim.doc_id,
                        text: claim.text,
                        stance: claim.stance,
                    })
                    .collect(),
                consensus: c.consensus,
            })
            .collect::<Vec<_>>();

        let summary = self.build_summary(&contradictions, &claim_clusters);

        // Store in database
        self.store_contradictions(case_id, &contradictions).await?;

        Ok(ContradictionAnalysisResult {
            contradictions,
            claim_clusters,
            summary,
        })
    }

    /// Compare two specific claims for contradiction
    pub async fn compare_claims(
        &self,
        claim1: &str,
        claim2: &str,
        context: Option<&str>,
    ) -> Result<ClaimComparisonResult, String> {
        if self.mock_mode || self.ai_client.is_none() {
            return Ok(ClaimComparisonResult {
                contradicts: false,
                contradiction_type: None,
                explanation: "Mock mode - unable to analyze".to_string(),
                severity: None,
            });
        }

        let ai_client = self.ai_client.as_ref().unwrap();

        let prompt = format!(
            r#"Compare these two claims for contradiction:

CLAIM 1: "{}"
CLAIM 2: "{}"
{}

Analyze:
1. Do these claims contradict each other?
2. If yes, what type of contradiction (direct/implicit/temporal/quantitative/attributional)?
3. Explain the nature of the contradiction
4. Rate severity if contradictory

Respond in JSON:
{{
  "contradicts": boolean,
  "type": "direct|implicit|temporal|quantitative|attributional" or null,
  "explanation": "...",
  "severity": "critical|high|medium|low" or null
}}"#,
            claim1,
            claim2,
            context.map(|c| format!("CONTEXT: {}", c)).unwrap_or_default()
        );

        let response: AIComparisonResponse = ai_client
            .prompt_json_with_system("Compare claims for contradiction.", &prompt)
            .await?;

        Ok(ClaimComparisonResult {
            contradicts: response.contradicts,
            contradiction_type: response.contradiction_type.map(|t| parse_contradiction_type(&t)),
            explanation: response.explanation,
            severity: response.severity.map(|s| parse_severity(&s)),
        })
    }

    /// Mock detection for testing
    async fn mock_detect_contradictions(
        &self,
        documents: &[DocumentInfo],
        case_id: &str,
    ) -> Result<ContradictionAnalysisResult, String> {
        log::warn!("MOCK MODE: Contradiction engine running without AI. Results are simulated.");

        // Simulate processing time
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        let doc1_id = documents.first().map(|d| d.id.clone()).unwrap_or_else(|| "mock-doc-1".to_string());
        let doc2_id = documents.get(1).map(|d| d.id.clone()).unwrap_or_else(|| "mock-doc-2".to_string());
        let doc3_id = documents.get(2).map(|d| d.id.clone()).unwrap_or_else(|| "mock-doc-3".to_string());

        let contradictions = vec![
            ContradictionFinding {
                id: format!("contradiction-{}-0", &case_id[..8.min(case_id.len())]),
                contradiction_type: ContradictionType::Direct,
                severity: Severity::Critical,
                claim1: ClaimReference {
                    document_id: doc1_id.clone(),
                    document_name: documents.first().map(|d| d.name.clone()).unwrap_or_else(|| "Document 1".to_string()),
                    text: "Subject was at home all night".to_string(),
                    date: Some("2023-01-12T10:00:00Z".to_string()),
                    author: Some("Officer A".to_string()),
                    page_ref: Some(2),
                },
                claim2: ClaimReference {
                    document_id: doc2_id.clone(),
                    document_name: documents.get(1).map(|d| d.name.clone()).unwrap_or_else(|| "Document 2".to_string()),
                    text: "Subject was seen at the pub at 9pm".to_string(),
                    date: Some("2023-01-15T14:30:00Z".to_string()),
                    author: Some("Social Worker B".to_string()),
                    page_ref: Some(5),
                },
                explanation: "Direct contradiction regarding the subject's location on the night of the incident.".to_string(),
                implication: "Undermines the credibility of the subject's alibi.".to_string(),
                suggested_resolution: Some("Verify CCTV footage or third-party witness statements.".to_string()),
            },
            ContradictionFinding {
                id: format!("contradiction-{}-1", &case_id[..8.min(case_id.len())]),
                contradiction_type: ContradictionType::Temporal,
                severity: Severity::High,
                claim1: ClaimReference {
                    document_id: doc1_id.clone(),
                    document_name: documents.first().map(|d| d.name.clone()).unwrap_or_else(|| "Document 1".to_string()),
                    text: "Incident occurred at 10:00 PM".to_string(),
                    date: Some("2023-01-12T10:00:00Z".to_string()),
                    author: None,
                    page_ref: None,
                },
                claim2: ClaimReference {
                    document_id: doc3_id,
                    document_name: documents.get(2).map(|d| d.name.clone()).unwrap_or_else(|| "Document 3".to_string()),
                    text: "Ambulance called at 9:45 PM".to_string(),
                    date: Some("2023-01-20T09:00:00Z".to_string()),
                    author: None,
                    page_ref: None,
                },
                explanation: "Timeline inconsistency: Ambulance called before the stated incident time.".to_string(),
                implication: "Suggests the timeline of events is inaccurate or manipulated.".to_string(),
                suggested_resolution: Some("Cross-reference with emergency service call logs.".to_string()),
            },
        ];

        let claim_clusters = vec![ClaimCluster {
            topic: "Subject Location".to_string(),
            claims: vec![
                ClusterClaim {
                    doc_id: doc1_id,
                    text: "At home".to_string(),
                    stance: "Defense".to_string(),
                },
                ClusterClaim {
                    doc_id: doc2_id,
                    text: "At pub".to_string(),
                    stance: "Prosecution".to_string(),
                },
            ],
            consensus: false,
        }];

        let summary = self.build_summary(&contradictions, &claim_clusters);

        Ok(ContradictionAnalysisResult {
            contradictions,
            claim_clusters,
            summary,
        })
    }

    /// Build analysis summary
    fn build_summary(
        &self,
        contradictions: &[ContradictionFinding],
        clusters: &[ClaimCluster],
    ) -> AnalysisSummary {
        let critical_count = contradictions
            .iter()
            .filter(|c| c.severity == Severity::Critical)
            .count();
        let high_count = contradictions
            .iter()
            .filter(|c| c.severity == Severity::High)
            .count();

        let credibility_impact = if critical_count >= 3 || (critical_count >= 1 && high_count >= 3) {
            CredibilityImpact::Severe
        } else if critical_count >= 1 || high_count >= 3 {
            CredibilityImpact::Moderate
        } else if high_count >= 1 || contradictions.len() >= 3 {
            CredibilityImpact::Minor
        } else {
            CredibilityImpact::None
        };

        let most_contradicted_topics = clusters
            .iter()
            .filter(|c| !c.consensus)
            .map(|c| c.topic.clone())
            .take(5)
            .collect();

        AnalysisSummary {
            total_contradictions: contradictions.len(),
            critical_count,
            most_contradicted_topics,
            credibility_impact,
        }
    }

    /// Store contradictions in database
    async fn store_contradictions(
        &self,
        case_id: &str,
        contradictions: &[ContradictionFinding],
    ) -> Result<(), String> {
        let now = chrono::Utc::now().to_rfc3339();

        for c in contradictions {
            let id = Uuid::new_v4().to_string();
            let title = format!(
                "{} contradiction: {}...",
                c.contradiction_type.as_str(),
                &c.explanation[..c.explanation.len().min(50)]
            );
            let doc_ids = serde_json::json!([c.claim1.document_id, c.claim2.document_id]).to_string();
            let evidence = serde_json::json!({
                "type": c.contradiction_type.as_str(),
                "claim1": c.claim1,
                "claim2": c.claim2,
                "implication": c.implication,
            })
            .to_string();

            sqlx::query(
                r#"INSERT INTO findings (id, case_id, engine, title, description, severity, document_ids, evidence, created_at)
                   VALUES (?, ?, 'contradiction', ?, ?, ?, ?, ?, ?)"#,
            )
            .bind(&id)
            .bind(case_id)
            .bind(&title)
            .bind(&c.explanation)
            .bind(c.severity.as_str())
            .bind(&doc_ids)
            .bind(&evidence)
            .bind(&now)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to store contradiction: {}", e))?;
        }

        log::info!(
            "Stored {} contradictions for case {}",
            contradictions.len(),
            case_id
        );
        Ok(())
    }
}

/// Result of comparing two specific claims
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaimComparisonResult {
    pub contradicts: bool,
    pub contradiction_type: Option<ContradictionType>,
    pub explanation: String,
    pub severity: Option<Severity>,
}

// Helper functions

fn parse_contradiction_type(s: &str) -> ContradictionType {
    match s.to_lowercase().as_str() {
        "direct" => ContradictionType::Direct,
        "implicit" => ContradictionType::Implicit,
        "temporal" => ContradictionType::Temporal,
        "quantitative" => ContradictionType::Quantitative,
        "attributional" => ContradictionType::Attributional,
        _ => ContradictionType::Direct, // Default
    }
}

fn parse_severity(s: &str) -> Severity {
    match s.to_lowercase().as_str() {
        "critical" => Severity::Critical,
        "high" => Severity::High,
        "medium" => Severity::Medium,
        "low" => Severity::Low,
        _ => Severity::Medium, // Default
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_contradiction_type_parsing() {
        assert_eq!(parse_contradiction_type("direct"), ContradictionType::Direct);
        assert_eq!(parse_contradiction_type("TEMPORAL"), ContradictionType::Temporal);
        assert_eq!(parse_contradiction_type("unknown"), ContradictionType::Direct);
    }

    #[test]
    fn test_severity_parsing() {
        assert_eq!(parse_severity("critical"), Severity::Critical);
        assert_eq!(parse_severity("HIGH"), Severity::High);
        assert_eq!(parse_severity("unknown"), Severity::Medium);
    }

    #[test]
    fn test_contradiction_type_as_str() {
        assert_eq!(ContradictionType::Direct.as_str(), "direct");
        assert_eq!(ContradictionType::Temporal.as_str(), "temporal");
    }

    #[test]
    fn test_severity_as_str() {
        assert_eq!(Severity::Critical.as_str(), "critical");
        assert_eq!(Severity::Low.as_str(), "low");
    }
}
