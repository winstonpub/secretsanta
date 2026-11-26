// Правила для входа и регистрации по почте.

export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 72;
export const DISPLAY_NAME_MAX = 40;

export type AuthUser = { id: string; email: string; displayName: string };

/** Почта не зависит от регистра. */
export function normalizeEmail(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

/** Возвращает текст ошибки или null, если адрес похож на почту. */
export function emailError(email: string): string | null {
  if (!email) return "Укажите электронную почту";
  if (email.length > EMAIL_MAX) return "Слишком длинный адрес почты";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return "Похоже, в адресе почты опечатка. Пример: ivan@example.com";
  }
  return null;
}

/** Старые логины (без @) по-прежнему подходят для входа. */
export function normalizeLogin(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

export function passwordError(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Пароль должен быть не короче ${PASSWORD_MIN} символов`;
  if (password.length > PASSWORD_MAX) return `Пароль должен быть не длиннее ${PASSWORD_MAX} символов`;
  return null;
}
