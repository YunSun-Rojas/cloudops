/**
 * Exportacion de reportes (reto adicional).
 * Genera un archivo CSV en el navegador sin depender de librerias externas.
 */

export type ReportRow = (string | number)[];

const escapeCell = (cell: string | number): string => {
  const text = String(cell ?? '');
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const downloadCsv = (fileName: string, rows: ReportRow[]): void => {
  const csv = rows.map((row) => row.map(escapeCell).join(';')).join('\n');
  // BOM para que Excel respete las tildes
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
