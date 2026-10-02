import { useState, type FormEvent } from 'react';
import { ClipboardList, RotateCcw, Table2, Trash2 } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';
import ViewToggle, { type ViewMode } from '../components/ViewToggle';
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

const goals: MigrationGoal[] = [
  'Reduccion de costos',
  'Escalabilidad',
  'Alta disponibilidad',
  'Modernizacion de la aplicacion',
  'Mejora de seguridad',
];

const appTypePresets: Record<AppType, { description: string; services: string[] }> = {
  'Aplicacion web': {
    description:
      'Aplicacion web de tres capas desplegada en AWS: instancias EC2 detras de CloudFront, base de datos RDS Multi-AZ y almacenamiento en S3 dentro de una VPC.',
    services: ['ec2', 's3', 'rds', 'iam', 'vpc', 'route53', 'cloudfront'],
  },
  'API / Microservicios': {
    description:
      'API y microservicios sobre EC2 con base de datos RDS, permisos gestionados con IAM y monitoreo en CloudWatch dentro de una VPC.',
    services: ['ec2', 'rds', 'iam', 'vpc', 'route53', 'cloudwatch'],
  },
  'Aplicacion movil': {
    description:
      'Backend para aplicacion movil con computo, autenticacion, persistencia y distribucion de contenido.',
    services: ['ec2', 's3', 'rds', 'iam', 'vpc', 'route53', 'cloudfront', 'cloudwatch'],
  },
  'Analitica de datos': {
    description:
      'Plataforma de analitica de datos con almacenamiento, procesamiento y monitoreo.',
    services: ['ec2', 's3', 'rds', 'iam', 'vpc', 'cloudwatch'],
  },
  'Comercio electronico': {
    description:
      'Tienda en linea con computo, almacenamiento, base de datos y distribucion de contenido.',
    services: ['ec2', 's3', 'rds', 'iam', 'vpc', 'route53', 'cloudfront', 'cloudwatch'],
  },
};

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
  const {
    regionId,
    proposals,
    proposalsLoading,
    proposalsError,
    activeProposal,
    setActiveProposalId,
    addProposal,
    removeProposal,
  } = useApp();
  const [form, setForm] = useState<FormState>({ ...emptyForm, regionId });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [view, setView] = useState<ViewMode>('cards');

  const handleAppTypeChange = (appType: AppType) => {
    const preset = appTypePresets[appType];
    setForm((previous) => ({
      ...previous,
      appType,
      description: preset.description,
      services: [...preset.services],
    }));
    setErrors((previous) => ({ ...previous, services: '' }));
  };

  const toggleService = (serviceId: string) => {
    setForm((previous) => ({
      ...previous,
      services: previous.services.includes(serviceId)
        ? previous.services.filter((id) => id !== serviceId)
        : [...previous.services, serviceId],
    }));
    setErrors((previous) => ({ ...previous, services: '' }));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const users = Number(form.estimatedUsers);

    if (form.name.trim().length < 4) {
      next.name = 'Escribe un nombre de al menos 4 caracteres.';
    }
    if (form.description.trim().length < 15) {
      next.description = 'Describe la solucion con al menos 15 caracteres.';
    }
    if (!regions.some((region) => region.id === form.regionId)) {
      next.regionId = 'Selecciona una region valida.';
    }
    if (!form.estimatedUsers || !Number.isSafeInteger(users) || users <= 0) {
      next.estimatedUsers = 'Indica un numero entero de usuarios mayor que cero.';
    }
    if (form.services.length === 0) {
      next.services = 'Selecciona al menos un servicio Cloud.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setSaved(false);

    if (!validate()) return;

    setSaving(true);
    const success = await addProposal({
      name: form.name.trim(),
      appType: form.appType,
      description: form.description.trim(),
      regionId: form.regionId,
      estimatedUsers: Number(form.estimatedUsers),
      availability: form.availability,
      services: form.services,
      goal: form.goal,
    });
    setSaving(false);

    if (!success) {
      setMessage('No se pudo guardar la propuesta. Revisa la notificacion para ver el detalle.');
      return;
    }

    setForm({ ...emptyForm, regionId });
    setErrors({});
    setSaved(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Deseas eliminar esta propuesta?')) return;

    setDeletingId(id);
    const success = await removeProposal(id);
    setDeletingId(null);

    if (!success) {
      setMessage('No se pudo eliminar la propuesta. Revisa la notificacion para ver el detalle.');
    }
  };

  const clearForm = () => {
    setForm({ ...emptyForm, regionId });
    setErrors({});
    setMessage('');
    setSaved(false);
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Registrar propuesta de solucion Cloud"
        description="Define los requisitos y selecciona los servicios. Los precios se calculan en el modulo de Costos."
        icon={ClipboardList}
        action={
          <button type="button" onClick={clearForm} className="btn-ghost py-2">
            <RotateCcw size={15} /> Limpiar
          </button>
        }
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label-field" htmlFor="name">Nombre de la solucion</label>
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
              <label className="label-field" htmlFor="appType">Tipo de aplicacion</label>
              <select
                id="appType"
                className="input-field"
                value={form.appType}
                onChange={(event) => handleAppTypeChange(event.target.value as AppType)}
              >
                {appTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-field" htmlFor="regionId">Region</label>
              <select
                id="regionId"
                className="input-field"
                value={form.regionId}
                onChange={(event) => setForm({ ...form, regionId: event.target.value })}
              >
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>{region.location}</option>
                ))}
              </select>
              {errors.regionId && (
                <p className="mt-1 text-[12px] text-alert">{errors.regionId}</p>
              )}
            </div>

            <div>
              <label className="label-field" htmlFor="estimatedUsers">
                Numero estimado de usuarios
              </label>
              <input
                id="estimatedUsers"
                type="number"
                min={1}
                step={1}
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
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-field" htmlFor="goal">Objetivo de la migracion</label>
              <select
                id="goal"
                className="input-field"
                value={form.goal}
                onChange={(event) =>
                  setForm({ ...form, goal: event.target.value as MigrationGoal })
                }
              >
                {goals.map((goal) => (
                  <option key={goal} value={goal}>{goal}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label-field" htmlFor="description">
              Descripcion de la solucion
            </label>
            <textarea
              id="description"
              className="input-field min-h-24"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
            {errors.description && (
              <p className="mt-1 text-[12px] text-alert">{errors.description}</p>
            )}
          </div>

          <fieldset>
            <legend className="label-field">Servicios Cloud</legend>
            <p className="mb-3 text-small text-muted dark:text-night-muted">
              El tipo de aplicacion sugiere servicios; puedes seleccionar los que necesites.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {awsServices.map((service) => (
                <label
                  key={service.id}
                  className="flex items-center gap-2 rounded-lg border border-line p-2.5 text-small dark:border-night-line"
                >
                  <input
                    type="checkbox"
                    checked={form.services.includes(service.id)}
                    onChange={() => toggleService(service.id)}
                  />
                  {service.name}
                </label>
              ))}
            </div>
            {errors.services && (
              <p className="mt-1 text-[12px] text-alert">{errors.services}</p>
            )}
          </fieldset>

          {message && <p role="alert" className="text-small text-alert">{message}</p>}
          {saved && (
            <p role="status" className="text-small text-green-600">
              Propuesta guardada. Ya puedes seleccionarla en el modulo de Costos.
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar propuesta'}
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title="Propuestas registradas"
        description="Servicios y requisitos de las soluciones planificadas"
        icon={Table2}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <ViewToggle view={view} onChange={setView} />
            <StatusBadge status="info" label={`${proposals.length} registro(s)`} />
          </div>
        }
      >
        {proposalsError && (
          <p role="alert" className="mb-4 text-small text-alert">
            No se pudieron cargar las propuestas: {proposalsError}
          </p>
        )}
        {message && <p role="alert" className="mb-4 text-small text-alert">{message}</p>}

        {proposalsLoading ? (
          <p className="py-10 text-center text-small text-muted">Cargando propuestas...</p>
        ) : proposals.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line py-10 text-center text-small text-muted dark:border-night-line dark:text-night-muted">
            No hay propuestas registradas. Completa el formulario para agregar la primera.
          </p>
        ) : view === 'cards' ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {proposals.map((proposal) => (
              <article
                key={proposal.id}
                className="rounded-card border border-line p-4 dark:border-night-line"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[16px] font-semibold text-ink dark:text-night-ink">
                      {proposal.name}
                    </h3>
                    <p className="text-[12px] text-muted dark:text-night-muted">
                      {proposal.appType} · {getRegionById(proposal.regionId).location}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(proposal.id)}
                    disabled={deletingId === proposal.id}
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-alert/10 hover:text-alert disabled:opacity-50"
                    aria-label={`Eliminar ${proposal.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <p className="mt-2 text-small text-muted dark:text-night-muted">
                  {proposal.description}
                </p>

                <dl className="mt-3 grid grid-cols-2 gap-2 text-small">
                  <div className="rounded-lg bg-base p-2.5 dark:bg-night-bg">
                    <dt className="text-[12px] text-muted dark:text-night-muted">
                      Usuarios estimados
                    </dt>
                    <dd className="font-semibold text-ink dark:text-night-ink">
                      {numberFormat(proposal.estimatedUsers)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-base p-2.5 dark:bg-night-bg">
                    <dt className="text-[12px] text-muted dark:text-night-muted">Disponibilidad</dt>
                    <dd className="font-semibold text-ink dark:text-night-ink">
                      {proposal.availability}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-base p-2.5 dark:bg-night-bg">
                    <dt className="text-[12px] text-muted dark:text-night-muted">Region</dt>
                    <dd className="font-semibold text-ink dark:text-night-ink">{proposal.regionId}</dd>
                  </div>
                  <div className="rounded-lg bg-base p-2.5 dark:bg-night-bg">
                    <dt className="text-[12px] text-muted dark:text-night-muted">Objetivo</dt>
                    <dd className="font-semibold text-ink dark:text-night-ink">{proposal.goal}</dd>
                  </div>
                </dl>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {proposal.services.map((serviceId) => (
                    <span
                      key={serviceId}
                      className="rounded-md border border-line bg-base px-2 py-0.5 text-[11px] text-ink dark:border-night-line dark:bg-night-bg dark:text-night-ink"
                    >
                      {getServiceById(serviceId)?.name ?? serviceId}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 dark:border-night-line">
                  {activeProposal?.id === proposal.id ? (
                    <StatusBadge status="ok" label="Propuesta activa en Costos" />
                  ) : (
                    <button
                      type="button"
                      className="btn-ghost py-1.5"
                      onClick={() => setActiveProposalId(proposal.id)}
                    >
                      Usar en Costos
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-small">
              <thead>
                <tr className="border-b border-line text-left text-muted dark:border-night-line dark:text-night-muted">
                  <th className="py-2.5 pr-4 font-medium">Solucion</th>
                  <th className="py-2.5 pr-4 font-medium">Tipo</th>
                  <th className="py-2.5 pr-4 font-medium">Region</th>
                  <th className="py-2.5 pr-4 font-medium">Usuarios</th>
                  <th className="py-2.5 pr-4 font-medium">Disponibilidad</th>
                  <th className="py-2.5 pr-4 font-medium">Servicios</th>
                  <th className="py-2.5 pr-4 font-medium">Objetivo</th>
                  <th className="py-2.5 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((proposal) => (
                  <tr
                    key={proposal.id}
                    className="border-b border-line text-ink dark:border-night-line dark:text-night-ink"
                  >
                    <td className="py-2.5 pr-4 font-medium">{proposal.name}</td>
                    <td className="py-2.5 pr-4">{proposal.appType}</td>
                    <td className="py-2.5 pr-4">
                      {getRegionById(proposal.regionId).location}
                    </td>
                    <td className="py-2.5 pr-4">{numberFormat(proposal.estimatedUsers)}</td>
                    <td className="py-2.5 pr-4">{proposal.availability}</td>
                    <td className="py-2.5 pr-4">{proposal.services.length}</td>
                    <td className="py-2.5 pr-4">{proposal.goal}</td>
                    <td className="py-2.5">
                      <button
                        type="button"
                        onClick={() => void handleDelete(proposal.id)}
                        disabled={deletingId === proposal.id}
                        className="rounded-lg p-1.5 text-muted hover:text-alert disabled:opacity-50"
                        aria-label={`Eliminar ${proposal.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
