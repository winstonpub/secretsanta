"use client";

import { useState, type ReactNode } from "react";
import Avatar from "@/components/Avatar";
import type { RoomState, WishlistVisibility } from "@/lib/constants";

const VISIBILITY_OPTIONS: { value: WishlistVisibility; title: string; hint: string }[] = [
  {
    value: "all",
    title: "Всем участникам",
    hint: "Любой может нажать на подарок под ёлкой и прочитать пожелания.",
  },
  {
    value: "santa",
    title: "Только Санте",
    hint: "Пожелания видит только тот, кто дарит подарок этому человеку.",
  },
];

function Section({
  icon,
  title,
  open,
  onToggle,
  children,
}: {
  icon: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={`flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left font-semibold transition hover:bg-slate-50 ${
          open ? "rounded-b-none border-b border-slate-200 bg-slate-50" : ""
        }`}
      >
        <span>
          {icon} {title}
        </span>
        <svg
          viewBox="0 0 20 20"
          className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="space-y-3 p-3">{children}</div>}
    </div>
  );
}

export default function AdminPanel({
  state,
  act,
}: {
  state: RoomState;
  act: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [drawOpen, setDrawOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const people = state.participants;
  const pairs = state.assignments ?? [];
  const bySanta = new Map(pairs.map((a) => [a.santaId, a]));
  const byRecipient = new Map(pairs.map((a) => [a.recipientId, a]));
  const nameOf = (id: number) => people.find((p) => p.id === id)?.name ?? "?";
  const visibility = state.room.wishlistVisibility;

  async function run(payload: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    await act(payload);
    setBusy(false);
  }

  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">👑 Панель организатора</h2>
        <span className="text-sm text-slate-500">
          Назначено {pairs.length}/{people.length} · отправлено {pairs.filter((p) => p.sent).length}
        </span>
      </div>

      <Section icon="🎲" title="Жеребьёвка" open={drawOpen} onToggle={() => setDrawOpen((v) => !v)}>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn btn-red text-sm"
            disabled={busy || people.length < 2}
            onClick={() =>
              run(
                { action: "draw", mode: "full" },
                pairs.length
                  ? "Перемешать всех заново? Текущие пары и отметки об отправке будут сброшены."
                  : undefined,
              )
            }
          >
            🎲 Рандом для всех
          </button>
          <button
            className="btn btn-green text-sm"
            disabled={busy || people.length < 2 || pairs.length === people.length}
            onClick={() => run({ action: "draw", mode: "fill" })}
            title="Сохранить ручные назначения и случайно распределить оставшихся"
          >
            🎯 Рандом для оставшихся
          </button>
          <button
            className="btn btn-ghost text-sm"
            disabled={busy || pairs.length === 0}
            onClick={() => run({ action: "reset" }, "Сбросить все назначения?")}
          >
            ♻️ Сбросить
          </button>
          <button className="btn btn-ghost text-sm" onClick={() => setRevealed((v) => !v)}>
            {revealed ? "🙈 Скрыть" : "👀 Показать пары"}
          </button>
        </div>
        {people.length < 2 ? (
          <p className="text-sm text-amber-700">Пригласите хотя бы ещё одного участника.</p>
        ) : (
          <p className="text-xs text-slate-500">
            Назначьте Санту вручную в списке ниже или используйте рандом. Пары видны только вам.
          </p>
        )}

        <div
          className={`space-y-2 transition ${revealed ? "" : "pointer-events-none select-none blur-md"}`}
          aria-hidden={!revealed}
        >
          {people.map((santa) => {
            const a = bySanta.get(santa.id);
            return (
              <div
                key={santa.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2"
              >
                <div className="flex min-w-[130px] flex-1 items-center gap-2">
                  <Avatar avatar={santa.avatar} color={santa.color} size={30} />
                  <span className="truncate font-medium">
                    {santa.name}
                    {santa.id === state.room.ownerId && " 👑"}
                  </span>
                </div>
                <span className="text-slate-400">🎅 →</span>
                <select
                  className="input !w-auto min-w-[160px] flex-1 !py-1.5"
                  disabled={busy}
                  value={a?.recipientId ?? ""}
                  onChange={(e) =>
                    run({
                      action: "assign",
                      santaId: santa.id,
                      recipientId: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                >
                  <option value="">— не назначен —</option>
                  {people
                    .filter((p) => p.id !== santa.id)
                    .map((p) => {
                      const taken = byRecipient.get(p.id);
                      const takenBy = taken && taken.santaId !== santa.id ? nameOf(taken.santaId) : null;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.avatar} {p.name}
                          {takenBy ? ` (сейчас у ${takenBy})` : ""}
                        </option>
                      );
                    })}
                </select>
                {a && (
                  <button
                    className={`btn !px-3 !py-1.5 text-sm ${a.sent ? "btn-green" : "btn-ghost"}`}
                    disabled={busy}
                    onClick={() => run({ action: "sent", recipientId: a.recipientId, sent: !a.sent })}
                    title="Отметить отправку за Санту"
                  >
                    {a.sent ? "✓ Отправлен" : "📦 Не отправлен"}
                  </button>
                )}
                {santa.id !== state.room.ownerId && (
                  <button
                    className="btn btn-ghost !px-2 !py-1.5 text-sm text-red-600"
                    disabled={busy}
                    title="Удалить участника"
                    onClick={() =>
                      run({ action: "kick", participantId: santa.id }, `Удалить ${santa.name} из комнаты?`)
                    }
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        icon="⚙️"
        title="Настройка комнаты"
        open={settingsOpen}
        onToggle={() => setSettingsOpen((v) => !v)}
      >
        <fieldset disabled={busy} className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-slate-700">
            Кто видит пожелания на подарке
          </legend>
          {VISIBILITY_OPTIONS.map((o) => (
            <label
              key={o.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition ${
                visibility === o.value
                  ? "border-red-500 bg-red-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="wishlist-visibility"
                className="mt-1 accent-red-600"
                checked={visibility === o.value}
                onChange={() => run({ action: "wishlistVisibility", value: o.value })}
              />
              <span>
                <span className="block font-semibold">{o.title}</span>
                <span className="block text-xs text-slate-500">{o.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </Section>
    </section>
  );
}
