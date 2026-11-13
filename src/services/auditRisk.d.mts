import type { AwsRecommendation, SecurityFinding } from '../types/githubAudit';

export function calculateSecurityMetrics(
  findings: SecurityFinding[],
  awsRecommendations: AwsRecommendation[],
): {
  securityScore: number;
  estimatedSecurityAfterRecommendations: number;
  estimatedSecurityGainPoints: number;
};

export const SECURITY_RISK_FORMULA: string;
