import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { AwsService } from '../types/cloud';
import StatusBadge from './StatusBadge';
import { currency } from '../utils/format';

interface ServiceCardProps {
  service: AwsService;
  selected?: boolean;
  onToggle?: (id: string) => void;
}

export default function ServiceCard({ service, selected, onToggle }: ServiceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = service.icon;

  const usageStatus =
    service.usage === 'En uso' ? 'ok' : service.usage === 'Planificado' ? 'warning' : 'info';

  return (
    <article
      className={`surface flex flex-col p-5 transition-all hover:shadow-pop ${
        selected ? 'ring-2 ring-brand' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-brand">
            <Icon size={20} />
          </span>
          <div>
            <h3 className="text-[16px] font-semibold text-ink dark:text-night-ink">{service.name}</h3>
            <p className="text-[12px] text-muted dark:text-night-muted">{service.category}</p>
          </div>
        </div>
        <StatusBadge status={usageStatus} label={service.usage} />
      </div>

      <p className="mt-3 text-small text-muted dark:text-night-muted">{service.description}</p>

      <dl className="mt-4 space-y-2 text-small">
        <div className="flex justify-between gap-3">
          <dt className="text-muted dark:text-night-muted">Funcion principal</dt>
          <dd className="max-w-[60%] text-right font-medium text-ink dark:text-night-ink">
            {service.mainFunction}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted dark:text-night-muted">Costo unitario</dt>
          <dd className="font-semibold text-cost">
            {service.hourlyPrice === 0 ? 'Sin costo' : `${currency(service.hourlyPrice)} / h`}
          </dd>
        </div>
      </dl>

      {expanded && (
        <div className="mt-4 animate-fade-up rounded-lg bg-base p-3 text-small dark:bg-night-bg">
          <p className="text-muted dark:text-night-muted">
            <span className="font-semibold text-ink dark:text-night-ink">Unidad facturable: </span>
            {service.unit}
          </p>
          <p className="mt-2 text-muted dark:text-night-muted">
            <span className="font-semibold text-ink dark:text-night-ink">Responsabilidad: </span>
            {service.responsibility}
          </p>
          <p className="mt-2 text-muted dark:text-night-muted">{service.docs}</p>
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 pt-4">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="btn-ghost flex-1 py-2"
          aria-expanded={expanded}
        >
          {expanded ? 'Ocultar detalle' : 'Ver detalle'}
          <ChevronDown size={15} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
        {onToggle && (
          <button
            type="button"
            onClick={() => onToggle(service.id)}
            className={selected ? 'btn-primary flex-1 py-2' : 'btn-ghost flex-1 py-2'}
          >
            {selected ? 'Seleccionado' : 'Seleccionar'}
          </button>
        )}
      </div>
    </article>
  );
}
