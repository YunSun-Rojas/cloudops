export const MAX_ANALYSIS_BATCHES = 200;
export const MAX_REVIEW_FILES = 600;
export const MAX_FILE_BYTES = 100_000;
export const MAX_REPOSITORY_BYTES = 10_000_000;

const MAX_BATCH_FILES = 15;
const MAX_BATCH_BYTES = 60_000;

export function canAddAnalysisFile(fileSizes, nextFileBytes) {
  let batchCount = 0;
  let batchFiles = 0;
  let batchBytes = 0;

  for (const fileBytes of [...fileSizes, nextFileBytes]) {
    if (
      batchFiles > 0 &&
      (batchFiles >= MAX_BATCH_FILES || batchBytes + fileBytes > MAX_BATCH_BYTES)
    ) {
      batchCount += 1;
      batchFiles = 0;
      batchBytes = 0;
    }
    batchFiles += 1;
    batchBytes += fileBytes;
  }

  return batchCount + (batchFiles > 0 ? 1 : 0) <= MAX_ANALYSIS_BATCHES;
}

export function selectAnalysisFiles(files, getFileSize) {
  const selected = [];
  const fileSizes = [];
  let totalBytes = 0;

  for (const file of files) {
    if (selected.length >= MAX_REVIEW_FILES) break;
    const fileBytes = getFileSize(file);
    if (
      !Number.isFinite(fileBytes) ||
      fileBytes <= 0 ||
      fileBytes > MAX_FILE_BYTES ||
      totalBytes + fileBytes > MAX_REPOSITORY_BYTES ||
      !canAddAnalysisFile(fileSizes, fileBytes)
    ) {
      continue;
    }

    selected.push(file);
    fileSizes.push(fileBytes);
    totalBytes += fileBytes;
  }

  return selected;
}
