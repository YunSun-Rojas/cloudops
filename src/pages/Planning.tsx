  import { useEffect, useState } from 'react';
  import { supabase } from '../lib/supabase';
  import { ClipboardList, Table2, Trash2, Save, RotateCcw } from 'lucide-react';
  import SectionCard from '../components/SectionCard';
  import StatusBadge from '../components/StatusBadge';
  import { useApp } from '../context/AppContext';
  import { regions, getRegionById } from '../data/regions';
  import { awsServices, getServiceById } from '../data/awsServices';
  import { numberFormat } from '../utils/format';
  import type { AppType, Availability, MigrationGoal } from '../types/cloud';

  const appTypes: AppType[] = [
    'Aplicacion web',
    'API / Microservicios',
    'Aplicacion movil',
    'Analitica de datos',
    'Comercio electronico',
  ];

  const availabilities: Availability[] = ['99.0%', '99.9%', '99.95%', '99.99%'];

  const handleDelete = async (id: number) => {
    const confirmar = window.confirm(
      '¿Deseas eliminar esta propuesta?'
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from('propuestas_cloud')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando propuesta:', error);
      alert('No se pudo eliminar la propuesta.');
      return;
    }

    await loadProposals();
  };

  const goals: MigrationGoal[] = [
    'Reduccion de costos',
    'Escalabilidad',
    'Alta disponibilidad',
    'Modernizacion de la aplicacion',
    'Mejora de seguridad',
  ];

  interface FormState {
    name: string;
    appType: AppType;
    description: string;
    regionId: string;
    estimatedUsers: string;
    availability: Availability;
    services: string[];
    goal: MigrationGoal;
  }

  interface ProposalDB {
    id: number;
    nombre: string;
    descripcion: string;
    region: string;
    costo_estimado: number;
    estado: string;
    tipo_aplicacion: AppType;
    usuarios_estimados: number;
    disponibilidad: Availability;
    objetivo: MigrationGoal;

    configuracion: {
      servicios: string[];
    };

    created_at: string;
  }

  const emptyForm: FormState = {
    name: '',
    appType: 'Aplicacion web',
    description: '',
    regionId: 'us-east-1',
    estimatedUsers: '',
    availability: '99.9%',
    services: [],
    goal: 'Escalabilidad',
  };

  export default function Planning() {
    const { regionId } = useApp();
    const [proposals, setProposals] = useState<ProposalDB[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<FormState>({ ...emptyForm, regionId });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saved, setSaved] = useState(false);

    const loadProposals = async () => { setLoading(true);

    const { data, error } = await supabase
      .from('propuestas_cloud')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error cargando propuestas:', error);
      setLoading(false);
      return;
    }

    setProposals((data ?? []) as ProposalDB[]);
    setLoading(false);
  };
    useEffect(() => {
      loadProposals();
    }, []);
    const toggleService = (id: string) => {
      setForm((prev) => ({
        ...prev,
        services: prev.services.includes(id)
          ? prev.services.filter((item) => item !== id)
          : [...prev.services, id],
      }));
    };

    const validate = (): boolean => {
      const next: Record<string, string> = {};
      if (form.name.trim().length < 4) next.name = 'Escribe un nombre de al menos 4 caracteres.';
      if (form.description.trim().length < 15)
        next.description = 'Describe la solucion con al menos 15 caracteres.';
      const users = Number(form.estimatedUsers);
      if (!form.estimatedUsers || Number.isNaN(users) || users <= 0)
        next.estimatedUsers = 'Indica un numero de usuarios mayor que cero.';
      if (form.services.length === 0) next.services = 'Selecciona al menos un servicio Cloud.';
      setErrors(next);
      return Object.keys(next).length === 0;
    };

    const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validate()) return;

    const { error } = await supabase
      .from('propuestas_cloud')
      .insert({
        nombre: form.name.trim(),

        descripcion: form.description.trim(),

        region: form.regionId,

        tipo_aplicacion: form.appType,

        usuarios_estimados: Number(form.estimatedUsers),

        disponibilidad: form.availability,

        objetivo: form.goal,

        estado: 'planificado',

        costo_estimado: 0,

        configuracion: {
          servicios: form.services,
        },
      });

    if (error) {
      console.error('Error guardando propuesta:', error);
      alert('No se pudo guardar la propuesta.');
      return;
    }

    await loadProposals();

    setForm({
      ...emptyForm,
      regionId,
    });

    setErrors({});
    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 3500);
  };

    return (
      <div className="space-y-6">
        <SectionCard
          title="Registrar propuesta de solucion Cloud"
          description="Completa los datos de la solucion que se desea llevar a la nube"
          icon={ClipboardList}
          action={
            <button
              type="button"
              onClick={() => {
                setForm({ ...emptyForm, regionId });
                setErrors({});
              }}
              className="btn-ghost py-2"
            >
              <RotateCcw size={15} /> Limpiar
            </button>
          }
        >
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label-field" htmlFor="name">
                  Nombre de la solucion
                </label>
                <input
                  id="name"
                  className="input-field"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Plataforma de facturacion electronica"
                />
                {errors.name && <p className="mt-1 text-[12px] text-alert">{errors.name}</p>}
              </div>

              <div>
                <label className="label-field" htmlFor="appType">
                  Tipo de aplicacion
                </label>
                <select
                  id="appType"
                  className="input-field"
                  value={form.appType}
                  onChange={(event) => setForm({ ...form, appType: event.target.value as AppType })}
                >
                  {appTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label-field" htmlFor="description">
                Descripcion
              </label>
              <textarea
                id="description"
                rows={3}
                className="input-field resize-y"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Describe el alcance funcional y tecnico de la solucion"
              />
              {errors.description && <p className="mt-1 text-[12px] text-alert">{errors.description}</p>}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="label-field" htmlFor="regionId">
                  Region seleccionada
                </label>
                <select
                  id="regionId"
                  className="input-field"
                  value={form.regionId}
                  onChange={(event) => setForm({ ...form, regionId: event.target.value })}
                >
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name} - {region.location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-field" htmlFor="estimatedUsers">
                  Numero estimado de usuarios
                </label>
                <input
                  id="estimatedUsers"
                  type="number"
                  min={1}
                  className="input-field"
                  value={form.estimatedUsers}
                  onChange={(event) => setForm({ ...form, estimatedUsers: event.target.value })}
                  placeholder="1500"
                />
                {errors.estimatedUsers && (
                  <p className="mt-1 text-[12px] text-alert">{errors.estimatedUsers}</p>
                )}
              </div>

              <div>
                <label className="label-field" htmlFor="availability">
                  Nivel de disponibilidad requerido
                </label>
                <select
                  id="availability"
                  className="input-field"
                  value={form.availability}
                  onChange={(event) =>
                    setForm({ ...form, availability: event.target.value as Availability })
                  }
                >
                  {availabilities.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-field" htmlFor="goal">
                  Objetivo de la migracion
                </label>
                <select
                  id="goal"
                  className="input-field"
                  value={form.goal}
                  onChange={(event) => setForm({ ...form, goal: event.target.value as MigrationGoal })}
                >
                  {goals.map((goal) => (
                    <option key={goal}>{goal}</option>
                  ))}
                </select>
              </div>
            </div>

            <fieldset>
              <legend className="label-field">Servicios Cloud seleccionados</legend>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {awsServices.map((service) => {
                  const checked = form.services.includes(service.id);
                  return (
                    <label
                      key={service.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-small transition-colors ${
                        checked
                          ? 'border-brand bg-brand/5 text-ink dark:text-night-ink'
                          : 'border-line text-muted hover:border-brand/50 dark:border-night-line dark:text-night-muted'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-brand"
                        checked={checked}
                        onChange={() => toggleService(service.id)}
                      />
                      <span className="truncate font-medium">{service.name}</span>
                    </label>
                  );
                })}
              </div>
              {errors.services && <p className="mt-1 text-[12px] text-alert">{errors.services}</p>}
            </fieldset>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="btn-primary">
                <Save size={16} /> Guardar propuesta
              </button>
              {saved && <StatusBadge status="ok" label="Propuesta registrada" />}
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Propuestas registradas"
          description="Informacion consolidada de las soluciones planificadas"
          icon={Table2}
          action={<StatusBadge status="info" label={`${proposals.length} registro(s)`} />}
        >

          {loading ? (
            <p className="py-10 text-center text-small text-muted">
              Cargando propuestas...
            </p>
          ) : proposals.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line py-10 text-center text-small text-muted dark:border-night-line dark:text-night-muted">
              No hay propuestas registradas. Completa el formulario para agregar la primera.
            </p>
          ) : (
            <>
              <div className="grid gap-4 xl:grid-cols-2">
                {proposals.map((proposal) => (
                  <article key={proposal.id} className="rounded-card border border-line p-4 dark:border-night-line">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[16px] font-semibold text-ink dark:text-night-ink">
                          {proposal.nombre}
                        </h3>
                        <p className="text-[12px] text-muted dark:text-night-muted">
                          {proposal.tipo_aplicacion} · {getRegionById(proposal.region).location}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(proposal.id)}
                        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-alert/10 hover:text-alert"
                        aria-label={`Eliminar ${proposal.nombre}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <p className="mt-2 text-small text-muted dark:text-night-muted">{proposal.description}</p>

                    <dl className="mt-3 grid grid-cols-2 gap-2 text-small">
                      <div className="rounded-lg bg-base p-2.5 dark:bg-night-bg">
                        <dt className="text-[12px] text-muted dark:text-night-muted">Usuarios estimados</dt>
                        <dd className="font-semibold text-ink dark:text-night-ink">
                          {numberFormat(proposal.usuarios_estimados)}
                        </dd>
                      </div>
                      <div className="rounded-lg bg-base p-2.5 dark:bg-night-bg">
                        <dt className="text-[12px] text-muted dark:text-night-muted">Disponibilidad</dt>
                        <dd className="font-semibold text-ink dark:text-night-ink">{proposal.disponibilidad}</dd>
                      </div>
                      <div className="rounded-lg bg-base p-2.5 dark:bg-night-bg">
                        <dt className="text-[12px] text-muted dark:text-night-muted">Region</dt>
                        <dd className="font-semibold text-ink dark:text-night-ink">{proposal.region}</dd>
                      </div>
                      <div className="rounded-lg bg-base p-2.5 dark:bg-night-bg">
                        <dt className="text-[12px] text-muted dark:text-night-muted">Objetivo</dt>
                        <dd className="font-semibold text-ink dark:text-night-ink">{proposal.objetivo}</dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {proposal.configuracion?.servicios?.map((serviceId) => (
                        <span
                          key={serviceId}
                          className="rounded-md border border-line bg-base px-2 py-0.5 text-[11px] text-ink dark:border-night-line dark:bg-night-bg dark:text-night-ink"
                        >
                          {getServiceById(serviceId)?.name ?? serviceId}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-small">
                  <thead>
                    <tr className="border-b border-line text-left text-muted dark:border-night-line dark:text-night-muted">
                      <th className="py-2.5 pr-4 font-medium">Solucion</th>
                      <th className="py-2.5 pr-4 font-medium">Tipo</th>
                      <th className="py-2.5 pr-4 font-medium">Region</th>
                      <th className="py-2.5 pr-4 font-medium">Usuarios</th>
                      <th className="py-2.5 pr-4 font-medium">Disponibilidad</th>
                      <th className="py-2.5 pr-4 font-medium">Servicios</th>
                      <th className="py-2.5 font-medium">Objetivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposals.map((proposal) => (
                      <tr
                        key={proposal.id}
                        className="border-b border-line text-ink dark:border-night-line dark:text-night-ink"
                      >
                        <td className="py-2.5 pr-4 font-medium">{proposal.nombre}</td>
                        <td className="py-2.5 pr-4">{proposal.tipo_aplicacion}</td>
                        <td className="py-2.5 pr-4">{proposal.region}</td>
                        <td className="py-2.5 pr-4">{numberFormat(proposal.usuarios_estimados)}</td>
                        <td className="py-2.5 pr-4">{proposal.disponibilidad}</td>
                        <td className="py-2.5 pr-4">{proposal.configuracion?.servicios?.length ?? 0}</td>
                        <td className="py-2.5">{proposal.objetivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </SectionCard>
      </div>
    );
  }
