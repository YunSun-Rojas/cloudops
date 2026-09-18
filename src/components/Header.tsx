import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Check, Menu, Moon, Search, Sun, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { regions } from '../data/regions';
import { navItems } from './Sidebar';

const pageDescriptions: Record<string, string> = {
  '/dashboard': 'Resumen general de la solucion Cloud propuesta',
  '/planning': 'Registro y seguimiento de propuestas de arquitectura',
  '/costs': 'Estimacion simulada de costos y economia de la nube',
  '/infrastructure': 'Regiones, zonas de disponibilidad y ubicaciones de borde',
  '/security': 'Responsabilidad compartida, IAM, datos y cumplimiento',
  '/network': 'Ruta del trafico desde Internet hasta la VPC',
  '/services': 'Catalogo de servicios AWS de la solucion',
};

interface HeaderProps {
  onOpenMenu: () => void;
}

export default function Header({ onOpenMenu }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const {
    darkMode,
    toggleDarkMode,
    regionId,
    setRegionId,
    notifications,
    markNotificationsRead,
    clearNotifications,
  } = useApp();

  const current = navItems.find((item) => location.pathname.startsWith(item.to));
  const unread = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    navigate(`/services?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-card/95 backdrop-blur dark:border-night-line dark:bg-night-card/95">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-6">
        <button
          type="button"
          onClick={onOpenMenu}
          className="rounded-lg border border-line p-2 text-ink lg:hidden dark:border-night-line dark:text-night-ink"
          aria-label="Abrir menu"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-bold leading-tight text-ink dark:text-night-ink sm:text-[22px]">
            {current?.label ?? 'CloudOps Dashboard'}
          </h1>
          <p className="truncate text-small text-muted dark:text-night-muted">
            {pageDescriptions[current?.to ?? ''] ?? 'Cloud Foundations - Semanas 5 y 6'}
          </p>
        </div>

        <form onSubmit={submitSearch} className="order-last w-full sm:order-none sm:w-64">
          <label className="sr-only" htmlFor="buscador-servicios">
            Buscar servicios AWS
          </label>
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              id="buscador-servicios"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar servicio AWS"
              className="input-field pl-9 py-2 text-small"
            />
          </div>
        </form>

        <label className="sr-only" htmlFor="selector-region">
          Region
        </label>
        <select
          id="selector-region"
          value={regionId}
          onChange={(event) => setRegionId(event.target.value)}
          className="input-field w-auto py-2 text-small"
        >
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={toggleDarkMode}
          className="rounded-lg border border-line p-2 text-ink transition-colors hover:bg-base dark:border-night-line dark:text-night-ink dark:hover:bg-night-bg"
          aria-label={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative" ref={panelRef}>
          <button
            type="button"
            onClick={() => {
              setShowNotifications((prev) => !prev);
              if (!showNotifications) markNotificationsRead();
            }}
            className="relative rounded-lg border border-line p-2 text-ink transition-colors hover:bg-base dark:border-night-line dark:text-night-ink dark:hover:bg-night-bg"
            aria-label="Notificaciones"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-alert px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[min(320px,calc(100vw-2rem))] animate-fade-up surface p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-small font-semibold text-ink dark:text-night-ink">Notificaciones</p>
                <button
                  type="button"
                  onClick={clearNotifications}
                  className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-alert"
                >
                  <Trash2 size={13} /> Vaciar
                </button>
              </div>

              {notifications.length === 0 ? (
                <p className="py-6 text-center text-small text-muted dark:text-night-muted">
                  No hay avisos. Registra una propuesta o agrega un costo para generar actividad.
                </p>
              ) : (
                <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {notifications.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-line p-2.5 dark:border-night-line"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            item.status === 'ok'
                              ? 'bg-security'
                              : item.status === 'warning'
                                ? 'bg-cost'
                                : item.status === 'danger'
                                  ? 'bg-alert'
                                  : 'bg-brand'
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-small font-semibold text-ink dark:text-night-ink">
                            {item.title}
                          </p>
                          <p className="text-[12px] text-muted dark:text-night-muted">{item.message}</p>
                          <p className="mt-1 text-[11px] text-muted/80">{item.time}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={markNotificationsRead}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-base py-2 text-[12px] font-semibold text-ink dark:bg-night-bg dark:text-night-ink"
              >
                <Check size={13} /> Marcar todo como leido
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
