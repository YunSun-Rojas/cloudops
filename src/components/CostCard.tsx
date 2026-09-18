import { Trash2 } from 'lucide-react';
import type { CostItem } from '../types/cloud';
import { currency, numberFormat } from '../utils/format';

interface CostCardProps {
  item: CostItem;
  share: number;
  onRemove?: (id: string) => void;
}

export default function CostCard({ item, share, onRemove }: CostCardProps) {
  return (
    <article className="surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-ink dark:text-night-ink">{item.serviceName}</h3>
          <p className="text-[12px] text-muted dark:text-night-muted">
            {numberFormat(item.quantity)} unidad(es) · {numberFormat(item.hours)} h ·{' '}
            {currency(item.hourlyPrice)} / h
          </p>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-alert/10 hover:text-alert"
            aria-label={`Quitar ${item.serviceName} de la estimacion`}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-base p-2.5 dark:bg-night-bg">
          <p className="text-[12px] text-muted dark:text-night-muted">Costo mensual</p>
          <p className="text-[16px] font-bold text-cost">{currency(item.monthlyCost)}</p>
        </div>
        <div className="rounded-lg bg-base p-2.5 dark:bg-night-bg">
          <p className="text-[12px] text-muted dark:text-night-muted">Costo anual</p>
          <p className="text-[16px] font-bold text-ink dark:text-night-ink">{currency(item.annualCost)}</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[12px] text-muted dark:text-night-muted">
          <span>Participacion en el gasto</span>
          <span className="font-semibold text-ink dark:text-night-ink">{share.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line dark:bg-night-line">
          <div
            className="h-full rounded-full bg-cost transition-all duration-500"
            style={{ width: `${Math.min(share, 100)}%` }}
          />
        </div>
      </div>
    </article>
  );
}
