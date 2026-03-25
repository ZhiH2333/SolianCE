import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { TokenPair } from '@/lib/api/types';
import { clearStoredTokenPair, getStoredTokenPair, setStoredTokenPair } from '@/lib/api/token-store';

interface AuthContextValue {
  tokenPair: TokenPair | null;
  isHydrating: boolean;
  isAuthenticated: boolean;
  executeSignIn: (pair: TokenPair) => Promise<void>;
  executeSignOut: () => Promise<void>;
  executeEnsureFreshToken: () => Promise<TokenPair | null>;
}

const AuthContext: React.Context<AuthContextValue | null> = createContext<AuthContextValue | null>(null);

const MOCK_AUTH_ENABLED: boolean = true;
const TOKEN_REFRESH_SKEW_MS: number = 30_000;
const MOCK_ACCESS_TOKEN_TTL_MS: number = 15 * 60 * 1000;
const MOCK_REFRESH_TOKEN_TTL_MS: number = 7 * 24 * 60 * 60 * 1000;

function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return false;
  }
  const expireMs: number = new Date(expiresAt).getTime();
  return Number.isFinite(expireMs) && expireMs <= Date.now();
}

function isTokenAboutToExpire(expiresAt: string | null, skewMs: number): boolean {
  if (!expiresAt) {
    return false;
  }
  const expireMs: number = new Date(expiresAt).getTime();
  return Number.isFinite(expireMs) && expireMs - skewMs <= Date.now();
}

function generateMockToken(prefix: string): string {
  const randomPart: string = Math.random().toString(36).slice(2);
  return `${prefix}.${Date.now()}.${randomPart}`;
}

function createMockTokenPair(): TokenPair {
  const nowMs: number = Date.now();
  return {
    token: generateMockToken('mock_access_token'),
    refreshToken: generateMockToken('mock_refresh_token'),
    expiresAt: new Date(nowMs + MOCK_ACCESS_TOKEN_TTL_MS).toISOString(),
    refreshExpiresAt: new Date(nowMs + MOCK_REFRESH_TOKEN_TTL_MS).toISOString(),
  };
}

export function AuthProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [tokenPair, setTokenPair] = useState<TokenPair | null>(null);
  const [isHydrating, setIsHydrating] = useState<boolean>(true);

  useEffect(() => {
    async function hydrateAuthState(): Promise<void> {
      const storedPair: TokenPair | null = await getStoredTokenPair();
      if (!storedPair) {
        setIsHydrating(false);
        return;
      }
      if (!isTokenExpired(storedPair.expiresAt)) {
        setTokenPair(storedPair);
        setIsHydrating(false);
        return;
      }
      try {
        if (MOCK_AUTH_ENABLED) {
          const refreshedPair: TokenPair = createMockTokenPair();
          await setStoredTokenPair(refreshedPair);
          setTokenPair(refreshedPair);
          return;
        }
        // 目前 Phase 1 不接入真实 API；若未来移除 mock，请在此处接入真实 refresh。
        const refreshedPair: TokenPair = createMockTokenPair();
        await setStoredTokenPair(refreshedPair);
        setTokenPair(refreshedPair);
      } catch {
        await clearStoredTokenPair();
        setTokenPair(null);
      } finally {
        setIsHydrating(false);
      }
    }
    hydrateAuthState();
  }, []);

  useEffect(() => {
    if (!tokenPair) {
      return;
    }

    let isMounted: boolean = true;
    let isRefreshing: boolean = false;

    const intervalId: ReturnType<typeof setInterval> = setInterval(async () => {
      if (!isMounted) {
        return;
      }
      if (isRefreshing) {
        return;
      }
      if (!isTokenAboutToExpire(tokenPair.expiresAt, TOKEN_REFRESH_SKEW_MS)) {
        return;
      }

      isRefreshing = true;
      try {
        const refreshedPair: TokenPair = createMockTokenPair();
        await setStoredTokenPair(refreshedPair);
        if (!isMounted) {
          return;
        }
        setTokenPair(refreshedPair);
      } catch {
        if (!isMounted) {
          return;
        }
        await clearStoredTokenPair();
        setTokenPair(null);
      } finally {
        isRefreshing = false;
      }
    }, 10_000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [tokenPair]);

  async function executeSignIn(pair: TokenPair): Promise<void> {
    await setStoredTokenPair(pair);
    setTokenPair(pair);
  }

  async function executeSignOut(): Promise<void> {
    await clearStoredTokenPair();
    setTokenPair(null);
  }

  async function executeEnsureFreshToken(): Promise<TokenPair | null> {
    if (!tokenPair) {
      return null;
    }
    if (!isTokenExpired(tokenPair.expiresAt)) {
      return tokenPair;
    }
    try {
      if (MOCK_AUTH_ENABLED) {
        const refreshedPair: TokenPair = createMockTokenPair();
        await setStoredTokenPair(refreshedPair);
        setTokenPair(refreshedPair);
        return refreshedPair;
      }
      // 目前 Phase 1 不接入真实 API；若未来移除 mock，请在此处接入真实 refresh。
      const refreshedPair: TokenPair = createMockTokenPair();
      await setStoredTokenPair(refreshedPair);
      setTokenPair(refreshedPair);
      return refreshedPair;
    } catch {
      await executeSignOut();
      return null;
    }
  }

  const value: AuthContextValue = useMemo(
    () => ({
      tokenPair,
      isHydrating,
      isAuthenticated: tokenPair !== null,
      executeSignIn,
      executeSignOut,
      executeEnsureFreshToken,
    }),
    [tokenPair, isHydrating],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context: AuthContextValue | null = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext 必须在 AuthProvider 内使用');
  }
  return context;
}
