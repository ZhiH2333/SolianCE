import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { TokenPair } from '@/lib/api/types';
import { clearStoredTokenPair, getStoredTokenPair, setStoredTokenPair } from '@/lib/api/token-store';
import { refreshAccessToken } from '@/lib/api/client';

interface AuthContextValue {
  tokenPair: TokenPair | null;
  isHydrating: boolean;
  isAuthenticated: boolean;
  executeSignIn: (pair: TokenPair) => Promise<void>;
  executeSignOut: () => Promise<void>;
  executeEnsureFreshToken: () => Promise<TokenPair | null>;
}

const AuthContext: React.Context<AuthContextValue | null> = createContext<AuthContextValue | null>(null);

function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return false;
  }
  const expireMs: number = new Date(expiresAt).getTime();
  return Number.isFinite(expireMs) && expireMs <= Date.now();
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
    hydrateAuthState();
  }, []);

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
      const refreshedPair: TokenPair = await refreshAccessToken(tokenPair);
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
