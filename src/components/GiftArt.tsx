import { WRAP_COLORS, type WrapColor } from "@/lib/constants";

type Palette = { box: string; lid: string; ribbon: string };
const GREY: Palette = { box: "#9ca3af", lid: "#6b7280", ribbon: "#d1d5db" };
const BOX_HEIGHTS = [52, 66, 46, 60];
const SHADOW = "rgba(0,0,0,0.22)";
const CANDY_COLORS = ["#ef4444", "#facc15", "#22c55e", "#3b82f6", "#ec4899", "#f97316"];

/**
 * Рисунок подарка: «box» — коробка с бантом, «bag» — новогодний подарочный пакет,
 * «mystery» — серая коробка со знаком вопроса (подарок ещё не отправлен).
 * opened — получатель нажал «Принять»: крышка съезжает вбок, из подарка торчат конфеты.
 */
export default function GiftArt({
  kind,
  color = "red",
  width,
  variant = 0,
  opened = false,
}: {
  kind: "box" | "bag" | "mystery";
  color?: WrapColor;
  width: number;
  /** Для коробок: немного разная высота, чтобы груда подарков выглядела живой. */
  variant?: number;
  opened?: boolean;
}) {
  const pal: Palette = kind === "mystery" ? GREY : (WRAP_COLORS[color] ?? WRAP_COLORS.red);
  return kind === "bag" ? (
    <Bag pal={pal} width={width} opened={opened} />
  ) : (
    <Box pal={pal} width={width} variant={variant} mystery={kind === "mystery"} opened={opened} />
  );
}

/** Одна конфета в обёртке: овальная серединка и два «фантика» по бокам. */
function Candy({ x, y, r, fill, rotate = 0 }: { x: number; y: number; r: number; fill: string; rotate?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <path
        d={`M ${-r * 0.5} 0 L ${-r * 1.6} ${-r * 0.7} L ${-r * 1.6} ${r * 0.7} Z`}
        fill={fill}
        stroke={SHADOW}
        strokeWidth="0.8"
      />
      <path
        d={`M ${r * 0.5} 0 L ${r * 1.6} ${-r * 0.7} L ${r * 1.6} ${r * 0.7} Z`}
        fill={fill}
        stroke={SHADOW}
        strokeWidth="0.8"
      />
      <ellipse cx="0" cy="0" rx={r} ry={r * 0.86} fill={fill} stroke={SHADOW} strokeWidth="0.8" />
      <ellipse cx={-r * 0.28} cy={-r * 0.32} rx={r * 0.42} ry={r * 0.24} fill="#fff" opacity="0.5" />
    </g>
  );
}

/** Куча конфет, выглядывающая из открытого подарка. */
function CandyPile({ cx, baseY }: { cx: number; baseY: number }) {
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
          y={baseY + it.dy}
          r={it.r}
          fill={CANDY_COLORS[it.c % CANDY_COLORS.length]}
          rotate={it.rot}
        />
      ))}
    </g>
  );
}

/** Бантик отдельным элементом — его можно положить рядом с открытой коробкой. */
function Bow({ pal, transform }: { pal: Palette; transform: string }) {
  return (
    <g transform={transform}>
      <path d="M0 0 C -12 -24, -30 -20, -23 -6 C -19 2, -6 1, 0 0 Z" fill={pal.ribbon} stroke={SHADOW} />
      <path d="M0 0 C 12 -24, 30 -20, 23 -6 C 19 2, 6 1, 0 0 Z" fill={pal.ribbon} stroke={SHADOW} />
      <circle cx="0" cy="-2" r="5" fill={pal.ribbon} stroke={SHADOW} />
    </g>
  );
}

function Box({
  pal,
  width,
  variant,
  mystery,
  opened,
}: {
  pal: Palette;
  width: number;
  variant: number;
  mystery: boolean;
  opened: boolean;
}) {
  const bh = BOX_HEIGHTS[Math.abs(variant) % BOX_HEIGHTS.length];
  const h = 36 + bh;
  const cy = 36 + bh / 2;

  if (opened) {
    // Крышка съехала вправо, бантик лежит рядом, из коробки видны конфеты.
    const wideH = Math.max(h, 104);
    return (
      <svg viewBox={`-8 0 178 ${wideH}`} width={width * 1.5} height={(width * 1.5 * wideH) / 178} aria-hidden>
        <CandyPile cx={50} baseY={30} />
        {/* коробка без крышки, видно тёмное нутро */}
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
        <Bow pal={pal} transform={`translate(146 ${Math.max(78, h - 46)}) rotate(84)`} />
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

function Bag({ pal, width, opened }: { pal: Palette; width: number; opened: boolean }) {
  const flake = [0, 60, 120];
  // Белая бумага; у белого пакета — цвета ленты, чтобы не сливалась.
  const tissue = pal.box === WRAP_COLORS.white.box ? pal.ribbon : "#ffffff";
  return (
    <svg viewBox="0 0 100 112" width={width} height={(width * 112) / 100} aria-hidden>
      {opened ? (
        <>
          {/* ручки опущены вниз по стенкам пакета */}
          <path d="M32 44 C 20 58, 18 74, 26 84" fill="none" stroke={pal.lid} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M58 44 C 70 58, 72 74, 64 84" fill="none" stroke={pal.lid} strokeWidth="4.5" strokeLinecap="round" />
          {/* конфеты горкой из пакета */}
          <CandyPile cx={50} baseY={34} />
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
