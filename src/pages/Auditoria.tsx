import { useEffect, useState } from 'react';
import {
  MapPin,
  Navigation,
  Wifi,
  Gauge,
  Clock,
  ShieldAlert,
  ExternalLink,
  Trash2,
  ClipboardList,
} from 'lucide-react';
import SectionCard from '../components/SectionCard';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { fetchIpLocation } from '../lib/ipLocation';
import {
  clearAuditHistory,
  fetchAuditHistory,
  logAudit,
  type AuditLocation,
  type AuditRow,
} from '../lib/auditApi';

const MODULE_NAME = 'auditoria';

type CaptureStatus = 'idle' | 'loading-gps' | 'loading-ip' | 'success' | 'error';

/** Precisión típica del GPS del navegador, para comparar visualmente con la de IP */
const formatRadius = (meters: number) =>
  meters >= 1000 ? `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km` : `${Math.round(meters)} m`;

export default function Auditoria() {
  const [status, setStatus] = useState<CaptureStatus>('idle');
  const [current, setCurrent] = useState<AuditLocation | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<AuditRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      setHistory(await fetchAuditHistory(MODULE_NAME));
      setHistoryError(null);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Error desconocido.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const registerCapture = async (location: AuditLocation) => {
    setCurrent(location);
    setStatus('success');
    try {
      await logAudit(
        location.source === 'gps' ? 'captura_gps' : 'captura_ip',
        MODULE_NAME,
        location,
      );
      await loadHistory();
    } catch (error) {
      setErrorMsg(
        `La ubicación se obtuvo, pero no se pudo guardar en el historial: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
    }
  };

  const captureByGps = () => {
    if (!('geolocation' in navigator)) {
      setStatus('error');
      setErrorMsg('Este navegador no soporta geolocalización por GPS.');
      return;
    }
    setStatus('loading-gps');
    setErrorMsg('');

    const onSuccess = (position: GeolocationPosition) => {
      void registerCapture({
        source: 'gps',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        radiusMeters: position.coords.accuracy,
      });
    };

    navigator.geolocation.getCurrentPosition(
      onSuccess,
      () => {
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (fallbackError) => {
            setStatus('error');
            setErrorMsg(
              fallbackError.code === fallbackError.PERMISSION_DENIED
                ? 'Permiso de ubicación denegado. Habilítalo en el navegador para usar el GPS.'
                : 'No se pudo obtener la ubicación por GPS.',
            );
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  };

  const captureByIp = async () => {
    setStatus('loading-ip');
    setErrorMsg('');
    try {
      const result = await fetchIpLocation();
      await registerCapture({
        source: 'ip',
        latitude: result.latitude,
        longitude: result.longitude,
        radiusMeters: result.approxRadiusMeters,
        ip: result.ip,
        city: result.city,
        region: result.region,
        country: result.country,
      });
    } catch (error) {
      setStatus('error');
      setErrorMsg(error instanceof Error ? error.message : 'No se pudo obtener la ubicación por IP.');
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('¿Eliminar todo el historial de auditoría?')) return;
    try {
      await clearAuditHistory(MODULE_NAME);
      await loadHistory();
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'No se pudo limpiar el historial.');
    }
  };

  const mapsUrl = current
    ? `https://www.google.com/maps?q=${current.latitude},${current.longitude}`
    : undefined;

  // El radar se dibuja a una escala fija solo para visualizar el orden de magnitud del rango,
  // no está a escala real del mapa (eso exigiría la API de mapas con clave propia).
  const radarScale = current ? Math.min(1, Math.log10(current.radiusMeters + 10) / 5) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Última fuente"
          value={current ? (current.source === 'gps' ? 'GPS' : 'IP') : '—'}
          hint="Origen de la última captura"
          icon={current?.source === 'ip' ? Wifi : Navigation}
          tone="info"
        />
        <StatCard
          label="Rango aproximado"
          value={current ? formatRadius(current.radiusMeters) : '—'}
          hint={current?.source === 'ip' ? 'Estimado por IP' : 'Precisión reportada por el GPS'}
          icon={Gauge}
          tone="info"
        />
        <StatCard
          label="Dirección IP"
          value={current?.ip ?? '—'}
          hint={current?.city ? `${current.city}, ${current.country ?? ''}` : 'Solo disponible con captura por IP'}
          icon={Wifi}
          tone="info"
        />
        <StatCard
          label="Registros en el historial"
          value={`${history.length}`}
          hint="Guardados en Supabase"
          icon={ClipboardList}
          tone="info"
        />
      </div>

      <SectionCard
        title="Auditoría de ubicación"
        description="Captura la ubicación del cliente por GPS (alta precisión) o por IP (aproximada, sin pedir permisos)"
        icon={MapPin}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={captureByGps}
              disabled={status === 'loading-gps' || status === 'loading-ip'}
              className="btn-primary py-2"
            >
              <Navigation size={15} className={status === 'loading-gps' ? 'animate-pulse' : ''} />
              {status === 'loading-gps' ? 'Obteniendo GPS...' : 'Ubicación GPS'}
            </button>
            <button
              type="button"
              onClick={captureByIp}
              disabled={status === 'loading-gps' || status === 'loading-ip'}
              className="btn-ghost py-2"
            >
              <Wifi size={15} className={status === 'loading-ip' ? 'animate-pulse' : ''} />
              {status === 'loading-ip' ? 'Buscando IP...' : 'Ubicación por IP'}
            </button>
          </div>
        }
      >
        {status === 'error' && (
          <div className="mb-5 flex items-start gap-3 rounded-card border border-alert/25 bg-alert/5 p-4 text-small text-alert">
            <ShieldAlert size={18} className="mt-0.5 shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        {status === 'idle' && !current && (
          <div className="rounded-card border border-dashed border-line p-8 text-center text-small text-muted dark:border-night-line dark:text-night-muted">
            Elige <span className="font-semibold text-ink dark:text-night-ink">Ubicación GPS</span> para precisión
            exacta (pide permiso), o <span className="font-semibold text-ink dark:text-night-ink">Ubicación por IP</span>{' '}
            para una estimación sin permisos.
          </div>
        )}

        {current && (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="overflow-hidden rounded-card border border-line dark:border-night-line">
              <iframe
                title="Mapa de ubicación"
                className="h-full min-h-[260px] w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${current.latitude},${current.longitude}&z=${
                  current.source === 'gps' ? 15 : 9
                }&output=embed`}
              />
            </div>

            <div className="rounded-card border border-brand/30 bg-brand/5 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-brand">
                  {current.source === 'gps' ? 'Ubicación por GPS' : 'Ubicación por IP'}
                </h3>
                <StatusBadge status="ok" label="Capturado" />
              </div>

              {/* "Radar" propio: representa el orden de magnitud del rango, no a escala real */}
              <div className="my-4 flex items-center justify-center">
                <div className="relative flex h-28 w-28 items-center justify-center">
                  <div
                    className="absolute rounded-full bg-brand/15"
                    style={{ width: `${40 + radarScale * 60}%`, height: `${40 + radarScale * 60}%` }}
                  />
                  <div
                    className="absolute rounded-full border border-brand/40"
                    style={{ width: `${40 + radarScale * 60}%`, height: `${40 + radarScale * 60}%` }}
                  />
                  <div className="relative h-3 w-3 rounded-full bg-brand" />
                </div>
              </div>
              <p className="text-center text-[12px] text-muted dark:text-night-muted">
                Rango aproximado: <span className="font-semibold text-ink dark:text-night-ink">{formatRadius(current.radiusMeters)}</span>
              </p>

              <dl className="mt-4 space-y-2 text-small text-ink dark:text-night-ink">
                <div className="flex items-center justify-between">
                  <dt className="text-muted dark:text-night-muted">Latitud</dt>
                  <dd className="font-mono font-semibold">{current.latitude.toFixed(6)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted dark:text-night-muted">Longitud</dt>
                  <dd className="font-mono font-semibold">{current.longitude.toFixed(6)}</dd>
                </div>
                {current.ip && (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted dark:text-night-muted">IP</dt>
                    <dd className="font-mono font-semibold">{current.ip}</dd>
                  </div>
                )}
                {current.city && (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted dark:text-night-muted">Ciudad</dt>
                    <dd className="font-semibold">{current.city}, {current.country}</dd>
                  </div>
                )}
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
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Historial de auditoría"
        description="Últimas capturas de ubicación, guardadas en Supabase"
        icon={ClipboardList}
        action={
          history.length > 0 ? (
            <button
              type="button"
              onClick={handleClearHistory}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[12px] font-semibold text-muted transition-colors hover:border-alert/60 hover:text-alert dark:border-night-line dark:text-night-muted"
            >
              <Trash2 size={14} />
              Limpiar historial
            </button>
          ) : undefined
        }
      >
        {historyError && <p className="mb-3 text-small text-alert">No se pudo cargar el historial: {historyError}</p>}

        {historyLoading ? (
          <p className="py-10 text-center text-small text-muted dark:text-night-muted">Cargando historial...</p>
        ) : history.length === 0 ? (
          <p className="text-small text-muted dark:text-night-muted">Todavía no hay capturas registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-small">
              <thead>
                <tr className="border-b border-line text-left text-muted dark:border-night-line dark:text-night-muted">
                  <th className="py-2.5 pr-4 font-medium">Fecha y hora</th>
                  <th className="py-2.5 pr-4 font-medium">Origen</th>
                  <th className="py-2.5 pr-4 font-medium">IP</th>
                  <th className="py-2.5 pr-4 font-medium">Coordenadas</th>
                  <th className="py-2.5 pr-4 font-medium">Rango</th>
                  <th className="py-2.5 font-medium">Mapa</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className="border-b border-line dark:border-night-line">
                    <td className="py-2.5 pr-4 text-ink dark:text-night-ink">
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-muted dark:text-night-muted" />
                        {entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge
                        status="info"
                        label={entry.ubicacion?.source === 'gps' ? 'GPS' : 'IP'}
                      />
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-ink dark:text-night-ink">
                      {entry.ubicacion?.ip ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-ink dark:text-night-ink">
                      {entry.ubicacion
                        ? `${entry.ubicacion.latitude.toFixed(4)}, ${entry.ubicacion.longitude.toFixed(4)}`
                        : '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-muted dark:text-night-muted">
                      {entry.ubicacion ? formatRadius(entry.ubicacion.radiusMeters) : '—'}
                    </td>
                    <td className="py-2.5">
                      {entry.ubicacion ? (
                        <a
                          href={`https://www.google.com/maps?q=${entry.ubicacion.latitude},${entry.ubicacion.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline"
                        >
                          Abrir <ExternalLink size={12} />
                        </a>
                      ) : (
                        '—'
                      )}
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