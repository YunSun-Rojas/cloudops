import type { GithubAuditResult } from '../types/githubAudit';

export function aggregateAuditBatches(
  batches: GithubAuditResult[],
  totalFiles: number,
  selectedFiles: number,
  notice: string,
  incomplete: boolean,
  successfulBatches?: number,
  totalBatches?: number,
): GithubAuditResult;
