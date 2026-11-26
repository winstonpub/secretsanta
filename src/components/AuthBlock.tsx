"use client";

import { useState } from "react";
import {
  DISPLAY_NAME_MAX,
  EMAIL_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  emailError,
  normalizeEmail,
  passwordError,
  type AuthUser,
} from "@/lib/login";
import * as roomApi from "@/lib/roomApi";

type Mode = "signin" | "signup" | "forgot" | "reset";

export default function AuthBlock({
  loading,
  configured,
  user,
  onAuth,
}: {
  loading: boolean;
  configured: boolean;
  user: AuthUser | null;
  onAuth: (user: AuthUser | null) => void;
}) {
  // По ссылке из письма восстановления сразу показываем смену пароля.
  const [mode, setMode] = useState<Mode>(() =>
    roomApi.isRecoveryUrl() ? "reset" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isSignup = mode === "signup";
  const mismatch =
    (isSignup || mode === "reset") && passwordConfirm.length > 0 && password !== passwordConfirm;

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
    setPasswordConfirm("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    const cleanEmail = normalizeEmail(email);
    if (isSignup) {
      const problem = emailError(cleanEmail) ?? passwordError(password);
      if (problem) return setError(problem);
      if (password !== passwordConfirm) return setError("Пароли не совпадают");
      if (!displayName.trim()) {
        return setError("Укажите имя, которое будет отображаться на сайте");
      }
    } else if (mode === "forgot") {
      const problem = emailError(cleanEmail);
      if (problem) return setError(problem);
    } else if (mode === "reset") {
      const problem = passwordError(password);
      if (problem) return setError(problem);
      if (password !== passwordConfirm) return setError("Пароли не совпадают");
    } else if (!cleanEmail) {
      return setError("Укажите электронную почту");
    }
    setBusy(true);
    if (mode === "forgot") {
      const err = await roomApi.requestPasswordReset(cleanEmail);
      setBusy(false);
      if (err) return setError(err);
      setNotice("Проверьте почту: мы отправили ссылку для смены пароля. Она действует недолго.");
      return;
    }
    if (mode === "reset") {
      const res = await roomApi.updatePassword(password);
      setBusy(false);
      if (!res.user) return setError(res.error);
      setPassword("");
      setPasswordConfirm("");
      onAuth(res.user);
      return;
    }
    const res =
      mode === "signup"
        ? await roomApi.signUp(cleanEmail, password, displayName.trim())
        : await roomApi.signIn(cleanEmail, password);
    setBusy(false);
    if (!res.user) {
      setError(res.error || "Не удалось выполнить запрос");
      return;
    }
    setPassword("");
    setPasswordConfirm("");
    onAuth(res.user);
  }

  async function signOut() {
    setBusy(true);
    await roomApi.signOut();
    setBusy(false);
    onAuth(null);
  }

  if (loading) {
    return (
      <section className="card">
        <h2 className="text-xl font-bold">🔐 Регистрация / Вход</h2>
        <p className="mt-2 text-sm text-slate-500">Проверяем, вошли ли вы…</p>
      </section>
    );
  }

  if (user) {
    return (
      <section className="card">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Вы вошли в профиль
            </div>
            <div className="truncate text-xl font-bold">{user.displayName}</div>
            <div className="truncate text-sm text-slate-500">Почта: {user.email}</div>
          </div>
          <button type="button" className="btn btn-ghost shrink-0" disabled={busy} onClick={signOut}>
            Выйти
          </button>
        </div>
      </section>
    );
  }

  const showTabs = mode === "signin" || mode === "signup";

  return (
    <section className="card space-y-4">
      <h2 className="text-xl font-bold">
        {mode === "forgot"
          ? "🔑 Восстановление пароля"
          : mode === "reset"
            ? "🔑 Новый пароль"
            : "🔐 Регистрация / Вход"}
      </h2>

      {!configured ? (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Вход пока недоступен: сайт не подключён к Supabase. Владельцу сайта нужно добавить
          ключи Supabase в Secrets репозитория по инструкции из файла <b>INSTRUCTION.md</b>.
        </p>
      ) : mode === "forgot" ? (
        <p className="text-sm text-slate-600">
          Введите почту, с которой регистрировались, — пришлём ссылку для смены пароля.
        </p>
      ) : mode === "reset" ? (
        <p className="text-sm text-slate-600">Придумайте новый пароль для входа.</p>
      ) : (
        <p className="text-sm text-slate-600">
          Войдите или зарегистрируйтесь, чтобы создать свою комнату.
        </p>
      )}

      {showTabs ? (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`rounded-lg py-1.5 transition ${
                mode === m ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {m === "signin" ? "Вход" : "Регистрация"}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => switchMode("signin")}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Назад ко входу
        </button>
      )}

      <form onSubmit={submit} className="space-y-3">
        <fieldset disabled={!configured || busy} className="space-y-3 disabled:opacity-60">
          {mode !== "reset" && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Электронная почта
              </span>
              <input
                className="input"
                type="email"
                name="username"
                autoComplete={isSignup ? "email" : "username"}
                autoCapitalize="none"
                spellCheck={false}
                required
                maxLength={EMAIL_MAX}
                placeholder="ivan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}

          {mode !== "forgot" && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                {mode === "reset" ? "Новый пароль" : "Пароль"}
              </span>
              <input
                className="input"
                type="password"
                name={mode === "reset" ? "new-password" : "password"}
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN}
                maxLength={PASSWORD_MAX}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}

          {(isSignup || mode === "reset") && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Повторите пароль
              </span>
              <input
                className={`input ${mismatch ? "!border-red-500" : ""}`}
                type="password"
                name="password-confirm"
                autoComplete="new-password"
                required
                maxLength={PASSWORD_MAX}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
              {mismatch && (
                <span className="mt-1 block text-xs text-red-600">Пароли не совпадают</span>
              )}
            </label>
          )}

          {isSignup && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Имя, которое будет отображаться на сайте
              </span>
              <input
                className="input"
                type="text"
                name="display-name"
                autoComplete="nickname"
                required
                maxLength={DISPLAY_NAME_MAX}
                placeholder="Например, Иван"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {notice && <p className="text-sm text-green-700">{notice}</p>}

          <button className="btn btn-red w-full" disabled={mismatch}>
            {busy
              ? "Подождите…"
              : mode === "forgot"
                ? "Отправить ссылку"
                : mode === "reset"
                  ? "Сохранить пароль"
                  : isSignup
                    ? "Зарегистрироваться"
                    : "Войти"}
          </button>

          {mode === "signin" && (
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              className="mx-auto block text-sm text-blue-600 hover:underline"
            >
              Забыли пароль?
            </button>
          )}
        </fieldset>
      </form>
    </section>
  );
}
