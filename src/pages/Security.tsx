import { useState } from 'react';
import { KeyRound, ShieldCheck, Users, Building2, Lock } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import SecurityCard from '../components/SecurityCard';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { iamEntities, securityControls } from '../data/security';
import { useApp } from '../context/AppContext';
import type { SecurityControl } from '../types/cloud';

const areas: Array<SecurityControl['area'] | 'Todas'> = [
  'Todas',
  'Responsabilidad compartida',
  'IAM',
  'Proteccion de cuentas',
  'Proteccion de datos',
  'Cumplimiento',
];

const awsResponsibilities = [
  'Seguridad de las instalaciones fisicas',
  'Hardware y red global',
  'Capa de virtualizacion y hipervisor',
  'Servicios administrados del plano de control',
];

const clientResponsibilities = [
  'Datos del cliente y su clasificacion',
  'Configuracion de IAM, usuarios y permisos',
  'Sistema operativo, parches y aplicaciones',
  'Cifrado, grupos de seguridad y firewall',
];

export default function Security() {
  const { securityScore } = useApp();
  const [area, setArea] = useState<(typeof areas)[number]>('Todas');

  const filtered =
    area === 'Todas' ? securityControls : securityControls.filter((control) => control.area === area);

  const counts = {
    ok: securityControls.filter((item) => item.status === 'ok').length,
    warning: securityControls.filter((item) => item.status === 'warning').length,
    danger: securityControls.filter((item) => item.status === 'danger').length,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Postura de seguridad"
          value={`${securityScore}%`}
          hint="Promedio ponderado de los controles"
          icon={ShieldCheck}
          tone={securityScore >= 80 ? 'ok' : 'warning'}
        />
        <StatCard label="Controles correctos" value={`${counts.ok}`} icon={ShieldCheck} tone="ok" hint="Indicador verde" />
        <StatCard label="Requieren revision" value={`${counts.warning}`} icon={Lock} tone="warning" hint="Indicador amarillo" />
        <StatCard label="Con problema" value={`${counts.danger}`} icon={KeyRound} tone="danger" hint="Indicador rojo" />
      </div>

      <SectionCard
        title="Modelo de responsabilidad compartida"
        description="AWS asegura la nube y el cliente asegura lo que coloca en ella"
        icon={Building2}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-card border border-brand/30 bg-brand/5 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-brand">AWS: seguridad de la nube</h3>
              <StatusBadge status="ok" label="Cubierto por AWS" />
            </div>
            <ul className="mt-3 space-y-2 text-small text-ink dark:text-night-ink">
              {awsResponsibilities.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-card border border-cost/30 bg-cost/5 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-cost">Cliente: seguridad en la nube</h3>
              <StatusBadge status="warning" label="Responsabilidad propia" />
            </div>
            <ul className="mt-3 space-y-2 text-small text-ink dark:text-night-ink">
              {clientResponsibilities.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cost" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Controles de seguridad"
        description="Verde correcto, amarillo requiere revision y rojo problema"
        icon={ShieldCheck}
        action={<StatusBadge status="info" label={`${filtered.length} control(es)`} />}
      >
        <div className="mb-5 flex flex-wrap gap-2">
          {areas.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setArea(item)}
              className={`rounded-lg border px-3 py-2 text-[12px] font-semibold transition-colors ${
                area === item
                  ? 'border-brand bg-brand text-white'
                  : 'border-line text-muted hover:border-brand/60 dark:border-night-line dark:text-night-muted'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((control) => (
            <SecurityCard key={control.id} control={control} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Administracion de identidades (IAM)"
        description="Usuarios, grupos, roles y politicas de la cuenta"
        icon={Users}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-small">
            <thead>
              <tr className="border-b border-line text-left text-muted dark:border-night-line dark:text-night-muted">
                <th className="py-2.5 pr-4 font-medium">Identidad</th>
                <th className="py-2.5 pr-4 font-medium">Tipo</th>
                <th className="py-2.5 pr-4 font-medium">Politicas asociadas</th>
                <th className="py-2.5 pr-4 font-medium">MFA</th>
                <th className="py-2.5 pr-4 font-medium">Ultimo acceso</th>
                <th className="py-2.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {iamEntities.map((entity) => (
                <tr key={entity.id} className="border-b border-line dark:border-night-line">
                  <td className="py-2.5 pr-4 font-medium text-ink dark:text-night-ink">{entity.name}</td>
                  <td className="py-2.5 pr-4 text-muted dark:text-night-muted">{entity.type}</td>
                  <td className="py-2.5 pr-4 text-muted dark:text-night-muted">
                    {entity.policies.join(', ')}
                  </td>
                  <td className="py-2.5 pr-4">
                    <StatusBadge
                      status={entity.mfa ? 'ok' : 'danger'}
                      label={entity.mfa ? 'Habilitado' : 'Sin MFA'}
                      dot={false}
                    />
                  </td>
                  <td className="py-2.5 pr-4 text-muted dark:text-night-muted">{entity.lastAccess}</td>
                  <td className="py-2.5">
                    <StatusBadge status={entity.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-base p-3 dark:bg-night-bg">
            <p className="text-[12px] text-muted dark:text-night-muted">Principio aplicado</p>
            <p className="text-small font-semibold text-ink dark:text-night-ink">Minimo privilegio</p>
          </div>
          <div className="rounded-lg bg-base p-3 dark:bg-night-bg">
            <p className="text-[12px] text-muted dark:text-night-muted">Acceso programatico</p>
            <p className="text-small font-semibold text-ink dark:text-night-ink">Roles en lugar de claves</p>
          </div>
          <div className="rounded-lg bg-base p-3 dark:bg-night-bg">
            <p className="text-[12px] text-muted dark:text-night-muted">Cuenta raiz</p>
            <p className="text-small font-semibold text-ink dark:text-night-ink">Bloqueada con MFA fisico</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
