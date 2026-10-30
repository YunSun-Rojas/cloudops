export interface AwsRecommendation {
  service: string;
  reason: string;
}

export interface SecurityFinding {
  severity: 'Crítica' | 'Alta' | 'Media' | 'Baja' | 'Info';
  file: string;
  description: string;
  recommendation: string;
}

export interface ScalabilityAssessment {
  level: 'Baja' | 'Media' | 'Alta' | 'No determinada';
  assessment: string;
  bottlenecks: string[];
  recommendations: string[];
}

export interface GithubAuditResult {
  repository: string;
  branch: string;
  analysisEngine: 'Gemini' | 'Reglas locales';
  analysisNotice: string;
  reviewedFiles: number;
  reviewedPaths: string[];
  totalFiles: number;
  findings: SecurityFinding[];
  securityScore: number;
  estimatedSecurityAfterRecommendations: number;
  estimatedSecurityGainPoints: number;
  securityEstimateAssumptions: string[];
  scalability: ScalabilityAssessment;
  awsRecommendations: AwsRecommendation[];
  improvementLevel: 'Bajo' | 'Medio' | 'Alto';
  technicalJustification: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isGithubAuditResult(value: unknown): value is GithubAuditResult {
  if (!isRecord(value)) return false;
  const result = value;

  return (
    typeof result.repository === 'string' &&
    typeof result.branch === 'string' &&
    (result.analysisEngine === 'Gemini' || result.analysisEngine === 'Reglas locales') &&
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
        typeof finding.description === 'string' &&
        typeof finding.recommendation === 'string',
    ) &&
    typeof result.securityScore === 'number' &&
    Number.isFinite(result.securityScore) &&
    result.securityScore >= 0 &&
    result.securityScore <= 100 &&
    typeof result.estimatedSecurityAfterRecommendations === 'number' &&
    Number.isFinite(result.estimatedSecurityAfterRecommendations) &&
    result.estimatedSecurityAfterRecommendations >= result.securityScore &&
    result.estimatedSecurityAfterRecommendations <= 100 &&
    typeof result.estimatedSecurityGainPoints === 'number' &&
    Number.isFinite(result.estimatedSecurityGainPoints) &&
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
    Array.isArray(result.scalability.bottlenecks) &&
    result.scalability.bottlenecks.every((item: unknown) => typeof item === 'string') &&
    Array.isArray(result.scalability.recommendations) &&
    result.scalability.recommendations.every((item: unknown) => typeof item === 'string') &&
    Array.isArray(result.awsRecommendations) &&
    result.awsRecommendations.every(
      (recommendation: unknown) =>
        isRecord(recommendation) &&
        typeof recommendation.service === 'string' &&
        typeof recommendation.reason === 'string',
    ) &&
    (result.improvementLevel === 'Bajo' ||
      result.improvementLevel === 'Medio' ||
      result.improvementLevel === 'Alto') &&
    typeof result.technicalJustification === 'string'
  );
}
