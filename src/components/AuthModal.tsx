"use client";

import { useEffect, type ReactNode } from "react";
import AuthBlock from "./AuthBlock";
import type { AuthUser } from "@/lib/login";

/** Окно «Регистрация / Вход» поверх страницы. */
export default function AuthModal({
  configured,
  message,
  onAuth,
  onClose,
  footer,
}: {
  configured: boolean;
  message: string;
  onAuth: (user: AuthUser) => void;
  /** Если не задан, окно нельзя закрыть (например, на странице комнаты). */
  onClose?: () => void;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Регистрация или вход"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
        {onClose && (
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            className="absolute -top-2 right-0 z-10 flex h-9 w-9 -translate-y-full items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            ✕
          </button>
        )}
        <p className="rounded-xl bg-white/10 px-4 py-2.5 text-center text-sm text-blue-50">
          {message}
        </p>
        <AuthBlock
          loading={false}
          configured={configured}
          user={null}
          onAuth={(user) => user && onAuth(user)}
        />
        {footer}
      </div>
    </div>
  );
}
