"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/** Окно приглашения: QR-код со ссылкой на комнату и код комнаты под ним. */
export default function InviteModal({
  code,
  url,
  roomName,
  onClose,
}: {
  code: string;
  url: string;
  roomName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copy(what: "link" | "code") {
    try {
      await navigator.clipboard.writeText(what === "link" ? url : code);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {}
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Приглашение в комнату"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card relative w-full max-w-sm space-y-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Закрыть"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          ✕
        </button>
        <div>
          <h2 className="text-xl font-bold">🔗 Пригласить в комнату</h2>
          <p className="mt-1 truncate text-sm text-slate-500">«{roomName}»</p>
        </div>

        <div className="mx-auto w-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-inner">
          {url ? (
            <QRCodeSVG value={url} size={220} level="M" marginSize={1} title="QR-код приглашения" />
          ) : (
            <div className="h-[220px] w-[220px]" />
          )}
        </div>
        <p className="text-xs text-slate-500">
          Наведите камеру телефона на QR-код, чтобы открыть приглашение
        </p>

        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Код для приглашения
          </div>
          <div className="mt-1 font-mono text-3xl font-black tracking-[0.3em] text-slate-900">
            {code}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Его можно ввести на главной странице в блоке «Войти по коду»
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-red text-sm" onClick={() => copy("link")}>
            {copied === "link" ? "✓ Скопировано" : "Скопировать ссылку"}
          </button>
          <button type="button" className="btn btn-ghost text-sm" onClick={() => copy("code")}>
            {copied === "code" ? "✓ Скопировано" : "Скопировать код"}
          </button>
        </div>
      </div>
    </div>
  );
}
