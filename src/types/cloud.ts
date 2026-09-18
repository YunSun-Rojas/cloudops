import type { LucideIcon } from 'lucide-react';

/** Estado generico usado por badges e indicadores */
export type Status = 'ok' | 'warning' | 'danger' | 'info';

/** Categorias de servicios AWS representadas en el catalogo */
export type ServiceCategory =
  | 'Computo'
  | 'Almacenamiento'
  | 'Base de datos'
  | 'Seguridad e identidad'
  | 'Redes'
  | 'Entrega de contenido';

/** Nivel de uso del servicio dentro de la propuesta */
export type ServiceUsage = 'En uso' | 'Planificado' | 'No utilizado';

export interface AwsService {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  mainFunction: string;
  usage: ServiceUsage;
  /** Precio unitario simulado por hora en USD */
  hourlyPrice: number;
  unit: string;
  icon: LucideIcon;
  /** Modelo de responsabilidad compartida asociado */
  responsibility: 'AWS' | 'Cliente' | 'Compartida';
  docs: string;
}

export interface Region {
  id: string;
  name: string;
  location: string;
  continent: string;
  availabilityZones: number;
  edgeLocations: number;
  deployedServices: string[];
  latencyMs: number;
  status: Status;
  statusLabel: string;
  /** Multiplicador de costo simulado respecto a us-east-1 */
  costFactor: number;
  coords: { x: number; y: number };
}

export type AppType =
  | 'Aplicacion web'
  | 'API / Microservicios'
  | 'Aplicacion movil'
  | 'Analitica de datos'
  | 'Comercio electronico';

export type Availability = '99.0%' | '99.9%' | '99.95%' | '99.99%';

export type MigrationGoal =
  | 'Reduccion de costos'
  | 'Escalabilidad'
  | 'Alta disponibilidad'
  | 'Modernizacion de la aplicacion'
  | 'Mejora de seguridad';

export interface CloudProposal {
  id: string;
  name: string;
  appType: AppType;
  description: string;
  regionId: string;
  estimatedUsers: number;
  availability: Availability;
  services: string[];
  goal: MigrationGoal;
  createdAt: string;
}

export interface CostItem {
  id: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
  hours: number;
  hourlyPrice: number;
  /** quantity * hours * hourlyPrice * costFactor */
  monthlyCost: number;
  annualCost: number;
}

export interface SecurityControl {
  id: string;
  area:
    | 'Responsabilidad compartida'
    | 'IAM'
    | 'Proteccion de cuentas'
    | 'Proteccion de datos'
    | 'Cumplimiento';
  title: string;
  description: string;
  status: Status;
  detail: string;
  owner: 'AWS' | 'Cliente' | 'Compartida';
}

export interface IamEntity {
  id: string;
  name: string;
  type: 'Usuario' | 'Grupo' | 'Rol' | 'Politica';
  policies: string[];
  mfa: boolean;
  lastAccess: string;
  status: Status;
}

export interface NetworkNode {
  id: string;
  label: string;
  sublabel: string;
  layer: 'internet' | 'dns' | 'cdn' | 'vpc' | 'subnet-public' | 'subnet-private';
  icon: LucideIcon;
  detail: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  status: Status;
  time: string;
  read: boolean;
}

export interface ChartDatum {
  label: string;
  value: number;
  color: string;
}
