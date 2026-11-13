const RISK_POINTS_BY_SEVERITY = {
  Crítica: 40,
  Alta: 25,
  Media: 12,
  Baja: 4,
  Info: 0,
};
const UNCERTAINTY_RISK_FLOOR = 1;

function findingKey(finding) {
  return `${finding.file}\u0000${finding.evidence.replace(/\s+/g, ' ').trim()}`;
}

export function calculateSecurityMetrics(findings, awsRecommendations) {
  const uniqueFindings = [...new Map(findings.map((finding) => [findingKey(finding), finding])).values()];
  const riskPoints = (items) => {
    const lowerSeverityRisk = Math.min(
      12,
      items.filter((finding) => finding.severity === 'Baja').length *
        RISK_POINTS_BY_SEVERITY.Baja,
    );
    const otherSeverityRisk = items
      .filter((finding) => finding.severity !== 'Baja')
      .reduce(
        (total, finding) => total + (RISK_POINTS_BY_SEVERITY[finding.severity] ?? 0),
        0,
      );
    return Math.min(100, lowerSeverityRisk + otherSeverityRisk);
  };
  // Sin hallazgos el índice se mantiene en 99 por incertidumbre; la vista lo oculta si no hay evidencia.
  const detectedRisk = Math.max(UNCERTAINTY_RISK_FLOOR, riskPoints(uniqueFindings));
  const findingsAddressedByAws = new Set(
    awsRecommendations.flatMap((recommendation) =>
      recommendation.relatedFindings.map((finding) => `${finding.file}\u0000${finding.evidence}`),
    ),
  );
  const addressedFindings = uniqueFindings.filter((finding) =>
    findingsAddressedByAws.has(findingKey(finding)),
  );
  const estimatedRiskReduction = riskPoints(addressedFindings);
  const remainingRisk = Math.max(
    UNCERTAINTY_RISK_FLOOR,
    detectedRisk - estimatedRiskReduction,
  );
  const securityScore = 100 - detectedRisk;
  const estimatedSecurityAfterRecommendations = 100 - remainingRisk;

  return {
    securityScore,
    estimatedSecurityAfterRecommendations,
    estimatedSecurityGainPoints: estimatedSecurityAfterRecommendations - securityScore,
  };
}

export const SECURITY_RISK_FORMULA =
  'Índice orientativo por hallazgo único con evidencia: Crítica 40, Alta 25, Media 12, Baja 4 (aporte total de Baja limitado a 12) e Info 0 puntos; el riesgo se limita a 100. Se reserva como mínimo 1 punto por incertidumbre del análisis estático/parcial, así que el porcentaje nunca certifica 100% de seguridad.';
