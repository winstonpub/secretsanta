"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthBlock from "@/components/AuthBlock";
import AuthModal from "@/components/AuthModal";
import ProfilePicker from "@/components/ProfilePicker";
import TreeScene from "@/components/TreeScene";
import { AVATARS, COLORS, type GiftState } from "@/lib/constants";
import type { AuthUser } from "@/lib/login";
import * as roomApi from "@/lib/roomApi";

const demo = [
  { id: 1, name: "Аня", avatar: "🦊", color: "#f97316", wishlist: "" },
  { id: 2, name: "Миша", avatar: "🐻", color: "#3b82f6", wishlist: "" },
  { id: 3, name: "Оля", avatar: "🐰", color: "#ec4899", wishlist: "" },
  { id: 4, name: "Дима", avatar: "🐧", color: "#22c55e", wishlist: "" },
  { id: 5, name: "Катя", avatar: "🦄", color: "#8b5cf6", wishlist: "" },
];

const demoGifts: GiftState[] = [
  { recipientId: 1, assigned: true, sent: true, accepted: true, style: "bag", color: "gold" },
  { recipientId: 2, assigned: true, sent: false, accepted: false, style: null, color: null },
  { recipientId: 3, assigned: true, sent: true, accepted: false, style: "box", color: "red" },
  { recipientId: 4, assigned: true, sent: false, accepted: false, style: null, color: null },
  { recipientId: 5, assigned: true, sent: true, accepted: true, style: "box", color: "blue" },
];

type Recent = { code: string; name: string };
type AuthState = { loading: boolean; configured: boolean; user: AuthUser | null };

const roomHref = (code: string) => `/room?code=${code}`;

export default function Home() {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState>({ loading: true, configured: true, user: null });
  const [look, setLook] = useState({ avatar: AVATARS[14], color: COLORS[0] });
  const [roomName, setRoomName] = useState("");
  const [budget, setBudget] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  const loadAuth = useCallback(async () => {
    const user = await roomApi.getSessionUser();
    setAuth({ loading: false, configured: roomApi.isConfigured(), user });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAuth();
    try {
      setRecent(JSON.parse(localStorage.getItem("ss_recent") || "[]"));
    } catch {}
  }, [loadAuth]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await roomApi.createRoom({ roomName, budget, ...look });
    setBusy(false);
    if (!res.ok) {
      if (res.reason === "need-auth") {
        // Сессия закончилась — возвращаем форму входа.
        await loadAuth();
        return;
      }
      if (res.reason === "network") {
        setError(roomApi.networkErrorText());
        return;
      }
      if (res.reason === "not-found") {
        setError("Комната не найдена");
        return;
      }
      setError(res.error);
      return;
    }
    router.push(roomHref(res.code));
  }

  function join(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    // Без входа в профиль в комнату не попасть — сначала окно входа.
    if (!auth.loading && !auth.user) {
      setPendingCode(code);
      return;
    }
    router.push(roomHref(code));
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="relative z-10 mb-8 text-center">
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
          🎅 Тайный Санта
        </h1>
        <p className="mt-2 text-blue-100/80">
          Создайте комнату, позовите друзей, проведите жеребьёвку — и следите, как под ёлкой
          появляются подарки.
        </p>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="relative z-30 pt-4">
          <TreeScene
            participants={demo}
            gifts={demoGifts}
          />
        </div>

        <div className="relative z-20 space-y-6">
          <AuthBlock
            loading={auth.loading}
            configured={auth.configured}
            user={auth.user}
            onAuth={(user) => {
              setError("");
              setAuth((prev) => ({ ...prev, user }));
            }}
          />

          {/* Блок создания комнаты виден только после входа в профиль */}
          {auth.user && (
            <form onSubmit={create} className="card space-y-4">
              <h2 className="text-xl font-bold">Создать комнату</h2>
              <input
                className="input"
                placeholder="Название"
                value={roomName}
                maxLength={60}
                onChange={(e) => setRoomName(e.target.value)}
              />
              <input
                className="input"
                placeholder="Бюджет, напр. 1500 ₽"
                value={budget}
                maxLength={40}
                onChange={(e) => setBudget(e.target.value)}
              />
              <div className="border-t pt-4">
                <div className="mb-2 text-sm font-semibold text-slate-600">
                  Вы — организатор комнаты
                </div>
                <ProfilePicker
                  lockName
                  value={{ name: auth.user.displayName, ...look }}
                  onChange={(p) => setLook({ avatar: p.avatar, color: p.color })}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button className="btn btn-red w-full" disabled={busy}>
                {busy ? "Создаём..." : "🎄 Создать комнату"}
              </button>
            </form>
          )}

          <form onSubmit={join} className="card space-y-3">
            <h2 className="text-xl font-bold">Войти по коду</h2>
            <div className="flex gap-2">
              <input
                className="input font-mono uppercase tracking-widest"
                placeholder="ABC123"
                value={joinCode}
                maxLength={8}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <button className="btn btn-green">Войти</button>
            </div>
          </form>

          {recent.length > 0 && (
            <div className="card">
              <h2 className="mb-2 text-lg font-bold">Мои комнаты</h2>
              <ul className="space-y-1">
                {recent.map((r) => (
                  <li key={r.code}>
                    <Link
                      href={roomHref(r.code)}
                      className="flex justify-between rounded-lg px-2 py-1.5 hover:bg-slate-100"
                    >
                      <span className="font-medium">{r.name}</span>
                      <span className="font-mono text-slate-500">{r.code}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {pendingCode && (
        <AuthModal
          configured={auth.configured}
          message={`Чтобы войти в комнату ${pendingCode}, войдите в профиль или зарегистрируйтесь.`}
          onClose={() => setPendingCode(null)}
          onAuth={(user) => {
            setAuth((prev) => ({ ...prev, user }));
            const code = pendingCode;
            setPendingCode(null);
            router.push(roomHref(code));
          }}
        />
      )}
    </main>
  );
}
