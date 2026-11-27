import Gift from "./Gift";
import type { GiftContent, PublicParticipant, WrapColor, WrapStyle } from "@/lib/constants";

type GiftItem = {
  recipientId: number;
  sent: boolean;
  accepted?: boolean;
  style?: WrapStyle | null;
  color?: WrapColor | null;
  contents?: GiftContent | null;
};

const ORNAMENTS: [number, number, string][] = [
  [200, 110, "#ef4444"], [168, 140, "#fde047"], [236, 135, "#3b82f6"],
  [150, 200, "#ec4899"], [205, 190, "#22d3ee"], [255, 205, "#f97316"],
  [120, 270, "#fde047"], [175, 255, "#ef4444"], [232, 265, "#a855f7"], [285, 280, "#22c55e"],
  [100, 345, "#3b82f6"], [150, 330, "#f97316"], [210, 345, "#fde047"], [265, 330, "#ec4899"], [310, 350, "#22d3ee"],
];

const LIGHTS = Array.from({ length: 28 }, (_, i) => {
  // three garland arcs
  const tier = i < 7 ? 0 : i < 16 ? 1 : 2;
  const local = tier === 0 ? i : tier === 1 ? i - 7 : i - 16;
  const count = tier === 0 ? 7 : tier === 1 ? 9 : 12;
  const t = local / (count - 1);
  const ranges = [
    { x1: 150, x2: 250, y1: 150, y2: 175 },
    { x1: 115, x2: 290, y1: 230, y2: 290 },
    { x1: 80, x2: 325, y1: 310, y2: 375 },
  ][tier];
  const x = ranges.x1 + (ranges.x2 - ranges.x1) * t;
  const y = ranges.y1 + (ranges.y2 - ranges.y1) * t + Math.sin(t * Math.PI) * 12;
  const colors = ["#fde047", "#f87171", "#60a5fa", "#4ade80", "#f0abfc"];
  return { x, y, c: colors[i % colors.length], d: (i % 5) * 0.3 };
});

export default function TreeScene({
  gifts,
  participants,
  targetId,
  meId,
  onGiftClick,
}: {
  gifts: GiftItem[];
  participants: PublicParticipant[];
  targetId?: number | null;
  meId?: number | null;
  onGiftClick?: (recipientId: number) => void;
}) {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const n = gifts.length;
  const scale = n <= 6 ? 1 : n <= 12 ? 0.85 : n <= 20 ? 0.72 : 0.6;
  const sentCount = gifts.filter((g) => g.sent).length;
  const receivedCount = gifts.filter((g) => g.accepted).length;

  return (
    <div className="relative z-30 mx-auto w-full max-w-3xl select-none overflow-visible">
      <svg
        viewBox="0 -28 400 468"
        style={{ overflow: "visible" }}
        className="pointer-events-none relative z-30 mx-auto block w-[78%] max-w-[440px] overflow-visible"
      >
        <defs>
          <linearGradient id="treeGrad" x1="0" x2="1">
            <stop offset="0%" stopColor="#166534" />
            <stop offset="55%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#14532d" />
          </linearGradient>
          <linearGradient id="trunkGrad" x1="0" x2="1">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>
          <radialGradient id="starHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#facc15" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* trunk */}
        <rect x="178" y="380" width="44" height="60" rx="4" fill="url(#trunkGrad)" />
        {/* tiers */}
        <path d="M200 40 L310 200 L90 200 Z" fill="url(#treeGrad)" />
        <path d="M200 110 L345 300 L55 300 Z" fill="url(#treeGrad)" />
        <path d="M200 190 L380 400 L20 400 Z" fill="url(#treeGrad)" />
        {/* snow edges */}
        <path d="M90 200 Q 120 190 150 200 Q 180 190 200 200 Q 230 190 260 200 Q 285 190 310 200" stroke="#f8fafc" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.85" />
        <path d="M55 300 Q 90 288 125 300 Q 165 288 200 300 Q 240 288 275 300 Q 310 288 345 300" stroke="#f8fafc" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.85" />
        <path d="M20 400 Q 65 386 110 400 Q 155 386 200 400 Q 245 386 290 400 Q 335 386 380 400" stroke="#f8fafc" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.9" />
        {/* garland wire */}
        <path d="M150 150 Q 200 190 250 175" stroke="#fef3c7" strokeWidth="1" fill="none" opacity="0.5" />
        <path d="M115 230 Q 200 290 290 290" stroke="#fef3c7" strokeWidth="1" fill="none" opacity="0.5" />
        <path d="M80 310 Q 200 385 325 375" stroke="#fef3c7" strokeWidth="1" fill="none" opacity="0.5" />
        {LIGHTS.map((l, i) => (
          <circle key={i} cx={l.x} cy={l.y} r="4" fill={l.c} className="twinkle" style={{ animationDelay: `${l.d}s` }} />
        ))}
        {ORNAMENTS.map(([x, y, c], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="9" fill={c} stroke="rgba(0,0,0,0.25)" />
            <circle cx={x - 3} cy={y - 3} r="2.5" fill="white" opacity="0.7" />
            <rect x={x - 2.5} y={y - 12} width="5" height="4" fill="#fcd34d" />
          </g>
        ))}
        {/* star halo + star */}
        <circle cx="200" cy="42" r="46" fill="url(#starHalo)" className="star-halo" />
        <g className="star-glow">
          <path
            d="M200 8 L209 32 L234 32 L214 47 L222 72 L200 57 L178 72 L186 47 L166 32 L191 32 Z"
            fill="#facc15"
            stroke="#fef08a"
            strokeWidth="2"
          />
        </g>
      </svg>

      {/* Gifts pile right under the tree */}
      <div className="relative z-30 -mt-[11%] px-2">
        <div
          className="absolute inset-x-[2%] bottom-0 top-[35%] -z-10 rounded-[50%] bg-gradient-to-b from-white/80 to-slate-200/70 blur-[2px]"
          aria-hidden
        />
        {n === 0 ? (
          <p className="pb-10 pt-16 text-center text-slate-500">Под ёлкой пока пусто</p>
        ) : (
          <div className="flex flex-wrap items-end justify-center gap-x-2 gap-y-3 pb-6">
            {gifts.map((g, i) => {
              const p = byId.get(g.recipientId);
              if (!p) return null;
              return (
                <Gift
                  key={g.recipientId}
                  index={i}
                  name={p.name}
                  avatar={p.avatar}
                  color={p.color}
                  sent={g.sent}
                  accepted={g.accepted}
                  wrapStyle={g.style}
                  wrapColor={g.color}
                  contents={g.contents}
                  scale={scale}
                  highlight={g.recipientId === targetId ? "target" : g.recipientId === meId ? "mine" : null}
                  onClick={onGiftClick ? () => onGiftClick(g.recipientId) : undefined}
                />
              );
            })}
          </div>
        )}
      </div>
      {n > 0 && (
        <div className="mt-3 space-y-1 text-center text-sm text-blue-100/80">
          <p>
            Отправлено подарков: <b className="text-white">{sentCount}</b> из {n}
          </p>
          <p>
            Получено подарков: <b className="text-white">{receivedCount}</b> из {n}
          </p>
        </div>
      )}
    </div>
  );
}
