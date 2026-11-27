import { WRAP_COLORS, type GiftContent, type WrapColor } from "@/lib/constants";

type Palette = { box: string; lid: string; ribbon: string };
const GREY: Palette = { box: "#9ca3af", lid: "#6b7280", ribbon: "#d1d5db" };
const BOX_HEIGHTS = [52, 66, 46, 60];
const SHADOW = "rgba(0,0,0,0.22)";
const CANDY_COLORS = ["#ef4444", "#facc15", "#22c55e", "#3b82f6", "#ec4899", "#f97316"];

/**
 * Рисунок подарка: «box» — коробка с бантом, «bag» — новогодний подарочный пакет,
 * «mystery» — серая коробка со знаком вопроса (подарок ещё не отправлен).
 * opened — получатель принял подарок: крышка съезжает вбок, внутри видно содержимое.
 */
export default function GiftArt({
  kind,
  color = "red",
  width,
  variant = 0,
  opened = false,
  contents = null,
}: {
  kind: "box" | "bag" | "mystery";
  color?: WrapColor;
  width: number;
  /** Для коробок: немного разная высота, чтобы груда подарков выглядела живой. */
  variant?: number;
  opened?: boolean;
  contents?: GiftContent | null;
}) {
  const pal: Palette = kind === "mystery" ? GREY : (WRAP_COLORS[color] ?? WRAP_COLORS.red);
  const inside: GiftContent = contents ?? "candy";
  return kind === "bag" ? (
    <Bag pal={pal} width={width} opened={opened} contents={inside} />
  ) : (
    <Box pal={pal} width={width} variant={variant} mystery={kind === "mystery"} opened={opened} contents={inside} />
  );
}

/** Иконка содержимого для выбора в форме (без подарка вокруг). */
export function ContentIcon({ kind, className = "h-10 w-16" }: { kind: GiftContent; className?: string }) {
  return (
    <svg viewBox="0 0 100 60" className={className} aria-hidden>
      <ContentArt kind={kind} cx={50} b={56} />
    </svg>
  );
}

/** Одна конфета в обёртке: овальная серединка и два «фантика» по бокам. */
function Candy({ x, y, r, fill, rotate = 0 }: { x: number; y: number; r: number; fill: string; rotate?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <path d={`M ${-r * 0.5} 0 L ${-r * 1.6} ${-r * 0.7} L ${-r * 1.6} ${r * 0.7} Z`} fill={fill} stroke={SHADOW} strokeWidth="0.8" />
      <path d={`M ${r * 0.5} 0 L ${r * 1.6} ${-r * 0.7} L ${r * 1.6} ${r * 0.7} Z`} fill={fill} stroke={SHADOW} strokeWidth="0.8" />
      <ellipse cx="0" cy="0" rx={r} ry={r * 0.86} fill={fill} stroke={SHADOW} strokeWidth="0.8" />
      <ellipse cx={-r * 0.28} cy={-r * 0.32} rx={r * 0.42} ry={r * 0.24} fill="#fff" opacity="0.5" />
    </g>
  );
}

/** Выбирает рисунок содержимого. Все фигуры стоят на линии baseY и умещаются в ±34 по горизонтали. */
function ContentArt({ kind, cx, b }: { kind: GiftContent; cx: number; b: number }) {
  switch (kind) {
    case "toys":
      return <ToysArt cx={cx} b={b} />;
    case "champagne":
      return <ChampagneArt cx={cx} b={b} />;
    case "book":
      return <BookArt cx={cx} b={b} />;
    case "tangerines":
      return <TangerineArt cx={cx} b={b} />;
    case "gingerbread":
      return <GingerbreadArt cx={cx} b={b} />;
    case "tea":
      return <TeaArt cx={cx} b={b} />;
    case "ornaments":
      return <OrnamentArt cx={cx} b={b} />;
    case "socks":
      return <SocksArt cx={cx} b={b} />;
    default:
      return <CandyArt cx={cx} b={b} />;
  }
}

function CandyArt({ cx, b }: { cx: number; b: number }) {
  const items: { dx: number; dy: number; r: number; c: number; rot: number }[] = [
    { dx: -27, dy: 0, r: 6.5, c: 0, rot: -18 },
    { dx: 27, dy: 0, r: 6.5, c: 2, rot: 18 },
    { dx: 0, dy: 1, r: 7.5, c: 1, rot: 4 },
    { dx: -13, dy: -9, r: 7, c: 3, rot: -28 },
    { dx: 14, dy: -8, r: 7, c: 4, rot: 24 },
    { dx: 0, dy: -17, r: 7, c: 5, rot: -6 },
    { dx: -30, dy: -12, r: 5.5, c: 1, rot: 36 },
    { dx: 31, dy: -11, r: 5.5, c: 0, rot: -34 },
  ];
  return (
    <g>
      {items.map((it, i) => (
        <Candy
          key={i}
          x={cx + it.dx}
          y={b + it.dy}
          r={it.r}
          fill={CANDY_COLORS[it.c % CANDY_COLORS.length]}
          rotate={it.rot}
        />
      ))}
    </g>
  );
}

function ToysArt({ cx, b }: { cx: number; b: number }) {
  return (
    <g>
      {/* машинка */}
      <rect x={cx - 30} y={b - 12} width={24} height={9} rx={3} fill="#ef4444" stroke={SHADOW} strokeWidth="0.8" />
      <rect x={cx - 25} y={b - 19} width={13} height={8} rx={3} fill="#fca5a5" stroke={SHADOW} strokeWidth="0.8" />
      <rect x={cx - 23} y={b - 17} width={4} height={4} fill="#dbeafe" />
      <rect x={cx - 17} y={b - 17} width={4} height={4} fill="#dbeafe" />
      <circle cx={cx - 25} cy={b - 2} r={3.5} fill="#1f2937" />
      <circle cx={cx - 11} cy={b - 2} r={3.5} fill="#1f2937" />
      {/* плюшевый медведь */}
      <circle cx={cx + 16} cy={b - 6} r={7} fill="#a16207" stroke={SHADOW} strokeWidth="0.8" />
      <circle cx={cx + 16} cy={b - 19} r={7} fill="#a16207" stroke={SHADOW} strokeWidth="0.8" />
      <circle cx={cx + 10} cy={b - 25} r={2.8} fill="#a16207" />
      <circle cx={cx + 22} cy={b - 25} r={2.8} fill="#a16207" />
      <ellipse cx={cx + 16} cy={b - 17} rx={3.5} ry={2.6} fill="#fde68a" />
      <circle cx={cx + 13.5} cy={b - 20} r={1} fill="#111827" />
      <circle cx={cx + 18.5} cy={b - 20} r={1} fill="#111827" />
    </g>
  );
}

function ChampagneArt({ cx, b }: { cx: number; b: number }) {
  return (
    <g>
      <rect x={cx - 6} y={b - 18} width={12} height={18} rx={3} fill="#15803d" stroke={SHADOW} strokeWidth="0.8" />
      <rect x={cx - 2.5} y={b - 27} width={5} height={10} fill="#166534" />
      <rect x={cx - 3.2} y={b - 30} width={6.4} height={3.5} rx={1} fill="#facc15" />
      <rect x={cx - 6} y={b - 13} width={12} height={7} fill="#fef3c7" />
      <circle cx={cx} cy={b - 9.5} r={1.8} fill="#b45309" />
    </g>
  );
}

function BookArt({ cx, b }: { cx: number; b: number }) {
  return (
    <g>
      <rect x={cx - 18} y={b - 14} width={36} height={14} rx={2} fill="#1d4ed8" stroke={SHADOW} strokeWidth="0.8" />
      <rect x={cx - 16} y={b - 11} width={32} height={3} fill="#fef3c7" />
      <rect x={cx - 15} y={b - 25} width={30} height={11} rx={2} fill="#dc2626" stroke={SHADOW} strokeWidth="0.8" />
      <rect x={cx - 13} y={b - 22} width={26} height={2.5} fill="#fef3c7" />
      <rect x={cx + 8} y={b - 14} width={2.5} height={7} fill="#facc15" />
    </g>
  );
}

function TangerineArt({ cx, b }: { cx: number; b: number }) {
  const fruits: [number, number][] = [
    [cx - 12, b - 9],
    [cx + 12, b - 9],
    [cx, b - 23],
  ];
  return (
    <g>
      {fruits.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={9} fill="#f97316" stroke={SHADOW} strokeWidth="0.8" />
          <circle cx={x - 3} cy={y - 3} r={2.2} fill="#fff" opacity="0.45" />
        </g>
      ))}
      <path d={`M ${cx} ${b - 31} q 4 -4 8 -1 q -4 4 -8 1 z`} fill="#16a34a" />
    </g>
  );
}

function GingerMan({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx={0} cy={-26} r={6} fill="#b45309" stroke={SHADOW} strokeWidth="0.8" />
      <rect x={-8} y={-20} width={16} height={14} rx={6} fill="#b45309" stroke={SHADOW} strokeWidth="0.8" />
      <rect x={-14} y={-18} width={7} height={4} rx={2} fill="#b45309" />
      <rect x={7} y={-18} width={7} height={4} rx={2} fill="#b45309" />
      <rect x={-7} y={-6} width={6} height={7} rx={2.5} fill="#b45309" />
      <rect x={1} y={-6} width={6} height={7} rx={2.5} fill="#b45309" />
      <circle cx={-2.5} cy={-27} r={1} fill="#fff" />
      <circle cx={2.5} cy={-27} r={1} fill="#fff" />
      <circle cx={0} cy={-16} r={1.2} fill="#fef3c7" />
      <circle cx={0} cy={-11} r={1.2} fill="#fef3c7" />
    </g>
  );
}

function GingerbreadArt({ cx, b }: { cx: number; b: number }) {
  return (
    <g>
      <GingerMan x={cx - 6} y={b} s={1} />
      <GingerMan x={cx + 16} y={b} s={0.7} />
    </g>
  );
}

function TeaArt({ cx, b }: { cx: number; b: number }) {
  return (
    <g>
      <path d={`M ${cx + 12} ${b - 14} q 8 0 8 5 q 0 5 -8 5`} fill="none" stroke="#dc2626" strokeWidth={3} strokeLinecap="round" />
      <path d={`M ${cx - 12} ${b - 20} h 24 v 14 q 0 6 -6 6 h -12 q -6 0 -6 -6 z`} fill="#dc2626" stroke={SHADOW} strokeWidth="0.8" />
      <ellipse cx={cx} cy={b - 20} rx={12} ry={2.5} fill="#78350f" />
      <path d={`M ${cx - 4} ${b - 23} q -2.5 -2.5 0 -5 q 2.5 -2.5 0 -5`} fill="none" stroke="#cbd5e1" strokeWidth={1.6} strokeLinecap="round" />
      <path d={`M ${cx + 3} ${b - 23} q -2.5 -2.5 0 -5 q 2.5 -2.5 0 -5`} fill="none" stroke="#cbd5e1" strokeWidth={1.6} strokeLinecap="round" />
    </g>
  );
}

function OrnamentArt({ cx, b }: { cx: number; b: number }) {
  const balls: [number, number, string][] = [
    [cx - 14, b - 8, "#ef4444"],
    [cx + 14, b - 8, "#facc15"],
    [cx, b - 20, "#3b82f6"],
  ];
  return (
    <g>
      {balls.map(([x, y, c], i) => (
        <g key={i}>
          <rect x={x - 2.5} y={y - 12} width={5} height={4} fill="#fcd34d" />
          <circle cx={x} cy={y} r={8} fill={c} stroke={SHADOW} strokeWidth="0.8" />
          <circle cx={x - 3} cy={y - 3} r={2} fill="#fff" opacity="0.6" />
        </g>
      ))}
    </g>
  );
}

function SocksArt({ cx, b }: { cx: number; b: number }) {
  return (
    <g>
      {/* первый носок: красный с белыми полосками */}
      <rect x={cx - 12} y={b - 30} width={11} height={22} rx={3} fill="#dc2626" stroke={SHADOW} strokeWidth="0.8" />
      <rect x={cx - 12} y={b - 12} width={20} height={12} rx={6} fill="#dc2626" stroke={SHADOW} strokeWidth="0.8" />
      <rect x={cx - 12} y={b - 26} width={11} height={2.5} fill="#fff" />
      <rect x={cx - 12} y={b - 19} width={11} height={2.5} fill="#fff" />
      {/* второй носок: зелёный с белыми снежинками */}
      <rect x={cx + 2} y={b - 24} width={10} height={16} rx={3} fill="#16a34a" stroke={SHADOW} strokeWidth="0.8" />
      <rect x={cx + 2} y={b - 10} width={18} height={10} rx={5} fill="#16a34a" stroke={SHADOW} strokeWidth="0.8" />
      <circle cx={cx + 7} cy={b - 3} r={1.6} fill="#fff" />
      <circle cx={cx + 14} cy={b - 3} r={1.6} fill="#fff" />
    </g>
  );
}

function Box({
  pal,
  width,
  variant,
  mystery,
  opened,
  contents,
}: {
  pal: Palette;
  width: number;
  variant: number;
  mystery: boolean;
  opened: boolean;
  contents: GiftContent;
}) {
  const bh = BOX_HEIGHTS[Math.abs(variant) % BOX_HEIGHTS.length];
  const h = 36 + bh;
  const cy = 36 + bh / 2;

  if (opened) {
    // Крышка съехала вправо, бантик лежит рядом, из коробки видно содержимое.
    const wideH = Math.max(h, 104);
    return (
      <svg viewBox={`-8 0 178 ${wideH}`} width={width * 1.5} height={(width * 1.5 * wideH) / 178} aria-hidden>
        <ContentArt kind={contents} cx={50} b={34} />
        <rect x="0" y="34" width="100" height={bh + 2} rx="2" fill={pal.box} />
        <rect x="74" y="34" width="26" height={bh + 2} fill="#000" opacity="0.12" />
        <rect x="2" y="30" width="96" height="10" rx="3" fill="#3f3f46" opacity="0.9" />
        {!mystery && <rect x="0" y={cy} width="100" height="10" fill={pal.ribbon} />}
        <rect x="43" y="30" width="14" height={bh + 6} fill={pal.ribbon} />
        {/* съехавшая крышка */}
        <g transform={`translate(108 ${Math.max(44, h - 74)}) rotate(10)`}>
          <rect x="-5" y="0" width="62" height="14" rx="2" fill={pal.lid} />
          <rect x="-5" y="11" width="62" height="3" fill="#000" opacity="0.15" />
          <rect x="21" y="0" width="12" height="14" fill={pal.ribbon} />
        </g>
        {/* бантик лежит сбоку от крышки */}
        <g transform={`translate(146 ${Math.max(78, h - 46)}) rotate(84)`}>
          <path d="M0 0 C -12 -24, -30 -20, -23 -6 C -19 2, -6 1, 0 0 Z" fill={pal.ribbon} stroke={SHADOW} />
          <path d="M0 0 C 12 -24, 30 -20, 23 -6 C 19 2, 6 1, 0 0 Z" fill={pal.ribbon} stroke={SHADOW} />
          <circle cx="0" cy="-2" r="5" fill={pal.ribbon} stroke={SHADOW} />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox={`-6 0 112 ${h}`} width={width} height={(width * h) / 112} aria-hidden>
      {/* бант */}
      <path d="M50 22 C 38 -2, 16 2, 23 16 C 27 24, 42 23, 50 22 Z" fill={pal.ribbon} stroke={SHADOW} />
      <path d="M50 22 C 62 -2, 84 2, 77 16 C 73 24, 58 23, 50 22 Z" fill={pal.ribbon} stroke={SHADOW} />
      {/* коробка */}
      <rect x="0" y="34" width="100" height={bh + 2} rx="2" fill={pal.box} />
      <rect x="74" y="34" width="26" height={bh + 2} fill="#000" opacity="0.12" />
      {!mystery && <rect x="0" y={cy - 5} width="100" height="10" fill={pal.ribbon} />}
      {/* крышка */}
      <rect x="-5" y="24" width="110" height="14" rx="2" fill={pal.lid} />
      <rect x="-5" y="35" width="110" height="3" fill="#000" opacity="0.15" />
      {/* лента и узел банта */}
      <rect x="43" y="24" width="14" height={bh + 12} fill={pal.ribbon} />
      <circle cx="50" cy="22" r="5.5" fill={pal.ribbon} stroke={SHADOW} />
      {mystery && (
        <g>
          <circle cx="50" cy={cy} r={bh * 0.32} fill="#6b7280" stroke="#e5e7eb" strokeWidth="3" />
          <text
            x="50"
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={bh * 0.42}
            fontWeight="900"
            fill="#fff"
            fontFamily="system-ui, sans-serif"
          >
            ?
          </text>
        </g>
      )}
    </svg>
  );
}

function Bag({
  pal,
  width,
  opened,
  contents,
}: {
  pal: Palette;
  width: number;
  opened: boolean;
  contents: GiftContent;
}) {
  const flake = [0, 60, 120];
  // Белая бумага; у белого пакета — цвета ленты, чтобы не сливалась.
  const tissue = pal.box === WRAP_COLORS.white.box ? pal.ribbon : "#ffffff";
  return (
    <svg viewBox="0 0 100 112" width={width} height={(width * 112) / 100} aria-hidden>
      {opened ? (
        <>
          {/* содержимое выглядывает из пакета */}
          <ContentArt kind={contents} cx={50} b={38} />
          {/* ручки опущены вниз по стенкам пакета */}
          <path d="M32 44 C 20 58, 18 74, 26 84" fill="none" stroke={pal.lid} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M58 44 C 70 58, 72 74, 64 84" fill="none" stroke={pal.lid} strokeWidth="4.5" strokeLinecap="round" />
          {/* сам пакет */}
          <path d="M16 38 L84 38 L92 110 L8 110 Z" fill={pal.box} stroke={SHADOW} strokeLinejoin="round" />
          <path d="M66 38 L84 38 L92 110 L71 110 Z" fill="#000" opacity="0.12" />
          <path d="M16 38 L84 38 L85.3 50 L14.7 50 Z" fill={pal.lid} />
          {[32, 58].map((x) => (
            <circle key={x} cx={x} cy="44" r="2.2" fill={pal.ribbon} />
          ))}
        </>
      ) : (
        <>
          {/* верёвочные ручки: задняя и передняя */}
          <path d="M40 42 C 40 -2, 66 -2, 66 42" fill="none" stroke={pal.lid} strokeWidth="4.5" strokeLinecap="round" />
          {/* бумага, выглядывающая из пакета */}
          <path
            d="M24 40 L33 27 L41 37 L50 22 L59 37 L67 28 L76 40 Z"
            fill={tissue}
            stroke={SHADOW}
            strokeLinejoin="round"
          />
          <path d="M32 42 C 32 2, 58 2, 58 42" fill="none" stroke={pal.lid} strokeWidth="4.5" strokeLinecap="round" />
          {/* пакет */}
          <path d="M16 38 L84 38 L92 110 L8 110 Z" fill={pal.box} stroke={SHADOW} strokeLinejoin="round" />
          <path d="M66 38 L84 38 L92 110 L71 110 Z" fill="#000" opacity="0.12" />
          <path d="M16 38 L84 38 L85.3 50 L14.7 50 Z" fill={pal.lid} />
          {/* крепления ручек */}
          {[32, 58].map((x) => (
            <circle key={x} cx={x} cy="44" r="2.2" fill={pal.ribbon} />
          ))}
          {/* снежинка */}
          <g stroke={pal.ribbon} strokeWidth="3" strokeLinecap="round">
            {flake.map((deg) => (
              <g key={deg} transform={`rotate(${deg} 50 80)`}>
                <line x1="50" y1="65" x2="50" y2="95" />
                <line x1="50" y1="70" x2="45" y2="66" />
                <line x1="50" y1="70" x2="55" y2="66" />
                <line x1="50" y1="90" x2="45" y2="94" />
                <line x1="50" y1="90" x2="55" y2="94" />
              </g>
            ))}
          </g>
        </>
      )}
    </svg>
  );
}
