import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileArchive,
  GitBranch,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';
import SectionCard from './SectionCard';
import {
  analyzeGithubRepository,
  MAX_ANALYSIS_BATCHES,
  MAX_FILE_BYTES,
  MAX_REPOSITORY_BYTES,
  MAX_REVIEW_FILES,
  type AuditProgress,
  type GithubAuditResult,
} from '../services/githubAuditService';
import { analyzeZipProject } from '../services/zipAuditService';
import type {
  AwsRecommendation,
  EvidenceStatement,
  SecurityFinding,
} from '../types/githubAudit';

const PAGE_SIZE = 5;
const SEVERITY_FILTERS = ['Todas', 'Crítica', 'Alta', 'Media', 'Baja', 'Info'] as const;

export default function AnalisisIAView() {
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [result, setResult] = useState<GithubAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<AuditProgress | null>(null);
  const [source, setSource] = useState<'github' | 'zip'>('github');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const noEvidence = result !== null && result.findings.length === 0;
  const selectedFiles = result?.selectedFiles ?? result?.reviewedFiles ?? 0;
  const securityIndex = result?.securityScore ?? 99;
  const securityAfterAws = result?.estimatedSecurityAfterRecommendations ?? securityIndex;
  const awsGain = result?.estimatedSecurityGainPoints ?? 0;
  const detectedRisk = 100 - securityIndex;
  const readCoverage = selectedFiles > 0
    ? Math.min(100, Math.round(((result?.reviewedFiles ?? 0) / selectedFiles) * 100))
    : 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    if (source === 'zip' && !zipFile) return;

    setLoading(true);
    setProgress({ stage: 'loading', completedBatches: 0, totalBatches: 0 });
    setError(null);
    setResult(null);

    try {
      setResult(
        source === 'github'
          ? await analyzeGithubRepository(repositoryUrl, updateProgress)
          : await analyzeZipProject(zipFile as File, updateProgress),
      );
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

  function updateProgress(nextProgress: AuditProgress) {
    setProgress(nextProgress);
    if (nextProgress.partialResult) setResult(nextProgress.partialResult);
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <BrainCircuit className="text-brand" size={24} aria-hidden="true" />
          <h1 className="text-2xl font-bold text-ink dark:text-night-ink">Análisis IA</h1>
        </div>
        <p className="mt-1 text-body text-muted dark:text-night-muted">
          Revisa un repositorio o ZIP y prioriza riesgos y mejoras.
        </p>
      </div>

      <SectionCard
        title="Analizar proyecto"
        description="Elige un repositorio público o un archivo ZIP."
        icon={ShieldCheck}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className="inline-flex rounded-lg border border-line p-1 dark:border-night-line"
            role="group"
            aria-label="Origen del proyecto"
          >
            {(
              [
                ['github', 'Repositorio GitHub', GitBranch],
                ['zip', 'Archivo ZIP', FileArchive],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                disabled={loading}
                aria-pressed={source === value}
                onClick={() => setSource(value)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  source === value ? 'bg-brand text-white' : 'text-muted hover:text-ink dark:text-night-muted'
                }`}
              >
                <Icon size={14} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>

          {source === 'github' ? (
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
          ) : (
            <div>
              <label htmlFor="project-zip" className="label-field">
                Archivo ZIP del proyecto
              </label>
              <input
                id="project-zip"
                type="file"
                required
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={(event) => setZipFile(event.target.files?.[0] ?? null)}
                className="input-field"
                disabled={loading}
              />
              {zipFile && (
                <p className="mt-1.5 text-[12px] text-ink dark:text-night-ink">
                  Seleccionado: {zipFile.name} ({(zipFile.size / 1024 / 1024).toFixed(1)} MB)
                </p>
              )}
            </div>
          )}

          <details className="text-[12px] text-muted dark:text-night-muted">
            <summary className="w-fit cursor-pointer font-medium text-brand">
              Alcance y privacidad
            </summary>
            <p className="mt-2 leading-relaxed">
              Se priorizan archivos de código, APIs, autenticación, infraestructura y configuración; se excluyen pruebas,
              dependencias y archivos generados. En ZIP (máximo 25 MB), el navegador selecciona los archivos y oculta
              patrones de claves reconocidos antes de enviarlos a la IA. No incluyas información que no tengas autorización
              para compartir.
            </p>
          </details>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || (source === 'github' ? !repositoryUrl.trim() : !zipFile)}
          >
            {loading ? (
              <>
                <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                {progress?.stage === 'loading'
                  ? 'Leyendo proyecto...'
                  : progress?.stage === 'local-review'
                    ? 'Aplicando reglas de seguridad...'
                  : progress?.stage === 'summarizing'
                    ? 'Agrupando resultados verificados...'
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
          <AnalysisStatus result={result} />

          <div className="grid gap-4 md:grid-cols-3">
            <SectionCard
              title="Porcentaje de seguridad"
              description={result.analysisEngine === 'Reglas locales'
                ? 'Índice de coincidencias conocidas'
                : 'Índice orientativo según hallazgos con evidencia'}
              icon={ShieldCheck}
            >
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-bold ${noEvidence ? 'text-muted dark:text-night-muted' : 'text-security'}`}>
                  {noEvidence ? 'Sin determinar' : `${securityIndex}%`}
                </span>
                {!noEvidence && (
                  <span className="text-small text-muted dark:text-night-muted">estimado</span>
                )}
              </div>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-line dark:bg-night-line"
                role="progressbar"
                aria-label="Porcentaje de seguridad estimado"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={noEvidence ? 0 : securityIndex}
              >
                <div
                  className={`h-full rounded-full transition-all ${noEvidence ? 'bg-transparent' : 'bg-security'}`}
                  style={{ width: noEvidence ? '0%' : `${securityIndex}%` }}
                />
              </div>
              {noEvidence ? (
                <p className="mt-2 text-[12px] text-muted dark:text-night-muted">
                  No se encontraron hallazgos con evidencia. Eso no significa que el proyecto sea seguro: puede que el análisis no haya detectado nada.
                </p>
              ) : (
                <p className="mt-2 text-[12px] text-muted dark:text-night-muted">
                  Basado solo en {result.reviewedFiles} archivos revisados; no es una certificación ni garantiza seguridad.
                </p>
              )}
              {(result.discardedFindings ?? 0) > 0 && (
                <p className="mt-2 text-[12px] font-medium text-amber-700 dark:text-amber-300">
                  {result.discardedFindings} candidatos de la IA se descartaron por no coincidir con el código.
                </p>
              )}
              <details className="mt-2 text-[12px] text-muted dark:text-night-muted">
                <summary className="w-fit cursor-pointer font-medium text-brand">Cómo se calcula</summary>
                <p className="mt-1">{result.securityEstimateAssumptions.join(' ')}</p>
              </details>
            </SectionCard>

            <SectionCard
              title="Riesgo detectado"
              description="Índice orientativo, con mínimo por incertidumbre."
              icon={AlertCircle}
            >
              <span className="text-3xl font-bold text-brand">{noEvidence ? '—' : `${detectedRisk}%`}</span>
              <p className="mt-2 text-[12px] text-muted dark:text-night-muted">
                {result.findings.length} hallazgos contabilizados en el índice
                {(result.localRuleFindings ?? 0) > 0 &&
                  ` (${result.localRuleFindings} por reglas locales)`}.
              </p>
              <p className="mt-1 text-[12px] text-muted dark:text-night-muted">
                {noEvidence
                  ? 'No se puede determinar la ausencia real de riesgos solo porque no haya hallazgos.'
                  : 'No es probabilidad de ataque; reserva 1 punto porque el análisis no puede certificar seguridad total.'}
              </p>
            </SectionCard>

            <SectionCard
              title="Cobertura de lectura"
              description={`${result.repository} · rama ${result.branch}`}
              icon={BrainCircuit}
            >
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-brand">{result.reviewedFiles}</span>
                <span className="text-small text-muted dark:text-night-muted">
                  de {selectedFiles} {result.analysisEngine === 'Reglas locales' ? 'seleccionados' : 'seleccionados con respuesta IA'}
                </span>
              </div>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-line dark:bg-night-line"
                role="progressbar"
                aria-label="Cobertura de archivos seleccionados revisados"
                aria-valuemin={0}
                aria-valuemax={selectedFiles}
                aria-valuenow={result.reviewedFiles}
              >
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${readCoverage}%` }}
                />
              </div>
              <p className="mt-2 text-[12px] text-muted dark:text-night-muted">
                {readCoverage}% de los archivos seleccionados fueron revisados.
              </p>
              {result.reviewedFiles < selectedFiles && (
                <p className="mt-1 text-[12px] font-medium text-amber-700 dark:text-amber-300">
                  {selectedFiles - result.reviewedFiles} archivos sin respuesta.
                </p>
              )}
            </SectionCard>
          </div>

          {result.analysisEngine === 'Reglas locales' ? (
            <>
              <SectionCard
                title="Detalle de coincidencias"
                description="Patrones que requieren validación manual."
                icon={CheckCircle2}
              >
                {result.findings.length > 0 ? (
                  <ul className="space-y-3">
                    {result.findings.map((finding, index) => (
                      <li key={`${finding.file}-${index}`} className="text-small">
                        <p className="font-semibold text-ink dark:text-night-ink">{finding.recommendation}</p>
                        <EvidenceQuote text={finding.evidence} />
                        <EvidenceFiles paths={[finding.file]} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-small leading-relaxed text-ink dark:text-night-ink">
                    No se encontraron coincidencias en las reglas locales; esto no demuestra que el proyecto esté libre de riesgos.
                  </p>
                )}
                <details className="mt-3 text-[12px] text-muted dark:text-night-muted">
                  <summary className="w-fit cursor-pointer font-medium text-brand">Límites de este resultado</summary>
                  <p className="mt-1">Las reglas locales pueden generar falsos positivos y no evalúan arquitectura ni carga.</p>
                </details>
              </SectionCard>
              <SectionCard
                title="Recomendaciones AWS"
                description="Opción general para evaluar; no inferida del código."
                icon={CheckCircle2}
              >
                <AwsRecommendationGroups recommendations={result.awsRecommendations} />
                <p className="mt-2 text-[12px] text-muted dark:text-night-muted">
                  Esta opción no está vinculada a un hallazgo y no cambia el porcentaje estimado de seguridad.
                </p>
              </SectionCard>
              <SectionCard
                title="Escalabilidad"
                description="No determinada por las reglas locales."
                icon={BrainCircuit}
              >
                <p className="text-small leading-relaxed text-ink dark:text-night-ink">
                  Se requiere análisis contextual de arquitectura y pruebas de carga para estimarla.
                </p>
              </SectionCard>
            </>
          ) : (
            <>
              <SectionCard
                title="Detalle de hallazgos"
                description={`${result.reviewedFiles} archivos revisados · ${result.totalFiles} detectados`}
                icon={AlertCircle}
              >
                <details className="mb-4 text-[12px] text-muted dark:text-night-muted">
                  <summary className="w-fit cursor-pointer font-medium text-brand">Alcance y límites</summary>
                  <p className="mt-2 leading-relaxed">
                    {result.analysisEngine.startsWith('IA parcial') || result.analysisEngine.startsWith('IA por lotes')
                      ? `IA con resultados para ${result.reviewedFiles} de ${result.selectedFiles ?? result.reviewedFiles} archivos seleccionados.`
                      : `IA: ${result.reviewedFiles} archivos elegibles.`}{' '}
                    El análisis admite hasta {MAX_REVIEW_FILES} archivos, {(MAX_REPOSITORY_BYTES / 1_000_000).toLocaleString('es-PE')} MB en total,
                    {` ${MAX_FILE_BYTES / 1_000} KB por archivo y ${MAX_ANALYSIS_BATCHES} lotes.`} Se omiten pruebas, mocks,
                    fixtures, Cypress, Playwright, lockfiles, binarios, dependencias y archivos generados. El contador de detectados
                    también incluye archivos excluidos.
                  </p>
                </details>
                <details className="mb-4 rounded-lg border border-line p-3 dark:border-night-line">
                  <summary className="cursor-pointer text-small font-semibold text-ink dark:text-night-ink">
                    Ver archivos revisados ({result.reviewedPaths.length})
                  </summary>
                  <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-[12px] text-muted dark:text-night-muted">
                    {result.reviewedPaths.map((path) => (
                      <li key={path}><code>{path}</code></li>
                    ))}
                  </ul>
                </details>
                <SecurityFindings findings={result.findings} />
              </SectionCard>

              <SectionCard
                title="Recomendaciones AWS"
                description={result.awsRecommendations.length > 0
                  ? 'Servicios vinculados a hallazgos con evidencia.'
                  : 'Opción base para evaluar si usas AWS.'}
                icon={CheckCircle2}
              >
                {result.awsRecommendations.length > 0 ? (
                  <>
                    <AwsRecommendationGroups recommendations={result.awsRecommendations} />
                    <div className="mt-4 border-t border-line pt-4 dark:border-night-line">
                      <h3 className="text-small font-semibold text-ink dark:text-night-ink">
                        Seguridad estimada tras implementar las medidas
                      </h3>
                      {awsGain > 0 ? (
                        <>
                          <p className="mt-1 text-2xl font-bold text-security">
                            {securityIndex}% → {securityAfterAws}%
                            <span className="ml-2 text-small font-semibold">(+{awsGain} puntos porcentuales estimados)</span>
                          </p>
                          <p className="mt-1 text-[12px] text-muted dark:text-night-muted">
                            Proyección orientativa: supone que las medidas se implementan y mitigan los riesgos vinculados. AWS por sí solo no corrige el código.
                          </p>
                        </>
                      ) : (
                        <p className="mt-1 text-[12px] text-muted dark:text-night-muted">
                          No se estima una mejora del índice para los riesgos vinculados.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <AwsRecommendationGroups recommendations={result.awsRecommendations} />
                    <p className="mt-2 text-[12px] text-muted dark:text-night-muted">
                      La opción general no está vinculada a un hallazgo del código; por eso no se calcula una mejora de seguridad.
                    </p>
                  </>
                )}
              </SectionCard>

              <SectionCard
                title="Escalabilidad"
                description="Señales estáticas de diseño; no son mediciones de rendimiento."
                icon={BrainCircuit}
              >
                <span className="inline-flex rounded-full bg-cost/10 px-3 py-1 text-[12px] font-semibold text-cost">
                  Diseño: {result.scalability.level} · rendimiento real no medido
                </span>
                <p className="mt-3 text-small leading-relaxed text-ink dark:text-night-ink">
                  {result.scalability.assessment}
                </p>
                <ScalabilityResults
                  bottlenecks={result.scalability.bottlenecks}
                  recommendations={result.scalability.recommendations}
                />
                {result.scalability.bottlenecks.length === 0 &&
                  result.scalability.recommendations.length === 0 && (
                    <p className="mt-3 rounded-lg bg-base p-3 text-[12px] leading-relaxed text-muted dark:bg-night-bg dark:text-night-muted">
                      No hubo evidencia de código suficiente para recomendar un cambio concreto. La capacidad real requiere pruebas de carga y métricas de ejecución.
                    </p>
                  )}
              </SectionCard>
            </>
          )}

          <p className="text-[12px] text-muted dark:text-night-muted">
            Revisión parcial: no sustituye una auditoría profesional.
          </p>
        </div>
      )}
    </div>
  );
}

function EvidenceFiles({ paths }: { paths: string[] }) {
  if (paths.length === 0) return null;

  return (
    <span className="mt-1 block break-all text-[11px] text-slate-500 dark:text-slate-400">
      Archivos: {paths.join(', ')}
    </span>
  );
}

function EvidenceQuote({ text }: { text: string }) {
  if (!text) return null;

  return (
    <details className="group mt-2">
      <summary className="w-fit cursor-pointer list-none text-[11px] font-medium text-brand marker:hidden">
        Ver fragmento de evidencia
      </summary>
      <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-[11px] leading-relaxed text-emerald-200 shadow-inner">
        {text}
      </pre>
    </details>
  );
}

function AnalysisStatus({ result }: { result: GithubAuditResult }) {
  const isLocal = result.analysisEngine === 'Reglas locales';
  const isPartial =
    result.analysisEngine.startsWith('IA parcial') ||
    result.analysisEngine.startsWith('IA por lotes');

  return (
    <details
      className={`group rounded-xl border px-4 py-3 ${
        isLocal || isPartial
          ? 'border-amber-300/70 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-950/20'
          : 'border-emerald-300/70 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-950/20'
      }`}
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-small marker:hidden">
        <span className="flex min-w-0 items-center gap-2 font-semibold text-ink dark:text-night-ink">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              isLocal || isPartial ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
          Motor: {result.analysisEngine}
        </span>
        <span className="text-[11px] font-medium text-muted dark:text-night-muted">
          {result.successfulBatches !== undefined && result.totalBatches !== undefined
            ? `${result.successfulBatches} de ${result.totalBatches} lotes · `
            : ''}
          {result.reviewedFiles} archivos · Ver estado
        </span>
      </summary>
      <p className="mt-3 border-t border-black/5 pt-3 text-[12px] leading-relaxed text-muted dark:border-white/10 dark:text-night-muted">
        {result.analysisNotice}
      </p>
      {isLocal && (
        <p className="mt-1 text-[12px] text-muted dark:text-night-muted">
          Las reglas locales detectan patrones; no sustituyen una auditoría contextual.
        </p>
      )}
    </details>
  );
}

function FilterButtons<T extends string>({
  options,
  active,
  counts,
  onChange,
}: {
  options: readonly T[];
  active: T;
  counts: Record<T, number>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Filtros de resultados">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={active === option}
          onClick={() => onChange(option)}
          className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
            active === option
              ? 'border-brand bg-brand text-white shadow-sm'
              : 'border-line bg-card text-muted hover:border-brand/50 hover:text-ink dark:border-night-line dark:bg-night-card dark:text-night-muted dark:hover:text-night-ink'
          }`}
        >
          {option} <span className={active === option ? 'text-white/75' : 'opacity-60'}>{counts[option]}</span>
        </button>
      ))}
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 dark:border-night-line" aria-label="Paginación">
      <span className="text-[11px] text-muted dark:text-night-muted">
        Página {page + 1} de {pageCount}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-lg border border-line p-2 text-muted transition hover:bg-base disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-line dark:hover:bg-night-bg"
          onClick={() => onChange(page - 1)}
          disabled={page === 0}
          aria-label="Página anterior"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          className="rounded-lg border border-line p-2 text-muted transition hover:bg-base disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-line dark:hover:bg-night-bg"
          onClick={() => onChange(page + 1)}
          disabled={page + 1 >= pageCount}
          aria-label="Página siguiente"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </nav>
  );
}

function SecurityFindings({ findings }: { findings: SecurityFinding[] }) {
  const [severity, setSeverity] = useState<(typeof SEVERITY_FILTERS)[number]>('Todas');
  const [page, setPage] = useState(0);
  const counts = Object.fromEntries(
    SEVERITY_FILTERS.map((filter) => [
      filter,
      filter === 'Todas'
        ? findings.length
        : findings.filter((finding) => finding.severity === filter).length,
    ]),
  ) as Record<(typeof SEVERITY_FILTERS)[number], number>;
  const filtered = severity === 'Todas'
    ? findings
    : findings.filter((finding) => finding.severity === severity);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (findings.length === 0) {
    return (
      <p className="rounded-xl bg-base p-4 text-small text-muted dark:bg-night-bg dark:text-night-muted">
        Sin hallazgos detectados. Esto no garantiza que el proyecto esté libre de riesgos.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <FilterButtons
        options={SEVERITY_FILTERS}
        active={severity}
        counts={counts}
        onChange={(value) => {
          setSeverity(value);
          setPage(0);
        }}
      />
      {visible.length > 0 ? (
        <ul className="space-y-2.5">
          {visible.map((finding, index) => (
            <li
              key={`${finding.file}-${finding.evidence}-${index}`}
              className="rounded-xl border border-line bg-card p-4 transition-colors hover:border-brand/30 dark:border-night-line dark:bg-night-card"
            >
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={finding.severity} />
                <code className="break-all text-[11px] text-muted dark:text-night-muted">{finding.file}</code>
              </div>
              <p className="mt-2 line-clamp-2 text-small leading-relaxed text-ink dark:text-night-ink">
                {finding.description}
              </p>
              <details className="mt-2 text-[12px]">
                <summary className="w-fit cursor-pointer font-medium text-brand">
                  Ver descripción y recomendación
                </summary>
                <p className="mt-2 leading-relaxed text-ink dark:text-night-ink">
                  {finding.description}
                </p>
                <p className="mt-2 leading-relaxed text-muted dark:text-night-muted">
                  <span className="font-semibold text-ink dark:text-night-ink">Recomendación: </span>
                  {finding.recommendation}
                </p>
                <EvidenceQuote text={finding.evidence} />
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-base p-4 text-small text-muted dark:bg-night-bg dark:text-night-muted">
          No hay hallazgos con severidad {severity}.
        </p>
      )}
      <Pagination page={page} pageCount={pageCount} onChange={setPage} />
    </div>
  );
}

function ScalabilityResults({
  bottlenecks,
  recommendations,
}: {
  bottlenecks: EvidenceStatement[];
  recommendations: EvidenceStatement[];
}) {
  const options = ['Todo', 'Señales de diseño', 'Recomendaciones'] as const;
  const [filter, setFilter] = useState<(typeof options)[number]>('Todo');
  const [severity, setSeverity] = useState<(typeof SEVERITY_FILTERS)[number]>('Todas');
  const [page, setPage] = useState(0);
  const allItems = [
    ...bottlenecks.map((item) => ({ ...item, kind: 'Señal de diseño' as const })),
    ...recommendations.map((item) => ({ ...item, kind: 'Recomendación' as const })),
  ];
  const counts = Object.fromEntries(
    SEVERITY_FILTERS.map((value) => [
      value,
      value === 'Todas'
        ? allItems.length
        : allItems.filter((item) => item.severity === value).length,
    ]),
  ) as Record<(typeof SEVERITY_FILTERS)[number], number>;
  const filtered = allItems.filter(
    (item) =>
      (filter === 'Todo' ||
        (filter === 'Señales de diseño' && item.kind === 'Señal de diseño') ||
        (filter === 'Recomendaciones' && item.kind === 'Recomendación')) &&
      (severity === 'Todas' || item.severity === severity),
  );
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (allItems.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" aria-label="Tipo de observación de escalabilidad">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={filter === option}
              onClick={() => {
                setFilter(option);
                setPage(0);
              }}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${
                filter === option
                  ? 'bg-brand/10 text-brand'
                  : 'text-muted hover:bg-base dark:text-night-muted dark:hover:bg-night-bg'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <FilterButtons
        options={SEVERITY_FILTERS}
        active={severity}
        counts={counts}
        onChange={(value) => {
          setSeverity(value);
          setPage(0);
        }}
      />
      <ul className="space-y-2">
        {visible.map((item, index) => (
          <li
            key={`${item.kind}-${item.evidence}-${index}`}
            className="rounded-xl bg-base/80 p-3 dark:bg-night-bg/70"
          >
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={item.severity} />
              <span className="text-[11px] font-medium text-muted dark:text-night-muted">{item.kind}</span>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-ink dark:text-night-ink">{item.text}</p>
            <EvidenceQuote text={item.evidence} />
            <EvidenceFiles paths={item.evidenceFiles} />
          </li>
        ))}
      </ul>
      {visible.length === 0 && (
        <p className="text-[12px] text-muted dark:text-night-muted">
          No hay resultados para estos filtros.
        </p>
      )}
      <Pagination page={page} pageCount={pageCount} onChange={setPage} />
    </div>
  );
}

function SeverityBadge({ severity }: { severity: SecurityFinding['severity'] }) {
  const styles: Record<SecurityFinding['severity'], string> = {
    Crítica: 'bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300',
    Alta: 'bg-orange-100 text-orange-700 dark:bg-orange-400/10 dark:text-orange-300',
    Media: 'bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
    Baja: 'bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300',
    Info: 'bg-slate-100 text-slate-600 dark:bg-slate-400/10 dark:text-slate-300',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${styles[severity]}`}>
      Prioridad sugerida: {severity}
    </span>
  );
}

function awsCategory(service: string): string {
  const name = service.toLowerCase();
  if (/waf|shield|guardduty|inspector|security hub|cognito|kms|secrets|iam/.test(name)) {
    return 'Seguridad y WAF';
  }
  if (/cloudfront|route 53|route53|load balanc|vpc|api gateway|elastic beanstalk|amplify/.test(name)) {
    return 'Alojamiento y redes';
  }
  if (/s3|rds|dynamo|database|elasticache|storage|backup|efs/.test(name)) {
    return 'Datos y almacenamiento';
  }
  if (/cloudwatch|cloudtrail|config|x-ray|systems manager/.test(name)) {
    return 'Observabilidad y operaciones';
  }
  return 'Otros servicios';
}

function AwsRecommendationGroups({
  recommendations,
}: {
  recommendations: AwsRecommendation[];
}) {
  type GroupedRecommendation = {
    recommendation: AwsRecommendation;
    evidence: Set<string>;
    evidenceFiles: Set<string>;
    relatedFindings: Map<string, AwsRecommendation['relatedFindings'][number]>;
  };
  const grouped = new Map<string, Map<string, Map<string, GroupedRecommendation>>>();
  for (const recommendation of recommendations) {
    const category = awsCategory(recommendation.service);
    const serviceKey = recommendation.service.trim().toLowerCase();
    const categoryServices = grouped.get(category) ?? new Map();
    const serviceRecommendations = categoryServices.get(serviceKey) ?? new Map();
    const reasonKey = recommendation.reason.trim().toLowerCase();
    const entry = serviceRecommendations.get(reasonKey) ?? {
      recommendation,
      evidence: new Set<string>(),
      evidenceFiles: new Set<string>(),
      relatedFindings: new Map<string, AwsRecommendation['relatedFindings'][number]>(),
    };
    entry.evidence.add(recommendation.evidence);
    recommendation.evidenceFiles.forEach((path) => entry.evidenceFiles.add(path));
    recommendation.relatedFindings.forEach((finding) =>
      entry.relatedFindings.set(`${finding.file}\u0000${finding.evidence}`, finding),
    );
    serviceRecommendations.set(reasonKey, entry);
    categoryServices.set(serviceKey, serviceRecommendations);
    grouped.set(category, categoryServices);
  }

  if (grouped.size === 0) {
    return (
      <article className="rounded-xl border border-line bg-base p-4 dark:border-night-line dark:bg-night-bg">
        <p className="text-[10px] font-bold uppercase tracking-wide text-brand">
          Recomendación general · no inferida del código
        </p>
        <h3 className="mt-1 text-small font-semibold text-ink dark:text-night-ink">AWS Security Hub</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-muted dark:text-night-muted">
          Si despliegas en AWS, evalúa Security Hub para centralizar y priorizar hallazgos de seguridad de los servicios AWS habilitados. No corrige vulnerabilidades del código ni se asume que esté configurado.
        </p>
      </article>
    );
  }

  return (
    <div className="space-y-3">
      {[...grouped.entries()].map(([category, services]) => (
        <details
          key={category}
          className="group rounded-xl border border-line bg-card dark:border-night-line dark:bg-night-card"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden">
            <span className="font-semibold text-ink dark:text-night-ink">{category}</span>
            <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-semibold text-brand">
              {services.size} {services.size === 1 ? 'servicio' : 'servicios'}
            </span>
          </summary>
          <div className="space-y-2 border-t border-line p-3 dark:border-night-line">
            {[...services.values()].flatMap((entries) => [...entries.values()]).map((entry) => (
              <article
                key={`${entry.recommendation.service}-${entry.recommendation.reason}`}
                className="rounded-lg bg-base/80 p-3 dark:bg-night-bg/70"
              >
                <h3 className="text-small font-semibold text-ink dark:text-night-ink">
                  {entry.recommendation.service}
                </h3>
                <p className="mt-2 text-[12px] leading-relaxed text-muted dark:text-night-muted">
                  {entry.recommendation.reason}
                </p>
                <details className="mt-1 text-[11px]">
                  <summary className="w-fit cursor-pointer font-medium text-brand">
                    Ver riesgos vinculados ({entry.relatedFindings.size})
                  </summary>
                  <ul className="mt-1 space-y-1">
                    {[...entry.relatedFindings.values()].map((finding) => (
                      <li key={`${finding.file}-${finding.evidence}`}>
                        <code className="break-all text-muted dark:text-night-muted">{finding.file}</code>
                        <EvidenceQuote text={finding.evidence} />
                      </li>
                    ))}
                  </ul>
                </details>
                <details className="mt-1 text-[11px]">
                  <summary className="w-fit cursor-pointer font-medium text-brand">
                    Ver evidencia de recomendación ({entry.evidence.size})
                  </summary>
                  {[...entry.evidence].map((evidence) => (
                    <EvidenceQuote key={evidence} text={evidence} />
                  ))}
                  <EvidenceFiles paths={[...entry.evidenceFiles]} />
                </details>
              </article>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}