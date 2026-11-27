import Avatar from "./Avatar";
import GiftArt from "./GiftArt";
import {
  WRAP_COLORS,
  WRAP_COLOR_KEYS,
  WRAP_FILLINGS,
  type WrapColor,
  type WrapFilling,
  type WrapStyle,
} from "@/lib/constants";

const BOX_WIDTHS = [92, 80, 100, 84];

export type GiftProps = {
  index: number;
  name: string;
  avatar: string;
  color: string;
  sent: boolean;
  /** Получатель нажал «Принять»: подарок открыт, видно наполнение, рамка зелёная. */
  accepted?: boolean;
  /** Упаковка, выбранная Сантой (есть только у отправленного подарка). */
  wrapStyle?: WrapStyle | null;
  wrapColor?: WrapColor | null;
  /** Наполнение, выбранное Сантой (видно только после принятия). */
  wrapFilling?: WrapFilling | null;
  scale?: number;
  highlight?: "target" | "mine" | null;
  onClick?: () => void;
};

export default function Gift({
  index,
  name,
  avatar,
  color,
  sent,
  accepted = false,
  wrapStyle,
  wrapColor,
  wrapFilling,
  scale = 1,
  highlight = null,
  onClick,
}: GiftProps) {
  const kind = !sent ? "mystery" : wrapStyle === "bag" ? "bag" : "box";
  const fill = wrapColor ?? WRAP_COLOR_KEYS[index % WRAP_COLOR_KEYS.length];
  const filling = wrapFilling ?? "candy";
  const width = (kind === "bag" ? 78 : BOX_WIDTHS[index % BOX_WIDTHS.length]) * scale;
  const tilt = ((index * 37) % 7) - 3;
  const look = kind === "bag" ? "подарочный пакет" : "подарок";

  return (
    <button
      type="button"
      onClick={onClick}
      title={
        accepted
          ? `Для ${name}: ${look}, ${WRAP_COLORS[fill].label.toLowerCase()} — подарок получен, внутри: ${WRAP_FILLINGS[filling].label.toLowerCase()}`
          : sent
            ? `Для ${name}: ${look}, ${WRAP_COLORS[fill].label.toLowerCase()} — отправлен 🎉`
            : `Подарок для ${name} — ещё не отправлен`
      }
      className="gift gift-pop relative flex flex-col items-center focus:outline-none"
      style={{ animationDelay: `${index * 60}ms`, cursor: onClick ? "pointer" : "default" }}
    >
      <div
        className="gift-body relative flex items-end"
        style={{
          transform: `rotate(${tilt}deg)`,
          filter: highlight
            ? `drop-shadow(0 0 12px ${highlight === "target" ? "#fde047" : "#67e8f9"})`
            : "drop-shadow(0 6px 6px rgba(0,0,0,0.35))",
        }}
      >
        <GiftArt kind={kind} color={fill} width={width} variant={index} opened={accepted} filling={filling} />
      </div>

      {/* бирка с аватаркой и именем получателя */}
      <div
        className={`relative z-10 -mt-3 flex max-w-[140px] items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 shadow-md ${
          accepted
            ? "bg-emerald-100 text-emerald-900 ring-2 ring-emerald-400"
            : "bg-white/95 text-slate-800"
        }`}
        style={{ fontSize: Math.max(10, 12 * scale) }}
      >
        <Avatar avatar={avatar} color={color} size={Math.max(18, 22 * scale)} className="ring-1" />
        <span className="truncate font-semibold">{name}</span>
        {accepted ? (
          <span className="shrink-0" title="Подарок получен">
            {WRAP_FILLINGS[filling].emoji}
          </span>
        ) : (
          sent && <span className="text-green-600">✓</span>
        )}
      </div>
      {highlight === "target" && (
        <span className="mt-1 rounded bg-yellow-300 px-1.5 text-[10px] font-bold text-slate-900">
          вы Санта
        </span>
      )}
      {highlight === "mine" && (
        <span className="mt-1 rounded bg-cyan-300 px-1.5 text-[10px] font-bold text-slate-900">
          для вас
        </span>
      )}
    </button>
  );
}
