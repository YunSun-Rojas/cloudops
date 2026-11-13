import { unzipSync } from 'fflate';
import {
  IGNORED_DIRECTORIES,
  auditLoadedSource,
  reviewPriority,
  type AuditProgress,
  type GithubAuditResult,
  type LoadedSource,
  type SourceFile,
} from './githubAuditService';
import {
  selectAnalysisFiles,
} from './auditSelection.mjs';

const MAX_ZIP_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_ZIP_ENTRIES = 50_000; // entradas totales del ZIP, antes de filtrar
const MAX_PROJECT_FILES = 10_000; // el servidor rechaza más de 10.000 archivos

interface ZipEntry {
  rawName: string; // nombre tal cual viene dentro del ZIP
  path: string; // ruta normalizada, sin la carpeta raíz
  size: number; // bytes del archivo ya descomprimido
}

/**
 * Tapa claves y contraseñas ANTES de que el contenido salga del navegador.
 * Conserva la forma de la línea para que las reglas locales sigan detectándola.
 */
const SECRET_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  {
    pattern: /(-----BEGIN [A-Z ]*PRIVATE KEY-----)[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----)/g,
    replacement: '$1\n[REDACTADO]\n$2',
  },
  { pattern: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g, replacement: '$1XXXXXXXXXXXXXXXX' },
  { pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, replacement: '[REDACTADO]' },
  { pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g, replacement: '[REDACTADO]' },
  { pattern: /\bxox[abprs]-[0-9A-Za-z-]{10,}\b/g, replacement: '[REDACTADO]' },
  {
    pattern:
      /(\b(?:api[_-]?key|client[_-]?secret|password|passwd|secret[_-]?key|access[_-]?token|token)\b\s*[:=]\s*["'])[^"'${}\s]{8,}(["'])/gi,
    replacement: '$1[REDACTADO]$2',
  },
];

export function redactSecrets(content: string): string {
  return SECRET_PATTERNS.reduce(
    (text, { pattern, replacement }) => text.replace(pattern, replacement),
    content,
  );
}

const normalizePath = (rawName: string) => rawName.replace(/\\/g, '/').replace(/^\.\//, '');

/** Descarta rutas peligrosas (../, absolutas) y basura de macOS */
const isUnsafeOrNoise = (path: string): boolean => {
  const segments = path.split('/');
  return (
    path.startsWith('/') ||
    /^[A-Za-z]:/.test(path) ||
    segments.some((segment) => segment === '..') ||
    segments[0] === '__MACOSX' ||
    segments[segments.length - 1] === '.DS_Store'
  );
};

const isIgnored = (path: string): boolean =>
  path.split('/').some((segment) => IGNORED_DIRECTORIES.has(segment.toLowerCase()));

/** Nombre corto y seguro para mostrar: el servidor solo acepta letras, números, punto, guion y guion bajo */
const projectLabel = (fileName: string): string => {
  const base = fileName
    .replace(/\.zip$/i, '')
    .replace(/[^A-Za-z0-9_.-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80);
  return base || 'proyecto';
};

/** Primera pasada: solo lee el índice del ZIP. Devolver false evita descomprimir nada. */
function listEntries(data: Uint8Array): Array<{ rawName: string; size: number }> {
  const entries: Array<{ rawName: string; size: number }> = [];
  unzipSync(data, {
    filter: (file) => {
      if (!file.name.endsWith('/')) entries.push({ rawName: file.name, size: file.originalSize });
      return false;
    },
  });
  return entries;
}

/** Segunda pasada: descomprime únicamente los archivos elegidos */
function extractFiles(data: Uint8Array, rawNames: Set<string>): Record<string, Uint8Array> {
  return unzipSync(data, { filter: (file) => rawNames.has(file.name) });
}

async function loadZipSource(file: File): Promise<LoadedSource> {
  if (!/\.zip$/i.test(file.name)) throw new Error('Selecciona un archivo con extensión .zip.');
  if (file.size === 0) throw new Error('El archivo ZIP está vacío.');
  if (file.size > MAX_ZIP_BYTES) {
    throw new Error(
      `El ZIP supera el límite de ${MAX_ZIP_BYTES / 1024 / 1024} MB. Excluye node_modules, dist y .git antes de comprimir.`,
    );
  }

  const data = new Uint8Array(await file.arrayBuffer());

  let rawEntries: Array<{ rawName: string; size: number }>;
  try {
    rawEntries = listEntries(data);
  } catch {
    throw new Error('No se pudo leer el ZIP: el archivo está dañado o no es un ZIP válido.');
  }
  if (rawEntries.length > MAX_ZIP_ENTRIES) {
    throw new Error('El ZIP tiene demasiados archivos. Excluye node_modules, dist y .git antes de comprimir.');
  }

  const safeEntries = rawEntries
    .map(({ rawName, size }) => ({ rawName, size, path: normalizePath(rawName) }))
    .filter((entry) => !isUnsafeOrNoise(entry.path));

  // Los programas de compresión suelen meter todo dentro de una carpeta raíz: se quita
  // para que las reglas de prioridad (README en la raíz, src/, etc.) funcionen igual que en GitHub.
  const roots = new Set(safeEntries.map((entry) => entry.path.split('/')[0]));
  const stripRoot = roots.size === 1 && safeEntries.every((entry) => entry.path.includes('/'));
  const entries: ZipEntry[] = safeEntries.map((entry) => ({
    ...entry,
    path: stripRoot ? entry.path.slice(entry.path.indexOf('/') + 1) : entry.path,
  }));

  const projectEntries = entries.filter((entry) => !isIgnored(entry.path));
  if (projectEntries.length === 0) {
    throw new Error('El ZIP no contiene archivos del proyecto (¿solo node_modules o carpetas generadas?).');
  }
  if (projectEntries.length > MAX_PROJECT_FILES) {
    throw new Error(
      `El proyecto tiene más de ${MAX_PROJECT_FILES.toLocaleString('es-PE')} archivos. Excluye las carpetas generadas antes de comprimir.`,
    );
  }

  // Misma selección que en GitHub: por prioridad, con tope de archivos y de bytes
  const reviewable = projectEntries
    .map((entry) => ({ entry, priority: reviewPriority(entry.path) }))
    .filter((item): item is { entry: ZipEntry; priority: number } => item.priority !== null)
    .sort((a, b) => a.priority - b.priority || a.entry.path.localeCompare(b.entry.path));
  if (reviewable.length === 0) {
    throw new Error('No se encontraron archivos de código o configuración revisables en el ZIP.');
  }

  const selected = selectAnalysisFiles(
    reviewable.map(({ entry }) => entry),
    (entry) => entry.size,
  );
  if (selected.length === 0) {
    throw new Error('No se encontraron archivos relevantes dentro de los límites de análisis.');
  }

  let extracted: Record<string, Uint8Array>;
  try {
    extracted = extractFiles(data, new Set(selected.map((entry) => entry.rawName)));
  } catch {
    throw new Error('No se pudo descomprimir el ZIP.');
  }

  const decoder = new TextDecoder('utf-8', { fatal: true });
  const files: SourceFile[] = [];
  for (const entry of selected) {
    const bytes = extracted[entry.rawName];
    if (!bytes || bytes.includes(0)) continue; // ausente o binario
    try {
      files.push({ path: entry.path, content: redactSecrets(decoder.decode(bytes)) });
    } catch {
      // No está en UTF-8: se omite en lugar de cancelar todo el análisis
    }
  }
  if (files.length === 0) {
    throw new Error('Los archivos seleccionados no se pudieron leer como texto.');
  }

  return {
    repositoryName: `zip/${projectLabel(file.name)}`,
    branch: 'zip',
    totalFiles: projectEntries.length,
    files,
  };
}

export async function analyzeZipProject(
  file: File,
  onProgress?: (progress: AuditProgress) => void,
): Promise<GithubAuditResult> {
  onProgress?.({ stage: 'loading', completedBatches: 0, totalBatches: 0 });
  const source = await loadZipSource(file);
  return auditLoadedSource(source, onProgress);
}