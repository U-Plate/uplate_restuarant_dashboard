import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { Action } from './reducer';
import { reducer } from './reducer';
import type { AppState } from '../types';
import { buildSeedState } from '../data/mockData';
import { clearState, loadState, saveState } from './persistence';

interface ContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  reset: () => void;
}

const AppContext = createContext<ContextValue | null>(null);

function initState(): AppState {
  const loaded = loadState();
  if (loaded) {
    return { ...loaded, restaurant: loaded.restaurant ?? {} };
  }
  return buildSeedState();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const value = useMemo<ContextValue>(
    () => ({
      state,
      dispatch,
      reset: () => {
        clearState();
        dispatch({ type: 'RESET', payload: buildSeedState() });
      },
    }),
    [state]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): ContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
