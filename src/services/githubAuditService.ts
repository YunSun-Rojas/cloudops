import {
  isGithubAuditResult,
  type GithubAuditResult,
  type SecurityFinding,
} from '../types/githubAudit';

export type { AwsRecommendation, GithubAuditResult, SecurityFinding } from '../types/githubAudit';

interface GithubTreeEntry {
  path: string;
  type: string;
  size?: number;
}

interface GithubTree {
  truncated: boolean;
  tree: GithubTreeEntry[];
}

interface GithubRepository {
  default_branch: string;
}

interface SourceFile {
  path: string;
  content: string;
}

export interface AuditProgress {
  stage: 'loading' | 'local-review' | 'analyzing' | 'summarizing';
  completedBatches: number;
  totalBatches: number;
  retryAfterSeconds?: number;
}

class AuditApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const MAX_REVIEW_FILES = 30;
const MAX_FILE_BYTES = 100_000;
const MAX_REPOSITORY_BYTES = 150_000;
const MAX_BATCH_FILES = 30;
const MAX_BATCH_BYTES = 60_000;
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.next',
  '.nuxt',
  '.turbo',
  'build',
  'coverage',
  'dist',
  'generated',
  'node_modules',
  'out',
  'target',
  'vendor',
]);
const BINARY_EXTENSIONS = new Set([
  '.7z',
  '.avif',
  '.bmp',
  '.class',
  '.dll',
  '.doc',
  '.docx',
  '.eot',
  '.exe',
  '.gif',
  '.gz',
  '.ico',
  '.jpeg',
  '.jpg',
  '.map',
  '.mp3',
  '.mp4',
  '.otf',
  '.pdf',
  '.png',
  '.so',
  '.svgz',
  '.tar',
  '.ttf',
  '.wasm',
  '.webm',
  '.woff',
  '.woff2',
  '.zip',
]);
const TEXT_FILENAMES = new Set([
  '.dockerignore',
  '.editorconfig',
  '.env.example',
  '.gitattributes',
  '.gitignore',
  '.npmrc',
  '.nvmrc',
  '.prettierignore',
  '.prettierrc',
  'dockerfile',
  'license',
  'makefile',
  'procfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'gemfile',
  'go.mod',
  'package.json',
  'pipfile',
  'requirements.txt',
  'serverless.yml',
  'serverless.yaml',
]);
const IMPORTANT_JSON_FILES = new Set([
  'angular.json',
  'firebase.json',
  'nest-cli.json',
  'serverless.json',
  'vercel.json',
  'wrangler.json',
  'wrangler.jsonc',
]);
const SOURCE_EXTENSIONS = new Set([
  '.c',
  '.cc',
  '.conf',
  '.cpp',
  '.cs',
  '.css',
  '.cjs',
  '.cts',
  '.graphql',
  '.gql',
  '.go',
  '.h',
  '.hcl',
  '.hpp',
  '.html',
  '.java',
  '.js',
  '.jsx',
  '.jsonc',
  '.kt',
  '.lua',
  '.m',
  '.mjs',
  '.php',
  '.pl',
  '.properties',
  '.py',
  '.rb',
  '.rs',
  '.scala',
  '.scss',
  '.sh',
  '.sql',
  '.swift',
  '.tf',
  '.tfvars',
  '.toml',
  '.ts',
  '.tsx',
  '.mts',
  '.proto',
  '.vue',
  '.xml',
  '.yaml',
  '.yml',
]);
const EXCLUDED_PATH_SEGMENTS = new Set([
  ...IGNORED_DIRECTORIES,
  '__fixtures__',
  '__mocks__',
  '__snapshots__',
  'fixtures',
  'mocks',
  'samples',
  'storybook-static',
  'test-results',
]);
const EXCLUDED_FILE_NAMES = new Set([
  'bun.lock',
  'bun.lockb',
  'cargo.lock',
  'composer.lock',
  'go.sum',
  'npm-shrinkwrap.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'poetry.lock',
  'requirements.lock',
  'yarn.lock',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseRepositoryUrl(repositoryUrl: string): { owner: string; repository: string } {
  let url: URL;
  try {
    url = new URL(repositoryUrl.trim());
  } catch {
    throw new Error('Ingresa una URL válida de un repositorio público de GitHub.');
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (
    url.hostname.toLowerCase() !== 'github.com' ||
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    segments.length !== 2
  ) {
    throw new Error('La URL debe tener el formato https://github.com/usuario/repositorio.');
  }

  const [owner, repositoryWithSuffix] = segments;
  const repository = repositoryWithSuffix.replace(/\.git$/i, '');
  if (!owner || !repository) {
    throw new Error('No se pudo identificar el usuario y el repositorio en la URL.');
  }
  return { owner, repository };
}

async function fetchGithubJson<T>(url: string, subject: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  } catch {
    throw new Error(`No se pudo conectar con GitHub para obtener ${subject}.`);
  }
  if (response.status === 404) {
    throw new Error(`No se encontró ${subject}. Verifica que el repositorio sea público.`);
  }
  if (response.status === 403) {
    throw new Error('GitHub limitó las solicitudes anónimas. Espera un momento y vuelve a intentarlo.');
  }
  if (!response.ok) {
    throw new Error(`GitHub no pudo obtener ${subject} (HTTP ${response.status}).`);
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!payload) throw new Error(`GitHub devolvió JSON inválido al obtener ${subject}.`);
  return payload as T;
}

function isGithubRepository(value: unknown): value is GithubRepository {
  return isRecord(value) && typeof value.default_branch === 'string';
}

function isGithubTree(value: unknown): value is GithubTree {
  return (
    isRecord(value) &&
    typeof value.truncated === 'boolean' &&
    Array.isArray(value.tree) &&
    value.tree.every(
      (entry: unknown) =>
        isRecord(entry) && typeof entry.path === 'string' && typeof entry.type === 'string',
    )
  );
}

function reviewPriority(path: string): number | null {
  const segments = path.split('/');
  const normalizedSegments = segments.map((segment) => segment.toLowerCase());
  if (normalizedSegments.some((segment) => EXCLUDED_PATH_SEGMENTS.has(segment))) return null;

  const fileName = normalizedSegments[normalizedSegments.length - 1];
  if (
    EXCLUDED_FILE_NAMES.has(fileName) ||
    /^(?:mock|mocks|fixture|fixtures|sample|samples|seed|seeds|testdata|mockdata)\.[^.]+$/.test(
      fileName,
    ) ||
    /\.(?:mock|fixture|generated)\.[^.]+$/.test(fileName) ||
    /\.(?:min|bundle)\.(?:js|css)$/.test(fileName) ||
    /\.generated\.[^.]+$/.test(fileName)
  ) {
    return null;
  }

  const dotIndex = fileName.lastIndexOf('.');
  const extension = dotIndex > 0 ? fileName.slice(dotIndex) : '';
  const isRootReadme =
    segments.length === 1 && /^readme\.md$/i.test(fileName);
  const isSecurityDoc =
    segments.length === 1 && /^(security|contributing)\.md$/i.test(fileName);
  const isJsonConfig =
    extension === '.json' &&
    (fileName.endsWith('.config.json') ||
      fileName.startsWith('tsconfig') ||
      IMPORTANT_JSON_FILES.has(fileName) ||
      TEXT_FILENAMES.has(fileName));
  const isReviewedTextFile =
    SOURCE_EXTENSIONS.has(extension) ||
    TEXT_FILENAMES.has(fileName) ||
    isJsonConfig ||
    isRootReadme ||
    isSecurityDoc ||
    fileName === 'dockerfile' ||
    fileName.startsWith('dockerfile.');

  if (!isReviewedTextFile || (BINARY_EXTENSIONS.has(extension) && !TEXT_FILENAMES.has(fileName))) {
    return null;
  }

  if (
    normalizedSegments.some((segment) =>
      ['.github', '.circleci', 'infra', 'infrastructure', 'terraform', 'k8s', 'kubernetes'].includes(
        segment,
      ),
    ) ||
    /^(dockerfile(?:\..*)?|docker-compose\.(?:ya?ml)|package\.json|serverless\.(?:json|ya?ml)|vercel\.json|wrangler\.jsonc?)$/.test(
      fileName,
    )
  ) {
    return 0;
  }
  if (
    normalizedSegments.some((segment) =>
      ['api', 'auth', 'authentication', 'authorization', 'controllers', 'middleware', 'routes', 'server'].includes(
        segment,
      ),
    ) ||
    /(?:auth|security|permission|secret|credential)/i.test(fileName)
  ) {
    return 1;
  }
  if (
    normalizedSegments.some((segment) =>
      ['test', 'tests', '__tests__', 'spec', 'specs'].includes(segment),
    ) ||
    /\.(?:test|spec)\.[^.]+$/i.test(fileName)
  ) {
    return 3;
  }
  if (isRootReadme || isSecurityDoc) return 4;
  return 2;
}

async function readTextFile(path: string, rawUrl: string, expectedSize: number | undefined): Promise<string> {
  if (expectedSize !== undefined && expectedSize > MAX_FILE_BYTES) {
    throw new Error(
      `El archivo "${path}" supera el límite de ${MAX_FILE_BYTES / 1_000} KB; no se hizo una revisión parcial.`,
    );
  }

  let response: Response;
  try {
    response = await fetch(rawUrl);
  } catch {
    throw new Error(`No se pudo descargar "${path}" desde GitHub.`);
  }
  if (!response.ok || !response.body) {
    throw new Error(`GitHub no pudo entregar el archivo "${path}" (HTTP ${response.status}).`);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_FILE_BYTES) {
        await reader.cancel();
        throw new Error(
          `El archivo "${path}" supera el límite de ${MAX_FILE_BYTES / 1_000} KB; no se hizo una revisión parcial.`,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (bytes.includes(0)) {
    throw new Error(`El archivo "${path}" parece binario y no se puede revisar como texto.`);
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(
      `El archivo "${path}" no tiene codificación UTF-8 legible; no se hizo una revisión parcial.`,
    );
  }
}

async function loadRepositoryFiles(
  owner: string,
  repository: string,
): Promise<{ branch: string; totalFiles: number; files: SourceFile[] }> {
  const baseUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;
  const repositoryPayload: unknown = await fetchGithubJson(baseUrl, 'los metadatos del repositorio');
  if (!isGithubRepository(repositoryPayload)) {
    throw new Error('GitHub devolvió metadatos inválidos para este repositorio.');
  }

  const branch = repositoryPayload.default_branch;
  const treePayload: unknown = await fetchGithubJson(
    `${baseUrl}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    'el árbol de archivos de la rama principal',
  );
  if (!isGithubTree(treePayload)) throw new Error('GitHub devolvió un árbol de archivos inválido.');
  if (treePayload.truncated) {
    throw new Error('GitHub truncó el árbol del repositorio; no se hizo una revisión parcial.');
  }

  const allFiles = treePayload.tree.filter((entry) => entry.type === 'blob');
  const reviewableFiles = allFiles
    .map((entry) => ({ entry, priority: reviewPriority(entry.path) }))
    .filter(
      (item): item is { entry: GithubTreeEntry; priority: number } => item.priority !== null,
    )
    .sort((left, right) => left.priority - right.priority || left.entry.path.localeCompare(right.entry.path));
  if (reviewableFiles.length === 0) {
    throw new Error('No se encontraron archivos de texto revisables en el repositorio.');
  }

  const ref = branch.split('/').map(encodeURIComponent).join('/');
  const files: SourceFile[] = [];
  let totalBytes = 0;
  for (const { entry } of reviewableFiles) {
    if (files.length >= MAX_REVIEW_FILES || totalBytes >= MAX_REPOSITORY_BYTES) break;
    if (entry.size !== undefined && entry.size > MAX_FILE_BYTES) {
      continue;
    }

    const rawPath = entry.path.split('/').map(encodeURIComponent).join('/');
    let content: string;
    try {
      content = await readTextFile(
        entry.path,
        `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/${ref}/${rawPath}`,
        entry.size,
      );
    } catch (error) {
      if (entry.size === undefined && error instanceof Error && error.message.includes('supera el límite')) {
        continue;
      }
      throw error;
    }
    const fileBytes = new TextEncoder().encode(content).byteLength;
    if (totalBytes + fileBytes > MAX_REPOSITORY_BYTES) {
      continue;
    }
    files.push({ path: entry.path, content });
    totalBytes += fileBytes;
  }

  if (files.length === 0) {
    throw new Error('No se encontraron archivos relevantes dentro de los límites de análisis.');
  }

  return {
    branch,
    totalFiles: allFiles.length,
    files,
  };
}

function splitIntoBatches(files: SourceFile[]): SourceFile[][] {
  const batches: SourceFile[][] = [];
  let batch: SourceFile[] = [];
  let batchBytes = 0;

  for (const file of files) {
    const fileBytes = new TextEncoder().encode(file.content).byteLength;
    if (
      batch.length > 0 &&
      (batch.length >= MAX_BATCH_FILES || batchBytes + fileBytes > MAX_BATCH_BYTES)
    ) {
      batches.push(batch);
      batch = [];
      batchBytes = 0;
    }
    batch.push(file);
    batchBytes += fileBytes;
  }
  if (batch.length > 0) batches.push(batch);
  return batches;
}

interface StaticRule {
  pattern: RegExp;
  severity: SecurityFinding['severity'];
  description: string;
  recommendation: string;
}

const STATIC_SECURITY_RULES: StaticRule[] = [
  {
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    severity: 'Crítica',
    description: 'El archivo contiene un encabezado de clave privada.',
    recommendation: 'Revoca y reemplaza la clave; guárdala en un gestor de secretos y elimina el secreto del historial.',
  },
  {
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
    severity: 'Crítica',
    description: 'Se detectó un identificador con formato de clave de acceso de AWS.',
    recommendation: 'Revoca la credencial inmediatamente y usa roles IAM o AWS Secrets Manager.',
  },
  {
    pattern: /\b(?:api[_-]?key|client[_-]?secret|password|passwd|secret[_-]?key|access[_-]?token)\b\s*[:=]\s*["'][^"'${}\s]{8,}["']/i,
    severity: 'Alta',
    description: 'Posible credencial codificada directamente en el archivo.',
    recommendation: 'Rota la credencial y obtén su valor desde un gestor de secretos o una variable de entorno segura.',
  },
  {
    pattern: /\b(?:NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0|rejectUnauthorized\s*:\s*false)\b/i,
    severity: 'Alta',
    description: 'La verificación de certificados TLS parece estar deshabilitada.',
    recommendation: 'Mantén la validación TLS habilitada y corrige la cadena de certificados del servicio.',
  },
  {
    pattern: /\b(?:eval\s*\(|new\s+Function\s*\()/,
    severity: 'Alta',
    description: 'Se encontró ejecución dinámica de código, que puede permitir inyección.',
    recommendation: 'Evita evaluar cadenas dinámicas; utiliza alternativas explícitas y valida cualquier entrada.',
  },
  {
    pattern: /\bdangerouslySetInnerHTML\b|\.innerHTML\s*=/,
    severity: 'Alta',
    description: 'Se encontró una asignación de HTML que podría introducir XSS si el contenido no está sanitizado.',
    recommendation: 'Usa renderizado seguro o sanitiza el contenido con una biblioteca mantenida y una política estricta.',
  },
  {
    pattern: /\b(?:exec|execSync)\s*\(\s*`[^`]*\$\{/,
    severity: 'Alta',
    description: 'Un comando de shell parece interpolar datos dinámicos.',
    recommendation: 'Evita concatenar entrada en comandos; usa spawn con argumentos separados y valida cada valor.',
  },
  {
    pattern: /\b(?:query|execute)\s*\(\s*`[^`]*\$\{/i,
    severity: 'Alta',
    description: 'Una consulta parece interpolar valores en SQL en lugar de parametrizarlos.',
    recommendation: 'Usa consultas parametrizadas para todos los valores dinámicos.',
  },
  {
    pattern: /\b(?:Access-Control-Allow-Origin\s*:\s*['"]?\*|cors\s*\(\s*\))/i,
    severity: 'Media',
    description: 'La política CORS parece permitir cualquier origen.',
    recommendation: 'Restringe los orígenes permitidos a los dominios necesarios para la aplicación.',
  },
  {
    pattern: /\b(?:0\.0\.0\.0\/0|::\/0)\b/,
    severity: 'Media',
    description: 'Se encontró una regla de red que podría exponer un servicio a Internet.',
    recommendation: 'Limita el acceso a rangos IP y puertos estrictamente necesarios.',
  },
];

function buildStaticAudit(
  repository: string,
  branch: string,
  totalFiles: number,
  files: SourceFile[],
  notice: string,
): GithubAuditResult {
  const findings: SecurityFinding[] = [];

  for (const file of files) {
    const lines = file.content.split(/\r?\n/);
    for (const rule of STATIC_SECURITY_RULES) {
      const lineIndex = lines.findIndex((line) => rule.pattern.test(line));
      if (lineIndex < 0) continue;

      findings.push({
        severity: rule.severity,
        file: file.path,
        description: `${rule.description} Línea ${lineIndex + 1}.`,
        recommendation: rule.recommendation,
      });
    }
  }

  const scorePenalty: Record<SecurityFinding['severity'], number> = {
    Crítica: 30,
    Alta: 18,
    Media: 9,
    Baja: 4,
    Info: 0,
  };
  const maximumLocalScore = files.length < totalFiles ? 55 : 70;
  const deductions = findings.reduce(
    (score, finding) => score + scorePenalty[finding.severity],
    0,
  );
  const securityScore = Math.max(0, maximumLocalScore - deductions);
  const estimatedSecurityGainPoints = Math.min(
    10,
    deductions,
    (files.length < totalFiles ? 65 : 80) - securityScore,
  );
  const awsRecommendations = [
    {
      service: 'AWS Secrets Manager',
      reason: 'Almacena y rota credenciales fuera del código fuente.',
    },
    {
      service: 'AWS IAM',
      reason: 'Aplica roles y permisos de mínimo privilegio a los recursos desplegados.',
    },
    {
      service: 'AWS CloudTrail',
      reason: 'Registra la actividad de la cuenta para auditoría y detección de cambios.',
    },
  ];

  return {
    repository,
    branch,
    analysisEngine: 'Reglas locales',
    analysisNotice: `${notice} Puntaje heurístico limitado a ${maximumLocalScore} porque las reglas locales no pueden certificar la seguridad del proyecto.`,
    reviewedFiles: files.length,
    reviewedPaths: files.map((file) => file.path),
    totalFiles,
    findings,
    securityScore,
    estimatedSecurityAfterRecommendations: Math.min(
      files.length < totalFiles ? 65 : 80,
      securityScore + estimatedSecurityGainPoints,
    ),
    estimatedSecurityGainPoints,
    securityEstimateAssumptions: [
      'Estimación heurística basada únicamente en los patrones estáticos detectados.',
      'Supone que todas las recomendaciones relacionadas se implementan correctamente y se verifican.',
      'No equivale a una medición de riesgo real ni garantiza una mejora porcentual.',
    ],
    scalability: {
      level: 'No determinada',
      assessment:
        'El respaldo local no puede evaluar de forma fiable la arquitectura ni el comportamiento bajo carga; la escalabilidad requiere análisis contextual y pruebas.',
      bottlenecks: [],
      recommendations: [
        'Ejecutar pruebas de carga con métricas de latencia, errores y consumo de recursos.',
        'Revisar consultas, caché y tareas asíncronas con datos representativos.',
      ],
    },
    awsRecommendations,
    improvementLevel: securityScore >= 80 ? 'Bajo' : securityScore >= 55 ? 'Medio' : 'Alto',
    technicalJustification:
      findings.length > 0
        ? `El análisis estático local encontró ${findings.length} patrón(es) que requieren revisión manual. El puntaje es una heurística, no una evaluación contextual de una IA.`
        : 'El análisis estático local no encontró coincidencias con las reglas incluidas. Esto no demuestra que el repositorio esté libre de vulnerabilidades.',
  };
}

async function postAuditRequest(body: unknown, onRetry?: (seconds: number) => void): Promise<GithubAuditResult> {
  for (let attempt = 0; ; attempt += 1) {
    let response: Response;
    try {
      response = await fetch('/api/github-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error('No se pudo conectar con el servicio de análisis. Verifica que el backend esté iniciado.');
    }

    const payload: unknown = await response.json().catch(() => null);
    if (
      response.status === 503 && attempt < 2
    ) {
      const seconds =
        isRecord(payload) && typeof payload.retryAfterSeconds === 'number'
          ? Math.min(90, Math.max(1, payload.retryAfterSeconds))
          : 10 * (attempt + 1);
      for (let remaining = seconds; remaining > 0; remaining -= 1) {
        onRetry?.(remaining);
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
      continue;
    }
    if (!response.ok) {
      const message =
        isRecord(payload) && typeof payload.error === 'string'
          ? payload.error
          : `El servicio de análisis respondió con un error (HTTP ${response.status}).`;
      throw new AuditApiError(message, response.status);
    }
    if (!isGithubAuditResult(payload)) {
      throw new Error('El servicio de análisis devolvió una respuesta con formato inesperado.');
    }
    return payload;
  }
}

export async function analyzeGithubRepository(
  repositoryUrl: string,
  onProgress?: (progress: AuditProgress) => void,
): Promise<GithubAuditResult> {
  onProgress?.({ stage: 'loading', completedBatches: 0, totalBatches: 0 });
  const { owner, repository } = parseRepositoryUrl(repositoryUrl);
  const { branch, totalFiles, files } = await loadRepositoryFiles(owner, repository);
  const repositoryName = `${owner}/${repository}`;
  onProgress?.({ stage: 'local-review', completedBatches: 0, totalBatches: 0 });
  const localResult = buildStaticAudit(
    repositoryName,
    branch,
    totalFiles,
    files,
    'Gemini no está disponible; se muestran coincidencias de reglas estáticas locales.',
  );
  const batches = splitIntoBatches(files);
  const results: GithubAuditResult[] = [];

  try {
    for (const [index, batch] of batches.entries()) {
      onProgress?.({
        stage: 'analyzing',
        completedBatches: index,
        totalBatches: batches.length,
      });
      results.push(
        await postAuditRequest(
          {
            action: 'analyze-batch',
            repository: repositoryName,
            branch,
            totalFiles,
            files: batch,
          },
          (seconds) => {
            onProgress?.({
              stage: 'analyzing',
              completedBatches: index,
              totalBatches: batches.length,
              retryAfterSeconds: seconds,
            });
          },
        ),
      );
      onProgress?.({
        stage: 'analyzing',
        completedBatches: index + 1,
        totalBatches: batches.length,
      });
    }

    onProgress?.({
      stage: 'summarizing',
      completedBatches: batches.length,
      totalBatches: batches.length,
    });
    return await postAuditRequest({
      action: 'summarize',
      repository: repositoryName,
      branch,
      totalFiles,
      reviewedFiles: files.length,
      reviewedPaths: files.map((file) => file.path),
      batches: results,
    });
  } catch (error) {
    const reason =
      error instanceof AuditApiError && error.status === 429
        ? 'Gemini alcanzó su cuota o límite temporal; se usó el análisis estático local.'
        : 'No se pudo completar el análisis de Gemini; se usó el análisis estático local.';
    return {
      ...localResult,
      analysisNotice: `${reason}${error instanceof Error ? ` Detalle: ${error.message}` : ''}`,
    };
  }
}
