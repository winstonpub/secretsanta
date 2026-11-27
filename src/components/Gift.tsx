import Avatar from "./Avatar";
import GiftArt from "./GiftArt";
import {
  GIFT_CONTENTS,
  WRAP_COLORS,
  WRAP_COLOR_KEYS,
  type GiftContent,
  type WrapColor,
  type WrapStyle,
} from "@/lib/constants";

const BOX_WIDTHS = [92, 80, 100, 84];

export type GiftProps = {
  index: number;
  name: string;
  avatar: string;
  color: string;
  sent: boolean;
  /** Получатель нажал «Принять»: подарок открыт, рамка имени зелёная. */
  accepted?: boolean;
  /** Упаковка, выбранная Сантой (есть только у отправленного подарка). */
  wrapStyle?: WrapStyle | null;
  wrapColor?: WrapColor | null;
  /** Содержимое — видно только после принятия подарка. */
  contents?: GiftContent | null;
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
  contents = null,
  scale = 1,
  highlight = null,
  onClick,
}: GiftProps) {
  const kind = !sent ? "mystery" : wrapStyle === "bag" ? "bag" : "box";
  const fill = wrapColor ?? WRAP_COLOR_KEYS[index % WRAP_COLOR_KEYS.length];
  const width = (kind === "bag" ? 78 : BOX_WIDTHS[index % BOX_WIDTHS.length]) * scale;
  const tilt = ((index * 37) % 7) - 3;
  const look = kind === "bag" ? "подарочный пакет" : "подарок";
  const colorName = WRAP_COLORS[fill].label.toLowerCase();

  return (
    <button
      type="button"
      onClick={onClick}
      title={
        accepted
          ? `Для ${name}: ${look}, ${colorName} — подарок принят${contents ? `, внутри: ${GIFT_CONTENTS[contents].label.toLowerCase()}` : ""}`
          : sent
            ? `Для ${name}: ${look}, ${colorName} — отправлен 🎉`
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
        <GiftArt
          kind={kind}
          color={fill}
          width={width}
          variant={index}
          opened={accepted}
          contents={contents}
        />
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
          <span className="shrink-0 text-emerald-700" title="Подарок принят">
            ✓
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
