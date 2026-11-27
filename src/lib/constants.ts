export const AVATARS = [
  "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐸", "🐵", "🐧", "🦉",
  "🦄", "🐰", "🐱", "🐶", "🎅", "🤶", "⛄", "🦌", "🧝", "🐹",
];

export const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#64748b", "#a16207",
];

/** Цвета упаковки подарка: основной цвет, тёмный оттенок (крышка, ручки) и лента. */
export const WRAP_COLORS = {
  red: { label: "Красный", box: "#dc2626", lid: "#991b1b", ribbon: "#fde047" },
  orange: { label: "Оранжевый", box: "#f97316", lid: "#c2410c", ribbon: "#ffffff" },
  yellow: { label: "Жёлтый", box: "#eab308", lid: "#a16207", ribbon: "#dc2626" },
  green: { label: "Зелёный", box: "#16a34a", lid: "#166534", ribbon: "#fef08a" },
  sky: { label: "Голубой", box: "#38bdf8", lid: "#0369a1", ribbon: "#ffffff" },
  blue: { label: "Синий", box: "#2563eb", lid: "#1e40af", ribbon: "#f8fafc" },
  purple: { label: "Фиолетовый", box: "#9333ea", lid: "#6b21a8", ribbon: "#fcd34d" },
  white: { label: "Белый", box: "#f8fafc", lid: "#cbd5e1", ribbon: "#dc2626" },
  black: { label: "Чёрный", box: "#334155", lid: "#020617", ribbon: "#fde047" },
} as const satisfies Record<string, { label: string; box: string; lid: string; ribbon: string }>;

export type WrapColor = keyof typeof WRAP_COLORS;
export const WRAP_COLOR_KEYS = Object.keys(WRAP_COLORS) as WrapColor[];
export type WrapStyle = "box" | "bag";

/** Наполнение подарка — то, что Санта кладёт внутрь. Видно после принятия. */
export const WRAP_FILLINGS = {
  candy: { label: "Конфеты", hint: "Куча конфет", emoji: "🍬" },
  toys: { label: "Игрушки", hint: "Машинки и плюшевые игрушки", emoji: "🧸" },
  champagne: { label: "Шампанское", hint: "Бутылка шампанского", emoji: "🍾" },
  book: { label: "Книга", hint: "Книга", emoji: "📕" },
  mug: { label: "Кружка", hint: "Новогодняя кружка", emoji: "☕" },
  socks: { label: "Носки", hint: "Тёплые носки", emoji: "🧦" },
  candle: { label: "Свеча", hint: "Ароматическая свеча", emoji: "🕯️" },
  cookies: { label: "Печенье", hint: "Новогоднее печенье", emoji: "🍪" },
} as const satisfies Record<string, { label: string; hint: string; emoji: string }>;

export type WrapFilling = keyof typeof WRAP_FILLINGS;
export const WRAP_FILLING_KEYS = Object.keys(WRAP_FILLINGS) as WrapFilling[];
export const DEFAULT_FILLING: WrapFilling = "candy";

export type WishlistVisibility = "all" | "santa";

export const isWrapStyle = (v: unknown): v is WrapStyle => v === "box" || v === "bag";
export const isWrapColor = (v: unknown): v is WrapColor =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(WRAP_COLORS, v);
export const isWrapFilling = (v: unknown): v is WrapFilling =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(WRAP_FILLINGS, v);
export const isWishlistVisibility = (v: unknown): v is WishlistVisibility =>
  v === "all" || v === "santa";

/** Старые цвета (до обновления палитры) приводим к новым ближайшим. */
const LEGACY_WRAP_COLORS: Record<string, WrapColor> = {
  gold: "yellow",
  pink: "red",
  teal: "sky",
};

export function normalizeWrapColor(v: unknown): WrapColor {
  if (isWrapColor(v)) return v;
  if (typeof v === "string" && LEGACY_WRAP_COLORS[v]) return LEGACY_WRAP_COLORS[v];
  return "red";
}

export function normalizeWrapFilling(v: unknown): WrapFilling {
  return isWrapFilling(v) ? v : DEFAULT_FILLING;
}

export type PublicParticipant = {
  id: number;
  name: string;
  avatar: string;
  color: string;
  wishlist: string;
};

export function isSameParticipant(
  a: { name: string; avatar: string; color: string },
  b: { name: string; avatar: string; color: string },
): boolean {
  return (
    a.name.trim().toLowerCase() === b.name.trim().toLowerCase() &&
    a.avatar === b.avatar &&
    a.color === b.color
  );
}

export type GiftState = {
  recipientId: number;
  assigned: boolean;
  sent: boolean;
  /** Получатель нажал «Принять» — под ёлкой подарок открыт. */
  accepted: boolean;
  /** Упаковка известна всем только после отправки. */
  style: WrapStyle | null;
  color: WrapColor | null;
  /** Наполнение видно только после принятия подарка. */
  filling: WrapFilling | null;
};

export type RoomState = {
  room: {
    code: string;
    name: string;
    budget: string;
    eventDate: string;
    ownerId: number | null;
    wishlistVisibility: WishlistVisibility;
  };
  viewer: { email: string; displayName: string };
  me: PublicParticipant | null;
  isOwner: boolean;
  participants: PublicParticipant[];
  gifts: GiftState[];
  myTarget: {
    assignmentId: number;
    recipient: PublicParticipant;
    sent: boolean;
    style: WrapStyle;
    color: WrapColor;
    filling: WrapFilling;
  } | null;
  assignments: {
    id: number;
    santaId: number;
    recipientId: number;
    sent: boolean;
  }[] | null;
};
