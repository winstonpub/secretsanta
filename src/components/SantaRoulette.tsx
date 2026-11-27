"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import type { PublicParticipant } from "@/lib/constants";

/**
 * Рулетка подопечного: после жеребьёвки участники прокручиваются
 * в окошке и останавливаются на том, кого назначила жеребьёвка.
 * Показывается один раз для каждого назначения (запоминаем в localStorage).
 */
export default function SantaRoulette({
  participants,
  target,
  storageKey,
  onDone,
}: {
  participants: PublicParticipant[];
  target: PublicParticipant;
  storageKey: string;
  onDone: () => void;
}) {
  const pool = participants.length > 0 ? participants : [target];
  const [step, setStep] = useState(0);
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const targetIdx = Math.max(
      0,
      pool.findIndex((p) => p.id === target.id),
    );
    // Лента прокрутки: случайные участники, в конце — назначенный.
    const total = Math.max(26, pool.length * 4);
    const seq: number[] = [];
    for (let i = 0; i < total; i++) seq.push(Math.floor(Math.random() * pool.length));
    seq.push(targetIdx);
    let i = 0;
    const tick = () => {
      setCurrent(seq[i]);
      setStep(i + 1);
      i += 1;
      if (i >= seq.length) {
        setFinished(true);
        return;
      }
      // Замедление к концу: от 70 мс до ~420 мс.
      const progress = i / seq.length;
      const delay = 70 + progress * progress * 350;
      timer.current = setTimeout(tick, delay);
    };
    timer.current = setTimeout(tick, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish() {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {}
    onDone();
  }

  const shown = pool[current] ?? target;

  return (
    <section className="card relative space-y-4 overflow-hidden text-center">
      <div className="text-sm font-semibold uppercase tracking-wide text-red-600">
        🎰 Кому вы дарите подарок?
      </div>

      <div className="relative mx-auto max-w-xs overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-b from-slate-50 to-amber-50 py-2">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-white to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-white to-transparent" />
        {/* Стрелка-указатель */}
        <div className="absolute top-1/2 left-1 z-20 -translate-y-1/2 text-xl" aria-hidden>
          ▶
        </div>
        <div className="absolute top-1/2 right-1 z-20 -translate-y-1/2 text-xl" aria-hidden>
          ◀
        </div>
        <div key={step} className="roulette-item flex items-center justify-center gap-3 px-10 py-6">
          <Avatar avatar={shown.avatar} color={shown.color} size={56} />
          <div className="truncate text-2xl font-black">{shown.name}</div>
        </div>
      </div>

      {!finished ? (
        <>
          <p className="animate-pulse text-sm text-slate-500">Крутим барабан…</p>
          <button
            type="button"
            onClick={finish}
            className="mx-auto block text-sm text-blue-600 hover:underline"
          >
            Пропустить
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Рулетка остановилась — вы дарите подарок именно этому человеку! 🎉
          </p>
          <button className="btn btn-red w-full" onClick={finish}>
            Открыть подарок
          </button>
        </div>
      )}
    </section>
  );
}
