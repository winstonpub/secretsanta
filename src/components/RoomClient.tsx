"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import AdminPanel from "./AdminPanel";
import AuthModal from "./AuthModal";
import Avatar from "./Avatar";
import GiftArt from "./GiftArt";
import InviteModal from "./InviteModal";
import ProfilePicker, { type Profile } from "./ProfilePicker";
import Roulette from "./Roulette";
import TreeScene from "./TreeScene";
import {
  AVATARS,
  COLORS,
  GIFT_CONTENTS,
  WRAP_COLORS,
  WRAP_COLOR_KEYS,
  formatBudget,
  isSameParticipant,
  type GiftState,
  type PublicParticipant,
  type RoomState,
  type WrapColor,
  type WrapStyle,
} from "@/lib/constants";
import * as roomApi from "@/lib/roomApi";
import { siteBasePath } from "@/lib/supabase";

type Act = (payload: Record<string, unknown>) => Promise<boolean>;
const DUPLICATE_HINT = "Такой участник уже есть в комнате — выберите другой аватар, цвет или имя.";

export default function RoomClient({ code }: { code: string }) {
  const [state, setState] = useState<RoomState | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [authNeeded, setAuthNeeded] = useState<{ configured: boolean } | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");

  const load = useCallback(async () => {
    const res = await roomApi.getRoomState(code);
    if (res.ok) {
      setAuthNeeded(null);
      setState(res.state);
      return;
    }
    if (res.reason === "not-found") {
      setNotFound(true);
      return;
    }
    if (res.reason === "need-auth") {
      setState(null);
      setAuthNeeded({ configured: roomApi.isConfigured() });
    }
    // Ошибки сети молча ждём: опрос повторится через 4 секунды.
  }, [code]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    setInviteUrl(`${window.location.origin}${siteBasePath()}/room?code=${code}`);
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load, code]);

  // Запоминаем комнату для блока «Мои комнаты» на главной.
  useEffect(() => {
    if (!state?.me) return;
    try {
      const list: { code: string; name: string }[] = JSON.parse(localStorage.getItem("ss_recent") || "[]");
      const next = [{ code, name: state.room.name }, ...list.filter((r) => r.code !== code)].slice(0, 10);
      localStorage.setItem("ss_recent", JSON.stringify(next));
    } catch {}
  }, [state?.me, state?.room.name, code]);

  const act = useCallback<Act>(
    async (payload) => {
      setError("");
      const res = await roomApi.roomAction(code, payload);
      if (res.ok) {
        await load();
        return true;
      }
      if (res.reason === "need-auth") {
        setAuthNeeded({ configured: roomApi.isConfigured() });
        return false;
      }
      if (res.reason === "not-found") {
        setNotFound(true);
        return false;
      }
      setError(res.reason === "network" ? roomApi.networkErrorText() : res.error);
      return false;
    },
    [code, load],
  );

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  if (notFound) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="card">
          <div className="text-5xl">🎄❓</div>
          <h1 className="mt-3 text-2xl font-bold">Комната {code} не найдена</h1>
          <Link href="/" className="btn btn-red mt-5">На главную</Link>
        </div>
      </main>
    );
  }

  if (authNeeded) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Link href="/" className="relative z-10 text-sm text-blue-200 hover:underline">← Тайный Санта</Link>
        <AuthModal
          configured={authNeeded.configured}
          message={`Чтобы войти в комнату ${code}, войдите в профиль или зарегистрируйтесь.`}
          onAuth={() => {
            setAuthNeeded(null);
            load();
          }}
          footer={
            <Link href="/" className="block text-center text-sm text-blue-100 hover:underline">
              ← Вернуться на главную
            </Link>
          }
        />
      </main>
    );
  }

  if (!state) {
    return <main className="py-32 text-center text-blue-100">Загружаем ёлку... 🎄</main>;
  }

  const { room, me, isOwner, participants, gifts, myTarget, viewer } = state;
  const owner = participants.find((p) => p.id === room.ownerId);
  const selectedPerson = selected === null ? null : participants.find((p) => p.id === selected) ?? null;
  // Подарок, который отправили лично мне: показываем блок «Вам подарок».
  const myGift = me ? gifts.find((g) => g.recipientId === me.id) : undefined;
  const budget = formatBudget(room.budget);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="relative z-10 flex items-center justify-between gap-3">
        <Link href="/" className="text-sm text-blue-200 hover:underline">← Тайный Санта</Link>
        {isOwner && (
          <button className="btn btn-red !py-2 text-sm" onClick={() => setInviteOpen(true)}>
            🔗 Пригласить
          </button>
        )}
      </div>

      <header className="relative z-10 mb-6 mt-3 text-center">
        <RoomTitle
          name={room.name}
          editable={isOwner}
          onSave={(name) => act({ action: "rename", name })}
        />
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {owner && <Chip tone="amber">👑 Организатор: {owner.name}</Chip>}
          <Chip tone="white">👥 Участников: {participants.length}</Chip>
          {budget.text && (
            <Chip tone="emerald">
              💰 Бюджет: {budget.text}
              {budget.numeric && " ₽"}
            </Chip>
          )}
          {room.eventDate && (
            <Chip tone="sky">
              📅{" "}
              {new Date(room.eventDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
            </Chip>
          )}
        </div>
      </header>

      {error && (
        <div
          className="relative z-20 mb-4 rounded-xl bg-red-600/90 px-4 py-2 text-white"
          onClick={() => setError("")}
        >
          {error}
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="relative z-30">
          <TreeScene
            gifts={gifts}
            participants={participants}
            targetId={myTarget?.recipient.id}
            meId={me?.id}
            onGiftClick={setSelected}
          />
          {selectedPerson && (
            <GiftInfo
              p={selectedPerson}
              gift={gifts.find((g) => g.recipientId === selectedPerson.id)}
              hiddenWishlist={room.wishlistVisibility === "santa" && selectedPerson.id !== me?.id && selectedPerson.id !== myTarget?.recipient.id}
              onClose={() => setSelected(null)}
            />
          )}
        </div>

        <div className="relative z-20 space-y-5">
          {!me ? (
            <JoinCard act={act} roomName={room.name} displayName={viewer.displayName} participants={participants} />
          ) : (
            <>
              {myGift?.sent && <IncomingGift gift={myGift} act={act} flash={flash} />}
              <TargetSection state={state} act={act} flash={flash} />
              <ProfileCard
                me={me}
                participants={participants}
                onlySanta={room.wishlistVisibility === "santa"}
                act={act}
                flash={flash}
              />
            </>
          )}

          <section className="card space-y-3">
            <h2 className="text-lg font-bold">Участники ({participants.length})</h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {participants.map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2">
                  <Avatar avatar={p.avatar} color={p.color} size={30} />
                  <span className="truncate text-sm font-medium">
                    {p.name}
                    {p.id === room.ownerId && " 👑"}
                    {p.id === me?.id && " (вы)"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {me && isOwner && <AdminPanel state={state} act={act} />}
        </div>
      </div>

      {inviteOpen && (
        <InviteModal code={room.code} url={inviteUrl} roomName={room.name} onClose={() => setInviteOpen(false)} />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2 text-white shadow-xl">
          {toast}
        </div>
      )}
    </main>
  );
}

function PencilIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

/** Название комнаты по центру. Организатор видит карандаш и может его поменять. */
function RoomTitle({
  name,
  editable,
  onSave,
}: {
  name: string;
  editable: boolean;
  onSave: (name: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center justify-center gap-3">
        <h1 className="break-words text-4xl font-black tracking-tight sm:text-5xl">{name}</h1>
        {editable && (
          <button
            type="button"
            aria-label="Изменить название комнаты"
            title="Изменить название"
            onClick={() => {
              setValue(name);
              setEditing(true);
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center justify-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const clean = value.trim();
        if (!clean) return;
        setBusy(true);
        const ok = await onSave(clean);
        setBusy(false);
        if (ok) setEditing(false);
      }}
    >
      <input
        autoFocus
        className="input max-w-md text-center text-xl font-bold"
        maxLength={60}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Новое название комнаты"
      />
      <button className="btn btn-green !py-2" disabled={busy || !value.trim()}>
        Сохранить
      </button>
      <button type="button" className="btn btn-ghost !py-2" onClick={() => setEditing(false)}>
        Отмена
      </button>
    </form>
  );
}

const CHIP_TONES = {
  amber: "bg-amber-300 text-slate-900",
  white: "bg-white text-slate-900",
  emerald: "bg-emerald-300 text-slate-900",
  sky: "bg-sky-300 text-slate-900",
} as const;

function Chip({ tone, children }: { tone: keyof typeof CHIP_TONES; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-base font-bold shadow-lg sm:text-lg ${CHIP_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

function GiftInfo({
  p,
  gift,
  hiddenWishlist,
  onClose,
}: {
  p: PublicParticipant;
  gift?: GiftState;
  hiddenWishlist: boolean;
  onClose: () => void;
}) {
  const look =
    gift?.sent && gift.style && gift.color
      ? `${gift.style === "bag" ? "подарочный пакет" : "подарок с бантом"}, ${WRAP_COLORS[gift.color].label.toLowerCase()}`
      : null;
  return (
    <div className="card mx-auto mt-4 max-w-md">
      <div className="flex items-start gap-3">
        <Avatar avatar={p.avatar} color={p.color} size={48} />
        <div className="min-w-0 flex-1">
          <div className="font-bold">Подарок для {p.name}</div>
          <div className="text-sm text-slate-600">
            {gift?.sent
              ? `🎉 Санта отправил подарок${look ? ` — ${look}` : ""}`
              : gift?.assigned
                ? "⏳ Санта назначен, подарок ещё не отправлен"
                : "❔ Санта ещё не назначен"}
          </div>
          {gift?.accepted && gift.contents && (
            <div className="text-sm text-slate-700">Внутри: {GIFT_CONTENTS[gift.contents].label.toLowerCase()}</div>
          )}
          {hiddenWishlist ? (
            <p className="mt-2 rounded-lg bg-slate-100 p-2 text-sm text-slate-600">
              🔒 Пожелания этого участника видит только его Санта
            </p>
          ) : (
            p.wishlist && (
              <p className="mt-2 whitespace-pre-wrap rounded-lg bg-amber-50 p-2 text-sm">📝 {p.wishlist}</p>
            )
          )}
        </div>
        <button className="text-slate-400 hover:text-slate-700" onClick={onClose} aria-label="Закрыть">
          ✕
        </button>
      </div>
    </div>
  );
}

function JoinCard({
  act,
  roomName,
  displayName,
  participants,
}: {
  act: Act;
  roomName: string;
  displayName: string;
  participants: PublicParticipant[];
}) {
  const [look, setLook] = useState(() => ({
    avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));
  const [busy, setBusy] = useState(false);
  const profile = { name: displayName, ...look };
  const isDuplicate = participants.some((p) => isSameParticipant(p, profile));

  return (
    <form
      className="card space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (isDuplicate) return;
        setBusy(true);
        await act({ action: "join", ...look });
        setBusy(false);
      }}
    >
      <h2 className="text-xl font-bold">Присоединиться к «{roomName}»</h2>
      <p className="text-sm text-slate-600">Выберите аватар и цвет — так вас узнают под ёлкой.</p>
      <ProfilePicker lockName value={profile} onChange={(p) => setLook({ avatar: p.avatar, color: p.color })} />
      {isDuplicate && <p className="text-sm font-medium text-red-600">{DUPLICATE_HINT}</p>}
      <button className="btn btn-red w-full" disabled={busy || isDuplicate}>
        🎁 Войти в комнату
      </button>
    </form>
  );
}

/** Упаковка подарка: выбирает Санта. */
function WrapPicker({
  style,
  color,
  onChange,
}: {
  style: WrapStyle;
  color: WrapColor;
  onChange: (style: WrapStyle, color: WrapColor) => void;
}) {
  const styles: { value: WrapStyle; label: string }[] = [
    { value: "bag", label: "Пакет" },
    { value: "box", label: "Подарок" },
  ];
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-600">Как будет выглядеть подарок под ёлкой</div>
      <div className="grid grid-cols-2 gap-3">
        {styles.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={style === o.value}
            onClick={() => onChange(o.value, color)}
            className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition ${
              style === o.value ? "border-red-500 bg-red-50" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <span className="flex h-24 items-end justify-center">
              <GiftArt kind={o.value} color={color} width={o.value === "bag" ? 68 : 84} />
            </span>
            <span className="text-sm font-semibold">{o.label}</span>
          </button>
        ))}
      </div>
      <div className="mb-1.5 mt-3 text-xs font-medium text-slate-500">
        Цвет: {WRAP_COLORS[color].label.toLowerCase()}
      </div>
      <div className="flex flex-wrap gap-2">
        {WRAP_COLOR_KEYS.map((c) => (
          <button
            key={c}
            type="button"
            title={WRAP_COLORS[c].label}
            aria-label={WRAP_COLORS[c].label}
            aria-pressed={color === c}
            onClick={() => onChange(style, c)}
            className={`h-8 w-8 rounded-full border border-slate-300 transition ${
              color === c ? "ring-2 ring-slate-900 ring-offset-2" : "hover:scale-110"
            }`}
            style={{ background: WRAP_COLORS[c].box }}
          />
        ))}
      </div>
    </div>
  );
}

/** Подарок, который отправили мне. Принять можно только отправленный. */
function IncomingGift({
  gift,
  act,
  flash,
}: {
  gift: GiftState;
  act: Act;
  flash: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const opened = gift.accepted;

  return (
    <section
      className={`card relative space-y-3 overflow-hidden ring-2 ${opened ? "ring-emerald-400" : "ring-amber-300"}`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <GiftArt
            kind={gift.style ?? "box"}
            color={gift.color ?? "red"}
            width={70}
            opened={opened}
            contents={gift.contents}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={`text-sm font-semibold uppercase tracking-wide ${
              opened ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            Вам подарок
          </div>
          <p className="mt-1 text-sm text-slate-700">
            {opened ? "Подарок принят" : "Кто-то из комнаты отправил вам подарок. Он ждёт вас под ёлкой."}
          </p>
        </div>
      </div>
      {opened ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm font-semibold text-emerald-700">
          ✓ Подарок получен
        </p>
      ) : (
        <button
          className="btn btn-green w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const ok = await act({ action: "accept" });
            setBusy(false);
            if (ok) flash("Подарок принят — загляните под ёлку 🎁");
          }}
        >
          🎁 Принять
        </button>
      )}
    </section>
  );
}

/**
 * Блок «Вы — Тайный Санта для». В первый раз после жеребьёвки показываем рулетку,
 * которая останавливается на получателе. Дальше — обычная карточка.
 */
function TargetSection({ state, act, flash }: { state: RoomState; act: Act; flash: (m: string) => void }) {
  const t = state.myTarget;
  const storageKey = t ? `ss_reveal_${state.room.code}_${t.assignmentId}` : "";
  const [reveal, setReveal] = useState<{ key: string; done: boolean } | null>(null);

  useEffect(() => {
    if (!storageKey) return;
    let done = false;
    try {
      done = window.localStorage.getItem(storageKey) === "1";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReveal({ key: storageKey, done });
  }, [storageKey]);

  if (!t) return <TargetCard state={state} act={act} flash={flash} />;

  const seen = reveal && reveal.key === storageKey ? reveal.done : null;
  if (seen === null) {
    return <section className="card text-center text-sm text-slate-500">Готовим жеребьёвку…</section>;
  }
  if (!seen) {
    return (
      <Roulette
        key={storageKey}
        people={state.participants}
        targetId={t.recipient.id}
        onDone={() => {
          try {
            window.localStorage.setItem(storageKey, "1");
          } catch {}
          setReveal({ key: storageKey, done: true });
        }}
      />
    );
  }
  return <TargetCard key={t.assignmentId} state={state} act={act} flash={flash} />;
}

function TargetCard({ state, act, flash }: { state: RoomState; act: Act; flash: (m: string) => void }) {
  const t = state.myTarget;
  const [wrap, setWrap] = useState<{ style: WrapStyle; color: WrapColor }>(() => ({
    style: t?.style ?? "box",
    color: t?.color ?? "red",
  }));
  // После отправки карточка сворачивается в компактную строку.
  const [open, setOpen] = useState(() => !t?.sent);

  if (!t) {
    return (
      <section className="card text-center">
        <div className="text-4xl">🎅</div>
        <h2 className="mt-2 text-lg font-bold">Жеребьёвка ещё не проведена</h2>
        <p className="text-sm text-slate-600">
          {state.isOwner
            ? "Откройте «Жеребьёвку» в панели организатора и распределите пары."
            : "Ждём, пока организатор назначит, кому вы дарите подарок."}
        </p>
      </section>
    );
  }

  async function changeWrap(next: { style: WrapStyle; color: WrapColor }) {
    const prev = wrap;
    setWrap(next);
    // Наполнение не выбирается — в подарок всегда закладываются конфеты.
    const ok = await act({ action: "wrap", style: next.style, color: next.color, contents: "candy" });
    if (!ok) setWrap(prev);
  }

  const hidden = state.room.wishlistVisibility === "santa";

  if (t.sent && !open) {
    return (
      <section className="card !p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar avatar={t.recipient.avatar} color={t.recipient.color} size={34} />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-green-600">
                Подарок отправлен
              </div>
              <div className="truncate font-bold text-slate-900">{t.recipient.name}</div>
            </div>
          </div>
          <button
            type="button"
            aria-expanded={false}
            aria-label="Развернуть блок подарка"
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
              <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="card relative space-y-4 overflow-hidden">
      <div className="absolute -top-6 -right-6 text-8xl opacity-10">🎁</div>
      <div>
        <div className="text-sm font-semibold uppercase tracking-wide text-red-600">Вы — Тайный Санта для</div>
        <div className="mt-2 flex items-center gap-3">
          <Avatar avatar={t.recipient.avatar} color={t.recipient.color} size={56} />
          <div className="text-2xl font-black">{t.recipient.name}</div>
        </div>
      </div>
      <div className="rounded-xl bg-amber-50 p-3 text-sm">
        <div className="mb-1 font-semibold text-amber-800">
          📝 Пожелания{hidden && <span className="font-normal text-amber-700"> · видите только вы</span>}
        </div>
        <p className="whitespace-pre-wrap text-slate-700">
          {t.recipient.wishlist || "Пока ничего не написано — сюрприз!"}
        </p>
      </div>
      <WrapPicker
        style={wrap.style}
        color={wrap.color}
        onChange={(style, color) => changeWrap({ style, color })}
      />
      {t.sent && open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mx-auto flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          Свернуть блок
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
            <path d="M5 12.5 10 7.5 15 12.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <button
        className={`btn w-full ${t.sent ? "btn-ghost" : "btn-green"}`}
        onClick={async () => {
          const next = !t.sent;
          if (await act({ action: "sent", sent: next })) {
            flash(next ? "Подарок отмечен как отправленный 🎉" : "Отметка снята");
            if (next) setOpen(false);
          }
        }}
      >
        {t.sent ? "↩️ Отменить отметку «отправлен»" : "📦 Я отправил подарок"}
      </button>
      {t.sent && (
        <p className="-mt-2 text-center text-xs text-slate-500">
          Упаковку можно поменять — под ёлкой она обновится сразу.
        </p>
      )}
    </section>
  );
}

/** Редактирование своих данных в комнате: имя, аватар, цвет и пожелания. */
function ProfileCard({
  me,
  participants,
  onlySanta,
  act,
  flash,
}: {
  me: PublicParticipant;
  participants: PublicParticipant[];
  onlySanta: boolean;
  act: Act;
  flash: (m: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<Profile>({ name: me.name, avatar: me.avatar, color: me.color });
  const [wishlist, setWishlist] = useState(me.wishlist);
  const name = profile.name.trim();
  const nameMissing = editing && !name;
  const isDuplicate =
    editing && Boolean(name) && participants.some((p) => p.id !== me.id && isSameParticipant(p, { ...profile, name }));

  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar avatar={me.avatar} color={me.color} size={36} />
          <h2 className="truncate text-lg font-bold">{me.name}</h2>
        </div>
        <button
          className="shrink-0 text-sm font-semibold text-blue-600 hover:underline"
          onClick={() => {
            setProfile({ name: me.name, avatar: me.avatar, color: me.color });
            setEditing((v) => !v);
          }}
        >
          {editing ? "Закрыть" : "✏️ Редактировать"}
        </button>
      </div>
      {editing && <ProfilePicker value={profile} onChange={setProfile} />}
      {isDuplicate && <p className="text-sm font-medium text-red-600">{DUPLICATE_HINT}</p>}
      <div>
        <div className="mb-1 text-sm font-semibold text-slate-600">Мои пожелания для Санты</div>
        <textarea
          className="input min-h-[80px]"
          maxLength={1000}
          placeholder="Например: люблю чай, книги про космос, тёплые носки..."
          value={wishlist}
          onChange={(e) => setWishlist(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">
          {onlySanta ? "🔒 Ваши пожелания видит только ваш Санта." : "Ваши пожелания видят все участники комнаты."}
        </p>
      </div>
      <button
        className="btn btn-red w-full"
        disabled={isDuplicate || nameMissing}
        onClick={async () => {
          const payload = editing
            ? { action: "profile", wishlist, name, avatar: profile.avatar, color: profile.color }
            : { action: "profile", wishlist };
          if (await act(payload)) {
            setEditing(false);
            flash("Сохранено");
          }
        }}
      >
        Сохранить
      </button>
    </section>
  );
}
