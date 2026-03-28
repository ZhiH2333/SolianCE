import * as Localization from 'expo-localization';

/** 注册请求 `language` 字段，优先设备区域，缺省为 en */
export function resolveRegisterLanguageTag(): string {
  const locales: readonly { languageTag?: string }[] = Localization.getLocales();
  const tag: string | undefined = locales[0]?.languageTag;
  if (typeof tag === 'string' && tag.trim().length > 0) {
    return tag.trim();
  }
  return 'en';
}
