import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { TokenPair } from '@/lib/api/api-types';
import { refreshAccessToken } from '@/lib/api/http-client';
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

const TOKEN_REFRESH_SKEW_MS: number = 30_000;

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
        const refreshedPair: TokenPair = await refreshAccessToken(storedPair);
        await setStoredTokenPair(refreshedPair);
        setTokenPair(refreshedPair);
      } catch {
        await clearStoredTokenPair();
        setTokenPair(null);
      } finally {
        setIsHydrating(false);
      }
    }
    void hydrateAuthState();
  }, []);

  useEffect(() => {
    if (!tokenPair) {
      return;
    }

    let isMounted: boolean = true;
    let isRefreshing: boolean = false;

    const intervalId: ReturnType<typeof setInterval> = setInterval(() => {
      void (async (): Promise<void> => {
        if (!isMounted || isRefreshing) {
          return;
        }
        const stored: TokenPair | null = await getStoredTokenPair();
        if (!stored) {
          return;
        }
        if (!isTokenAboutToExpire(stored.expiresAt, TOKEN_REFRESH_SKEW_MS)) {
          return;
        }
        isRefreshing = true;
        try {
          const refreshedPair: TokenPair = await refreshAccessToken(stored);
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
      })();
    }, 10_000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [tokenPair]);

  const executeSignIn = useCallback(async (pair: TokenPair): Promise<void> => {
    await setStoredTokenPair(pair);
    setTokenPair(pair);
  }, []);

  const executeSignOut = useCallback(async (): Promise<void> => {
    await clearStoredTokenPair();
    setTokenPair(null);
  }, []);

  const executeEnsureFreshToken = useCallback(async (): Promise<TokenPair | null> => {
    if (!tokenPair) {
      return null;
    }
    if (!isTokenExpired(tokenPair.expiresAt)) {
      return tokenPair;
    }
    try {
      const refreshedPair: TokenPair = await refreshAccessToken(tokenPair);
      await setStoredTokenPair(refreshedPair);
      setTokenPair(refreshedPair);
      return refreshedPair;
    } catch {
      await clearStoredTokenPair();
      setTokenPair(null);
      return null;
    }
  }, [tokenPair]);

  const value: AuthContextValue = useMemo(
    () => ({
      tokenPair,
      isHydrating,
      isAuthenticated: tokenPair !== null,
      executeSignIn,
      executeSignOut,
      executeEnsureFreshToken,
    }),
    [tokenPair, isHydrating, executeSignIn, executeSignOut, executeEnsureFreshToken],
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
