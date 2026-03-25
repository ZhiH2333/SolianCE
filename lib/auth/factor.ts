export const AUTH_FACTOR_LABELS: Record<number, string> = {
  0: '密码验证',
  1: '邮箱验证码',
  2: '应用内通知确认',
  3: 'TOTP 动态码',
  4: 'PIN 码',
};

/** Solian-3 英文文案（登录/注册 v3 UI） */
export const AUTH_FACTOR_LABELS_EN: Record<number, string> = {
  0: 'Password',
  1: 'Email code',
  2: 'In-app notify',
  3: 'TOTP',
  4: 'PIN',
};

export function getFactorLabel(type: number): string {
  return AUTH_FACTOR_LABELS[type] ?? `未知因子(${type})`;
}

export function getFactorLabelEn(type: number): string {
  return AUTH_FACTOR_LABELS_EN[type] ?? `Factor (${type})`;
}
