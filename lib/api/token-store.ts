import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { TokenPair } from '@/lib/api/types';

const TOKEN_STORE_KEY: string = 'dyn_user_tk';

function readWebStorageToken(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  return localStorage.getItem(TOKEN_STORE_KEY);
}

function writeWebStorageToken(value: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(TOKEN_STORE_KEY, value);
}

function removeWebStorageToken(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.removeItem(TOKEN_STORE_KEY);
}

export async function getStoredTokenPair(): Promise<TokenPair | null> {
  const rawValue: string | null =
    Platform.OS === 'web'
      ? readWebStorageToken()
      : await SecureStore.getItemAsync(TOKEN_STORE_KEY);
  if (!rawValue) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const mapped: Record<string, unknown> = parsed as Record<string, unknown>;
    const token: string | undefined = (mapped.token ?? mapped.access_token) as string | undefined;
    if (!token) {
      return null;
    }
    return {
      token,
      refreshToken: (mapped.refreshToken ?? mapped.refresh_token ?? null) as string | null,
      expiresAt: (mapped.expiresAt ?? mapped.expires_at ?? null) as string | null,
      refreshExpiresAt: (mapped.refreshExpiresAt ?? mapped.refresh_expires_at ?? null) as string | null,
    };
  } catch {
    return null;
  }
}

export async function setStoredTokenPair(tokenPair: TokenPair): Promise<void> {
  const payload: string = JSON.stringify(tokenPair);
  if (Platform.OS === 'web') {
    writeWebStorageToken(payload);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_STORE_KEY, payload);
}

export async function clearStoredTokenPair(): Promise<void> {
  if (Platform.OS === 'web') {
    removeWebStorageToken();
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_STORE_KEY);
}
