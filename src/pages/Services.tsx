import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Boxes, Search, Download, X } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import ServiceCard from '../components/ServiceCard';
import StatusBadge from '../components/StatusBadge';
import { awsServices, serviceCategories, getServiceById } from '../data/awsServices';
import { useApp } from '../context/AppContext';
import { currency } from '../utils/format';
import { downloadCsv } from '../utils/report';

export default function Services() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pushNotification } = useApp();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [category, setCategory] = useState<string>('Todas');
  const [selected, setSelected] = useState<string[]>(
    awsServices.filter((service) => service.usage === 'En uso').map((service) => service.id),
  );

  /** Reto adicional: vista detallada de cada servicio */
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = detailId ? getServiceById(detailId) : undefined;

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetailId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return awsServices.filter((service) => {
      const matchCategory = category === 'Todas' || service.category === category;
      const haystack =
        `${service.name} ${service.category} ${service.description} ${service.mainFunction}`.toLowerCase();
      return matchCategory && haystack.includes(text);
    });
  }, [query, category]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const exportCatalog = () => {
    downloadCsv('catalogo-servicios-aws.csv', [
      ['CloudOps Dashboard - Catalogo de servicios AWS'],
      [],
      ['Servicio', 'Categoria', 'Funcion principal', 'Estado de utilizacion', 'Responsabilidad'],
      ...filtered.map((service) => [
        service.name,
        service.category,
        service.mainFunction,
        service.usage,
        service.responsibility,
      ]),
    ]);
    pushNotification({
      title: 'Catalogo exportado',
      message: 'Se descargo el catalogo de servicios AWS en formato CSV.',
      status: 'ok',
    });
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Catalogo de servicios AWS"
        description="Busca, filtra y revisa el detalle de cada servicio de la propuesta"
        icon={Boxes}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status="info" label={`${selected.length} seleccionado(s)`} />
            <button type="button" onClick={exportCatalog} className="btn-ghost py-2">
              <Download size={15} /> Exportar
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input-field pl-9"
              placeholder="Buscar por nombre, categoria o funcion"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearchParams(event.target.value ? { q: event.target.value } : {});
              }}
              aria-label="Buscar servicio AWS"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {['Todas', ...serviceCategories].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-lg border px-3 py-2 text-[12px] font-semibold transition-colors ${
                category === item
                  ? 'border-brand bg-brand text-white'
                  : 'border-line text-muted hover:border-brand/60 dark:border-night-line dark:text-night-muted'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </SectionCard>

      {filtered.length === 0 ? (
        <p className="surface py-14 text-center text-small text-muted dark:text-night-muted">
          No hay servicios que coincidan con la busqueda. Prueba con otro termino o cambia el filtro.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((service) => (
            <div key={service.id} className="flex animate-fade-up flex-col">
              <ServiceCard
                service={service}
                selected={selected.includes(service.id)}
                onToggle={toggle}
              />
              <button
                type="button"
                onClick={() => setDetailId(service.id)}
                className="mt-2 self-start text-[12px] font-semibold text-brand hover:underline"
              >
                Abrir ficha completa
              </button>
            </div>
          ))}
        </div>
      )}

      <SectionCard title="Resumen del catalogo" description="Comparativa rapida de los servicios incluidos" icon={Boxes}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-small">
            <thead>
              <tr className="border-b border-line text-left text-muted dark:border-night-line dark:text-night-muted">
                <th className="py-2.5 pr-4 font-medium">Nombre</th>
                <th className="py-2.5 pr-4 font-medium">Categoria</th>
                <th className="py-2.5 pr-4 font-medium">Funcion principal</th>
                <th className="py-2.5 pr-4 font-medium">Responsabilidad</th>
                <th className="py-2.5 font-medium">Estado de utilizacion</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((service) => (
                <tr key={service.id} className="border-b border-line dark:border-night-line">
                  <td className="py-2.5 pr-4 font-medium text-ink dark:text-night-ink">{service.name}</td>
                  <td className="py-2.5 pr-4 text-muted dark:text-night-muted">{service.category}</td>
                  <td className="py-2.5 pr-4 text-muted dark:text-night-muted">{service.mainFunction}</td>
                  <td className="py-2.5 pr-4 text-muted dark:text-night-muted">{service.responsibility}</td>
                  <td className="py-2.5">
                    <StatusBadge
                      status={service.usage === 'En uso' ? 'ok' : service.usage === 'Planificado' ? 'warning' : 'info'}
                      label={service.usage}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-sidebar/60 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={`Ficha de ${detail.name}`}
          onClick={() => setDetailId(null)}
        >
          <div
            className="surface max-h-[85vh] w-full max-w-lg animate-fade-up overflow-y-auto p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand/10 text-brand">
                  <detail.icon size={22} />
                </span>
                <div>
                  <h2 className="text-[20px] font-bold leading-tight text-ink dark:text-night-ink">
                    {detail.name}
                  </h2>
                  <p className="text-small text-muted dark:text-night-muted">{detail.category}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailId(null)}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-alert/10 hover:text-alert"
                aria-label="Cerrar ficha"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-4 text-body text-muted dark:text-night-muted">{detail.description}</p>

            <dl className="mt-5 space-y-3">
              <div className="rounded-lg bg-base p-3 dark:bg-night-bg">
                <dt className="text-[12px] text-muted dark:text-night-muted">Funcion principal</dt>
                <dd className="text-small font-medium text-ink dark:text-night-ink">
                  {detail.mainFunction}
                </dd>
              </div>
              <div className="rounded-lg bg-base p-3 dark:bg-night-bg">
                <dt className="text-[12px] text-muted dark:text-night-muted">Unidad facturable</dt>
                <dd className="text-small font-medium text-ink dark:text-night-ink">{detail.unit}</dd>
              </div>
              <div className="rounded-lg bg-base p-3 dark:bg-night-bg">
                <dt className="text-[12px] text-muted dark:text-night-muted">
                  Modelo de responsabilidad compartida
                </dt>
                <dd className="text-small font-medium text-ink dark:text-night-ink">
                  {detail.responsibility}
                </dd>
              </div>
              <div className="rounded-lg bg-base p-3 dark:bg-night-bg">
                <dt className="text-[12px] text-muted dark:text-night-muted">Nota de economia Cloud</dt>
                <dd className="text-small font-medium text-ink dark:text-night-ink">{detail.docs}</dd>
              </div>
            </dl>

            <div className="mt-5 flex items-center justify-between gap-3">
              <StatusBadge
                status={
                  detail.usage === 'En uso' ? 'ok' : detail.usage === 'Planificado' ? 'warning' : 'info'
                }
                label={detail.usage}
              />
              <p className="text-[16px] font-bold text-cost">
                {detail.hourlyPrice === 0 ? 'Sin costo' : `${currency(detail.hourlyPrice)} / h`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
