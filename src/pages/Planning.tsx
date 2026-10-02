  import { useEffect, useState } from 'react';
  import { supabase } from '../lib/supabase';
  import { ClipboardList, Table2, Trash2, Save, RotateCcw } from 'lucide-react';
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

  /**
   * Presets por tipo de aplicacion: al elegir un tipo se autocompleta la
   * descripcion y se autoseleccionan los servicios Cloud recomendados.
   */
  const appTypePresets: Record<AppType, { description: string; services: string[] }> = {
    'Aplicacion web': {
      description:
        'Aplicacion web de tres capas desplegada en AWS: instancias EC2 detras de CloudFront, base de datos RDS Multi-AZ y almacenamiento de archivos en S3, aislada en una VPC con subredes publicas y privadas.',
      services: ['ec2', 's3', 'rds', 'iam', 'vpc', 'route53', 'cloudfront'],
    },
    'API / Microservicios': {
      description:
        'API REST y microservicios sobre EC2 con escalado automatico, base de datos RDS, identidades y permisos gestionados con IAM y monitoreo centralizado en CloudWatch dentro de una VPC dedicada.',
      services: ['ec2', 'rds', 'iam', 'vpc', 'route53', 'cloudwatch'],
    },
    'Aplicacion movil': {
      description:
        'Backend para aplicacion movil con endpoints en EC2, autenticacion y permisos con IAM, persistencia en RDS, almacenamiento de imagenes en S3 y distribucion de contenido por CloudFront.',
      services: ['ec2', 's3', 'rds', 'iam', 'vpc', 'route53', 'cloudfront', 'cloudwatch'],
    },
    'Analitica de datos': {
      description:
        'Plataforma de analitica de datos con data lake en S3, procesamiento sobre EC2, base de datos RDS para los resultados y tableros monitoreados con CloudWatch en una VPC segura.',
      services: ['ec2', 's3', 'rds', 'iam', 'vpc', 'cloudwatch'],
    },
    'Comercio electronico': {
      description:
        'Tienda en linea de alta disponibilidad con servidores EC2 escalables, catalogo y contenido en S3, datos transaccionales en RDS Multi-AZ, entrega por CloudFront y seguridad con IAM.',
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
    const [view, setView] = useState<ViewMode>('cards');

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

    const handleAppTypeChange = (value: AppType) => {
      const preset = appTypePresets[value];
      setForm((prev) => ({
        ...prev,
        appType: value,
        description: preset.description,
        services: preset.services,
      }));
    };

    const toggleService = (id: string) => {
      setForm((prev) => ({
        ...prev,
        services: prev.services.includes(id)
          ? prev.services.filter((item) => item !== id)
          : [...prev.services, id],
      }));
    };
    
    const handleDelete = async (id: number) => {
    const confirmar = window.confirm(
      '¿Deseas eliminar esta propuesta?'
    );

    if (!confirmar) return;


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

    setSaving(true);
    const ok = await addProposal({
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
    if (!ok) return;

    setForm({ ...emptyForm, regionId });
    setErrors({});
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3500);
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
                  onChange={(event) => handleAppTypeChange(event.target.value as AppType)}
                >
                  {appTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>

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

          </form>
        </SectionCard>

        <SectionCard
          title="Propuestas registradas"
          description="Informacion consolidada de las soluciones planificadas"
          icon={Table2}
          action={
            <div className="flex flex-wrap items-center gap-3">
              <ViewToggle view={view} onChange={setView} />
              <StatusBadge status="info" label={`${proposals.length} registro(s)`} />
            </div>
          }
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
              {view === 'cards' ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {proposals.map((proposal) => (
                  <article key={proposal.id} className="rounded-card border border-line p-4 dark:border-night-line">

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
                        onClick={() => handleDelete(proposal.id)}
                        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-alert/10 hover:text-alert"
                        aria-label={`Eliminar ${proposal.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <p className="mt-2 text-small text-muted dark:text-night-muted">{proposal.description}</p>

                    <dl className="mt-3 grid grid-cols-2 gap-2 text-small">
                      <div className="rounded-lg bg-base p-2.5 dark:bg-night-bg">
                        <dt className="text-[12px] text-muted dark:text-night-muted">Usuarios estimados</dt>
                        <dd className="font-semibold text-ink dark:text-night-ink">
                          {numberFormat(proposal.estimatedUsers)}
                        </dd>
                      </div>
                      <div className="rounded-lg bg-base p-2.5 dark:bg-night-bg">
                        <dt className="text-[12px] text-muted dark:text-night-muted">Disponibilidad</dt>
                        <dd className="font-semibold text-ink dark:text-night-ink">{proposal.availability}</dd>
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
                      <p className="text-small text-muted dark:text-night-muted">
                        Costo mensual estimado:{' '}
                        <span className="font-semibold text-cost">{currency(monthlyOf(proposal))}</span>
                      </p>
                      {isActive ? (
                        <StatusBadge status="ok" label="Propuesta activa" />
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
              )}
            </>
          )}
        </SectionCard>
      </div>
    );
  }

