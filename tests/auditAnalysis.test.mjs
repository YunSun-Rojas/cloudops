import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateAuditBatches } from '../src/services/auditAggregation.mjs';
import { calculateSecurityMetrics } from '../src/services/auditRisk.mjs';
import { selectAnalysisFiles } from '../src/services/auditSelection.mjs';

const finding = (severity, file, evidence) => ({
  severity,
  file,
  evidence,
  description: 'Hallazgo de prueba',
  recommendation: 'Revisa el fragmento.',
});

function batch(overrides = {}) {
  return {
    repository: 'owner/repo',
    branch: 'main',
    analysisEngine: 'Gemini · model',
    analysisNotice: '',
    reviewedFiles: 1,
    reviewedPaths: ['src/auth.ts'],
    totalFiles: 3,
    findings: [finding('Alta', 'src/auth.ts', 'token in localStorage')],
    securityScore: 75,
    estimatedSecurityAfterRecommendations: 75,
    estimatedSecurityGainPoints: 0,
    securityEstimateAssumptions: [],
    scalability: {
      level: 'No determinada',
      assessment: 'No determinada.',
      evidence: '',
      evidenceFiles: [],
      bottlenecks: [],
      recommendations: [],
    },
    awsRecommendations: [],
    improvementLevel: 'No determinada',
    technicalJustification: '',
    ...overrides,
  };
}

test('hides certainty in the score and caps the contribution of low findings', () => {
  assert.equal(calculateSecurityMetrics([], []).securityScore, 99);
  const manyLowFindings = Array.from({ length: 10 }, (_, index) =>
    finding('Baja', `src/${index}.ts`, `low evidence ${index}`),
  );
  const lowSeverityScore = calculateSecurityMetrics(manyLowFindings, []).securityScore;
  const highSeverityScore = calculateSecurityMetrics(
    [finding('Alta', 'src/auth.ts', 'high severity evidence')],
    [],
  ).securityScore;

  assert.equal(lowSeverityScore, 88);
  assert.equal(highSeverityScore, 75);
});

test('deduplicates evidence after whitespace normalization', () => {
  const metrics = calculateSecurityMetrics([
    finding('Alta', 'src/auth.ts', 'token stored in localStorage'),
    finding('Alta', 'src/auth.ts', 'token  stored\nin localStorage'),
  ], []);

  assert.equal(metrics.securityScore, 75);
});

test('aggregates only successful batches and sums diagnostics', () => {
  const result = aggregateAuditBatches(
    [batch({ discardedFindings: 2, localRuleFindings: 3 })],
    3,
    2,
    '1 de 2 lotes respondieron.',
    true,
    1,
    2,
  );

  assert.equal(result.reviewedFiles, 1);
  assert.deepEqual(result.reviewedPaths, ['src/auth.ts']);
  assert.equal(result.securityScore, 75);
  assert.equal(result.discardedFindings, 2);
  assert.equal(result.localRuleFindings, 3);
  assert.equal(result.successfulBatches, 1);
  assert.equal(result.totalBatches, 2);
});

test('selects 600 small files within the 15-file batch limit', () => {
  const files = Array.from({ length: 600 }, (_, index) => ({ index, size: 10 }));
  const selected = selectAnalysisFiles(files, (file) => file.size);

  assert.equal(selected.length, 600);
});
