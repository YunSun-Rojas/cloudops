import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import type { SecurityControl } from '../types/cloud';
import StatusBadge from './StatusBadge';

const icons = {
  ok: ShieldCheck,
  warning: ShieldQuestion,
  danger: ShieldAlert,
  info: ShieldCheck,
} as const;

const accents = {
  ok: 'border-l-security',
  warning: 'border-l-cost',
  danger: 'border-l-alert',
  info: 'border-l-brand',
} as const;

const iconTones = {
  ok: 'bg-security/10 text-security',
  warning: 'bg-cost/10 text-cost',
  danger: 'bg-alert/10 text-alert',
  info: 'bg-brand/10 text-brand',
} as const;

export default function SecurityCard({ control }: { control: SecurityControl }) {
  const Icon = icons[control.status];

  return (
    <article className={`surface border-l-4 p-5 ${accents[control.status]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconTones[control.status]}`}>
            <Icon size={19} />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold text-ink dark:text-night-ink">{control.title}</h3>
            <p className="text-[12px] text-muted dark:text-night-muted">{control.area}</p>
          </div>
        </div>
        <StatusBadge status={control.status} />
      </div>

      <p className="mt-3 text-small text-muted dark:text-night-muted">{control.description}</p>

      <div className="mt-3 rounded-lg bg-base p-3 text-[12px] dark:bg-night-bg">
        <p className="text-muted dark:text-night-muted">{control.detail}</p>
        <p className="mt-1.5 font-semibold text-ink dark:text-night-ink">
          Responsable: {control.owner}
        </p>
      </div>
    </article>
  );
}
