import { calculateSecurityMetrics, SECURITY_RISK_FORMULA } from './auditRisk.mjs';

function uniqueBy(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

export function aggregateAuditBatches(
  batches,
  totalFiles,
  selectedFiles,
  notice,
  incomplete,
  successfulBatches = batches.length,
  totalBatches = batches.length,
) {
  if (batches.length === 0) {
    throw new Error('Se requiere al menos un lote de análisis IA para consolidar resultados.');
  }

  const reviewedPaths = [...new Set(batches.flatMap((batch) => batch.reviewedPaths))];
  const findings = uniqueBy(
    batches.flatMap((batch) => batch.findings),
    (finding) => `${finding.file}\u0000${normalizeText(finding.evidence)}`,
  );
  const awsRecommendationMap = new Map();
  for (const recommendation of batches.flatMap((batch) => batch.awsRecommendations)) {
    const key = `${recommendation.service}\u0000${recommendation.reason}\u0000${recommendation.evidence}`;
    const current = awsRecommendationMap.get(key);
    if (!current) {
      awsRecommendationMap.set(key, {
        ...recommendation,
        relatedFindings: [...recommendation.relatedFindings],
        evidenceFiles: [...recommendation.evidenceFiles],
      });
      continue;
    }
    current.relatedFindings = uniqueBy(
      [...current.relatedFindings, ...recommendation.relatedFindings],
      (finding) => `${finding.file}\u0000${finding.evidence}`,
    );
    current.evidenceFiles = [...new Set([...current.evidenceFiles, ...recommendation.evidenceFiles])];
  }
  const awsRecommendations = [...awsRecommendationMap.values()];
  const bottlenecks = uniqueBy(
    batches.flatMap((batch) => batch.scalability.bottlenecks),
    (item) => `${item.text}\u0000${item.evidence}\u0000${item.evidenceFiles.join('\u0000')}`,
  );
  const scalabilityRecommendations = uniqueBy(
    batches.flatMap((batch) => batch.scalability.recommendations),
    (item) => `${item.text}\u0000${item.evidence}\u0000${item.evidenceFiles.join('\u0000')}`,
  );
  const evaluatedScalability = batches.filter(
    (batch) =>
      batch.scalability.level !== 'No determinada' &&
      batch.scalability.evidence.length > 0 &&
      batch.scalability.evidenceFiles.length > 0,
  );
  const levelWeights = new Map();
  for (const batch of evaluatedScalability) {
    const level = batch.scalability.level;
    levelWeights.set(level, (levelWeights.get(level) ?? 0) + batch.reviewedFiles);
  }
  const highestLevelWeight = Math.max(0, ...levelWeights.values());
  const winningLevels = [...levelWeights.entries()]
    .filter(([, weight]) => weight === highestLevelWeight)
    .map(([level]) => level);
  const overallScalabilityLevel =
    winningLevels.length === 1 ? winningLevels[0] : 'No determinada';
  const hasScalabilityLevel = overallScalabilityLevel !== 'No determinada';
  const scalabilityAssessment = evaluatedScalability.length > 0
    ? `Evaluación estática respaldada en ${evaluatedScalability.length} de ${batches.length} lotes. ${[
        ...new Set(evaluatedScalability.map((batch) => batch.scalability.assessment)),
      ].slice(0, 2).join(' ')}`
    : 'No hubo evidencia de diseño suficiente para sugerir cambios. Las pruebas de carga y métricas permiten completar esta evaluación.';
  const scalability = {
    level: overallScalabilityLevel,
    assessment: scalabilityAssessment,
    evidence: hasScalabilityLevel
      ? [...new Set(evaluatedScalability.map((batch) => batch.scalability.evidence))].join('\n')
      : '',
    evidenceFiles: hasScalabilityLevel
      ? [...new Set(evaluatedScalability.flatMap((batch) => batch.scalability.evidenceFiles))]
      : [],
    bottlenecks,
    recommendations: scalabilityRecommendations,
  };
  const engineNames = [...new Set(batches.map((batch) => batch.analysisEngine))];
  const securityMetrics = calculateSecurityMetrics(findings, awsRecommendations);

  return {
    ...batches[0],
    analysisEngine: incomplete
      ? `IA parcial · ${engineNames.join(', ')}`.slice(0, 120)
      : `IA por lotes · ${engineNames.join(', ')}`.slice(0, 120),
    analysisNotice: notice,
    reviewedFiles: reviewedPaths.length,
    selectedFiles,
    reviewedPaths,
    totalFiles,
    findings,
    discardedFindings: batches.reduce(
      (total, batch) => total + (batch.discardedFindings ?? 0),
      0,
    ),
    localRuleFindings: batches.reduce(
      (total, batch) => total + (batch.localRuleFindings ?? 0),
      0,
    ),
    successfulBatches,
    totalBatches,
    ...securityMetrics,
    securityEstimateAssumptions: [SECURITY_RISK_FORMULA],
    scalability,
    awsRecommendations,
    improvementLevel: 'No determinada',
    technicalJustification: notice,
  };
}
