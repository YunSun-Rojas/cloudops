import { useState } from 'react';
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
  Server,
  Database,
  KeyRound,
  HardDrive,
  Cloud,
  LockKeyhole,
  Route,
  Shield,
  BarChart3,
  LineChart,
  PieChart,
  MapPinned,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import SectionCard from '../components/SectionCard';
import DonutChart from '../components/DonutChart';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { awsServices, getServiceById } from '../data/awsServices';
import { regions } from '../data/regions';
import { securityControls } from '../data/security';
import { chartPalette, currency, dollarCurrency, numberFormat, today } from '../utils/format';
import { downloadCsv } from '../utils/report';
import type { ChartDatum, Status } from '../types/cloud';

/* =========================================================
   GRAFICOS DEL DASHBOARD (SVG propio, sin librerias)
   ========================================================= */

/* ---------- Barras horizontales (ranking) ---------- */

interface HBarProps {
  data: (ChartDatum & { highlight?: boolean; note?: string })[];
  formatValue?: (value: number) => string;
  showPercent?: boolean;
}

function HorizontalBarChart({ data, formatValue = currency, showPercent = false }: HBarProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <ul className="space-y-3" role="img" aria-label="Grafico de barras horizontales">
      {data.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-small">
            <span
              className={`truncate ${
                item.highlight ? 'font-semibold text-brand' : 'text-ink dark:text-night-ink'
              }`}
            >
              {item.label}
              {item.note && (
                <span className="ml-2 text-[11px] font-normal text-muted dark:text-night-muted">
                  {item.note}
                </span>
              )}
            </span>
            <span className="shrink-0 font-semibold text-ink dark:text-night-ink">
              {formatValue(item.value)}
              {showPercent && (
                <span className="ml-2 text-[11px] font-medium text-muted dark:text-night-muted">
                  {((item.value / total) * 100).toFixed(0)}%
                </span>
              )}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-line dark:bg-night-line">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.max((item.value / max) * 100, 2)}%`,
                background: item.color,
                outline: item.highlight ? `2px solid ${item.color}33` : undefined,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Area / linea (proyeccion acumulada) ---------- */

interface AreaChartProps {
  labels: string[];
  values: number[];
  color?: string;
  formatValue?: (value: number) => string;
}

function AreaChart({ labels, values, color = '#2563EB', formatValue = currency }: AreaChartProps) {
  const [active, setActive] = useState<number | null>(null);

  const W = 640;
  const H = 240;
  const pad = { top: 16, right: 16, bottom: 28, left: 56 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? innerW / (values.length - 1) : innerW;

  const x = (i: number) => pad.left + i * stepX;
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;

  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  const area = `${line} L ${x(values.length - 1)} ${pad.top + innerH} L ${x(0)} ${pad.top + innerH} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const gradId = `area-grad-${color.replace('#', '')}`;

  const tipW = 150;
  const tipX = active === null ? 0 : Math.min(Math.max(x(active) - tipW / 2, pad.left), W - pad.right - tipW);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Grafico de area">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={pad.left}
            x2={W - pad.right}
            y1={y(max * t)}
            y2={y(max * t)}
            className="stroke-line dark:stroke-night-line"
            strokeDasharray={t === 0 ? undefined : '3 4'}
          />
          <text
            x={pad.left - 8}
            y={y(max * t) + 4}
            textAnchor="end"
            className="fill-current text-muted"
            style={{ fontSize: '11px' }}
          >
            {compactCurrency(max * t)}
          </text>
        </g>
      ))}

      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {labels.map((label, i) => (
        <text
          key={label}
          x={x(i)}
          y={H - 8}
          textAnchor="middle"
          className="fill-current text-muted"
          style={{ fontSize: '11px' }}
        >
          {label}
        </text>
      ))}

      {values.map((v, i) => (
        <g key={i} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
          <rect
            x={x(i) - stepX / 2}
            y={pad.top}
            width={stepX}
            height={innerH}
            fill="transparent"
            className="cursor-pointer"
          />
          <circle
            cx={x(i)}
            cy={y(v)}
            r={active === i ? 5.5 : 3}
            fill="white"
            stroke={color}
            strokeWidth="2"
            className="transition-all duration-150"
          />
        </g>
      ))}

      {active !== null && (
        <g pointerEvents="none">
          <line x1={x(active)} x2={x(active)} y1={pad.top} y2={pad.top + innerH} stroke={color} strokeOpacity="0.4" />
          <rect x={tipX} y={pad.top} width={tipW} height={40} rx={8} fill="#0F172A" opacity="0.92" />
          <text x={tipX + 10} y={pad.top + 16} fill="#CBD5E1" style={{ fontSize: '11px' }}>
            Acumulado al {labels[active]}
          </text>
          <text x={tipX + 10} y={pad.top + 32} fill="#FFFFFF" style={{ fontSize: '13px', fontWeight: 700 }}>
            {formatValue(values[active])}
          </text>
        </g>
      )}
    </svg>
  );
}

/* ---------- Medidor semicircular (gauge) ---------- */

interface GaugeProps {
  value: number; // 0 - 100
  label: string;
  color?: string;
}

function GaugeChart({ value, label, color }: GaugeProps) {
  const pct = Math.min(Math.max(value, 0), 100);
  const tone = color ?? (pct >= 80 ? '#16A34A' : pct >= 60 ? '#F59E0B' : '#DC2626');
  const R = 80;
  const C = Math.PI * R; // longitud del semicirculo
  const d = `M ${100 - R} 100 A ${R} ${R} 0 0 1 ${100 + R} 100`;

  return (
    <svg viewBox="0 0 200 118" className="mx-auto h-auto w-full max-w-[260px]" role="img" aria-label={label}>
      <path d={d} fill="none" strokeWidth="16" strokeLinecap="round" className="stroke-line dark:stroke-night-line" />
      <path
        d={d}
        fill="none"
        stroke={tone}
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C - (C * pct) / 100}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
      <text
        x="100"
        y="88"
        textAnchor="middle"
        className="fill-current text-ink dark:text-night-ink"
        style={{ fontSize: '30px', fontWeight: 700 }}
      >
        {pct}%
      </text>
      <text x="100" y="108" textAnchor="middle" className="fill-current text-muted" style={{ fontSize: '11px' }}>
        {label}
      </text>
      <text x={100 - R} y="116" textAnchor="middle" className="fill-current text-muted" style={{ fontSize: '9px' }}>
        0
      </text>
      <text x={100 + R} y="116" textAnchor="middle" className="fill-current text-muted" style={{ fontSize: '9px' }}>
        100
      </text>
    </svg>
  );
}

/* ---------- Barras apiladas (controles por area) ---------- */

interface StackedRow {
  label: string;
  ok: number;
  warning: number;
  danger: number;
}

function StackedBars({ rows }: { rows: StackedRow[] }) {
  return (
    <div>
      <ul className="space-y-3.5">
        {rows.map((row) => {
          const total = row.ok + row.warning + row.danger || 1;
          const segments = [
            { key: 'ok', value: row.ok, color: '#16A34A', name: 'Correctos' },
            { key: 'warning', value: row.warning, color: '#F59E0B', name: 'En revision' },
            { key: 'danger', value: row.danger, color: '#DC2626', name: 'Con problema' },
          ].filter((s) => s.value > 0);

          return (
            <li key={row.label}>
              <div className="mb-1 flex items-baseline justify-between text-small">
                <span className="truncate text-ink dark:text-night-ink">{row.label}</span>
                <span className="text-[11px] text-muted dark:text-night-muted">{total} controles</span>
              </div>
              <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-line dark:bg-night-line">
                {segments.map((s) => (
                  <div
                    key={s.key}
                    className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-700"
                    style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
                    title={`${s.name}: ${s.value}`}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted dark:text-night-muted">
        {[
          ['#16A34A', 'Correctos'],
          ['#F59E0B', 'En revision'],
          ['#DC2626', 'Con problema'],
        ].map(([c, n]) => (
          <span key={n} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: c }} />
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const {
    region,
    monthlyCost,
    annualCost,
    costItems,
    proposals,
    activeProposal,
    securityScore,
  } = useApp();

  const costByService: ChartDatum[] = costItems
    .map((item, index) => ({
      label: item.serviceName.replace('Amazon ', '').replace('AWS ', ''),
      value: item.monthlyCost * region.costFactor,
      color: chartPalette[index % chartPalette.length],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  /** Costo acumulado mes a mes durante 12 meses */
  const monthLabels = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];
  const cumulativeCost = monthLabels.map((_, index) => monthlyCost * (index + 1));

  /** Comparacion del costo mensual de la propuesta en cada region */
  const baseMonthlyCost = costItems.reduce((total, item) => total + item.monthlyCost, 0);
  const costByRegion = regions
    .map((item) => ({
      label: item.name,
      value: baseMonthlyCost * item.costFactor,
      color: item.id === region.id ? '#2563EB' : '#94A3B8',
      highlight: item.id === region.id,
      note: item.id === region.id ? 'seleccionada' : undefined,
    }))
    .sort((a, b) => a.value - b.value);

  /** Servicios de la propuesta agrupados por categoria */
  const servicesByCategory: ChartDatum[] = Object.entries(
    (activeProposal?.services ?? []).reduce<Record<string, number>>((acc, serviceId) => {
      const category = getServiceById(serviceId)?.category ?? 'Otros';
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([label, value], index) => ({
    label,
    value,
    color: chartPalette[index % chartPalette.length],
  }));

  /** Controles de seguridad por area */
  const controlsByArea: StackedRow[] = Object.values(
    securityControls.reduce<Record<string, StackedRow>>((acc, control) => {
      const row = acc[control.area] ?? { label: control.area, ok: 0, warning: 0, danger: 0 };
      if (control.status === 'ok' || control.status === 'warning' || control.status === 'danger') {
        row[control.status] += 1;
      }
      acc[control.area] = row;
      return acc;
    }, {}),
  );

  const securitySummary = {
    ok: securityControls.filter((item) => item.status === 'ok').length,
    warning: securityControls.filter((item) => item.status === 'warning').length,
    danger: securityControls.filter((item) => item.status === 'danger').length,
  };

  const architectureStatus: Status =
    securitySummary.danger > 0
      ? 'warning'
      : securityScore >= 85
        ? 'ok'
        : 'warning';

  const proposalDetails = activeProposal
    ? [
        { label: 'Propuesta', value: activeProposal.name, detail: activeProposal.appType },
        {
          label: 'Usuarios estimados',
          value: numberFormat(activeProposal.estimatedUsers),
          detail: 'Usuarios registrados en la propuesta',
        },
        {
          label: 'Disponibilidad',
          value: activeProposal.availability,
          detail: 'Objetivo configurado',
        },
        { label: 'Objetivo', value: activeProposal.goal, detail: 'Meta de la propuesta' },
        {
          label: 'Servicios incluidos',
          value: numberFormat(activeProposal.services.length),
          detail: activeProposal.services
            .map((serviceId) => getServiceById(serviceId)?.name ?? serviceId)
            .join(', '),
        },
        {
          label: 'Registrada',
          value: new Date(activeProposal.createdAt).toLocaleDateString('es-PE'),
          detail: activeProposal.regionId,
        },
      ]
    : [];

  /**
   * Servicios AWS explicados de manera sencilla para el cliente.
   * Cada bloque muestra qué hace el servicio dentro de la solución.
   */
  const awsServiceConcepts = [
    {
      name: 'Amazon EC2',
      concept: 'Servidores virtuales en la nube.',
      description:
        'Aquí se ejecutan las aplicaciones y sistemas de la empresa sin necesidad de tener servidores físicos propios.',
      icon: Server,
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-950/30',
    },
    {
      name: 'Amazon RDS',
      concept: 'Base de datos administrada.',
      description:
        'Guarda la información de la aplicación y AWS se encarga de tareas como respaldos, mantenimiento y disponibilidad.',
      icon: Database,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      name: 'AWS IAM',
      concept: 'Control de usuarios y permisos.',
      description:
        'Permite definir quién puede acceder a los recursos de AWS y qué acciones puede realizar cada usuario.',
      icon: KeyRound,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950/30',
    },
    {
      name: 'Amazon S3',
      concept: 'Almacenamiento de archivos.',
      description:
        'Permite guardar documentos, imágenes, respaldos y otros archivos de forma segura y escalable.',
      icon: HardDrive,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/30',
    },
    {
      name: 'Amazon CloudFront',
      concept: 'Entrega rápida de contenido.',
      description:
        'Distribuye la aplicación y sus contenidos desde ubicaciones cercanas a los usuarios para mejorar la velocidad.',
      icon: Cloud,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50 dark:bg-cyan-950/30',
    },
    {
      name: 'Amazon VPC',
      concept: 'Red privada de la solución.',
      description:
        'Crea un entorno de red aislado donde se organizan y protegen los servidores y bases de datos.',
      icon: Network,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    },
    {
      name: 'Amazon Route 53',
      concept: 'Gestión de dominios y tráfico.',
      description:
        'Ayuda a dirigir a los usuarios hacia la aplicación utilizando el nombre de dominio de la empresa.',
      icon: Route,
      color: 'text-pink-600',
      bg: 'bg-pink-50 dark:bg-pink-950/30',
    },
    {
      name: 'AWS WAF',
      concept: 'Protección de las aplicaciones web.',
      description:
        'Filtra solicitudes maliciosas y ayuda a proteger la aplicación frente a ataques comunes de internet.',
      icon: Shield,
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-950/30',
    },
    {
      name: 'AWS CloudWatch',
      concept: 'Monitoreo de los recursos.',
      description:
        'Permite supervisar el funcionamiento de los servicios, detectar problemas y revisar métricas del sistema.',
      icon: TrendingUp,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    },
    {
      name: 'AWS KMS',
      concept: 'Protección mediante cifrado.',
      description:
        'Administra las claves utilizadas para proteger información sensible mediante cifrado.',
      icon: LockKeyhole,
      color: 'text-teal-600',
      bg: 'bg-teal-50 dark:bg-teal-950/30',
    },
  ];

  /** Reto adicional: exportacion del reporte ejecutivo en formato CSV */
  const exportReport = () => {
    downloadCsv(`cloudops-resumen-${region.id}.csv`, [
      ['CloudOps Dashboard - Resumen ejecutivo'],
      ['Fecha de emision', today()],
      [],
      ['Indicador', 'Valor'],
      ['Region seleccionada', `${region.name} (${region.location})`],
      ['Servicios utilizados', `${activeProposal?.services.length ?? 0} de ${awsServices.length}`],
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

        <button
          type="button"
          onClick={exportReport}
          className="btn-primary"
        >
          <Download size={16} /> Exportar reporte
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Servicios utilizados"
          value={`${activeProposal?.services.length ?? 0} / ${awsServices.length}`}
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

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Distribucion por servicio"
          description="Distribución del costo mensual guardado para la propuesta activa"
          icon={Wallet}
        >
          {costByService.length > 0 ? (
            <DonutChart
              data={costByService}
              centerLabel="Gasto mensual"
              centerValue={currency(monthlyCost)}
            />
          ) : (
            <p className="py-10 text-center text-small text-muted dark:text-night-muted">
              No hay líneas de costo guardadas para esta propuesta.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Ranking de costos"
          description="Servicios que más pesan en el gasto mensual"
          icon={BarChart3}
        >
          {costByService.length > 0 ? (
            <HorizontalBarChart data={costByService} showPercent />
          ) : (
            <p className="py-10 text-center text-small text-muted dark:text-night-muted">
              Sin datos de costo para mostrar.
            </p>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Proyección de gasto a 12 meses"
          description="Costo acumulado mes a mes sin descuentos"
          icon={LineChart}
          className="lg:col-span-2"
        >
          {monthlyCost > 0 ? (
            <AreaChart labels={monthLabels} values={cumulativeCost} />
          ) : (
            <p className="py-10 text-center text-small text-muted dark:text-night-muted">
              Sin datos de costo para proyectar.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Controles por área"
          description="Estado de seguridad por categoría"
          icon={ShieldCheck}
        >
          <DonutChart
            data={costByService}
            centerLabel="Gasto mensual"
            centerValue={currency(monthlyCost)}
            valueLabel="Mensual"
            tooltipFormat={dollarCurrency}
          />

        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Estado de seguridad"
          description="Resumen de los controles evaluados"
          icon={ShieldCheck}
          action={
            <StatusBadge
              status={securityScore >= 80 ? 'ok' : 'warning'}
              label={`${securityScore}%`}
            />
          }
        >
          <div className="space-y-3">
            <GaugeChart value={securityScore} label="Postura de seguridad" />

            <ul className="space-y-2 text-small">
              <li className="flex items-center justify-between rounded-lg bg-base px-3 py-2 dark:bg-night-bg">
                <span className="text-muted dark:text-night-muted">
                  Controles correctos
                </span>
                <span className="font-semibold text-security">
                  {securitySummary.ok}
                </span>
              </li>

              <li className="flex items-center justify-between rounded-lg bg-base px-3 py-2 dark:bg-night-bg">
                <span className="text-muted dark:text-night-muted">
                  Requieren revision
                </span>
                <span className="font-semibold text-cost">
                  {securitySummary.warning}
                </span>
              </li>

              <li className="flex items-center justify-between rounded-lg bg-base px-3 py-2 dark:bg-night-bg">
                <span className="text-muted dark:text-night-muted">
                  Con problema
                </span>
                <span className="font-semibold text-alert">
                  {securitySummary.danger}
                </span>
              </li>
            </ul>

            <Link to="/security" className="btn-ghost w-full">
              Revisar panel de seguridad <ArrowRight size={15} />
            </Link>
          </div>
        </SectionCard>

        <SectionCard
          title="Datos de la propuesta"
          description="Información guardada para la propuesta activa"
          icon={Layers}
          className="lg:col-span-2"
        >
          {activeProposal ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {proposalDetails.map((detail) => (
                <div
                  key={detail.label}
                  className="rounded-lg border border-line p-3 dark:border-night-line"
                >
                  <p className="break-words text-[18px] font-bold leading-tight text-ink dark:text-night-ink">
                    {detail.value}
                  </p>
                  <p className="text-small font-medium text-ink dark:text-night-ink">
                    {detail.label}
                  </p>
                  <p className="break-words text-[12px] text-muted dark:text-night-muted">
                    {detail.detail}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-small text-muted dark:text-night-muted">
              Aún no hay una propuesta registrada.
            </p>
          )}
        </SectionCard>
      </div>

      {/* =========================================================
          SERVICIOS AWS DE LA SOLUCION
          ========================================================= */}
      <SectionCard
        title="Servicios AWS de la solución"
        description="Descripción sencilla de la función de cada servicio dentro de la arquitectura"
        icon={Boxes}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {awsServiceConcepts
            .filter((service) =>
              activeProposal?.services.some(
                (serviceId) => getServiceById(serviceId)?.name === service.name,
              ),
            )
            .map((service) => {
            const Icon = service.icon;

            return (
              <div
                key={service.name}
                className="group rounded-xl border border-line bg-white p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-night-line dark:bg-night-bg"
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${service.bg}`}
                    >
                      <Icon size={22} className={service.color} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-[16px] font-bold text-ink dark:text-night-ink">
                        {service.name}
                      </h3>

                      <p className="mt-0.5 text-[12px] font-medium text-brand">
                        {service.concept}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-small leading-relaxed text-muted dark:text-night-muted">
                    {service.description}
                  </p>
                </div>
              </div>
            );
            })}
        </div>
      </SectionCard>

      <SectionCard
        title="Estado de la arquitectura"
        description="Camino del trafico y propuesta vigente"
        icon={Network}
        action={
          <StatusBadge
            status={architectureStatus}
            label={
              architectureStatus === 'ok'
                ? 'Arquitectura validada'
                : 'Ajustes pendientes'
            }
          />
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-line p-4 dark:border-night-line">
            <p className="text-small font-semibold text-ink dark:text-night-ink">
              Flujo de la solucion
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-medium">
              {[
                'Internet',
                'Route 53',
                'CloudFront',
                'VPC',
                'EC2 / RDS',
              ].map((node, index, list) => (
                <span key={node} className="flex items-center gap-2">
                  <span className="rounded-lg border border-line bg-base px-2.5 py-1.5 text-ink dark:border-night-line dark:bg-night-bg dark:text-night-ink">
                    {node}
                  </span>

                  {index < list.length - 1 && (
                    <ArrowRight size={14} className="text-brand" />
                  )}
                </span>
              ))}
            </div>

            <Link to="/network" className="btn-ghost mt-4 w-full">
              Ver arquitectura de red <ArrowRight size={15} />
            </Link>
          </div>

          <div className="rounded-lg border border-line p-4 dark:border-night-line">
            <p className="text-small font-semibold text-ink dark:text-night-ink">
              Propuesta vigente
            </p>

            {proposals.length === 0 ? (
              <p className="mt-2 text-small text-muted dark:text-night-muted">
                Aun no hay propuestas registradas. Crea una desde
                Planificacion Cloud.
              </p>
            ) : (
              <div className="mt-2 space-y-2 text-small">
                <p className="text-[16px] font-semibold text-ink dark:text-night-ink">
                  {activeProposal?.name}
                </p>

                <p className="text-muted dark:text-night-muted">
                  {activeProposal?.description}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeProposal?.services.map((serviceId) => (
                    <span
                      key={serviceId}
                      className="rounded-md border border-line bg-base px-2 py-0.5 text-[11px] dark:border-night-line dark:bg-night-bg"
                    >
                      {getServiceById(serviceId)?.name ?? serviceId}
                    </span>
                  ))}
                </div>

                <p className="pt-1 text-muted dark:text-night-muted">
                  Usuarios estimados: {numberFormat(activeProposal?.estimatedUsers ?? 0)} ·
                  {' '}Disponibilidad {activeProposal?.availability}
                </p>
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}