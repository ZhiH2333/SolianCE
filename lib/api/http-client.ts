import { Platform } from 'react-native';
import type { AuthFactor, AuthTokenResponse, TokenPair } from '@/lib/api/types';

export const API_BASE_URL: string = 'https://api.solian.app';
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
  factorId: number | string;
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
  if (Platform.OS === 'web') {
    return 1;
  }
  if (Platform.OS === 'ios') {
    return 2;
  }
  if (Platform.OS === 'android') {
    return 3;
  }
  return 0;
}

function readChallengeStepRemain(body: Record<string, unknown>): number {
  const direct: unknown = body.stepRemain ?? body.step_remain;
  if (typeof direct === 'number' && Number.isFinite(direct)) {
    return direct;
  }
  return 1;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

/** 兼容服务端将列表包在 data / factors / items 等字段中的返回结构 */
function unwrapJsonArrayPayload(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (!raw || typeof raw !== 'object') {
    return [];
  }
  const root: Record<string, unknown> = raw as Record<string, unknown>;
  const topKeys: string[] = ['data', 'factors', 'items', 'results', 'list', 'records', 'rows'];
  for (const key of topKeys) {
    const v: unknown = root[key];
    if (Array.isArray(v)) {
      return v;
    }
  }
  const nestedData: unknown = root.data;
  const inner: Record<string, unknown> | null = readRecord(nestedData);
  if (inner) {
    for (const key of topKeys) {
      const v: unknown = inner[key];
      if (Array.isArray(v)) {
        return v;
      }
    }
  }
  return [];
}

/** 标准 UUID（含带连字符的 36 字符形式），用于 Padlock 因子字符串主键 */
const FACTOR_ID_UUID_RE: RegExp =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function coerceFactorId(raw: unknown): number | string | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === 'bigint') {
    const n: number = Number(raw);
    if (!Number.isFinite(n)) {
      return null;
    }
    const t: number = Math.trunc(n);
    return t >= 0 ? t : null;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const n: number = Math.trunc(raw);
    return n >= 0 ? n : null;
  }
  if (typeof raw === 'string') {
    const s: string = raw.trim();
    if (s.length === 0) {
      return null;
    }
    if (FACTOR_ID_UUID_RE.test(s)) {
      return s;
    }
    if (/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(s)) {
      return s;
    }
    if (/^\d+$/.test(s)) {
      const n: number = parseInt(s, 10);
      return n >= 0 ? n : null;
    }
    const asNumber: number = Number(s);
    if (Number.isFinite(asNumber)) {
      const t: number = Math.trunc(asNumber);
      if (t >= 0 && Math.abs(asNumber - t) < 1e-9) {
        return t;
      }
    }
    if (/^[a-zA-Z0-9_-]{10,128}$/.test(s)) {
      return s;
    }
    return null;
  }
  return null;
}

/** 依次尝试各字段，避免嵌套对象上无效 id 阻断顶层合法 id（日志中曾出现规范化整行失败）。 */
function resolveAuthFactorId(source: Record<string, unknown>, row: Record<string, unknown>): number | string | null {
  const candidates: unknown[] = [
    source.id,
    source.factor_id,
    source.factorId,
    row.id,
    row.factor_id,
    row.factorId,
  ];
  for (const c of candidates) {
    const id: number | string | null = coerceFactorId(c);
    if (id !== null) {
      return id;
    }
  }
  return null;
}

function normalizeAuthFactorRow(raw: unknown): AuthFactor | null {
  const row: Record<string, unknown> | null = readRecord(raw);
  if (!row) {
    return null;
  }
  const nested: Record<string, unknown> | null = readRecord(
    row.factor ?? row.auth_factor ?? row.authFactor ?? row.attributes,
  );
  const source: Record<string, unknown> = nested ?? row;
  const id: number | string | null = resolveAuthFactorId(source, row);
  if (id === null) {
    return null;
  }
  const typeRaw: unknown =
    source.type ??
    source.factor_type ??
    source.factorType ??
    row.type ??
    row.factor_type ??
    row.factorType;
  let type: number = 0;
  if (typeof typeRaw === 'number' && Number.isFinite(typeRaw)) {
    type = Math.trunc(typeRaw);
  } else if (typeof typeRaw === 'string' && typeRaw.length > 0) {
    const t: number = parseInt(typeRaw, 10);
    type = Number.isFinite(t) ? t : 0;
  }
  const name: string | undefined = typeof source.name === 'string' ? source.name : undefined;
  return { id, type, name };
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
  const response: unknown = await executeRequest<unknown>('/padlock/auth/challenge', {
    method: 'POST',
    body: JSON.stringify({
      account: payload.account,
      device_id: payload.deviceId,
      device_name: payload.deviceName,
      platform: payload.platform,
    }),
  });
  if (!response || typeof response !== 'object') {
    throw new Error('挑战创建失败');
  }
  const body: Record<string, unknown> = response as Record<string, unknown>;
  const id: string = String(body.id ?? '');
  if (!id) {
    throw new Error('挑战创建失败');
  }
  return {
    id,
    stepRemain: readChallengeStepRemain(body),
  };
}

export async function getChallengeFactors(challengeId: string): Promise<AuthFactor[]> {
  const result: unknown = await executeRequest<unknown>(`/padlock/auth/challenge/${challengeId}/factors`, {
    method: 'GET',
  });
  const rows: unknown[] = unwrapJsonArrayPayload(result);
  const factors: AuthFactor[] = [];
  for (const row of rows) {
    const f: AuthFactor | null = normalizeAuthFactorRow(row);
    if (f) {
      factors.push(f);
    }
  }
  return factors;
}

export async function triggerChallengeFactor(challengeId: string, factorId: number | string): Promise<void> {
  const segment: string = encodeURIComponent(String(factorId));
  await executeRequest(`/padlock/auth/challenge/${challengeId}/factors/${segment}`, {
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
  const stepRaw: unknown = result.stepRemain ?? result.step_remain;
  const stepRemain: number =
    typeof stepRaw === 'number' && Number.isFinite(stepRaw) ? stepRaw : 0;
  return {
    id: String(result.id ?? challengeId),
    stepRemain,
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

export interface AuthorizedFetchResult {
  data: unknown;
  tokenPair: TokenPair;
  headers: Headers;
}

async function resolveFreshTokenPair(tokenPair: TokenPair): Promise<TokenPair> {
  if (!isExpired(tokenPair.expiresAt)) {
    return tokenPair;
  }
  return refreshAccessToken(tokenPair);
}

export async function performAuthorizedFetch(
  pathWithQuery: string,
  init: RequestInit,
  tokenPair: TokenPair,
): Promise<AuthorizedFetchResult> {
  let activeTokenPair: TokenPair = await resolveFreshTokenPair(tokenPair);
  const response: Response = await fetch(buildUrl(pathWithQuery), {
    ...init,
    headers: {
      ...DEFAULT_HEADERS,
      Authorization: `Bearer ${activeTokenPair.token}`,
      ...(init.headers ?? {}),
    },
  });
  const text: string = await response.text();
  let data: unknown = null;
  if (text.length > 0) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const message: string =
      typeof data === 'object' && data !== null && 'message' in data
        ? String((data as Record<string, unknown>).message)
        : `请求失败: ${response.status}`;
    throw new Error(message);
  }
  return {
    data,
    tokenPair: activeTokenPair,
    headers: response.headers,
  };
}

function parseHeaderInt(headers: Headers, name: string): number | null {
  const raw: string | null = headers.get(name);
  if (raw === null || raw === '') {
    return null;
  }
  const n: number = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export interface AuthorizedListResult<T> {
  items: T[];
  tokenPair: TokenPair;
  totalCount: number | null;
}

export async function performAuthorizedGetList(
  pathWithQuery: string,
  tokenPair: TokenPair,
): Promise<AuthorizedListResult<unknown>> {
  const { data, tokenPair: nextPair, headers } = await performAuthorizedFetch(
    pathWithQuery,
    { method: 'GET' },
    tokenPair,
  );
  const items: unknown[] = unwrapJsonArrayPayload(data);
  return {
    items,
    tokenPair: nextPair,
    totalCount: parseHeaderInt(headers, 'X-Total'),
  };
}

export async function performAuthorizedGetAllowNotFound(
  pathWithQuery: string,
  tokenPair: TokenPair,
): Promise<{ data: unknown | null; tokenPair: TokenPair }> {
  let activeTokenPair: TokenPair = await resolveFreshTokenPair(tokenPair);
  const response: Response = await fetch(buildUrl(pathWithQuery), {
    method: 'GET',
    headers: {
      ...DEFAULT_HEADERS,
      Authorization: `Bearer ${activeTokenPair.token}`,
    },
  });
  const text: string = await response.text();
  if (response.status === 404) {
    return { data: null, tokenPair: activeTokenPair };
  }
  let data: unknown = null;
  if (text.length > 0) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const message: string =
      typeof data === 'object' && data !== null && 'message' in data
        ? String((data as Record<string, unknown>).message)
        : `请求失败: ${response.status}`;
    throw new Error(message);
  }
  return { data, tokenPair: activeTokenPair };
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
