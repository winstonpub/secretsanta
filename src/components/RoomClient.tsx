"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AuthModal from "@/components/AuthModal";
import Avatar from "@/components/Avatar";
import GiftArt from "@/components/GiftArt";
import InviteModal from "@/components/InviteModal";
import ProfilePicker from "@/components/ProfilePicker";
import SantaRoulette from "@/components/SantaRoulette";
import TreeScene from "@/components/TreeScene";
import {
  AVATARS,
  COLORS,
  DEFAULT_FILLING,
  WRAP_COLORS,
  WRAP_COLOR_KEYS,
  WRAP_FILLINGS,
  WRAP_FILLING_KEYS,
  isSameParticipant,
  type GiftState,
  type PublicParticipant,
  type RoomState,
  type WrapColor,
  type WrapFilling,
  type WrapStyle,
} from "@/lib/constants";
import AdminPanel from "./AdminPanel";
import * as roomApi from "@/lib/roomApi";
import { siteBasePath } from "@/lib/supabase";

type Act = (payload: Record<string, unknown>) => Promise<boolean>;
const DUPLICATE_HINT = "Такой участник уже есть в комнате — выберите другой аватар или цвет.";

export default function RoomClient({ code }: { code: string }) {
  const [state, setState] = useState<RoomState | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [authNeeded, setAuthNeeded] = useState<{ configured: boolean } | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);

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

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="relative z-10 mb-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-sm text-blue-200 hover:underline">← Тайный Санта</Link>
          {isOwner ? (
            <button className="btn btn-red" onClick={() => setInviteOpen(true)}>
              🔗 Пригласить
            </button>
          ) : (
            <span />
          )}
        </div>
        <div className="mt-2 text-center">
          <div className="flex items-center justify-center gap-2">
            {editingName ? (
              <form
                className="flex w-full max-w-md items-center gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!nameDraft.trim() || renameBusy) return;
                  setRenameBusy(true);
                  const ok = await act({ action: "rename", name: nameDraft.trim() });
                  setRenameBusy(false);
                  if (ok) {
                    setEditingName(false);
                    flash("Название комнаты обновлено");
                  }
                }}
              >
                <input
                  className="input !py-1.5 text-center text-2xl font-black"
                  value={nameDraft}
                  maxLength={60}
                  autoFocus
                  onChange={(e) => setNameDraft(e.target.value)}
                  aria-label="Новое название комнаты"
                />
                <button className="btn btn-green shrink-0 !px-3 !py-1.5" disabled={renameBusy || !nameDraft.trim()}>
                  ✓
                </button>
                <button
                  type="button"
                  className="btn btn-ghost shrink-0 !px-3 !py-1.5"
                  onClick={() => setEditingName(false)}
                  aria-label="Отмена"
                >
                  ✕
                </button>
              </form>
            ) : (
              <>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{room.name}</h1>
                {isOwner && (
                  <button
                    type="button"
                    title="Переименовать комнату"
                    aria-label="Переименовать комнату"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg text-white transition hover:bg-white/30"
                    onClick={() => {
                      setNameDraft(room.name);
                      setEditingName(true);
                    }}
                  >
                    ✏️
                  </button>
                )}
              </>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            {owner && (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-300/30 px-5 py-2 text-base font-bold text-amber-50 shadow-lg ring-2 ring-amber-300/70 sm:text-lg">
                <span aria-hidden className="text-xl">👑</span>
                <span className="font-normal text-amber-100/90">Организатор:</span>
                {owner.name}
              </span>
            )}
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2 text-base font-bold text-white shadow-lg ring-2 ring-white/50 sm:text-lg">
              <span aria-hidden className="text-xl">👥</span>
              <span className="font-normal text-blue-100/90">Участников:</span>
              {participants.length}
            </span>
            {room.budget && (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/30 px-5 py-2 text-base font-bold text-emerald-50 shadow-lg ring-2 ring-emerald-300/70 sm:text-lg">
                <span aria-hidden className="text-xl">💰</span>
                <span className="font-normal text-emerald-100/90">Бюджет:</span>
                {room.budget}
                {/₽/.test(room.budget) ? "" : " ₽"}
              </span>
            )}
            {room.eventDate && (
              <span className="inline-flex items-center gap-2 rounded-full bg-sky-400/30 px-5 py-2 text-base font-bold text-sky-50 shadow-lg ring-2 ring-sky-300/70 sm:text-lg">
                <span aria-hidden className="text-xl">📅</span>
                {new Date(room.eventDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
              </span>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="relative z-20 mb-4 rounded-xl bg-red-600/90 px-4 py-2 text-white" onClick={() => setError("")}>
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
              <TargetWithRoulette
                key={myTarget?.assignmentId ?? "none"}
                code={code}
                state={state}
                act={act}
                flash={flash}
              />
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
  return (
    <div className="card mx-auto mt-4 max-w-md">
      <div className="flex items-start gap-3">
        <Avatar avatar={p.avatar} color={p.color} size={48} />
        <div className="min-w-0 flex-1">
          <div className="font-bold">Подарок для {p.name}</div>
          <div className="text-sm text-slate-600">
            {gift?.accepted
              ? "🍬 Подарок получен"
              : gift?.sent
                ? "🎉 Санта отправил подарок"
                : gift?.assigned
                  ? "⏳ Санта назначен, подарок ещё не отправлен"
                  : "❔ Санта ещё не назначен"}
          </div>
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
        <button className="text-slate-400 hover:text-slate-700" onClick={onClose} aria-label="Закрыть">✕</button>
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

function WrapPicker({
  style,
  color,
  filling,
  onChange,
}: {
  style: WrapStyle;
  color: WrapColor;
  filling: WrapFilling;
  onChange: (style: WrapStyle, color: WrapColor, filling: WrapFilling) => void;
}) {
  const options: { value: WrapStyle; label: string }[] = [
    { value: "bag", label: "Пакет" },
    { value: "box", label: "Подарок" },
  ];
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-600">Как будет выглядеть подарок под ёлкой</div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={style === o.value}
            onClick={() => onChange(o.value, color, filling)}
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
            onClick={() => onChange(style, c, filling)}
            className={`h-8 w-8 rounded-full border border-slate-300 transition ${
              color === c ? "ring-2 ring-slate-900 ring-offset-2" : "hover:scale-110"
            }`}
            style={{ background: WRAP_COLORS[c].box }}
          />
        ))}
      </div>
      <div className="mb-1.5 mt-3 text-xs font-medium text-slate-500">
        Наполнение: {WRAP_FILLINGS[filling].label.toLowerCase()} — будет внутри после принятия
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {WRAP_FILLING_KEYS.map((f) => (
          <button
            key={f}
            type="button"
            title={WRAP_FILLINGS[f].hint}
            aria-label={WRAP_FILLINGS[f].label}
            aria-pressed={filling === f}
            onClick={() => onChange(style, color, f)}
            className={`flex flex-col items-center gap-0.5 rounded-xl border-2 px-1 py-2 transition ${
              filling === f ? "border-red-500 bg-red-50" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <span className="text-2xl" aria-hidden>
              {WRAP_FILLINGS[f].emoji}
            </span>
            <span className="text-xs font-semibold">{WRAP_FILLINGS[f].label}</span>
            <span className="px-1 text-center text-[10px] leading-tight text-slate-500">
              {WRAP_FILLINGS[f].hint}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

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
      className={`card relative space-y-3 overflow-hidden ring-2 ${
        opened ? "ring-emerald-400" : "ring-amber-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <GiftArt
            kind={gift.style ?? "box"}
            color={gift.color ?? "red"}
            width={58}
            opened={opened}
            filling={gift.filling ?? "candy"}
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
            {opened
              ? "Подарок принят"
              : "Кто-то из комнаты отправил вам подарок. Он ждёт вас под ёлкой."}
          </p>
        </div>
      </div>
      {opened ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm font-semibold text-emerald-700">
          ✓ Подарок принят
        </p>
      ) : (
        <button
          className="btn btn-green w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const ok = await act({ action: "accept" });
            setBusy(false);
            if (ok) flash("Подарок принят — загляните под ёлку 🍬");
          }}
        >
          🎁 Принять
        </button>
      )}
    </section>
  );
}

/**
 * Первое знакомство с назначением — через рулетку: участники прокручиваются
 * и останавливаются на том, кого выбрала жеребьёвка (или назначил создатель).
 * Дальше показывается обычная карточка подопечного.
 */
function TargetWithRoulette({
  code,
  state,
  act,
  flash,
}: {
  code: string;
  state: RoomState;
  act: Act;
  flash: (m: string) => void;
}) {
  const t = state.myTarget;
  const [show, setShow] = useState(() => {
    if (!t || typeof window === "undefined") return false;
    try {
      return !window.localStorage.getItem(`ss_roulette_${code}_${t.assignmentId}`);
    } catch {
      return true;
    }
  });
  if (!t) {
    return <TargetCard state={state} act={act} flash={flash} />;
  }
  if (show) {
    const pool = state.participants.filter((p) => p.id !== state.me?.id);
    return (
      <SantaRoulette
        participants={pool.length > 0 ? pool : [t.recipient]}
        target={t.recipient}
        storageKey={`ss_roulette_${code}_${t.assignmentId}`}
        onDone={() => setShow(false)}
      />
    );
  }
  return <TargetCard state={state} act={act} flash={flash} />;
}

function TargetCard({ state, act, flash }: { state: RoomState; act: Act; flash: (m: string) => void }) {
  const t = state.myTarget;
  const [wrap, setWrap] = useState<{ style: WrapStyle; color: WrapColor; filling: WrapFilling }>(() => ({
    style: t?.style ?? "box",
    color: t?.color ?? "red",
    filling: t?.filling ?? DEFAULT_FILLING,
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
            ? "Назначьте Сант вручную или нажмите «Рандом» в разделе «Жеребьёвка» панели организатора."
            : "Ждём, пока организатор назначит, кому вы дарите подарок."}
        </p>
      </section>
    );
  }

  async function changeWrap(style: WrapStyle, color: WrapColor, filling: WrapFilling) {
    const prev = wrap;
    setWrap({ style, color, filling });
    if (!(await act({ action: "wrap", style, color, filling }))) setWrap(prev);
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
      <div className="absolute -right-6 -top-6 text-8xl opacity-10">🎁</div>
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
      <WrapPicker style={wrap.style} color={wrap.color} filling={wrap.filling} onChange={changeWrap} />
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
  const [profile, setProfile] = useState({ name: me.name, avatar: me.avatar, color: me.color });
  const [wishlist, setWishlist] = useState(me.wishlist);
  const isDuplicate =
    editing &&
    Boolean(profile.name.trim()) &&
    participants.some((p) => p.id !== me.id && isSameParticipant(p, profile));

  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar avatar={me.avatar} color={me.color} size={36} />
          <h2 className="text-lg font-bold">{me.name}</h2>
        </div>
        <button className="text-sm text-blue-600 hover:underline" onClick={() => setEditing((v) => !v)}>
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
        disabled={isDuplicate || (editing && !profile.name.trim())}
        onClick={async () => {
          if (await act({ action: "profile", wishlist, ...(editing ? profile : {}) })) {
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
