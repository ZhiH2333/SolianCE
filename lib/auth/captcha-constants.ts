/**
 * 验证码完成后的回跳必须使用 **https**（与 GET /config/site 返回的站点根一致）。
 * Expo Go / 模拟器无法把 soliance:// 交回当前 JS 运行时，会出现 “Can't open url”。
 */
export function buildRegisterCaptchaRedirectUri(siteBaseUrl: string): string {
  return siteBaseUrl.replace(/\/$/, '') + '/';
}
