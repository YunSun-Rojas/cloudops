import { useState } from 'react';
import { Globe2, Layers, MapPin, Search } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import RegionCard from '../components/RegionCard';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { regions } from '../data/regions';
import { statusColor } from '../utils/format';

export default function Infrastructure() {
  const { regionId, setRegionId, pushNotification } = useApp();
  const [continent, setContinent] = useState('Todos');
  const [query, setQuery] = useState('');

  const continents = ['Todos', ...Array.from(new Set(regions.map((region) => region.continent)))];

  const visible = regions.filter((region) => {
    const matchContinent = continent === 'Todos' || region.continent === continent;
    const text = `${region.name} ${region.location} ${region.deployedServices.join(' ')}`.toLowerCase();
    return matchContinent && text.includes(query.trim().toLowerCase());
  });

  const totalAz = regions.reduce((sum, region) => sum + region.availabilityZones, 0);
  const totalEdge = regions.reduce((sum, region) => sum + region.edgeLocations, 0);

  const handleSelect = (id: string) => {
    setRegionId(id);
    pushNotification({
      title: 'Region actualizada',
      message: `La solucion se planifica ahora sobre ${id}.`,
      status: 'info',
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Regiones representadas" value={`${regions.length}`} icon={Globe2} tone="info" hint="Infraestructura global simulada" />
        <StatCard label="Zonas de disponibilidad" value={`${totalAz}`} icon={Layers} tone="ok" hint="Centros de datos aislados" />
        <StatCard label="Ubicaciones de borde" value={`${totalEdge}`} icon={MapPin} tone="warning" hint="Puntos de presencia de CloudFront" />
        <StatCard
          label="Region activa"
          value={regionId}
          icon={Globe2}
          tone="info"
          hint="Se aplica a costos y arquitectura"
        />
      </div>

      <SectionCard
        title="Mapa de infraestructura global"
        description="Cada punto representa una region de AWS incluida en la propuesta"
        icon={Globe2}
      >
        <div className="relative w-full overflow-hidden rounded-xl border border-line bg-base dark:border-night-line dark:bg-night-bg">
          <svg viewBox="0 0 100 74" className="h-full w-full" role="img" aria-label="Mapa de regiones">
            <defs>
              <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#E2E8F0" strokeWidth="0.2" />
              </pattern>
            </defs>
            <rect width="100" height="74" fill="url(#grid)" />

            {/* Siluetas continentales simplificadas */}
            <g fill="#CBD5E1" opacity="0.85">
              <path d="M12 22 q8-8 18-4 t12 8 -4 12 -10 6 -6 10 -6-6 -6-10 z" />
              <path d="M30 50 q6-6 10 0 t2 12 -6 8 -6-6 z" />
              <path d="M44 20 q8-6 14-2 t8 8 -6 6 -10 2 -6-6 z" />
              <path d="M48 32 q8 0 10 8 t-2 16 -10 4 -6-12 z" />
              <path d="M62 20 q14-8 24 0 t8 16 -12 10 -14-4 -8-10 z" />
              <path d="M76 56 q6-4 8 2 t-4 8 -6-4 z" />
            </g>

            {regions.map((region) => {
              const active = region.id === regionId;
              return (
                <g key={region.id} className="cursor-pointer" onClick={() => handleSelect(region.id)}>
                  {active && (
                    <circle cx={region.coords.x} cy={region.coords.y} r="3.4" fill={statusColor[region.status]} opacity="0.25" />
                  )}
                  <circle
                    cx={region.coords.x}
                    cy={region.coords.y}
                    r={active ? 1.8 : 1.3}
                    fill={statusColor[region.status]}
                    stroke="#FFFFFF"
                    strokeWidth="0.35"
                  >
                    <title>{`${region.name} - ${region.location}`}</title>
                  </circle>
                  <text
                    x={region.coords.x}
                    y={region.coords.y - 2.6}
                    textAnchor="middle"
                    fill="#1E293B"
                    style={{ fontSize: '2.1px', fontWeight: 600 }}
                    className="dark:fill-slate-200"
                  >
                    {region.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-muted dark:text-night-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-security" /> Operativa
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cost" /> Requiere revision
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-alert" /> Con incidencia
          </span>
        </div>
      </SectionCard>

      <SectionCard
        title="Regiones disponibles"
        description="Filtra por continente o busca por region, ubicacion o servicio"
        icon={MapPin}
        action={<StatusBadge status="info" label={`${visible.length} resultado(s)`} />}
      >
        <div className="mb-5 flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input-field pl-9"
              placeholder="Buscar region, ciudad o servicio"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Buscar region"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {continents.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setContinent(item)}
                className={`rounded-lg border px-3 py-2 text-[12px] font-semibold transition-colors ${
                  continent === item
                    ? 'border-brand bg-brand text-white'
                    : 'border-line text-muted hover:border-brand/60 dark:border-night-line dark:text-night-muted'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((region) => (
            <RegionCard
              key={region.id}
              region={region}
              active={region.id === regionId}
              onSelect={handleSelect}
            />
          ))}
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-small">
            <thead>
              <tr className="border-b border-line text-left text-muted dark:border-night-line dark:text-night-muted">
                <th className="py-2.5 pr-4 font-medium">Region</th>
                <th className="py-2.5 pr-4 font-medium">Ubicacion</th>
                <th className="py-2.5 pr-4 font-medium">Servicios desplegados</th>
                <th className="py-2.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((region) => (
                <tr key={region.id} className="border-b border-line dark:border-night-line">
                  <td className="py-2.5 pr-4 font-medium text-ink dark:text-night-ink">{region.name}</td>
                  <td className="py-2.5 pr-4 text-muted dark:text-night-muted">{region.location}</td>
                  <td className="py-2.5 pr-4 text-muted dark:text-night-muted">
                    {region.deployedServices.join(', ')}
                  </td>
                  <td className="py-2.5">
                    <StatusBadge status={region.status} label={region.statusLabel} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
