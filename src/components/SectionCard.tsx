import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function SectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className = '',
}: SectionCardProps) {
  return (
    <section className={`surface p-5 sm:p-6 ${className}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {Icon && (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
              <Icon size={19} />
            </span>
          )}
          <div>
            <h2 className="text-[18px] font-semibold leading-tight text-ink dark:text-night-ink">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-small text-muted dark:text-night-muted">{description}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
