import { useEffect, useState } from 'react';
import {
  MapPin,
  Navigation,
  Clock,
  Gauge,
  RefreshCw,
  ShieldAlert,
  ExternalLink,
  Trash2,
  ClipboardList,
} from 'lucide-react';
import SectionCard from '../components/SectionCard';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';

interface AuditEntry {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

type GeoStatus = 'idle' | 'loading' | 'success' | 'error' | 'unsupported';

const STORAGE_KEY = 'cloudops-dashboard-auditoria-v1';

export default function Auditoria() {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [current, setCurrent] = useState<AuditEntry | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [history, setHistory] = useState<AuditEntry[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch {
      setHistory([]);
    }
  }, []);

  const persist = (entries: AuditEntry[]) => {
    setHistory(entries);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // almacenamiento no disponible, se ignora
    }
  };

  const handleSuccess = (position: GeolocationPosition) => {
    const entry: AuditEntry = {
      id: `${position.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp).toISOString(),
    };
    setCurrent(entry);
    setStatus('success');
    persist([entry, ...history].slice(0, 20));
  };

  const describeError = (error: GeolocationPositionError) => {
    if (error.code === error.PERMISSION_DENIED) {
      return 'Permiso de ubicacion denegado. Habilitalo en el navegador para continuar.';
    }
    if (error.code === error.POSITION_UNAVAILABLE) {
      return 'La ubicacion no esta disponible. Revisa que el servicio de ubicacion del sistema operativo este activado.';
    }
    if (error.code === error.TIMEOUT) {
      return 'Se agoto el tiempo de espera al obtener la ubicacion. Verifica tu conexion y que el servicio de ubicacion del dispositivo este activado, luego intenta de nuevo.';
    }
    return 'No se pudo obtener la ubicacion.';
  };

  const captureLocation = () => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      setErrorMsg('Este navegador no soporta geolocalizacion.');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    // Primer intento: alta precision (GPS), con tiempo de espera generoso.
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      () => {
        // Si falla o tarda demasiado, se reintenta con precision estandar
        // (red / Wi-Fi), que responde mucho mas rapido.
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          (fallbackError) => {
            setStatus('error');
            setErrorMsg(describeError(fallbackError));
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  };

  const clearHistory = () => persist([]);

  const mapsUrl = current
    ? `https://www.google.com/maps?q=${current.latitude},${current.longitude}`
    : undefined;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Estado del GPS"
          value={
            status === 'success'
              ? 'Ubicado'
              : status === 'loading'
                ? 'Buscando...'
                : status === 'error' || status === 'unsupported'
                  ? 'Sin acceso'
                  : 'En espera'
          }
          hint="Sensor de geolocalizacion del navegador"
          icon={Navigation}
          tone={status === 'success' ? 'ok' : status === 'error' || status === 'unsupported' ? 'danger' : 'info'}
        />
        <StatCard
          label="Precision"
          value={current ? `${Math.round(current.accuracy)} m` : '—'}
          hint="Radio estimado de error"
          icon={Gauge}
          tone="info"
        />
        <StatCard
          label="Ultima captura"
          value={current ? new Date(current.timestamp).toLocaleTimeString() : '—'}
          hint={current ? new Date(current.timestamp).toLocaleDateString() : 'Aun sin registros'}
          icon={Clock}
          tone="info"
        />
        <StatCard
          label="Registros en el historial"
          value={`${history.length}`}
          hint="Guardados en este dispositivo"
          icon={ClipboardList}
          tone="info"
        />
      </div>

      <SectionCard
        title="Auditoria de ubicacion"
        description="Captura tu posicion GPS actual mediante el navegador para fines de auditoria y trazabilidad"
        icon={MapPin}
        action={
          <button
            type="button"
            onClick={captureLocation}
            disabled={status === 'loading'}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={status === 'loading' ? 'animate-spin' : ''} />
            {status === 'loading' ? 'Obteniendo...' : 'Obtener mi ubicacion'}
          </button>
        }
      >
        {(status === 'error' || status === 'unsupported') && (
          <div className="mb-5 flex items-start gap-3 rounded-card border border-alert/25 bg-alert/5 p-4 text-small text-alert">
            <ShieldAlert size={18} className="mt-0.5 shrink-0" />
            <div>
              <p>{errorMsg}</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[12px] text-alert/90">
                <li>Verifica que el icono de ubicacion en la barra del navegador tenga el permiso en "Permitir".</li>
                <li>En Windows: Configuracion → Privacidad → Ubicacion, debe estar activada.</li>
                <li>En macOS: Preferencias del Sistema → Privacidad y seguridad → Localizacion, activa el navegador.</li>
                <li>Intenta de nuevo; el sistema ahora reintenta con ubicacion aproximada si el GPS de alta precision tarda demasiado.</li>
              </ul>
            </div>
          </div>
        )}

        {status === 'idle' && !current && (
          <div className="rounded-card border border-dashed border-line p-8 text-center text-small text-muted dark:border-night-line dark:text-night-muted">
            Pulsa <span className="font-semibold text-ink dark:text-night-ink">"Obtener mi ubicacion"</span> y
            acepta el permiso de ubicacion que solicitara el navegador.
          </div>
        )}

        {current && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-card border border-brand/30 bg-brand/5 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-brand">Coordenadas actuales</h3>
                <StatusBadge status="ok" label="Capturado" />
              </div>
              <dl className="mt-3 space-y-2 text-small text-ink dark:text-night-ink">
                <div className="flex items-center justify-between">
                  <dt className="text-muted dark:text-night-muted">Latitud</dt>
                  <dd className="font-mono font-semibold">{current.latitude.toFixed(6)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted dark:text-night-muted">Longitud</dt>
                  <dd className="font-mono font-semibold">{current.longitude.toFixed(6)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted dark:text-night-muted">Precision</dt>
                  <dd className="font-mono font-semibold">{Math.round(current.accuracy)} m</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted dark:text-night-muted">Fecha y hora</dt>
                  <dd className="font-mono font-semibold">{new Date(current.timestamp).toLocaleString()}</dd>
                </div>
              </dl>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline"
                >
                  Ver en Google Maps <ExternalLink size={14} />
                </a>
              )}
            </div>

            <div className="overflow-hidden rounded-card border border-line dark:border-night-line">
              <iframe
                title="Mapa de ubicacion actual"
                className="h-full min-h-[220px] w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${current.latitude},${current.longitude}&z=15&output=embed`}
              />
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Historial de auditoria"
        description="Ultimas capturas de ubicacion realizadas desde este dispositivo"
        icon={ClipboardList}
        action={
          history.length > 0 ? (
            <button
              type="button"
              onClick={clearHistory}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[12px] font-semibold text-muted transition-colors hover:border-alert/60 hover:text-alert dark:border-night-line dark:text-night-muted"
            >
              <Trash2 size={14} />
              Limpiar historial
            </button>
          ) : undefined
        }
      >
        {history.length === 0 ? (
          <p className="text-small text-muted dark:text-night-muted">
            Todavia no hay capturas registradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-small">
              <thead>
                <tr className="border-b border-line text-left text-muted dark:border-night-line dark:text-night-muted">
                  <th className="py-2.5 pr-4 font-medium">Fecha y hora</th>
                  <th className="py-2.5 pr-4 font-medium">Latitud</th>
                  <th className="py-2.5 pr-4 font-medium">Longitud</th>
                  <th className="py-2.5 pr-4 font-medium">Precision</th>
                  <th className="py-2.5 font-medium">Mapa</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className="border-b border-line dark:border-night-line">
                    <td className="py-2.5 pr-4 text-ink dark:text-night-ink">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-ink dark:text-night-ink">
                      {entry.latitude.toFixed(6)}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-ink dark:text-night-ink">
                      {entry.longitude.toFixed(6)}
                    </td>
                    <td className="py-2.5 pr-4 text-muted dark:text-night-muted">
                      {Math.round(entry.accuracy)} m
                    </td>
                    <td className="py-2.5">
                      <a
                        href={`https://www.google.com/maps?q=${entry.latitude},${entry.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline"
                      >
                        Abrir <ExternalLink size={12} />
                      </a>
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