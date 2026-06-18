import { toPageMetadata } from "@/lib/pageSeo";
import { getPageSeoSettings } from "@/lib/siteSettings";

export async function generateMetadata() {
  const settings = await getPageSeoSettings();
  return toPageMetadata("privacy", settings);
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold text-zinc-900">
        Политика обработки данных
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Краткая версия для пользователей сервиса. Не является юридической
        консультацией.
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-zinc-700">
        <section>
          <h2 className="text-lg font-semibold text-zinc-900">
            Принцип минимизации
          </h2>
          <p className="mt-3">
            Мы собираем только данные, необходимые для приёма отзыва,
            модерации и связи с автором через Telegram. Регистрация на сайте не
            требуется.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">
            Что публикуется
          </h2>
          <ul className="mt-3 list-inside list-disc space-y-1">
            <li>Очищенный текст одобренного отзыва</li>
            <li>Город, район, тип отзыва, оценка</li>
            <li>Официальный ответ второй стороны (после модерации)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">
            Что не публикуется
          </h2>
          <ul className="mt-3 list-inside list-disc space-y-1">
            <li>Телефоны, email, ЕГН, ЛНЧ, паспортные данные</li>
            <li>Приватные имена и адреса (`private_name`, `address_private`)</li>
            <li>Файлы-доказательства — хранятся приватно в Supabase Storage</li>
            <li>Telegram ID автора отзыва</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">Поиск</h2>
          <p className="mt-3">
            Публичный поиск — по городу и типу отзыва. Поиск по ФИО физических
            лиц не предусмотрен.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">Ваши права</h2>
          <p className="mt-3">
            Вы можете запросить исправление или удаление своего отзыва через
            Telegram-бот или связь с модератором. Жалобы и ответы обрабатываются
            в разумные сроки.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">Хранение</h2>
          <p className="mt-3">
            Данные хранятся в Supabase (ЕС). Логи модерации ведутся для защиты
            сервиса и разрешения споров.
          </p>
        </section>
      </div>
    </main>
  );
}
