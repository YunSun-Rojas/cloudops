import type { Status } from '../types/cloud';

interface StatusBadgeProps {
  status: Status;
  label?: string;
  dot?: boolean;
}

const styles: Record<Status, string> = {
  ok: 'bg-security/10 text-security border-security/25',
  warning: 'bg-cost/10 text-cost border-cost/25',
  danger: 'bg-alert/10 text-alert border-alert/25',
  info: 'bg-brand/10 text-brand border-brand/25',
};

const dotStyles: Record<Status, string> = {
  ok: 'bg-security',
  warning: 'bg-cost',
  danger: 'bg-alert',
  info: 'bg-brand',
};

const defaultLabels: Record<Status, string> = {
  ok: 'Correcto',
  warning: 'Requiere revision',
  danger: 'Problema',
  info: 'Informativo',
};

export default function StatusBadge({ status, label, dot = true }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold ${styles[status]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[status]}`} aria-hidden />}
      {label ?? defaultLabels[status]}
    </span>
  );
}
