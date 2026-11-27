import { WRAP_COLORS, type WrapColor, type WrapFilling } from "@/lib/constants";

type Palette = { box: string; lid: string; ribbon: string };
const GREY: Palette = { box: "#9ca3af", lid: "#6b7280", ribbon: "#d1d5db" };
const BOX_HEIGHTS = [52, 66, 46, 60];
const SHADOW = "rgba(0,0,0,0.22)";
const CANDY_COLORS = ["#ef4444", "#facc15", "#22c55e", "#3b82f6", "#ec4899", "#f97316"];

/**
 * Рисунок подарка: «box» — коробка с бантом, «bag» — новогодний подарочный пакет,
 * «mystery» — серая коробка со знаком вопроса (подарок ещё не отправлен).
 * opened — получатель нажал «Принять»: коробка открыта, внутри лежит наполнение,
 * которое выбрал Санта (конфеты, игрушки и т.д.).
 */
export default function GiftArt({
  kind,
  color = "red",
  width,
  variant = 0,
  opened = false,
  filling = "candy",
}: {
  kind: "box" | "bag" | "mystery";
  color?: WrapColor;
  width: number;
  /** Для коробок: немного разная высота, чтобы груда подарков выглядела живой. */
  variant?: number;
  opened?: boolean;
  filling?: WrapFilling;
}) {
  const pal: Palette = kind === "mystery" ? GREY : (WRAP_COLORS[color] ?? WRAP_COLORS.red);
  return kind === "bag" ? (
    <Bag pal={pal} width={width} opened={opened} filling={filling} />
  ) : (
    <Box
      pal={pal}
      width={width}
      variant={variant}
      mystery={kind === "mystery"}
      opened={opened}
      filling={filling}
    />
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

/** Плюшевый мишка и машинка. */
function ToysPile({ cx, baseY }: { cx: number; baseY: number }) {
  const bx = cx - 16;
  const carX = cx + 1;
  return (
    <g>
      {/* мишка */}
      <circle cx={bx - 5} cy={baseY - 21} r={3.2} fill="#92400e" />
      <circle cx={bx + 5} cy={baseY - 21} r={3.2} fill="#92400e" />
      <circle cx={bx - 5} cy={baseY - 21} r={1.4} fill="#fde68a" />
      <circle cx={bx + 5} cy={baseY - 21} r={1.4} fill="#fde68a" />
      <ellipse cx={bx} cy={baseY - 4} rx={8.5} ry={7} fill="#b45309" />
      <circle cx={bx} cy={baseY - 16} r={7} fill="#b45309" />
      <ellipse cx={bx} cy={baseY - 13.5} rx={3.2} ry={2.6} fill="#fde68a" />
      <circle cx={bx - 1} cy={baseY - 14.5} r={0.9} fill="#451a03" />
      <circle cx={bx - 2.8} cy={baseY - 17.5} r={1} fill="#1f2937" />
      <circle cx={bx + 2.8} cy={baseY - 17.5} r={1} fill="#1f2937" />
      <rect x={bx - 8} y={baseY - 7} width={16} height={3.4} rx={1.7} fill="#dc2626" />
      {/* машинка */}
      <rect x={carX} y={baseY - 13} width={30} height={9} rx={2.5} fill="#ef4444" stroke={SHADOW} />
      <rect x={carX + 7} y={baseY - 20} width={15} height={8} rx={1.5} fill="#ef4444" stroke={SHADOW} />
      <rect x={carX + 9} y={baseY - 18.5} width={11} height={5} rx={1} fill="#bae6fd" />
      <circle cx={carX + 7} cy={baseY - 3} r={4.2} fill="#1f2937" />
      <circle cx={carX + 23} cy={baseY - 3} r={4.2} fill="#1f2937" />
      <circle cx={carX + 7} cy={baseY - 3} r={1.5} fill="#9ca3af" />
      <circle cx={carX + 23} cy={baseY - 3} r={1.5} fill="#9ca3af" />
    </g>
  );
}

/** Бутылка шампанского. */
function ChampagneBottle({ cx, baseY }: { cx: number; baseY: number }) {
  return (
    <g>
      <rect x={cx - 8} y={baseY - 18} width={16} height={18} rx={2.5} fill="#166534" stroke={SHADOW} />
      <path
        d={`M ${cx - 8} ${baseY - 18} L ${cx - 3.5} ${baseY - 24} L ${cx + 3.5} ${baseY - 24} L ${cx + 8} ${baseY - 18} Z`}
        fill="#166534"
      />
      <rect x={cx - 3.5} y={baseY - 28} width={7} height={5} fill="#166534" />
      <rect x={cx - 4} y={baseY - 31} width={8} height={4.5} rx={1} fill="#facc15" stroke={SHADOW} strokeWidth="0.6" />
      <rect x={cx - 8} y={baseY - 12} width={16} height={7} fill="#fefce8" />
      <rect x={cx - 8} y={baseY - 12} width={16} height={2} fill="#dc2626" />
      <rect x={cx - 6} y={baseY - 17} width={2} height={15} rx={1} fill="#fff" opacity="0.3" />
    </g>
  );
}

/** Стопка из двух книг. */
function BookStack({ cx, baseY }: { cx: number; baseY: number }) {
  return (
    <g>
      <rect x={cx - 22} y={baseY - 11} width={44} height={11} rx={1.5} fill="#dc2626" stroke={SHADOW} />
      <rect x={cx - 20} y={baseY - 9} width={40} height={7} fill="#fefce8" />
      <rect x={cx - 22} y={baseY - 11} width={4} height={11} fill="#991b1b" />
      <rect x={cx - 18} y={baseY - 22} width={36} height={11} rx={1.5} fill="#2563eb" stroke={SHADOW} />
      <rect x={cx - 16} y={baseY - 20} width={32} height={7} fill="#fefce8" />
      <rect x={cx - 18} y={baseY - 22} width={4} height={11} fill="#1e40af" />
      <rect x={cx + 6} y={baseY - 22} width={4} height={9} fill="#facc15" />
      <path d={`M ${cx + 6} ${baseY - 13} L ${cx + 8} ${baseY - 11} L ${cx + 10} ${baseY - 13} Z`} fill="#facc15" />
    </g>
  );
}

/** Новогодняя кружка с паром. */
function MugArt({ cx, baseY }: { cx: number; baseY: number }) {
  return (
    <g>
      <path
        d={`M ${cx + 11} ${baseY - 18} C ${cx + 21} ${baseY - 18}, ${cx + 21} ${baseY - 8}, ${cx + 11} ${baseY - 8}`}
        fill="none"
        stroke="#dc2626"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x={cx - 11} y={baseY - 22} width={22} height={22} rx={3} fill="#dc2626" stroke={SHADOW} />
      <rect x={cx - 11} y={baseY - 16} width={22} height={5} fill="#f8fafc" />
      <circle cx={cx - 4} cy={baseY - 13.5} r={1.2} fill="#f8fafc" />
      <circle cx={cx + 1} cy={baseY - 13.5} r={1.2} fill="#f8fafc" />
      <ellipse cx={cx} cy={baseY - 22} rx={11} ry={3} fill="#991b1b" />
      <ellipse cx={cx} cy={baseY - 22} rx={8} ry={2} fill="#451a03" />
      <path
        d={`M ${cx - 4} ${baseY - 25} q 2 -2.5 0 -5 M ${cx + 4} ${baseY - 25} q -2 -2.5 0 -5`}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.9"
      />
    </g>
  );
}

/** Новогодний носок. */
function SockArt({ cx, baseY }: { cx: number; baseY: number }) {
  return (
    <g>
      <rect x={cx - 13} y={baseY - 22} width={14} height={14} fill="#dc2626" />
      <ellipse cx={cx + 1} cy={baseY - 6} rx={11} ry={6.5} fill="#dc2626" />
      <ellipse cx={cx + 7} cy={baseY - 6} rx={4.5} ry={5.5} fill="#f8fafc" />
      <circle cx={cx - 11} cy={baseY - 9} r={3} fill="#f8fafc" />
      <rect x={cx - 13} y={baseY - 30} width={20} height={8} rx={2} fill="#f8fafc" stroke={SHADOW} />
      <rect x={cx - 13} y={baseY - 25} width={20} height={3} fill="#dc2626" />
    </g>
  );
}

/** Зажжённая свеча. */
function CandleArt({ cx, baseY }: { cx: number; baseY: number }) {
  return (
    <g>
      <circle cx={cx} cy={baseY - 25} r={9} fill="#fde047" opacity="0.2" />
      <rect x={cx - 8} y={baseY - 18} width={16} height={18} rx={2} fill="#fef3c7" stroke={SHADOW} />
      <ellipse cx={cx} cy={baseY - 18} rx={8} ry={2.5} fill="#fde68a" />
      <line x1={cx} y1={baseY - 18} x2={cx} y2={baseY - 21} stroke="#451a03" strokeWidth="1.5" />
      <ellipse cx={cx} cy={baseY - 25} rx={4} ry={5.5} fill="#f59e0b" />
      <ellipse cx={cx} cy={baseY - 24} rx={2} ry={3} fill="#fef08a" />
      <circle cx={cx - 3} cy={baseY - 10} r={1.8} fill="#16a34a" />
      <circle cx={cx + 3} cy={baseY - 10} r={1.8} fill="#16a34a" />
      <circle cx={cx} cy={baseY - 8} r={1.6} fill="#dc2626" />
    </g>
  );
}

/** Куча новогоднего печенья. */
function CookiePile({ cx, baseY }: { cx: number; baseY: number }) {
  const cookies: { dx: number; dy: number; r: number; rot: number }[] = [
    { dx: -15, dy: -1, r: 7, rot: 10 },
    { dx: 15, dy: -1, r: 7, rot: -12 },
    { dx: 0, dy: 0, r: 7.5, rot: 0 },
    { dx: -7, dy: -11, r: 6.5, rot: 20 },
    { dx: 8, dy: -10, r: 6.5, rot: -20 },
    { dx: 0, dy: -19, r: 6, rot: 5 },
  ];
  return (
    <g>
      {cookies.map((c, i) => (
        <g key={i} transform={`translate(${cx + c.dx} ${baseY + c.dy}) rotate(${c.rot})`}>
          <circle r={c.r} fill="#d97706" stroke="#92400e" strokeWidth="1" />
          <circle r={c.r * 0.62} fill="none" stroke="#fef3c7" strokeWidth="1.4" strokeDasharray="2.5 2" opacity="0.9" />
          <circle cx={-c.r * 0.25} cy={-c.r * 0.1} r={1.1} fill="#451a03" />
          <circle cx={c.r * 0.3} cy={c.r * 0.2} r={1.1} fill="#451a03" />
          <circle cx={c.r * 0.05} cy={-c.r * 0.35} r={1} fill="#dc2626" />
        </g>
      ))}
    </g>
  );
}

/** Наполнение открытого подарка — то, что положил Санта. */
function FillingContent({ filling, cx, baseY }: { filling: WrapFilling; cx: number; baseY: number }) {
  switch (filling) {
    case "toys":
      return <ToysPile cx={cx} baseY={baseY} />;
    case "champagne":
      return <ChampagneBottle cx={cx} baseY={baseY} />;
    case "book":
      return <BookStack cx={cx} baseY={baseY} />;
    case "mug":
      return <MugArt cx={cx} baseY={baseY} />;
    case "socks":
      return <SockArt cx={cx} baseY={baseY} />;
    case "candle":
      return <CandleArt cx={cx} baseY={baseY} />;
    case "cookies":
      return <CookiePile cx={cx} baseY={baseY} />;
    case "candy":
    default:
      return <CandyPile cx={cx} baseY={baseY} />;
  }
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
  filling,
}: {
  pal: Palette;
  width: number;
  variant: number;
  mystery: boolean;
  opened: boolean;
  filling: WrapFilling;
}) {
  const bh = BOX_HEIGHTS[Math.abs(variant) % BOX_HEIGHTS.length];
  const h = 36 + bh;
  const cy = 36 + bh / 2;

  if (opened) {
    // Крышка съехала вправо, бантик лежит рядом, внутри — наполнение Санты.
    const wideH = Math.max(h, 104);
    const top = 6;
    return (
      <svg
        viewBox={`-8 ${-top} 178 ${wideH + top}`}
        width={width * 1.5}
        height={(width * 1.5 * (wideH + top)) / 178}
        aria-hidden
      >
        <FillingContent filling={filling} cx={50} baseY={30} />
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
      {!mystery && <rect x="0" y={cy - 5} width={100} height="10" fill={pal.ribbon} />}
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
  filling,
}: {
  pal: Palette;
  width: number;
  opened: boolean;
  filling: WrapFilling;
}) {
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
          {/* наполнение горкой из пакета */}
          <FillingContent filling={filling} cx={50} baseY={34} />
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
