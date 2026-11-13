export const MAX_ANALYSIS_BATCHES: number;
export const MAX_REVIEW_FILES: number;
export const MAX_FILE_BYTES: number;
export const MAX_REPOSITORY_BYTES: number;

export function canAddAnalysisFile(fileSizes: readonly number[], nextFileBytes: number): boolean;

export function selectAnalysisFiles<T>(
  files: readonly T[],
  getFileSize: (file: T) => number,
): T[];
