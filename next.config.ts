import type { NextConfig } from "next";

// На GitHub Pages сайт собирается в статические файлы (PAGES_BUILD=1):
// серверных маршрутов там нет, браузер работает с Supabase напрямую.
// Локально собирается обычный режим для разработки и проверки.
const nextConfig: NextConfig = {
  ...(process.env.PAGES_BUILD === "1" ? { output: "export" as const } : {}),
  // Подпуть вида "/repo" — его подставляет сборка в GitHub Actions.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  images: { unoptimized: true },
};

export default nextConfig;
