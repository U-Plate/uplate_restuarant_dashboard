import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { Action } from './reducer';
import { reducer } from './reducer';
import type { Ad, AppState, Campaign } from '../types';
import {
  api,
  type AdInput,
  type CampaignInput,
  type CampaignPatch,
  type RestaurantPatch,
  type UpdateAdRequest,
} from '../api';
import { AuthLoading } from '../pages/auth/AuthFrame';

// The dashboard's working set (campaigns, ads, restaurant profile) is owned by
// the backend. We bootstrap it once on mount and then keep an in-memory mirror
// in the reducer so the existing selectors/components keep working unchanged.
//
// Writes go through `commands`, which are the only sanctioned mutation path:
//   • create / duplicate  — await the server (it assigns the id), then dispatch
//     the authoritative entity so navigation uses the real id.
//   • update / delete / toggle — dispatch optimistically for a snappy UI, fire
//     the request, reconcile with the server's response, and on failure reload
//     the authoritative state from the server (rolling the change back).

/** Empty shell used before `bootstrap()` resolves. Components never see this —
 *  the provider renders a loading screen until the real state arrives. */
const EMPTY_STATE: AppState = {
  campaigns: {},
  ads: {},
  events: [],
  campaignOrder: [],
  restaurant: {},
};

export interface AppCommands {
  createCampaign(input: CampaignInput): Promise<Campaign>;
  updateCampaign(id: string, patch: CampaignPatch): Promise<void>;
  deleteCampaign(id: string): Promise<void>;
  duplicateCampaign(id: string): Promise<Campaign>;
  toggleCampaignStatus(id: string): Promise<void>;
  createAd(input: AdInput): Promise<Ad>;
  updateAd(id: string, input: UpdateAdRequest): Promise<void>;
  deleteAd(id: string): Promise<void>;
  duplicateAd(sourceId: string, targetCampaignId: string): Promise<Ad>;
  toggleAdStatus(id: string): Promise<void>;
  updateRestaurant(patch: RestaurantPatch): Promise<void>;
}

interface ContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  commands: AppCommands;
  /** Re-fetch the entire working set from the server. */
  reload: () => Promise<void>;
  /** Legacy affordance — re-syncs from the server (no client-side seed). */
  reset: () => void;
}

const AppContext = createContext<ContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY_STATE);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  // Commands read the latest state without being re-created every render.
  const stateRef = useRef(state);
  stateRef.current = state;

  const load = useCallback(async () => {
    const data = await api.bootstrap();
    dispatch({
      type: 'HYDRATE',
      payload: {
        campaigns: Object.fromEntries(data.campaigns.map((c) => [c.id, c])),
        ads: Object.fromEntries(data.ads.map((a) => [a.id, a])),
        events: [],
        campaignOrder: data.campaignOrder,
        restaurant: data.restaurant,
      },
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
        if (!cancelled) setPhase('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load your dashboard.');
        setPhase('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const reload = useCallback(async () => {
    await load();
  }, [load]);

  // Wrap an optimistic write: the local change is already dispatched; if the
  // request fails we re-sync from the server (rolling the change back) and
  // surface the error to the caller.
  const settle = useCallback(
    async <T,>(work: () => Promise<T>): Promise<T> => {
      try {
        return await work();
      } catch (err) {
        await load().catch(() => {});
        throw err;
      }
    },
    [load],
  );

  const commands = useMemo<AppCommands>(
    () => ({
      createCampaign: async (input) => {
        const { campaign } = await api.campaigns.create(input);
        dispatch({ type: 'CAMPAIGN_CREATE', payload: campaign });
        return campaign;
      },

      updateCampaign: (id, patch) =>
        settle(async () => {
          dispatch({ type: 'CAMPAIGN_UPDATE', payload: { id, patch } });
          const { campaign } = await api.campaigns.patch(id, patch);
          dispatch({ type: 'CAMPAIGN_UPDATE', payload: { id, patch: campaign } });
        }),

      deleteCampaign: (id) =>
        settle(async () => {
          dispatch({ type: 'CAMPAIGN_DELETE', payload: { id } });
          await api.campaigns.remove(id);
        }),

      duplicateCampaign: async (id) => {
        const { campaign, ads } = await api.campaigns.duplicate(id);
        dispatch({
          type: 'CAMPAIGN_DUPLICATE',
          payload: { id, newCampaign: campaign, newAds: ads },
        });
        return campaign;
      },

      toggleCampaignStatus: (id) =>
        settle(async () => {
          dispatch({ type: 'CAMPAIGN_TOGGLE_STATUS', payload: { id } });
          const { campaign } = await api.campaigns.setStatus(id, { toggle: true });
          dispatch({ type: 'CAMPAIGN_UPDATE', payload: { id, patch: campaign } });
        }),

      createAd: async (input) => {
        const { ad } = await api.ads.create(input);
        dispatch({ type: 'AD_CREATE', payload: ad });
        return ad;
      },

      updateAd: (id, input) =>
        settle(async () => {
          dispatch({
            type: 'AD_UPDATE',
            payload: { id, patch: { ...input, iconUrl: input.iconUrl ?? undefined } },
          });
          const { ad } = await api.ads.update(id, input);
          dispatch({ type: 'AD_UPDATE', payload: { id, patch: ad } });
        }),

      deleteAd: (id) =>
        settle(async () => {
          dispatch({ type: 'AD_DELETE', payload: { id } });
          await api.ads.remove(id);
        }),

      duplicateAd: async (sourceId, targetCampaignId) => {
        const { ad } = await api.ads.duplicate(sourceId, { targetCampaignId });
        dispatch({ type: 'AD_DUPLICATE', payload: { sourceId, newAd: ad, targetCampaignId } });
        return ad;
      },

      toggleAdStatus: (id) =>
        settle(async () => {
          dispatch({ type: 'AD_TOGGLE_STATUS', payload: { id } });
          const { ad } = await api.ads.setStatus(id, { toggle: true });
          dispatch({ type: 'AD_UPDATE', payload: { id, patch: ad } });
        }),

      updateRestaurant: (patch) =>
        settle(async () => {
          dispatch({ type: 'RESTAURANT_UPDATE', payload: patch as Partial<AppState['restaurant']> });
          const restaurant = await api.restaurant.patch(patch);
          dispatch({ type: 'RESTAURANT_UPDATE', payload: restaurant });
        }),
    }),
    [settle],
  );

  const value = useMemo<ContextValue>(
    () => ({
      state,
      dispatch,
      commands,
      reload,
      reset: () => void reload(),
    }),
    [state, commands, reload],
  );

  if (phase === 'loading') return <AuthLoading />;
  if (phase === 'error') return <BootstrapError message={error} onRetry={() => location.reload()} />;

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): ContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

function BootstrapError({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-4)',
        maxWidth: '44ch',
        margin: '0 auto',
        padding: 'var(--s-7) var(--s-5)',
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--type-h2)',
          color: 'var(--ink)',
        }}
      >
        Couldn't load your dashboard.
      </h1>
      <p style={{ fontSize: 'var(--type-body)', color: 'var(--ink-2)' }}>
        {message ?? 'Something went wrong talking to the server.'}
      </p>
      <div>
        <button
          type="button"
          onClick={onRetry}
          style={{
            background: 'var(--accent)',
            color: 'var(--on-accent, #fff)',
            border: 'none',
            borderRadius: 'var(--r-md)',
            padding: 'var(--s-2) var(--s-4)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
