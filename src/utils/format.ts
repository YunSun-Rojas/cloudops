import type { Status } from '../types/cloud';

export const currency = (value: number): string =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

export const compactCurrency = (value: number): string =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 10000 ? 1 : 0,
  }).format(Number.isFinite(value) ? value : 0);

export const numberFormat = (value: number): string =>
  new Intl.NumberFormat('es-PE').format(Number.isFinite(value) ? value : 0);

export const statusColor: Record<Status, string> = {
  ok: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  info: '#2563EB',
};

export const statusLabel: Record<Status, string> = {
  ok: 'Correcto',
  warning: 'Requiere revision',
  danger: 'Problema',
  info: 'Informativo',
};

export const chartPalette = ['#2563EB', '#16A34A', '#F59E0B', '#DC2626', '#0F172A', '#64748B', '#7C3AED', '#0891B2'];

export const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const today = (): string =>
  new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });

export const clockTime = (): string =>
  new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
