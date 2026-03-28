export interface TokenPair {
  token: string;
  refreshToken: string | null;
  expiresAt: string | null;
  refreshExpiresAt: string | null;
}

export interface AuthChallenge {
  id: string;
  stepRemain: number;
}

export interface AuthFactor {
  /** Padlock 因子主键：服务端可能返回整型或 UUID 字符串 */
  id: number | string;
  type: number;
  name?: string;
}

export interface ChallengeCreateResponse {
  id: string;
  stepRemain?: number;
}

export interface AuthTokenResponse {
  token: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
}
