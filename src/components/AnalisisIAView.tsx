import { useState, type FormEvent } from 'react';
import { AlertCircle, BrainCircuit, CheckCircle2, LoaderCircle, ShieldCheck } from 'lucide-react';
import SectionCard from './SectionCard';
import {
  analyzeGithubRepository,
  type AuditProgress,
  type GithubAuditResult,
} from '../services/githubAuditService';

const improvementStyles: Record<GithubAuditResult['improvementLevel'], string> = {
  Bajo: 'bg-security/10 text-security',
  Medio: 'bg-cost/10 text-cost',
  Alto: 'bg-alert/10 text-alert',
};

export default function AnalisisIAView() {
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [result, setResult] = useState<GithubAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<AuditProgress | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setProgress({ stage: 'loading', completedBatches: 0, totalBatches: 0 });
    setError(null);
    setResult(null);

    try {
      setResult(await analyzeGithubRepository(repositoryUrl, setProgress));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'No se pudo completar el análisis. Inténtalo de nuevo.',
      );
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <BrainCircuit className="text-brand" size={24} aria-hidden="true" />
          <h1 className="text-2xl font-bold text-ink dark:text-night-ink">Análisis IA</h1>
        </div>
        <p className="mt-1 text-body text-muted dark:text-night-muted">
          Prioriza el código y las configuraciones sensibles de un repositorio público para reducir el consumo de análisis.
        </p>
      </div>

      <SectionCard
        title="Analizar repositorio"
        description="Se priorizan archivos de código, APIs, autenticación, infraestructura, pruebas y configuración para limitar el consumo."
        icon={ShieldCheck}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="github-repository-url" className="label-field">
              URL del repositorio
            </label>
            <input
              id="github-repository-url"
              type="url"
              required
              value={repositoryUrl}
              onChange={(event) => setRepositoryUrl(event.target.value)}
              placeholder="https://github.com/usuario/repositorio"
              className="input-field"
              disabled={loading}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading || !repositoryUrl.trim()}>
            {loading ? (
              <>
                <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                {progress?.stage === 'loading'
                  ? 'Leyendo repositorio...'
                  : progress?.stage === 'local-review'
                    ? 'Aplicando reglas de seguridad...'
                  : progress?.stage === 'summarizing'
                    ? 'Consolidando hallazgos...'
                    : progress?.retryAfterSeconds
                      ? `Límite de API; reintentando en ${progress.retryAfterSeconds}s...`
                      : `Analizando lote ${(progress?.completedBatches ?? 0) + 1} de ${progress?.totalBatches ?? '...' }...`}
              </>
            ) : (
              <>
                <BrainCircuit size={16} aria-hidden="true" />
                Analizar con IA
              </>
            )}
          </button>
        </form>
      </SectionCard>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-alert/30 bg-alert/5 p-4 text-small text-ink dark:text-night-ink"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-alert" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4" aria-live="polite">
          <div
            role="status"
            className={`rounded-xl border p-4 text-small ${
              result.analysisEngine === 'Gemini'
                ? 'border-security/30 bg-security/5 text-ink dark:text-night-ink'
                : 'border-cost/30 bg-cost/5 text-ink dark:text-night-ink'
            }`}
          >
            <p className="font-semibold">
              Motor de análisis: {result.analysisEngine}
            </p>
            <p className="mt-1">{result.analysisNotice}</p>
            {result.analysisEngine === 'Reglas locales' && (
              <p className="mt-1">
                El análisis local detecta patrones conocidos; no sustituye una auditoría experta ni comprende el contexto como un modelo de IA.
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SectionCard
              title="Seguridad estimada"
              description={`Puntaje conservador basado en ${result.reviewedFiles} archivos de ${result.repository} · rama ${result.branch}`}
              icon={ShieldCheck}
            >
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-brand">{result.securityScore}%</span>
                <span className="pb-1 text-small text-muted dark:text-night-muted">puntaje estimado</span>
              </div>
              <div
                className="mt-4 h-2 overflow-hidden rounded-full bg-line dark:bg-night-line"
                role="progressbar"
                aria-label="Porcentaje estimado de seguridad"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={result.securityScore}
              >
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${result.securityScore}%` }}
                />
              </div>
              <p className="mt-3 text-[12px] text-muted dark:text-night-muted">
                Un puntaje alto no certifica que el proyecto sea seguro. El valor está limitado por el alcance de la revisión y los hallazgos detectados.
              </p>
            </SectionCard>

            <SectionCard title="Oportunidad de mejora" description="Potencial de mejora con las recomendaciones" icon={BrainCircuit}>
              <span className={`inline-flex rounded-full px-3 py-1 text-small font-semibold ${improvementStyles[result.improvementLevel]}`}>
                {result.improvementLevel}
              </span>
              <p className="mt-3 text-small leading-relaxed text-ink dark:text-night-ink">
                {result.technicalJustification}
              </p>
            </SectionCard>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SectionCard
              title="Mejora de seguridad estimada"
              description="Puntaje proyectado si se implementan y verifican las recomendaciones"
              icon={ShieldCheck}
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-3xl font-bold text-brand">
                  {result.securityScore}% → {result.estimatedSecurityAfterRecommendations}%
                </span>
                <span className="text-small font-semibold text-security">
                  +{result.estimatedSecurityGainPoints} puntos estimados
                </span>
              </div>
              <p className="mt-2 text-[12px] text-muted dark:text-night-muted">
                Proyección heurística; solo se puede validar después de corregir los hallazgos y repetir la revisión.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-small text-muted dark:text-night-muted">
                {result.securityEstimateAssumptions.map((assumption, index) => (
                  <li key={`${index}-${assumption}`}>{assumption}</li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard
              title="Escalabilidad"
              description="Capacidad estimada para crecer en usuarios, carga y datos"
              icon={BrainCircuit}
            >
              <span className="inline-flex rounded-full bg-brand/10 px-3 py-1 text-small font-semibold text-brand">
                {result.scalability.level}
              </span>
              <p className="mt-3 text-small leading-relaxed text-ink dark:text-night-ink">
                {result.scalability.assessment}
              </p>
              {result.scalability.bottlenecks.length > 0 && (
                <div className="mt-3">
                  <h3 className="text-small font-semibold text-ink dark:text-night-ink">
                    Cuellos de botella
                  </h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-small text-muted dark:text-night-muted">
                    {result.scalability.bottlenecks.map((item, index) => (
                      <li key={`${index}-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.scalability.recommendations.length > 0 && (
                <div className="mt-3">
                  <h3 className="text-small font-semibold text-ink dark:text-night-ink">
                    Recomendaciones de escalabilidad
                  </h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-small text-muted dark:text-night-muted">
                    {result.scalability.recommendations.map((item, index) => (
                      <li key={`${index}-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </SectionCard>
          </div>

          <SectionCard
            title={`Hallazgos de seguridad (${result.findings.length})`}
            description={`Se revisaron ${result.reviewedFiles} archivos seleccionados de ${result.totalFiles} archivos versionados (máximo 30 archivos y 150 KB). Se omiten lockfiles, binarios, dependencias, archivos generados, mocks y datos de prueba.`}
            icon={AlertCircle}
          >
            <details className="mb-4 rounded-lg border border-line p-3 dark:border-night-line">
              <summary className="cursor-pointer text-small font-semibold text-ink dark:text-night-ink">
                Ver los {result.reviewedPaths.length} archivos incluidos
              </summary>
              <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-[12px] text-muted dark:text-night-muted">
                {result.reviewedPaths.map((path) => (
                  <li key={path}>
                    <code>{path}</code>
                  </li>
                ))}
              </ul>
            </details>
            {result.findings.length > 0 ? (
              <ul className="space-y-3">
                {result.findings.map((finding, index) => (
                  <li
                    key={`${finding.file}-${index}`}
                    className="rounded-xl border border-line p-4 dark:border-night-line"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-alert/10 px-2.5 py-1 text-[12px] font-semibold text-alert">
                        {finding.severity}
                      </span>
                      <code className="text-[12px] text-muted dark:text-night-muted">{finding.file}</code>
                    </div>
                    <p className="mt-2 text-small leading-relaxed text-ink dark:text-night-ink">
                      {finding.description}
                    </p>
                    <p className="mt-2 text-small leading-relaxed text-muted dark:text-night-muted">
                      <span className="font-semibold">Recomendación: </span>
                      {finding.recommendation}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-small text-muted dark:text-night-muted">
                No se identificaron hallazgos con la evidencia revisada. Esto no garantiza que el repositorio esté libre de vulnerabilidades.
              </p>
            )}
          </SectionCard>

          <SectionCard
            title="Servicios AWS recomendados"
            description="Opciones para fortalecer un despliegue seguro en la nube."
            icon={CheckCircle2}
          >
            {result.awsRecommendations.length > 0 ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {result.awsRecommendations.map((recommendation, index) => (
                  <li
                    key={`${recommendation.service}-${index}`}
                    className="rounded-xl border border-line p-4 dark:border-night-line"
                  >
                    <h3 className="font-semibold text-ink dark:text-night-ink">{recommendation.service}</h3>
                    <p className="mt-1 text-small leading-relaxed text-muted dark:text-night-muted">
                      {recommendation.reason}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-small text-muted dark:text-night-muted">
                No se generaron recomendaciones específicas para este repositorio.
              </p>
            )}
          </SectionCard>

          <p className="text-small text-muted dark:text-night-muted">
            La selección prioriza código fuente, autenticación, APIs, infraestructura, despliegue, pruebas y configuración. Se limita a 30 archivos y 150 KB; los archivos omitidos podrían contener problemas no detectados. El resultado no sustituye una auditoría profesional.
          </p>
        </div>
      )}
    </div>
  );
}
