/** 从 Solar Network Web 验证码页 redirect 或 postMessage 中解析 token */
export function extractCaptchaTokenFromNavigationUrl(url: string): string | null {
  const qIndex: number = url.indexOf('?');
  const query: string = qIndex >= 0 ? url.slice(qIndex) : url;
  const match: RegExpMatchArray | null = query.match(/[?&]captcha_tk=([^&]+)/);
  if (!match) {
    return null;
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function extractCaptchaTokenFromPostMessage(data: string): string | null {
  const prefix: string = 'captcha_tk=';
  if (!data.startsWith(prefix)) {
    return null;
  }
  const raw: string = data.slice(prefix.length).trim();
  return raw.length > 0 ? raw : null;
}
