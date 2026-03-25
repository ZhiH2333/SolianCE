/** 跳转 Captcha 时暂存注册表单（内存），返回后恢复，避免 replace 丢状态 */
export interface RegisterDraft {
  email: string;
  affiliationSpell: string;
  password: string;
  name: string;
  nick: string;
  termsAccepted: boolean;
}

let registerDraft: RegisterDraft | null = null;

export function saveRegisterDraft(draft: RegisterDraft): void {
  registerDraft = { ...draft };
}

export function peekRegisterDraft(): RegisterDraft | null {
  return registerDraft;
}

export function clearRegisterDraft(): void {
  registerDraft = null;
}
