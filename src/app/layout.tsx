import type { Metadata } from "next";
import type { ReactNode } from "react";
import Snow from "@/components/Snow";
import "./globals.css";

export const metadata: Metadata = {
  title: "Тайный Санта 🎅",
  description: "Комнаты для Тайного Санты: жеребьёвка, ручное назначение и ёлка с подарками.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="text-slate-100 antialiased">
        <Snow />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
