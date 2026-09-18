import { MapPin, Server, Signal, Zap } from 'lucide-react';
import type { Region } from '../types/cloud';
import StatusBadge from './StatusBadge';

interface RegionCardProps {
  region: Region;
  active?: boolean;
  onSelect?: (id: string) => void;
}

export default function RegionCard({ region, active, onSelect }: RegionCardProps) {
  return (
    <article
      className={`surface p-5 transition-all hover:shadow-pop ${active ? 'ring-2 ring-brand' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-semibold text-ink dark:text-night-ink">{region.name}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted dark:text-night-muted">
            <MapPin size={13} /> {region.location}
          </p>
        </div>
        <StatusBadge status={region.status} label={region.statusLabel} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-base p-2 dark:bg-night-bg">
          <p className="flex items-center justify-center gap-1 text-[11px] text-muted dark:text-night-muted">
            <Server size={12} /> AZ
          </p>
          <p className="text-[15px] font-bold text-ink dark:text-night-ink">{region.availabilityZones}</p>
        </div>
        <div className="rounded-lg bg-base p-2 dark:bg-night-bg">
          <p className="flex items-center justify-center gap-1 text-[11px] text-muted dark:text-night-muted">
            <Zap size={12} /> Borde
          </p>
          <p className="text-[15px] font-bold text-ink dark:text-night-ink">{region.edgeLocations}</p>
        </div>
        <div className="rounded-lg bg-base p-2 dark:bg-night-bg">
          <p className="flex items-center justify-center gap-1 text-[11px] text-muted dark:text-night-muted">
            <Signal size={12} /> Latencia
          </p>
          <p className="text-[15px] font-bold text-ink dark:text-night-ink">{region.latencyMs} ms</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[12px] text-muted dark:text-night-muted">Servicios desplegados</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {region.deployedServices.map((service) => (
            <li
              key={service}
              className="rounded-md border border-line bg-base px-2 py-0.5 text-[11px] font-medium text-ink dark:border-night-line dark:bg-night-bg dark:text-night-ink"
            >
              {service}
            </li>
          ))}
        </ul>
      </div>

      {onSelect && (
        <button
          type="button"
          onClick={() => onSelect(region.id)}
          className={`mt-4 w-full py-2 ${active ? 'btn-primary' : 'btn-ghost'}`}
        >
          {active ? 'Region seleccionada' : 'Usar esta region'}
        </button>
      )}
    </article>
  );
}
