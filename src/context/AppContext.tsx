import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode,} from 'react';
import type { AppNotification, CloudProposal, CostItem, Region } from '../types/cloud';
import { defaultRegionId, getRegionById } from '../data/regions';
import { awsServices } from '../data/awsServices';
import { securityControls } from '../data/security';
import { clockTime, uid } from '../utils/format';
import {
  deleteProposal,
  fetchProposals,
  insertProposal,
  saveProposalCosts,
  type NewProposal,
} from '../lib/proposalsApi';

const STORAGE_KEY = 'cloudops-dashboard-state-v1';

// Solo lo local: los costos ya no se guardan aquí, viven dentro de cada propuesta en Supabase
interface PersistedState {
  activeProposalId: string | null;
  regionId: string;
  darkMode: boolean;
  notifications: AppNotification[];
}

interface AppContextValue extends PersistedState {
  region: Region;
  monthlyCost: number;
  annualCost: number;
  activeServices: string[];
  securityScore: number;
  proposals: CloudProposal[];
  proposalsLoading: boolean;
  proposalsError: string | null;
  /** Propuesta sobre la que trabajan Costos y el resto de módulos */
  activeProposal: CloudProposal | null;
  /** Costos de la propuesta activa (importes base, sin factor regional) */
  costItems: CostItem[];
  setActiveProposalId: (id: string) => void;
  refreshProposals: () => Promise<void>;
  addProposal: (proposal: NewProposal) => Promise<boolean>;
  removeProposal: (id: string) => Promise<boolean>;
  setRegionId: (id: string) => void;
  toggleDarkMode: () => void;
  addCostItem: (item: Omit<CostItem, 'id'>) => void;
  removeCostItem: (id: string) => void;
  resetCostItems: () => void;
  pushNotification: (notification: Omit<AppNotification, 'id' | 'time' | 'read'>) => void;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
  resetAll: () => void;
}

/** Costos iniciales de una propuesta: 1 unidad de cada servicio elegido, 730 h al mes */
const buildProposalCostItems = (serviceIds: string[]): CostItem[] =>
  serviceIds.flatMap((serviceId) => {
    const service = awsServices.find((item) => item.id === serviceId);
    if (!service) return [];
    const monthlyCost = service.hourlyPrice * 730;
    return [
      {
        id: uid('cost'),
        serviceId: service.id,
        serviceName: service.name,
        quantity: 1,
        hours: 730,
        hourlyPrice: service.hourlyPrice,
        monthlyCost,
        annualCost: monthlyCost * 12,
      },
    ];
  });

const sumMonthly = (items: CostItem[], factor: number) =>
  items.reduce((total, item) => total + item.monthlyCost, 0) * factor;

const defaultState: PersistedState = {
  activeProposalId: null,
  regionId: defaultRegionId,
  darkMode: false,
  notifications: [
    {
      id: uid('ntf'),
      title: 'Cifrado en transito',
      message: 'Un origen de CloudFront acepta HTTP sin redireccion a HTTPS.',
      status: 'danger',
      time: '09:12',
      read: false,
    },
    {
      id: uid('ntf'),
      title: 'MFA pendiente',
      message: 'El usuario dev-integraciones aun no habilita autenticacion multifactor.',
      status: 'warning',
      time: '08:40',
      read: false,
    },
    {
      id: uid('ntf'),
      title: 'Respaldo completado',
      message: 'El snapshot automatico de RDS finalizo correctamente.',
      status: 'ok',
      time: '07:05',
      read: true,
    },
  ],
};

const loadState = (): PersistedState => {
  if (typeof window === 'undefined') return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      activeProposalId: parsed.activeProposalId ?? defaultState.activeProposalId,
      regionId: parsed.regionId ?? defaultState.regionId,
      darkMode: parsed.darkMode ?? defaultState.darkMode,
      notifications: parsed.notifications ?? defaultState.notifications,
    };
  } catch {
    return defaultState;
  }
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Error desconocido.';
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(loadState);
  const [proposals, setProposals] = useState<CloudProposal[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(true);
  const [proposalsError, setProposalsError] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* el almacenamiento puede estar bloqueado: la app sigue funcionando en memoria */
    }
  }, [state]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.darkMode);
  }, [state.darkMode]);

  const refreshProposals = useCallback(async () => {
    setProposalsLoading(true);
    try {
      setProposals(await fetchProposals());
      setProposalsError(null);
    } catch (error) {
      setProposalsError(getErrorMessage(error));
    } finally {
      setProposalsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProposals();
  }, [refreshProposals]);

  const region = useMemo(() => getRegionById(state.regionId), [state.regionId]);

  // Propuesta activa: la elegida, o la más reciente si aún no se eligió ninguna
  const activeProposal = useMemo(
    () => proposals.find((item) => item.id === state.activeProposalId) ?? proposals[0] ?? null,
    [proposals, state.activeProposalId],
  );

  const costItems = useMemo(() => activeProposal?.costItems ?? [], [activeProposal]);

  const monthlyCost = useMemo(() => sumMonthly(costItems, region.costFactor), [costItems, region.costFactor]);

  const activeServices = useMemo(() => {
    const fromCosts = costItems.map((item) => item.serviceId);
    const fromProposals = proposals.flatMap((proposal) => proposal.services);
    return Array.from(new Set([...fromCosts, ...fromProposals]));
  }, [costItems, proposals]);

  const securityScore = useMemo(() => {
    const weights = { ok: 1, warning: 0.5, danger: 0, info: 1 } as const;
    const total = securityControls.reduce((sum, control) => sum + weights[control.status], 0);
    return Math.round((total / securityControls.length) * 100);
  }, []);

  const setRegionId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, regionId: id }));
  }, []);

  // Al elegir una propuesta, la región global pasa a ser la de esa propuesta
  const setActiveProposalId = useCallback(
    (id: string) => {
      const target = proposals.find((item) => item.id === id);
      setState((prev) => ({ ...prev, activeProposalId: id, regionId: target?.regionId ?? prev.regionId }));
    },
    [proposals],
  );

  const toggleDarkMode = useCallback(() => {
    setState((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  }, []);

  const pushNotification = useCallback(
    (notification: Omit<AppNotification, 'id' | 'time' | 'read'>) => {
      setState((prev) => ({
        ...prev,
        notifications: [
          { ...notification, id: uid('ntf'), time: clockTime(), read: false },
          ...prev.notifications,
        ].slice(0, 12),
      }));
    },
    [],
  );

    const addProposal = useCallback(
    async (proposal: NewProposal) => {
      try {
        const initialCosts = buildProposalCostItems(proposal.services);
        const newId = await insertProposal(
          proposal,
          initialCosts,
          getRegionById(proposal.regionId).costFactor,
        );
        await refreshProposals();
        // La propuesta nueva pasa a ser la activa
        setState((prev) => ({ ...prev, activeProposalId: newId, regionId: proposal.regionId }));
        pushNotification({
          title: 'Propuesta registrada',
          message: `${proposal.name} quedó registrada en la región ${proposal.regionId} con costos iniciales.`,
          status: 'ok',
        });
        return true;
      } catch (error) {
        await refreshProposals();
        pushNotification({
          title: 'No se pudo guardar la propuesta',
          message: getErrorMessage(error),
          status: 'danger',
        });
        return false;
      }
    },
    [pushNotification, refreshProposals],
  );

  const removeProposal = useCallback(
    async (id: string) => {
      try {
        await deleteProposal(id);
        await refreshProposals();
        pushNotification({
          title: 'Propuesta eliminada',
          message: 'La propuesta y sus costos se eliminaron correctamente.',
          status: 'info',
        });
        return true;
      } catch (error) {
        pushNotification({
          title: 'No se pudo eliminar la propuesta',
          message: getErrorMessage(error),
          status: 'danger',
        });
        return false;
      }
    },
    [pushNotification, refreshProposals],
  );

  // Actualiza la pantalla al instante y guarda en Supabase; si falla, vuelve a cargar lo real
    // Cola de guardados: si editas varias veces seguidas, se guardan de a uno y en orden
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const pendingSaves = useRef(0);

  // Actualiza la pantalla al instante y guarda en Supabase; al terminar recarga los datos reales
  const persistCosts = useCallback(
    (proposal: CloudProposal, items: CostItem[]) => {
      setProposals((prev) =>
        prev.map((item) => (item.id === proposal.id ? { ...item, costItems: items } : item)),
      );

      pendingSaves.current += 1;
      saveQueue.current = saveQueue.current.then(async () => {
        try {
          await saveProposalCosts(proposal, items, getRegionById(proposal.regionId).costFactor);
        } catch (error) {
          pushNotification({
            title: 'No se pudieron guardar los costos',
            message: getErrorMessage(error),
            status: 'danger',
          });
        } finally {
          pendingSaves.current -= 1;
          if (pendingSaves.current === 0) await refreshProposals();
        }
      });
      return saveQueue.current;
    },
    [pushNotification, refreshProposals],
  );

  const addCostItem = useCallback(
    (item: Omit<CostItem, 'id'>) => {
      if (!activeProposal) {
        pushNotification({
          title: 'Sin propuesta activa',
          message: 'Registra o selecciona una propuesta en Planificación antes de estimar costos.',
          status: 'warning',
        });
        return;
      }
      const existing = activeProposal.costItems.find((entry) => entry.serviceId === item.serviceId);
      const updated: CostItem = { ...item, id: existing?.id ?? uid('cost') };
      const items = existing
        ? activeProposal.costItems.map((entry) => (entry.id === existing.id ? updated : entry))
        : [updated, ...activeProposal.costItems];
      void persistCosts(activeProposal, items);
    },
    [activeProposal, persistCosts, pushNotification],
  );

  const removeCostItem = useCallback(
    (id: string) => {
      if (!activeProposal) return;
      void persistCosts(activeProposal, activeProposal.costItems.filter((entry) => entry.id !== id));
    },
    [activeProposal, persistCosts],
  );

  // "Restaurar": vuelve a los costos iniciales según los servicios de la propuesta
  const resetCostItems = useCallback(() => {
    if (!activeProposal) return;
    void persistCosts(activeProposal, buildProposalCostItems(activeProposal.services));
  }, [activeProposal, persistCosts]);

  const markNotificationsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((item) => ({ ...item, read: true })),
    }));
  }, []);

  const clearNotifications = useCallback(() => {
    setState((prev) => ({ ...prev, notifications: [] }));
  }, []);

  // Restablece solo lo local (región, modo oscuro, notificaciones); no borra datos de Supabase
  const resetAll = useCallback(() => {
    setState(defaultState);
  }, []);

  const value: AppContextValue = {
    ...state,
    region,
    monthlyCost,
    annualCost: monthlyCost * 12,
    activeServices,
    securityScore,
    proposals,
    proposalsLoading,
    proposalsError,
    activeProposal,
    costItems,
    setActiveProposalId,
    refreshProposals,
    addProposal,
    removeProposal,
    setRegionId,
    toggleDarkMode,
    addCostItem,
    removeCostItem,
    resetCostItems,
    pushNotification,
    markNotificationsRead,
    clearNotifications,
    resetAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe usarse dentro de AppProvider');
  }
  return context;
}