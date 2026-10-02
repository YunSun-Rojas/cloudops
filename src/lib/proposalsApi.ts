import { supabase } from './supabase';
import { getServiceById } from '../data/awsServices';
import type { AppType, Availability, CloudProposal, CostItem, MigrationGoal } from '../types/cloud';

/** Parámetros del cálculo, guardados en costos.detalles */
interface CostDetails {
  quantity?: number;
  hours?: number;
  hourlyPrice?: number;
  costFactor?: number;
}

/** Identifica qué servicio de AWS representa el recurso */
interface ResourceMetadata {
  serviceId?: string;
}

interface CostRow {
  id: number;
  recurso_id: number;
  monto: number | null;
  moneda: string | null;
  periodo: string | null;
  detalles: CostDetails | null;
  created_at: string;
}

interface ResourceRow {
  id: number;
  tipo: string | null;
  metadata: ResourceMetadata | null;
  costos: CostRow[] | CostRow | null;
}

/** Fila de `propuestas_cloud` con sus recursos y costos anidados */
export interface ProposalRow {
  id: number;
  nombre: string;
  descripcion: string;
  region: string;
  costo_estimado: number | null;
  estado: string;
  tipo_aplicacion: AppType;
  usuarios_estimados: number;
  disponibilidad: Availability;
  objetivo: MigrationGoal;
  configuracion: { servicios?: string[] } | null;
  created_at: string;
  recursos_cloud: ResourceRow[] | null;
}

export type NewProposal = Omit<CloudProposal, 'id' | 'createdAt' | 'costItems'>;
type ProposalRef = Pick<CloudProposal, 'id' | 'name' | 'regionId'>;

const round2 = (value: number) => Math.round(value * 100) / 100;
const currentPeriod = () => `${new Date().toISOString().slice(0, 7)}-01`;
const asArray = <T>(value: T[] | T | null | undefined): T[] =>
  Array.isArray(value) ? value : value ? [value] : [];
const monthlyTotal = (items: CostItem[], factor: number) =>
  round2(items.reduce((total, item) => total + item.monthlyCost, 0) * factor);

/** Reconstruye una línea de costo a partir del recurso y su registro en `costos` */
const resourceToCostItem = (resource: ResourceRow): CostItem | null => {
  const serviceId = resource.metadata?.serviceId;
  if (!serviceId) return null;

  const latest = [...asArray(resource.costos)].sort((a, b) =>
    (b.created_at ?? '').localeCompare(a.created_at ?? ''),
  )[0];
  const quantity = latest?.detalles?.quantity ?? 1;
  const hours = latest?.detalles?.hours ?? 730;
  const hourlyPrice = latest?.detalles?.hourlyPrice ?? getServiceById(serviceId)?.hourlyPrice ?? 0;
  const monthlyCost = hourlyPrice * quantity * hours; // importe base, sin factor regional

  return {
    id: String(resource.id),
    serviceId,
    serviceName: resource.tipo ?? serviceId,
    quantity,
    hours,
    hourlyPrice,
    monthlyCost,
    annualCost: monthlyCost * 12,
  };
};

export const rowToProposal = (row: ProposalRow): CloudProposal => ({
  id: String(row.id),
  name: row.nombre,
  appType: row.tipo_aplicacion,
  description: row.descripcion,
  regionId: row.region,
  estimatedUsers: row.usuarios_estimados,
  availability: row.disponibilidad,
  services: row.configuracion?.servicios ?? [],
  goal: row.objetivo,
  costItems: [...(row.recursos_cloud ?? [])]
    .sort((a, b) => a.id - b.id)
    .flatMap((resource) => resourceToCostItem(resource) ?? []),
  createdAt: row.created_at,
});

export async function fetchProposals(): Promise<CloudProposal[]> {
  const { data, error } = await supabase
    .from('propuestas_cloud')
    .select('*, recursos_cloud(*, costos(*))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as ProposalRow[]).map(rowToProposal);
}

/**
 * Deja la base igual a la lista de costos recibida:
 * un recurso por servicio (recursos_cloud) y un registro de costo por recurso (costos).
 * Los recursos se localizan por serviceId, así que un id temporal no genera duplicados.
 */
export async function saveProposalCosts(
  proposal: ProposalRef,
  costItems: CostItem[],
  costFactor: number,
): Promise<void> {
  const proposalId = Number(proposal.id);

  // 1) Recursos que ya existen para esta propuesta
  const { data: existingData, error: existingError } = await supabase
    .from('recursos_cloud')
    .select('id, metadata')
    .eq('propuesta_id', proposalId);
  if (existingError) throw existingError;
  const existing = (existingData ?? []) as Array<{ id: number; metadata: ResourceMetadata | null }>;

  const idByService = new Map<string, number>();
  existing.forEach((row) => {
    if (row.metadata?.serviceId) idByService.set(row.metadata.serviceId, row.id);
  });
  const keptServices = new Set(costItems.map((item) => item.serviceId));

  // 2) Los costos anteriores se reescriben; los recursos que ya no están se eliminan
  if (existing.length > 0) {
    const { error } = await supabase
      .from('costos')
      .delete()
      .in('recurso_id', existing.map((row) => row.id));
    if (error) throw error;
  }
  const removedIds = existing
    .filter((row) => !row.metadata?.serviceId || !keptServices.has(row.metadata.serviceId))
    .map((row) => row.id);
  if (removedIds.length > 0) {
    const { error } = await supabase.from('recursos_cloud').delete().in('id', removedIds);
    if (error) throw error;
  }

  // 3) Actualiza los recursos que se mantienen e inserta los nuevos
  const resourceFields = (item: CostItem) => ({
    nombre: `${item.serviceName} - ${proposal.name}`,
    proveedor: 'AWS',
    tipo: item.serviceName,
    region: proposal.regionId,
    estado: 'planificado',
    costo_mensual: round2(item.monthlyCost * costFactor),
    metadata: { serviceId: item.serviceId },
    propuesta_id: proposalId,
  });

  const resourceIdByService = new Map<string, number>();

  await Promise.all(
    costItems
      .filter((item) => idByService.has(item.serviceId))
      .map(async (item) => {
        const id = idByService.get(item.serviceId) as number;
        const { error } = await supabase.from('recursos_cloud').update(resourceFields(item)).eq('id', id);
        if (error) throw error;
        resourceIdByService.set(item.serviceId, id);
      }),
  );

  const newItems = costItems.filter((item) => !idByService.has(item.serviceId));
  if (newItems.length > 0) {
    const { data, error } = await supabase
      .from('recursos_cloud')
      .insert(newItems.map(resourceFields))
      .select('id, metadata');
    if (error) throw error;
    ((data ?? []) as Array<{ id: number; metadata: ResourceMetadata | null }>).forEach((row) => {
      if (row.metadata?.serviceId) resourceIdByService.set(row.metadata.serviceId, row.id);
    });
  }

  // 4) Un registro de costo por recurso, para el mes actual
  const period = currentPeriod();
  const costRows = costItems.flatMap((item) => {
    const recursoId = resourceIdByService.get(item.serviceId);
    if (recursoId === undefined) return [];
    return [
      {
        recurso_id: recursoId,
        monto: round2(item.monthlyCost * costFactor),
        moneda: 'USD',
        periodo: period,
        detalles: {
          quantity: item.quantity,
          hours: item.hours,
          hourlyPrice: item.hourlyPrice,
          costFactor,
        },
      },
    ];
  });
  if (costRows.length > 0) {
    const { error } = await supabase.from('costos').insert(costRows);
    if (error) throw error;
  }

  // 5) Total de la propuesta
  const { error: totalError } = await supabase
    .from('propuestas_cloud')
    .update({ costo_estimado: monthlyTotal(costItems, costFactor) })
    .eq('id', proposalId);
  if (totalError) throw totalError;
}

/** Inserta solo los requisitos de la propuesta; los recursos y costos se crean desde Costos. */
export async function insertProposal(proposal: NewProposal): Promise<string> {
  const { data, error } = await supabase
    .from('propuestas_cloud')
    .insert({
      nombre: proposal.name,
      descripcion: proposal.description,
      region: proposal.regionId,
      tipo_aplicacion: proposal.appType,
      usuarios_estimados: proposal.estimatedUsers,
      disponibilidad: proposal.availability,
      objetivo: proposal.goal,
      estado: 'planificado',
      costo_estimado: 0,
      configuracion: { servicios: proposal.services },
    })
    .select('id')
    .single();
  if (error) throw error;

  return String((data as { id: number }).id);
}

/** Borra primero los costos y recursos de la propuesta, y al final la propuesta */
export async function deleteProposal(id: string): Promise<void> {
  const proposalId = Number(id);

  const { data, error: readError } = await supabase
    .from('recursos_cloud')
    .select('id')
    .eq('propuesta_id', proposalId);
  if (readError) throw readError;
  const resourceIds = ((data ?? []) as Array<{ id: number }>).map((row) => row.id);

  if (resourceIds.length > 0) {
    const { error: costsError } = await supabase.from('costos').delete().in('recurso_id', resourceIds);
    if (costsError) throw costsError;
    const { error: resourcesError } = await supabase.from('recursos_cloud').delete().in('id', resourceIds);
    if (resourcesError) throw resourcesError;
  }

  const { error } = await supabase.from('propuestas_cloud').delete().eq('id', proposalId);
  if (error) throw error;
}