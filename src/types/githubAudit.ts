export interface AwsRecommendation {
  service: string;
  reason: string;
  evidence: string;
  evidenceFiles: string[];
  relatedFindings: Array<Pick<SecurityFinding, 'file' | 'evidence'>>;
}

export interface SecurityFinding {
  severity: 'Crítica' | 'Alta' | 'Media' | 'Baja' | 'Info';
  file: string;
  evidence: string;
  description: string;
  recommendation: string;
}

export interface EvidenceStatement {
  severity: 'Crítica' | 'Alta' | 'Media' | 'Baja' | 'Info';
  text: string;
  evidence: string;
  evidenceFiles: string[];
}

export interface ScalabilityAssessment {
  level: 'Baja' | 'Media' | 'Alta' | 'No determinada';
  assessment: string;
  evidence: string;
  evidenceFiles: string[];
  bottlenecks: EvidenceStatement[];
  recommendations: EvidenceStatement[];
}

export interface GithubAuditResult {
  repository: string;
  branch: string;
  /** Nombre de la IA que respondió (p. ej. "Gemini · gemini-3.6-flash") o "Reglas locales" */
  analysisEngine: string;
  analysisNotice: string;
  reviewedFiles: number;
  selectedFiles?: number;
  reviewedPaths: string[];
  totalFiles: number;
  findings: SecurityFinding[];
  discardedFindings?: number;
  localRuleFindings?: number;
  successfulBatches?: number;
  totalBatches?: number;
  securityScore: number | null;
  estimatedSecurityAfterRecommendations: number | null;
  estimatedSecurityGainPoints: number | null;
  securityEstimateAssumptions: string[];
  scalability: ScalabilityAssessment;
  awsRecommendations: AwsRecommendation[];
  improvementLevel: 'Bajo' | 'Medio' | 'Alto' | 'No determinada';
  technicalJustification: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isGithubAuditResult(value: unknown): value is GithubAuditResult {
  if (!isRecord(value)) return false;
  const result = value;
  const isLocalResult = result.analysisEngine === 'Reglas locales';
  const validEvidenceFiles = (value: unknown): value is string[] =>
    Array.isArray(value) &&
    value.every(
      (path: unknown) =>
        typeof path === 'string' &&
        Array.isArray(result.reviewedPaths) &&
        result.reviewedPaths.includes(path),
    );
  const validEvidenceItems = (value: unknown): boolean =>
    Array.isArray(value) &&
    value.every(
      (item: unknown) =>
        isRecord(item) &&
        (item.severity === 'Crítica' ||
          item.severity === 'Alta' ||
          item.severity === 'Media' ||
          item.severity === 'Baja' ||
          item.severity === 'Info') &&
        typeof item.text === 'string' &&
        typeof item.evidence === 'string' &&
        item.evidence.length > 0 &&
        validEvidenceFiles(item.evidenceFiles) &&
        item.evidenceFiles.length > 0,
    );
  const findings = Array.isArray(result.findings) ? result.findings : [];
  const isOptionalCount = (value: unknown): boolean =>
    value === undefined ||
    (typeof value === 'number' && Number.isInteger(value) && value >= 0);

  return (
    typeof result.repository === 'string' &&
    typeof result.branch === 'string' &&
    typeof result.analysisEngine === 'string' &&
    result.analysisEngine.length > 0 &&
    result.analysisEngine.length <= 120 &&
    typeof result.analysisNotice === 'string' &&
    typeof result.reviewedFiles === 'number' &&
    Number.isInteger(result.reviewedFiles) &&
    Array.isArray(result.reviewedPaths) &&
    result.reviewedPaths.length === result.reviewedFiles &&
    result.reviewedPaths.every((path: unknown) => typeof path === 'string') &&
    typeof result.totalFiles === 'number' &&
    Number.isInteger(result.totalFiles) &&
    result.reviewedFiles >= 0 &&
    result.totalFiles >= result.reviewedFiles &&
    isOptionalCount(result.discardedFindings) &&
    isOptionalCount(result.localRuleFindings) &&
    isOptionalCount(result.successfulBatches) &&
    isOptionalCount(result.totalBatches) &&
    (typeof result.successfulBatches !== 'number' ||
      typeof result.totalBatches !== 'number' ||
      result.successfulBatches <= result.totalBatches) &&
    Array.isArray(result.findings) &&
    result.findings.every(
      (finding: unknown) =>
        isRecord(finding) &&
        (finding.severity === 'Crítica' ||
          finding.severity === 'Alta' ||
          finding.severity === 'Media' ||
          finding.severity === 'Baja' ||
          finding.severity === 'Info') &&
        typeof finding.file === 'string' &&
          Array.isArray(result.reviewedPaths) &&
          result.reviewedPaths.includes(finding.file) &&
          typeof finding.evidence === 'string' &&
          finding.evidence.length > 0 &&
          typeof finding.description === 'string' &&
        typeof finding.recommendation === 'string',
    ) &&
    typeof result.securityScore === 'number' &&
    Number.isInteger(result.securityScore) &&
    result.securityScore >= 0 &&
    result.securityScore <= 100 &&
    typeof result.estimatedSecurityAfterRecommendations === 'number' &&
    Number.isInteger(result.estimatedSecurityAfterRecommendations) &&
    result.estimatedSecurityAfterRecommendations >= result.securityScore &&
    result.estimatedSecurityAfterRecommendations <= 100 &&
    typeof result.estimatedSecurityGainPoints === 'number' &&
    Number.isInteger(result.estimatedSecurityGainPoints) &&
    result.estimatedSecurityGainPoints >= 0 &&
    result.estimatedSecurityGainPoints <= 100 &&
    Array.isArray(result.securityEstimateAssumptions) &&
    result.securityEstimateAssumptions.every((item: unknown) => typeof item === 'string') &&
    isRecord(result.scalability) &&
    (result.scalability.level === 'Baja' ||
      result.scalability.level === 'Media' ||
      result.scalability.level === 'Alta' ||
      result.scalability.level === 'No determinada') &&
    typeof result.scalability.assessment === 'string' &&
    typeof result.scalability.evidence === 'string' &&
    validEvidenceFiles(result.scalability.evidenceFiles) &&
    Array.isArray(result.scalability.bottlenecks) &&
    Array.isArray(result.scalability.recommendations) &&
    validEvidenceItems(result.scalability.bottlenecks) &&
    validEvidenceItems(result.scalability.recommendations) &&
    (result.scalability.level === 'No determinada'
      ? result.scalability.evidenceFiles.length === 0
      : result.scalability.evidence.length > 0 && result.scalability.evidenceFiles.length > 0) &&
    Array.isArray(result.awsRecommendations) &&
    result.awsRecommendations.every(
      (recommendation: unknown) =>
        isRecord(recommendation) &&
        typeof recommendation.service === 'string' &&
        typeof recommendation.reason === 'string' &&
        typeof recommendation.evidence === 'string' &&
        recommendation.evidence.length > 0 &&
        validEvidenceFiles(recommendation.evidenceFiles) &&
        recommendation.evidenceFiles.length > 0 &&
        Array.isArray(recommendation.relatedFindings) &&
        recommendation.relatedFindings.length > 0 &&
        recommendation.relatedFindings.every(
          (finding: unknown) =>
            isRecord(finding) &&
            typeof finding.file === 'string' &&
            typeof finding.evidence === 'string' &&
            findings.some(
              (candidate: unknown) =>
                isRecord(candidate) &&
                candidate.file === finding.file && candidate.evidence === finding.evidence,
            ),
        ),
    ) &&
    result.improvementLevel === 'No determinada' &&
    (isLocalResult ? result.awsRecommendations.length === 0 : true) &&
    typeof result.technicalJustification === 'string'
  );
}