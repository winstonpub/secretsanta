export const dynamic = "force-dynamic";

// Проверка «сайт запущен». На GitHub Pages API-маршрутов нет
// (папка api удаляется при сборке), это нужно только для локального запуска.
export async function GET() {
  return Response.json({ ok: true });
}
