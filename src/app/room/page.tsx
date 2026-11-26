"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import RoomClient from "@/components/RoomClient";

// На GitHub Pages нет серверных маршрутов вида /room/ABC123,
// поэтому код комнаты передаётся параметром: /room?code=ABC123.
function RoomRoute() {
  const code = (useSearchParams().get("code") ?? "").trim().toUpperCase();
  if (!code) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="card">
          <div className="text-5xl">🎄❓</div>
          <h1 className="mt-3 text-2xl font-bold">Не указан код комнаты</h1>
          <p className="mt-2 text-sm text-slate-600">
            Откройте ссылку из приглашения или введите код на главной странице.
          </p>
          <Link href="/" className="btn btn-red mt-5">
            На главную
          </Link>
        </div>
      </main>
    );
  }
  return <RoomClient code={code} />;
}

export default function RoomPage() {
  return (
    <Suspense
      fallback={<main className="py-32 text-center text-blue-100">Загружаем ёлку... 🎄</main>}
    >
      <RoomRoute />
    </Suspense>
  );
}
