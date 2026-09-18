import { useState } from 'react';
import { ArrowDown, Network as NetworkIcon, ShieldCheck, Route } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';
import { networkNodes } from '../data/security';
import { useApp } from '../context/AppContext';
import type { NetworkNode } from '../types/cloud';

const flowStyles: Record<NetworkNode['layer'], string> = {
  internet: 'border-line bg-base',
  dns: 'border-brand/40 bg-brand/5',
  cdn: 'border-cost/40 bg-cost/5',
  vpc: 'border-brand/40 bg-brand/5',
  'subnet-public': 'border-security/40 bg-security/5',
  'subnet-private': 'border-alert/30 bg-alert/5',
};

function NodeBox({
  node,
  onSelect,
  selected,
}: {
  node: NetworkNode;
  onSelect: (node: NetworkNode) => void;
  selected: boolean;
}) {
  const Icon = node.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      className={`w-full rounded-xl border p-3 text-left transition-all hover:shadow-card dark:bg-night-card/40 ${
        flowStyles[node.layer]
      } ${selected ? 'ring-2 ring-brand' : ''}`}
    >
      <span className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-brand shadow-sm dark:bg-night-bg">
          <Icon size={17} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-small font-semibold text-ink dark:text-night-ink">
            {node.label}
          </span>
          <span className="block truncate text-[12px] text-muted dark:text-night-muted">
            {node.sublabel}
          </span>
        </span>
      </span>
    </button>
  );
}

export default function Network() {
  const { region } = useApp();
  const [selected, setSelected] = useState<NetworkNode>(networkNodes[0]);

  const byId = (id: string) => networkNodes.find((node) => node.id === id)!;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Arquitectura de red de la solucion"
        description="Internet → Route 53 → CloudFront → VPC → EC2 / RDS"
        icon={NetworkIcon}
        action={<StatusBadge status="ok" label={`Region ${region.name}`} />}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <NodeBox node={byId('internet')} onSelect={setSelected} selected={selected.id === 'internet'} />
            <div className="flex justify-center">
              <ArrowDown size={18} className="text-brand" />
            </div>
            <NodeBox node={byId('route53')} onSelect={setSelected} selected={selected.id === 'route53'} />
            <div className="flex justify-center">
              <ArrowDown size={18} className="text-brand" />
            </div>
            <NodeBox node={byId('cloudfront')} onSelect={setSelected} selected={selected.id === 'cloudfront'} />
            <div className="flex justify-center">
              <ArrowDown size={18} className="text-brand" />
            </div>

            <div className="rounded-card border-2 border-dashed border-brand/50 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-small font-semibold text-brand">VPC 10.0.0.0/16</p>
                <StatusBadge status="info" label="Red virtual aislada" dot={false} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-security/40 bg-security/5 p-3">
                  <p className="mb-2 text-[12px] font-semibold text-security">
                    Subred publica 10.0.1.0/24 · AZ a
                  </p>
                  <NodeBox
                    node={byId('subnet-public')}
                    onSelect={setSelected}
                    selected={selected.id === 'subnet-public'}
                  />
                  <p className="mt-2 text-[12px] text-muted dark:text-night-muted">
                    Internet Gateway, balanceador de carga y NAT Gateway.
                  </p>
                </div>

                <div className="rounded-xl border border-alert/30 bg-alert/5 p-3">
                  <p className="mb-2 text-[12px] font-semibold text-alert">
                    Subred privada 10.0.2.0/24 · AZ b
                  </p>
                  <div className="space-y-2">
                    <NodeBox node={byId('ec2')} onSelect={setSelected} selected={selected.id === 'ec2'} />
                    <NodeBox node={byId('rds')} onSelect={setSelected} selected={selected.id === 'rds'} />
                  </div>
                  <p className="mt-2 text-[12px] text-muted dark:text-night-muted">
                    Sin direccion IP publica. Salida a Internet a traves del NAT Gateway.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="surface p-4">
              <p className="text-[12px] text-muted dark:text-night-muted">Componente seleccionado</p>
              <h3 className="mt-1 text-[17px] font-semibold text-ink dark:text-night-ink">
                {selected.label}
              </h3>
              <p className="mt-2 text-small text-muted dark:text-night-muted">{selected.detail}</p>
            </div>

            <div className="surface p-4">
              <p className="mb-3 flex items-center gap-2 text-small font-semibold text-ink dark:text-night-ink">
                <Route size={16} className="text-brand" /> Tablas de enrutamiento
              </p>
              <ul className="space-y-2 text-[12px] text-muted dark:text-night-muted">
                <li className="rounded-lg bg-base p-2.5 dark:bg-night-bg">
                  <span className="font-semibold text-ink dark:text-night-ink">rtb-publica: </span>
                  0.0.0.0/0 → Internet Gateway
                </li>
                <li className="rounded-lg bg-base p-2.5 dark:bg-night-bg">
                  <span className="font-semibold text-ink dark:text-night-ink">rtb-privada: </span>
                  0.0.0.0/0 → NAT Gateway
                </li>
                <li className="rounded-lg bg-base p-2.5 dark:bg-night-bg">
                  <span className="font-semibold text-ink dark:text-night-ink">local: </span>
                  10.0.0.0/16 → trafico interno de la VPC
                </li>
              </ul>
            </div>

            <div className="surface p-4">
              <p className="mb-3 flex items-center gap-2 text-small font-semibold text-ink dark:text-night-ink">
                <ShieldCheck size={16} className="text-security" /> Controles de red
              </p>
              <ul className="space-y-2 text-[12px]">
                <li className="flex items-center justify-between gap-2">
                  <span className="text-muted dark:text-night-muted">Security group web</span>
                  <StatusBadge status="ok" label="443 y 80" dot={false} />
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-muted dark:text-night-muted">Security group base de datos</span>
                  <StatusBadge status="ok" label="3306 interno" dot={false} />
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-muted dark:text-night-muted">Lista de control de red</span>
                  <StatusBadge status="warning" label="Revisar reglas" dot={false} />
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </SectionCard>

      <SectionCard
        title="Recorrido del trafico"
        description="Que ocurre en cada salto desde el usuario hasta la base de datos"
        icon={Route}
      >
        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {networkNodes.slice(0, 6).map((node, index) => (
            <li key={node.id} className="rounded-card border border-line p-4 dark:border-night-line">
              <p className="text-[12px] font-semibold text-brand">Salto {index + 1}</p>
              <p className="mt-1 text-small font-semibold text-ink dark:text-night-ink">{node.label}</p>
              <p className="mt-1 text-[12px] text-muted dark:text-night-muted">{node.detail}</p>
            </li>
          ))}
        </ol>
      </SectionCard>
    </div>
  );
}
