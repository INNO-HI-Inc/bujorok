import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_MODEL } from '../lib/anthropic';
import {
  claimPremiumFor,
  getBoundEventId,
  getStoredLicense,
  isPremiumFor,
  removeStoredLicense,
  storeLicense,
  type StoredLicense,
} from '../license/license';

const LS_API_KEY = 'bujorok.apiKey';
const LS_MODEL = 'bujorok.model';

interface AppContextValue {
  apiKey: string;
  setApiKey: (v: string) => void;
  model: string;
  setModel: (v: string) => void;
  license: StoredLicense | null;
  activateLicense: (key: string) => StoredLicense; // 실패 시 throw
  deactivateLicense: () => void;
  boundEventId: string | null;
  /** 이 행사에서 프리미엄 사용 가능 여부 (아직 귀속 전인 1회권 포함) */
  premiumFor: (eventId?: string) => boolean;
  /** 프리미엄 기능 실제 사용 시점 호출 — 1회권을 해당 행사에 귀속 */
  claimPremium: (eventId: string) => boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string>(() => localStorage.getItem(LS_API_KEY) ?? '');
  const [model, setModelState] = useState<string>(
    () => localStorage.getItem(LS_MODEL) ?? DEFAULT_MODEL,
  );
  const [license, setLicense] = useState<StoredLicense | null>(() => getStoredLicense());
  const [boundEventId, setBoundEventId] = useState<string | null>(() => getBoundEventId());

  const setApiKey = useCallback((v: string) => {
    const trimmed = v.trim();
    if (trimmed) localStorage.setItem(LS_API_KEY, trimmed);
    else localStorage.removeItem(LS_API_KEY);
    setApiKeyState(trimmed);
  }, []);

  const setModel = useCallback((v: string) => {
    localStorage.setItem(LS_MODEL, v);
    setModelState(v);
  }, []);

  const activateLicense = useCallback((key: string) => {
    const stored = storeLicense(key);
    setLicense(stored);
    setBoundEventId(getBoundEventId());
    return stored;
  }, []);

  const deactivateLicense = useCallback(() => {
    removeStoredLicense();
    setLicense(null);
    setBoundEventId(null);
  }, []);

  const premiumFor = useCallback(
    (eventId?: string) => isPremiumFor(license, eventId),
    [license, boundEventId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const claimPremium = useCallback(
    (eventId: string) => {
      const ok = claimPremiumFor(license, eventId);
      setBoundEventId(getBoundEventId());
      return ok;
    },
    [license],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      apiKey,
      setApiKey,
      model,
      setModel,
      license,
      activateLicense,
      deactivateLicense,
      boundEventId,
      premiumFor,
      claimPremium,
    }),
    [
      apiKey,
      setApiKey,
      model,
      setModel,
      license,
      activateLicense,
      deactivateLicense,
      boundEventId,
      premiumFor,
      claimPremium,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp은 AppProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
