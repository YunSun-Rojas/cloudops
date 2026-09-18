import type { LucideIcon } from 'lucide-react';
import type { Status } from '../types/cloud';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: Status;
  trend?: string;
}

const tones: Record<Status, { icon: string; accent: string }> = {
  info: { icon: 'bg-brand/10 text-brand', accent: 'text-brand' },
  ok: { icon: 'bg-security/10 text-security', accent: 'text-security' },
  warning: { icon: 'bg-cost/10 text-cost', accent: 'text-cost' },
  danger: { icon: 'bg-alert/10 text-alert', accent: 'text-alert' },
};

export default function StatCard({ label, value, hint, icon: Icon, tone = 'info', trend }: StatCardProps) {
  return (
    <article className="surface p-5 transition-shadow hover:shadow-pop">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-small font-medium text-muted dark:text-night-muted">{label}</p>
          <p className="mt-2 text-[26px] font-bold leading-tight text-ink dark:text-night-ink">{value}</p>
          {hint && <p className="mt-1 text-[12px] text-muted dark:text-night-muted">{hint}</p>}
        </div>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tones[tone].icon}`}>
          <Icon size={20} />
        </span>
      </div>
      {trend && (
        <p className={`mt-3 text-[12px] font-semibold ${tones[tone].accent}`}>{trend}</p>
      )}
    </article>
  );
}
