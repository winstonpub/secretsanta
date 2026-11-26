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
  green: { label: "Зелёный", box: "#16a34a", lid: "#166534", ribbon: "#fef08a" },
  blue: { label: "Синий", box: "#2563eb", lid: "#1e40af", ribbon: "#f8fafc" },
  purple: { label: "Фиолетовый", box: "#9333ea", lid: "#6b21a8", ribbon: "#fcd34d" },
  gold: { label: "Золотой", box: "#f59e0b", lid: "#b45309", ribbon: "#dc2626" },
  pink: { label: "Розовый", box: "#db2777", lid: "#9d174d", ribbon: "#f8fafc" },
  teal: { label: "Бирюзовый", box: "#0d9488", lid: "#115e59", ribbon: "#fca5a5" },
  white: { label: "Белый", box: "#f8fafc", lid: "#cbd5e1", ribbon: "#dc2626" },
} as const satisfies Record<string, { label: string; box: string; lid: string; ribbon: string }>;

export type WrapColor = keyof typeof WRAP_COLORS;
export const WRAP_COLOR_KEYS = Object.keys(WRAP_COLORS) as WrapColor[];
export type WrapStyle = "box" | "bag";
export type WishlistVisibility = "all" | "santa";

export const isWrapStyle = (v: unknown): v is WrapStyle => v === "box" || v === "bag";
export const isWrapColor = (v: unknown): v is WrapColor =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(WRAP_COLORS, v);
export const isWishlistVisibility = (v: unknown): v is WishlistVisibility =>
  v === "all" || v === "santa";

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
  } | null;
  assignments: {
    id: number;
    santaId: number;
    recipientId: number;
    sent: boolean;
  }[] | null;
};
