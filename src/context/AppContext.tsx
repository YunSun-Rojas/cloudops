import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AppNotification, CloudProposal, CostItem, Region } from '../types/cloud';
import { defaultRegionId, getRegionById } from '../data/regions';
import { awsServices } from '../data/awsServices';
import { securityControls } from '../data/security';
import { clockTime, uid } from '../utils/format';

const STORAGE_KEY = 'cloudops-dashboard-state-v1';

interface PersistedState {
  proposals: CloudProposal[];
  costItems: CostItem[];
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
  setRegionId: (id: string) => void;
  toggleDarkMode: () => void;
  addProposal: (proposal: Omit<CloudProposal, 'id' | 'createdAt'>) => void;
  removeProposal: (id: string) => void;
  addCostItem: (item: Omit<CostItem, 'id'>) => void;
  removeCostItem: (id: string) => void;
  resetCostItems: () => void;
  pushNotification: (notification: Omit<AppNotification, 'id' | 'time' | 'read'>) => void;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
  resetAll: () => void;
}

const buildDefaultCostItems = (): CostItem[] => {
  const preset: Array<{ id: string; quantity: number; hours: number }> = [
    { id: 'ec2', quantity: 2, hours: 730 },
    { id: 's3', quantity: 1, hours: 730 },
    { id: 'rds', quantity: 1, hours: 730 },
    { id: 'cloudfront', quantity: 1, hours: 730 },
    { id: 'vpc', quantity: 1, hours: 730 },
  ];

  return preset.flatMap((row) => {
    const service = awsServices.find((item) => item.id === row.id);
    if (!service) return [];
    const monthlyCost = service.hourlyPrice * row.quantity * row.hours;
    return [
      {
        id: uid('cost'),
        serviceId: service.id,
        serviceName: service.name,
        quantity: row.quantity,
        hours: row.hours,
        hourlyPrice: service.hourlyPrice,
        monthlyCost,
        annualCost: monthlyCost * 12,
      },
    ];
  });
};

const defaultState: PersistedState = {
  proposals: [
    {
      id: uid('prop'),
      name: 'Plataforma ERP Corporativa',
      appType: 'Aplicacion web',
      description:
        'Migracion del ERP interno a una arquitectura de tres capas sobre AWS con alta disponibilidad Multi-AZ.',
      regionId: defaultRegionId,
      estimatedUsers: 3500,
      availability: '99.9%',
      services: ['ec2', 's3', 'rds', 'iam', 'vpc', 'route53', 'cloudfront'],
      goal: 'Alta disponibilidad',
      createdAt: new Date().toISOString(),
    },
  ],
  costItems: buildDefaultCostItems(),
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
      proposals: parsed.proposals ?? defaultState.proposals,
      costItems: parsed.costItems ?? defaultState.costItems,
      regionId: parsed.regionId ?? defaultState.regionId,
      darkMode: parsed.darkMode ?? defaultState.darkMode,
      notifications: parsed.notifications ?? defaultState.notifications,
    };
  } catch {
    return defaultState;
  }
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(loadState);

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

  const region = useMemo(() => getRegionById(state.regionId), [state.regionId]);

  const monthlyCost = useMemo(
    () => state.costItems.reduce((total, item) => total + item.monthlyCost, 0) * region.costFactor,
    [state.costItems, region.costFactor],
  );

  const activeServices = useMemo(() => {
    const fromCosts = state.costItems.map((item) => item.serviceId);
    const fromProposals = state.proposals.flatMap((proposal) => proposal.services);
    return Array.from(new Set([...fromCosts, ...fromProposals]));
  }, [state.costItems, state.proposals]);

  const securityScore = useMemo(() => {
    const weights = { ok: 1, warning: 0.5, danger: 0, info: 1 } as const;
    const total = securityControls.reduce((sum, control) => sum + weights[control.status], 0);
    return Math.round((total / securityControls.length) * 100);
  }, []);

  const setRegionId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, regionId: id }));
  }, []);

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

  const addProposal = useCallback((proposal: Omit<CloudProposal, 'id' | 'createdAt'>) => {
    setState((prev) => ({
      ...prev,
      proposals: [
        { ...proposal, id: uid('prop'), createdAt: new Date().toISOString() },
        ...prev.proposals,
      ],
      notifications: [
        {
          id: uid('ntf'),
          title: 'Propuesta registrada',
          message: `${proposal.name} quedo registrada en la region ${proposal.regionId}.`,
          status: 'ok' as const,
          time: clockTime(),
          read: false,
        },
        ...prev.notifications,
      ].slice(0, 12),
    }));
  }, []);

  const removeProposal = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      proposals: prev.proposals.filter((proposal) => proposal.id !== id),
    }));
  }, []);

  const addCostItem = useCallback((item: Omit<CostItem, 'id'>) => {
    setState((prev) => ({ ...prev, costItems: [{ ...item, id: uid('cost') }, ...prev.costItems] }));
  }, []);

  const removeCostItem = useCallback((id: string) => {
    setState((prev) => ({ ...prev, costItems: prev.costItems.filter((item) => item.id !== id) }));
  }, []);

  const resetCostItems = useCallback(() => {
    setState((prev) => ({ ...prev, costItems: buildDefaultCostItems() }));
  }, []);

  const markNotificationsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((item) => ({ ...item, read: true })),
    }));
  }, []);

  const clearNotifications = useCallback(() => {
    setState((prev) => ({ ...prev, notifications: [] }));
  }, []);

  const resetAll = useCallback(() => {
    setState({ ...defaultState, costItems: buildDefaultCostItems() });
  }, []);

  const value: AppContextValue = {
    ...state,
    region,
    monthlyCost,
    annualCost: monthlyCost * 12,
    activeServices,
    securityScore,
    setRegionId,
    toggleDarkMode,
    addProposal,
    removeProposal,
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
