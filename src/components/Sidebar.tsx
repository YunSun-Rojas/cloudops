import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Wallet,
  Globe2,
  ShieldCheck,
  Network,
  Boxes,
  Cloud,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  hint: string;
}

export const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, hint: 'Resumen general' },
  { to: '/planning', label: 'Planificacion Cloud', icon: ClipboardList, hint: 'Propuestas' },
  { to: '/costs', label: 'Costos', icon: Wallet, hint: 'Economia de la nube' },
  { to: '/infrastructure', label: 'Infraestructura Global', icon: Globe2, hint: 'Regiones y AZ' },
  { to: '/security', label: 'Seguridad', icon: ShieldCheck, hint: 'IAM y cumplimiento' },
  { to: '/network', label: 'Arquitectura de Red', icon: Network, hint: 'VPC y borde' },
  { to: '/services', label: 'Servicios AWS', icon: Boxes, hint: 'Catalogo' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { region, securityScore } = useApp();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-sidebar/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-sidebar text-slate-300
                    transition-transform duration-200 lg:translate-x-0
                    ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Navegacion principal"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white">
              <Cloud size={20} />
            </span>
            <div>
              <p className="text-[15px] font-bold leading-tight text-white">CloudOps</p>
              <p className="text-[12px] text-slate-400">Dashboard</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Cerrar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-colors ${
                  isActive
                    ? 'bg-brand text-white font-semibold'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span className="flex-1">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="m-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-[12px] uppercase tracking-wide text-slate-400">Region activa</p>
          <p className="mt-1 text-[14px] font-semibold text-white">{region.name}</p>
          <p className="text-[12px] text-slate-400">{region.location}</p>
          <div className="mt-3 flex items-center justify-between text-[12px]">
            <span className="text-slate-400">Postura de seguridad</span>
            <span className="font-semibold text-security">{securityScore}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-security transition-all duration-500"
              style={{ width: `${securityScore}%` }}
            />
          </div>
        </div>
      </aside>
    </>
  );
}
