import type { AuthUser } from "./login";
import type { RoomState } from "./constants";
import { LEGACY_EMAIL_DOMAIN, getSupabase, isSupabaseConfigured, siteBasePath } from "./supabase";

export { isSupabaseConfigured as isConfigured };

export type Failure =
  | { ok: false; reason: "need-auth" }
  | { ok: false; reason: "not-found" }
  | { ok: false; reason: "network" }
  | { ok: false; reason: "error"; error: string };

type RpcOk<T> = { ok: true; data: T };
type RpcResult<T> = RpcOk<T> | Failure;

function mapRpcError(error: { message?: string; code?: string } | null): Failure {
  const msg = String(error?.message ?? "");
  if (/fetch failed|failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
    return { ok: false, reason: "network" };
  }
  if (
    msg.includes("NEED_AUTH") ||
    error?.code === "PGRST301" ||
    msg.toLowerCase().includes("jwt")
  ) {
    return { ok: false, reason: "need-auth" };
  }
  if (msg.includes("ROOM_NOT_FOUND")) return { ok: false, reason: "not-found" };
  return { ok: false, reason: "error", error: msg || "Не удалось выполнить запрос" };
}

async function callRpc<T>(fn: string, params?: Record<string, unknown>): Promise<RpcResult<T>> {
  const sb = getSupabase();
  if (!sb) return { ok: false, reason: "need-auth" };
  try {
    const { data, error } = await sb.rpc(fn, params ?? {});
    if (error) {
      const mapped = mapRpcError(error);
      if (mapped.reason === "need-auth") {
        // Токен протух или отозван — чистим сессию, чтобы показать окно входа.
        try {
          await sb.auth.signOut();
        } catch {}
      }
      return mapped;
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export function networkErrorText(): string {
  return "Нет связи. Проверьте интернет и попробуйте ещё раз.";
}

// ---------------- Профиль ----------------

async function fetchProfile(): Promise<AuthUser | null> {
  const res = await callRpc<AuthUser>("ensure_profile");
  return res.ok ? res.data : null;
}

/** Кто сейчас вошёл (null — гость или сайт не настроен). */
export async function getSessionUser(): Promise<AuthUser | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    if (!data.session) return null;
  } catch {
    return null;
  }
  return fetchProfile();
}

export async function signUp(
  email: string,
  password: string,
  displayName: string,
): Promise<{ user: AuthUser | null; error: string }> {
  const sb = getSupabase();
  if (!sb) return { user: null, error: "Сайт не подключён к Supabase" };
  try {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) {
      if (/already/i.test(error.message)) {
        return { user: null, error: "Этот адрес уже зарегистрирован. Войдите или восстановите пароль." };
      }
      return { user: null, error: error.message };
    }
    if (!data.session) {
      return {
        user: null,
        error:
          "Не удалось войти: в Supabase включено подтверждение почты. " +
          "Отключите его по инструкции (шаг про настройку входа).",
      };
    }
    // Supabase иногда прячет «такой пользователь уже есть» за пустым профилем.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      try {
        await sb.auth.signOut();
      } catch {}
      return { user: null, error: "Этот адрес уже зарегистрирован. Войдите или восстановите пароль." };
    }
    const profile = await fetchProfile();
    if (!profile) return { user: null, error: "Не удалось создать профиль. Попробуйте войти." };
    return { user: profile, error: "" };
  } catch {
    return { user: null, error: networkErrorText() };
  }
}

export async function signIn(
  emailOrLogin: string,
  password: string,
): Promise<{ user: AuthUser | null; error: string }> {
  const sb = getSupabase();
  if (!sb) return { user: null, error: "Сайт не подключён к Supabase" };
  // Совместимость: старые логины без @ дописываем до технического адреса.
  const email = emailOrLogin.includes("@")
    ? emailOrLogin
    : `${emailOrLogin}@${LEGACY_EMAIL_DOMAIN}`;
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      if (/invalid login|invalid.*credentials/i.test(error.message)) {
        return { user: null, error: "Неверная почта или пароль" };
      }
      if (/confirm/i.test(error.message)) {
        return {
          user: null,
          error:
            "Почта не подтверждена: отключите подтверждение почты в Supabase по инструкции.",
        };
      }
      return { user: null, error: error.message };
    }
    if (!data.session) {
      return { user: null, error: "Не удалось войти. Попробуйте ещё раз." };
    }
    const profile = await fetchProfile();
    if (!profile) return { user: null, error: "Не удалось загрузить профиль. Попробуйте ещё раз." };
    return { user: profile, error: "" };
  } catch {
    return { user: null, error: networkErrorText() };
  }
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.auth.signOut();
  } catch {}
}

// ---------------- Восстановление пароля ----------------

/** Открыта ли страница по ссылке из письма восстановления пароля. */
export function isRecoveryUrl(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.hash.includes("type=recovery")) return true;
  // Ссылки комнат тоже вида ?code=..., но короткие; код восстановления длинный.
  const code = new URLSearchParams(window.location.search).get("code");
  return !!code && code.length > 20;
}

function clearRecoveryUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.hash = "";
  const code = url.searchParams.get("code");
  if (code && code.length > 20) url.searchParams.delete("code");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}

/** Отправляет письмо со ссылкой для смены пароля. Пустая строка — успех. */
export async function requestPasswordReset(email: string): Promise<string> {
  const sb = getSupabase();
  if (!sb) return "Сайт не подключён к Supabase";
  try {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${siteBasePath()}/`,
    });
    if (error) return error.message;
    return "";
  } catch {
    return networkErrorText();
  }
}

/** Задаёт новый пароль по ссылке из письма. При успехе сразу входит. */
export async function updatePassword(
  password: string,
): Promise<{ user: AuthUser | null; error: string }> {
  const sb = getSupabase();
  if (!sb) return { user: null, error: "Сайт не подключён к Supabase" };
  try {
    const { data } = await sb.auth.getSession();
    if (!data.session) {
      return { user: null, error: "Ссылка недействительна или устарела. Запросите новую." };
    }
    const { error } = await sb.auth.updateUser({ password });
    if (error) {
      if (/session|expired|invalid|token/i.test(error.message)) {
        return { user: null, error: "Ссылка недействительна или устарела. Запросите новую." };
      }
      return { user: null, error: error.message };
    }
    clearRecoveryUrl();
    const profile = await fetchProfile();
    if (!profile) {
      return { user: null, error: "Пароль обновлён. Войдите с новым паролем." };
    }
    return { user: profile, error: "" };
  } catch {
    return { user: null, error: networkErrorText() };
  }
}

// ---------------- Комнаты ----------------

export async function getRoomState(
  code: string,
): Promise<{ ok: true; state: RoomState } | Failure> {
  const res = await callRpc<RoomState>("get_room_state", { p_code: code });
  if (!res.ok) return res;
  return { ok: true, state: res.data };
}

export async function createRoom(input: {
  roomName: string;
  budget: string;
  avatar: string;
  color: string;
}): Promise<{ ok: true; code: string } | Failure> {
  const res = await callRpc<{ code: string }>("create_room", {
    p_name: input.roomName,
    p_budget: input.budget,
    p_avatar: input.avatar,
    p_color: input.color,
  });
  if (!res.ok) return res;
  return { ok: true, code: res.data.code };
}

type ActionOk = { ok: true };

function voidResult(res: RpcResult<unknown>): ActionOk | Failure {
  return res.ok ? { ok: true } : res;
}

/** Действия в комнате. Имена повторяют прежние серверные action. */
export async function roomAction(
  code: string,
  payload: Record<string, unknown>,
): Promise<ActionOk | Failure> {
  const action = String(payload.action ?? "");
  switch (action) {
    case "join":
      return voidResult(
        await callRpc("join_room", {
          p_code: code,
          p_avatar: payload.avatar,
          p_color: payload.color,
        }),
      );
    case "profile":
      return voidResult(
        await callRpc("update_profile", {
          p_code: code,
          p_wishlist: String(payload.wishlist ?? ""),
          p_avatar: (payload.avatar as string | undefined) ?? null,
          p_color: (payload.color as string | undefined) ?? null,
          p_name: (payload.name as string | undefined) ?? null,
        }),
      );
    case "rename":
      return voidResult(
        await callRpc("set_room_name", { p_code: code, p_name: String(payload.name ?? "") }),
      );
    case "wrap":
      return voidResult(
        await callRpc("set_wrap", {
          p_code: code,
          p_style: payload.style,
          p_color: payload.color,
          p_contents: payload.contents,
        }),
      );
    case "sent":
      return voidResult(
        await callRpc("set_sent", {
          p_code: code,
          p_sent: Boolean(payload.sent),
          p_recipient_id:
            payload.recipientId === null || payload.recipientId === undefined
              ? null
              : Number(payload.recipientId),
        }),
      );
    case "accept":
      return voidResult(await callRpc("accept_gift", { p_code: code }));
    case "draw":
      return voidResult(
        await callRpc(payload.mode === "fill" ? "draw_fill" : "draw_full", { p_code: code }),
      );
    case "assign":
      return voidResult(
        await callRpc("set_pair", {
          p_code: code,
          p_santa: Number(payload.santaId),
          p_recipient:
            payload.recipientId === null || payload.recipientId === undefined
              ? null
              : Number(payload.recipientId),
        }),
      );
    case "reset":
      return voidResult(await callRpc("reset_draw", { p_code: code }));
    case "kick":
      return voidResult(
        await callRpc("kick_participant", {
          p_code: code,
          p_participant: Number(payload.participantId),
        }),
      );
    case "wishlistVisibility":
      return voidResult(
        await callRpc("set_wishlist_visibility", {
          p_code: code,
          p_value: String(payload.value ?? ""),
        }),
      );
    default:
      return { ok: false, reason: "error", error: "Неизвестное действие" };
  }
}
