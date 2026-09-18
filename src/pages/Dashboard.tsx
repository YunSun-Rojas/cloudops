import { Link } from 'react-router-dom';
import {
  Boxes,
  CalendarDays,
  Globe2,
  Layers,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Network,
  ArrowRight,
  Download,
  CalendarRange,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import SectionCard from '../components/SectionCard';
import BarChart from '../components/BarChart';
import DonutChart from '../components/DonutChart';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { awsServices, getServiceById } from '../data/awsServices';
import { securityControls } from '../data/security';
import { chartPalette, currency, numberFormat, today } from '../utils/format';
import { downloadCsv } from '../utils/report';
import type { ChartDatum, Status } from '../types/cloud';

export default function Dashboard() {
  const { region, monthlyCost, annualCost, costItems, proposals, activeServices, securityScore } = useApp();

  const costByService: ChartDatum[] = costItems
    .map((item, index) => ({
      label: item.serviceName.replace('Amazon ', '').replace('AWS ', ''),
      value: item.monthlyCost * region.costFactor,
      color: chartPalette[index % chartPalette.length],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const projection: ChartDatum[] = Array.from({ length: 6 }, (_, index) => ({
    label: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'][index],
    value: monthlyCost * (0.82 + index * 0.06),
    color: index === 5 ? '#2563EB' : '#93C5FD',
  }));

  const securitySummary = {
    ok: securityControls.filter((item) => item.status === 'ok').length,
    warning: securityControls.filter((item) => item.status === 'warning').length,
    danger: securityControls.filter((item) => item.status === 'danger').length,
  };

  const architectureStatus: Status =
    securitySummary.danger > 0 ? 'warning' : securityScore >= 85 ? 'ok' : 'warning';

  const resources = [
    { label: 'Instancias EC2', value: 2, detail: 't3.medium con escalado automatico' },
    { label: 'Buckets S3', value: 3, detail: 'Standard con versionado activo' },
    { label: 'Bases RDS', value: 1, detail: 'MySQL Multi-AZ' },
    { label: 'Distribuciones CloudFront', value: 1, detail: 'Origen protegido con WAF' },
    { label: 'VPC', value: 1, detail: '2 subredes publicas y 2 privadas' },
    { label: 'Zonas Route 53', value: 1, detail: 'Dominio app.cloudops.pe' },
  ];

  /** Reto adicional: exportacion del reporte ejecutivo en formato CSV */
  const exportReport = () => {
    downloadCsv(`cloudops-resumen-${region.id}.csv`, [
      ['CloudOps Dashboard - Resumen ejecutivo'],
      ['Fecha de emision', today()],
      [],
      ['Indicador', 'Valor'],
      ['Region seleccionada', `${region.name} (${region.location})`],
      ['Servicios utilizados', `${activeServices.length} de ${awsServices.length}`],
      ['Costo mensual estimado', currency(monthlyCost)],
      ['Costo anual estimado', currency(annualCost)],
      ['Postura de seguridad', `${securityScore}%`],
      ['Controles correctos', securitySummary.ok],
      ['Controles en revision', securitySummary.warning],
      ['Controles con problema', securitySummary.danger],
      ['Propuestas registradas', proposals.length],
      [],
      ['Servicio', 'Costo mensual (USD)', 'Costo anual (USD)'],
      ...costItems.map((item) => [
        item.serviceName,
        (item.monthlyCost * region.costFactor).toFixed(2),
        (item.annualCost * region.costFactor).toFixed(2),
      ]),
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[28px] font-bold leading-tight text-ink dark:text-night-ink">
            Resumen de la solucion Cloud
          </h2>
          <p className="mt-1 flex items-center gap-2 text-small text-muted dark:text-night-muted">
            <CalendarRange size={15} /> Actualizado al {today()}
          </p>
        </div>
        <button type="button" onClick={exportReport} className="btn-primary">
          <Download size={16} /> Exportar reporte
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Servicios utilizados"
          value={`${activeServices.length} / ${awsServices.length}`}
          hint="Servicios AWS incorporados a la solucion"
          icon={Boxes}
          tone="info"
          trend="Catalogo revisado esta semana"
        />
        <StatCard
          label="Region seleccionada"
          value={region.name}
          hint={region.location}
          icon={Globe2}
          tone={region.status}
          trend={`${region.availabilityZones} zonas de disponibilidad`}
        />
        <StatCard
          label="Costo mensual estimado"
          value={currency(monthlyCost)}
          hint={`Factor de region x${region.costFactor.toFixed(2)}`}
          icon={Wallet}
          tone="warning"
          trend={`${costItems.length} lineas de costo`}
        />
        <StatCard
          label="Costo anual estimado"
          value={currency(annualCost)}
          hint="Proyeccion a 12 meses sin descuentos"
          icon={CalendarDays}
          tone="warning"
          trend="Evaluar Savings Plans"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Proyeccion de gasto mensual"
          description="Evolucion simulada del consumo en la region activa"
          icon={TrendingUp}
          className="lg:col-span-2"
        >
          <BarChart data={projection} />
        </SectionCard>

        <SectionCard
          title="Distribucion por servicio"
          description="Participacion de cada servicio en el gasto"
          icon={Wallet}
        >
          <DonutChart
            data={costByService}
            centerLabel="Gasto mensual"
            centerValue={currency(monthlyCost)}
          />
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Estado de seguridad"
          description="Resumen de los controles evaluados"
          icon={ShieldCheck}
          action={<StatusBadge status={securityScore >= 80 ? 'ok' : 'warning'} label={`${securityScore}%`} />}
        >
          <div className="space-y-3">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-line dark:bg-night-line">
              <div
                className="h-full rounded-full bg-security transition-all duration-700"
                style={{ width: `${securityScore}%` }}
              />
            </div>
            <ul className="space-y-2 text-small">
              <li className="flex items-center justify-between rounded-lg bg-base px-3 py-2 dark:bg-night-bg">
                <span className="text-muted dark:text-night-muted">Controles correctos</span>
                <span className="font-semibold text-security">{securitySummary.ok}</span>
              </li>
              <li className="flex items-center justify-between rounded-lg bg-base px-3 py-2 dark:bg-night-bg">
                <span className="text-muted dark:text-night-muted">Requieren revision</span>
                <span className="font-semibold text-cost">{securitySummary.warning}</span>
              </li>
              <li className="flex items-center justify-between rounded-lg bg-base px-3 py-2 dark:bg-night-bg">
                <span className="text-muted dark:text-night-muted">Con problema</span>
                <span className="font-semibold text-alert">{securitySummary.danger}</span>
              </li>
            </ul>
            <Link to="/security" className="btn-ghost w-full">
              Revisar panel de seguridad <ArrowRight size={15} />
            </Link>
          </div>
        </SectionCard>

        <SectionCard
          title="Recursos Cloud"
          description="Inventario simulado desplegado en la propuesta"
          icon={Layers}
          className="lg:col-span-2"
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {resources.map((resource) => (
              <div key={resource.label} className="rounded-lg border border-line p-3 dark:border-night-line">
                <p className="text-[22px] font-bold leading-tight text-ink dark:text-night-ink">
                  {numberFormat(resource.value)}
                </p>
                <p className="text-small font-medium text-ink dark:text-night-ink">{resource.label}</p>
                <p className="text-[12px] text-muted dark:text-night-muted">{resource.detail}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Estado de la arquitectura"
        description="Camino del trafico y propuesta vigente"
        icon={Network}
        action={
          <StatusBadge
            status={architectureStatus}
            label={architectureStatus === 'ok' ? 'Arquitectura validada' : 'Ajustes pendientes'}
          />
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-line p-4 dark:border-night-line">
            <p className="text-small font-semibold text-ink dark:text-night-ink">Flujo de la solucion</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-medium">
              {['Internet', 'Route 53', 'CloudFront', 'VPC', 'EC2 / RDS'].map((node, index, list) => (
                <span key={node} className="flex items-center gap-2">
                  <span className="rounded-lg border border-line bg-base px-2.5 py-1.5 text-ink dark:border-night-line dark:bg-night-bg dark:text-night-ink">
                    {node}
                  </span>
                  {index < list.length - 1 && <ArrowRight size={14} className="text-brand" />}
                </span>
              ))}
            </div>
            <Link to="/network" className="btn-ghost mt-4 w-full">
              Ver arquitectura de red <ArrowRight size={15} />
            </Link>
          </div>

          <div className="rounded-lg border border-line p-4 dark:border-night-line">
            <p className="text-small font-semibold text-ink dark:text-night-ink">Propuesta vigente</p>
            {proposals.length === 0 ? (
              <p className="mt-2 text-small text-muted dark:text-night-muted">
                Aun no hay propuestas registradas. Crea una desde Planificacion Cloud.
              </p>
            ) : (
              <div className="mt-2 space-y-2 text-small">
                <p className="text-[16px] font-semibold text-ink dark:text-night-ink">
                  {proposals[0].name}
                </p>
                <p className="text-muted dark:text-night-muted">{proposals[0].description}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {proposals[0].services.map((serviceId) => (
                    <span
                      key={serviceId}
                      className="rounded-md border border-line bg-base px-2 py-0.5 text-[11px] dark:border-night-line dark:bg-night-bg"
                    >
                      {getServiceById(serviceId)?.name ?? serviceId}
                    </span>
                  ))}
                </div>
                <p className="pt-1 text-muted dark:text-night-muted">
                  Usuarios estimados: {numberFormat(proposals[0].estimatedUsers)} · Disponibilidad{' '}
                  {proposals[0].availability}
                </p>
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
