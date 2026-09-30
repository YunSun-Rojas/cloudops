export interface IpLocationResult {
  ip: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  /** La geolocalización por IP no da un radio real; se usa un valor típico de precisión por ciudad */
  approxRadiusMeters: number;
  isp: string;
}

interface IpApiResponse {
  ip: string;
  city: string;
  region: string;
  country_name: string;
  latitude: number;
  longitude: number;
  org: string;
  error?: boolean;
  reason?: string;
}

const APPROX_RADIUS_METERS = 25000; // ~25 km: precisión típica de geolocalización por IP

export async function fetchIpLocation(): Promise<IpLocationResult> {
  const response = await fetch('https://ipapi.co/json/');
  if (!response.ok) throw new Error('No se pudo consultar el servicio de geolocalización por IP.');

  const data = (await response.json()) as IpApiResponse;
  if (data.error) throw new Error(data.reason ?? 'El servicio de IP devolvió un error.');
  if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
    throw new Error('El servicio de IP no devolvió coordenadas válidas.');
  }

  return {
    ip: data.ip,
    city: data.city,
    region: data.region,
    country: data.country_name,
    latitude: data.latitude,
    longitude: data.longitude,
    approxRadiusMeters: APPROX_RADIUS_METERS,
    isp: data.org,
  };
}