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
  orange: { label: "Оранжевый", box: "#ea580c", lid: "#9a3412", ribbon: "#fef3c7" },
  yellow: { label: "Жёлтый", box: "#facc15", lid: "#ca8a04", ribbon: "#dc2626" },
  green: { label: "Зелёный", box: "#16a34a", lid: "#166534", ribbon: "#fef08a" },
  sky: { label: "Голубой", box: "#38bdf8", lid: "#0369a1", ribbon: "#ffffff" },
  blue: { label: "Синий", box: "#2563eb", lid: "#1e40af", ribbon: "#f8fafc" },
  purple: { label: "Фиолетовый", box: "#9333ea", lid: "#6b21a8", ribbon: "#fcd34d" },
  white: { label: "Белый", box: "#f8fafc", lid: "#cbd5e1", ribbon: "#dc2626" },
  black: { label: "Чёрный", box: "#262626", lid: "#0a0a0a", ribbon: "#e5e7eb" },
} as const satisfies Record<string, { label: string; box: string; lid: string; ribbon: string }>;

export type WrapColor = keyof typeof WRAP_COLORS;
export const WRAP_COLOR_KEYS = Object.keys(WRAP_COLORS) as WrapColor[];
export type WrapStyle = "box" | "bag";
export type WishlistVisibility = "all" | "santa";

/** Что положил Санта внутрь подарка. Показывается получателю, когда он откроет подарок. */
export const GIFT_CONTENTS = {
  candy: { label: "Конфеты", hint: "куча конфет" },
  toys: { label: "Игрушки", hint: "машинки и плюшевые мишки" },
  champagne: { label: "Шампанское", hint: "бутылка игристого" },
  book: { label: "Книга", hint: "стопка новогодних книг" },
  tangerines: { label: "Мандарины", hint: "сочные новогодние мандарины" },
  gingerbread: { label: "Пряники", hint: "домашние пряничные человечки" },
  tea: { label: "Чай", hint: "ароматный чай в кружке" },
  ornaments: { label: "Ёлочные шары", hint: "яркие ёлочные игрушки" },
  socks: { label: "Новогодние носки", hint: "тёплые носки с узорами" },
} as const;

export type GiftContent = keyof typeof GIFT_CONTENTS;
export const GIFT_CONTENT_KEYS = Object.keys(GIFT_CONTENTS) as GiftContent[];

export const isWrapStyle = (v: unknown): v is WrapStyle => v === "box" || v === "bag";
export const isWrapColor = (v: unknown): v is WrapColor =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(WRAP_COLORS, v);
export const isGiftContent = (v: unknown): v is GiftContent =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(GIFT_CONTENTS, v);
export const isWishlistVisibility = (v: unknown): v is WishlistVisibility =>
  v === "all" || v === "santa";

/** Бюджет хранится цифрами. Старые значения вида «1500 ₽» тоже понимаем. */
export function formatBudget(raw: string): { text: string; numeric: boolean } {
  const cleaned = raw.replace(/₽|руб\.?|р\./gi, "").trim();
  if (/^\d[\d\s]*$/.test(cleaned)) {
    return { text: Number(cleaned.replace(/\s/g, "")).toLocaleString("ru-RU"), numeric: true };
  }
  return { text: cleaned, numeric: false };
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
  /** Получатель нажал «Принять». */
  accepted: boolean;
  /** Упаковка известна всем только после отправки. */
  style: WrapStyle | null;
  color: WrapColor | null;
  /** Содержимое известно всем только после принятия подарка. */
  contents: GiftContent | null;
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
    /** Санта видит свой выбор всегда. */
    contents: GiftContent;
  } | null;
  assignments: {
    id: number;
    santaId: number;
    recipientId: number;
    sent: boolean;
  }[] | null;
};
