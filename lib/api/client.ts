import type { AuthFactor, AuthTokenResponse, ChallengeCreateResponse, TokenPair } from '@/lib/api/types';

const API_BASE_URL: string = 'https://api.solian.app';
const REFRESH_SKEW_MS: number = 30_000;
const DEFAULT_HEADERS: HeadersInit = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'X-Client-Ability': 'chat-e2ee-v1',
};

export interface CreateChallengePayload {
  account: string;
  deviceId: string;
  deviceName: string;
  platform: number;
}

export interface PatchChallengePayload {
  factorId: number;
  password: string;
}

export interface RegisterPayload {
  captchaToken: string;
  name: string;
  nick: string;
  email: string;
  password: string;
  language: string;
}

export interface RegisterValidationPayload {
  name?: string;
  email?: string;
}

export interface CreateChallengeResult {
  id: string;
  stepRemain: number;
}

export interface PatchChallengeResult {
  id: string;
  stepRemain: number;
}

function mapPlatformToNumber(): number {
  return 3;
}

function buildUrl(pathname: string): string {
  return `${API_BASE_URL}${pathname}`;
}

function readJwtExpireAt(token: string): string | null {
  const parts: string[] = token.split('.');
  if (parts.length < 2) {
    return null;
  }
  try {
    const payloadBase64: string = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    if (typeof atob === 'undefined') {
      return null;
    }
    const payloadJson: string = decodeURIComponent(
      Array.from(atob(payloadBase64))
        .map((char: string) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(''),
    );
    const payload: unknown = JSON.parse(payloadJson);
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const exp: unknown = (payload as Record<string, unknown>).exp;
    if (typeof exp !== 'number') {
      return null;
    }
    return new Date(exp * 1000).toISOString();
  } catch {
    return null;
  }
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return false;
  }
  const expireTimeMs: number = new Date(expiresAt).getTime();
  return Number.isFinite(expireTimeMs) && expireTimeMs - REFRESH_SKEW_MS <= Date.now();
}

function toTokenPair(payload: AuthTokenResponse): TokenPair {
  const now: number = Date.now();
  const expiresAt: string | null =
    typeof payload.expires_in === 'number'
      ? new Date(now + payload.expires_in * 1000).toISOString()
      : readJwtExpireAt(payload.token);
  const refreshExpiresAt: string | null =
    typeof payload.refresh_expires_in === 'number'
      ? new Date(now + payload.refresh_expires_in * 1000).toISOString()
      : payload.refresh_token
        ? readJwtExpireAt(payload.refresh_token)
        : null;
  return {
    token: payload.token,
    refreshToken: payload.refresh_token ?? null,
    expiresAt,
    refreshExpiresAt,
  };
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text: string = await response.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

async function executeRequest<T>(pathname: string, init: RequestInit): Promise<T> {
  const response: Response = await fetch(buildUrl(pathname), {
    ...init,
    headers: {
      ...DEFAULT_HEADERS,
      ...(init.headers ?? {}),
    },
  });
  const data: unknown = await readJsonResponse<unknown>(response);
  if (!response.ok) {
    const message: string =
      typeof data === 'object' && data && 'message' in data
        ? String((data as Record<string, unknown>).message)
        : `请求失败: ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

export async function getCaptchaBaseUrl(): Promise<string> {
  const result: string = await executeRequest<string>('/config/site', { method: 'GET' });
  return result;
}

export async function createAuthChallenge(payload: CreateChallengePayload): Promise<CreateChallengeResult> {
  const response: ChallengeCreateResponse = await executeRequest<ChallengeCreateResponse>('/padlock/auth/challenge', {
    method: 'POST',
    body: JSON.stringify({
      account: payload.account,
      device_id: payload.deviceId,
      device_name: payload.deviceName,
      platform: payload.platform,
    }),
  });
  return {
    id: response.id,
    stepRemain: response.stepRemain ?? 1,
  };
}

export async function getChallengeFactors(challengeId: string): Promise<AuthFactor[]> {
  const result: AuthFactor[] = await executeRequest<AuthFactor[]>(
    `/padlock/auth/challenge/${challengeId}/factors`,
    { method: 'GET' },
  );
  return result;
}

export async function triggerChallengeFactor(challengeId: string, factorId: number): Promise<void> {
  await executeRequest(`/padlock/auth/challenge/${challengeId}/factors/${factorId}`, {
    method: 'POST',
  });
}

export async function patchAuthChallenge(challengeId: string, payload: PatchChallengePayload): Promise<PatchChallengeResult> {
  const result: Record<string, unknown> = await executeRequest<Record<string, unknown>>(
    `/padlock/auth/challenge/${challengeId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        factor_id: payload.factorId,
        password: payload.password,
      }),
    },
  );
  return {
    id: String(result.id ?? challengeId),
    stepRemain: Number(result.stepRemain ?? 0),
  };
}

export async function exchangeAuthorizationCode(code: string): Promise<TokenPair> {
  const response: AuthTokenResponse = await executeRequest<AuthTokenResponse>('/padlock/auth/token', {
    method: 'POST',
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
    }),
  });
  return toTokenPair(response);
}

export async function refreshAccessToken(currentPair: TokenPair): Promise<TokenPair> {
  if (!currentPair.refreshToken) {
    throw new Error('缺少 refresh token，无法刷新登录状态');
  }
  if (isExpired(currentPair.refreshExpiresAt)) {
    throw new Error('refresh token 已过期，请重新登录');
  }
  const response: AuthTokenResponse = await executeRequest<AuthTokenResponse>('/padlock/auth/token', {
    method: 'POST',
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: currentPair.refreshToken,
    }),
  });
  return toTokenPair(response);
}

export async function validateRegister(payload: RegisterValidationPayload): Promise<void> {
  await executeRequest('/padlock/accounts/validate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function registerAccount(payload: RegisterPayload): Promise<void> {
  await executeRequest('/padlock/accounts', {
    method: 'POST',
    body: JSON.stringify({
      captcha_token: payload.captchaToken,
      name: payload.name,
      nick: payload.nick,
      email: payload.email,
      password: payload.password,
      language: payload.language,
    }),
  });
}

export interface ApiRequestInit {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  tokenPair: TokenPair;
  body?: unknown;
}

export interface ApiRequestResult<T> {
  data: T;
  tokenPair: TokenPair;
}

export async function performAuthorizedRequest<T>(options: ApiRequestInit): Promise<ApiRequestResult<T>> {
  let activeTokenPair: TokenPair = options.tokenPair;
  if (isExpired(activeTokenPair.expiresAt)) {
    activeTokenPair = await refreshAccessToken(activeTokenPair);
  }
  const data: T = await executeRequest<T>(options.path, {
    method: options.method,
    headers: {
      Authorization: `Bearer ${activeTokenPair.token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return {
    data,
    tokenPair: activeTokenPair,
  };
}

export function createDefaultChallengePayload(account: string): CreateChallengePayload {
  return {
    account,
    deviceId: 'soliance-mobile',
    deviceName: 'SolianCE',
    platform: mapPlatformToNumber(),
  };
}
