import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Сайт статический (GitHub Pages), поэтому браузер обращается к Supabase
// напрямую публичным ключом. Секретов здесь нет и быть не должно:
// секретный ключ для такой схемы не нужен вовсе.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

let client: SupabaseClient | null = null;

/** Общий клиент Supabase. Сессия хранится в localStorage браузера. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}

/**
 * Домен старых технических адресов. Раньше вход был по логину, и логин
 * «ivan» хранился как ivan@users.secret-santa.local. Такие учётки
 * продолжают работать: при входе к логину без @ подставляется этот домен.
 */
export const LEGACY_EMAIL_DOMAIN = "users.secret-santa.local";

/** Подпуть сайта на GitHub Pages (например, "/secretsanta2611"). */
export function siteBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}
