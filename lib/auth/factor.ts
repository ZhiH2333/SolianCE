export const AUTH_FACTOR_LABELS: Record<number, string> = {
  0: '密码验证',
  1: '邮箱验证码',
  2: '应用内通知确认',
  3: 'TOTP 动态码',
  4: 'PIN 码',
};

export function getFactorLabel(type: number): string {
  return AUTH_FACTOR_LABELS[type] ?? `未知因子(${type})`;
}
