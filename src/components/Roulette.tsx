"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import type { PublicParticipant } from "@/lib/constants";

const ITEM_H = 64;
const ROWS = 3;
const LAPS = 6;
const SPIN_MS = 5200;

/**
 * Рулетка после жеребьёвки: все участники прокручиваются и останавливаются
 * на получателе. Результат уже выбран сервером — рулетка лишь показывает его.
 */
export default function Roulette({
  people,
  targetId,
  onDone,
}: {
  people: PublicParticipant[];
  targetId: number;
  onDone: () => void;
}) {
  const [go, setGo] = useState(false);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  const n = people.length;
  const targetIdx = Math.max(0, people.findIndex((p) => p.id === targetId));
  const finalIdx = (LAPS - 2) * n + targetIdx;
  // Остановка: нужный участник встаёт в среднюю строку окна.
  const offset = -(finalIdx * ITEM_H) + ITEM_H;

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (n === 0 || reduce) {
      doneRef.current();
      return;
    }
    const start = setTimeout(() => setGo(true), 80);
    const end = setTimeout(() => doneRef.current(), SPIN_MS + 1000);
    return () => {
      clearTimeout(start);
      clearTimeout(end);
    };
  }, [n]);

  const strip = Array.from({ length: LAPS * n }, (_, i) => people[i % n]);

  return (
    <section className="card space-y-4 text-center">
      <div className="text-sm font-semibold uppercase tracking-wide text-red-600">Жеребьёвка</div>
      <p className="text-sm text-slate-600">Крутим барабан… кто достанется вам?</p>
      <div
        className="relative mx-auto w-full max-w-xs overflow-hidden rounded-2xl bg-slate-100"
        style={{ height: ROWS * ITEM_H }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 z-10 border-y-4 border-amber-400 bg-amber-300/25"
          style={{ top: ITEM_H, height: ITEM_H }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1/3 bg-gradient-to-b from-slate-100 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-1/3 bg-gradient-to-t from-slate-100 to-transparent" />
        <div
          style={{
            transform: `translateY(${go ? offset : 0}px)`,
            transition: go ? `transform ${SPIN_MS}ms cubic-bezier(0.15, 0.6, 0.1, 1)` : "none",
          }}
        >
          {strip.map((p, i) => (
            <div key={i} className="flex items-center gap-3 px-4" style={{ height: ITEM_H }}>
              <Avatar avatar={p.avatar} color={p.color} size={40} />
              <span className="truncate text-left text-lg font-bold text-slate-900">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
