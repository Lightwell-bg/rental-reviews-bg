import { Button } from "@/components/Button";
import { TELEGRAM_BOT_LINK } from "@/lib/constants";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-600">
        {children}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-800">
          Болгария · аренда недвижимости
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900">
          Проверенные отзывы об опыте аренды
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-600">
          Rental Reviews BG — независимая площадка, где арендаторы и
          арендодатели делятся реальным опытом. Каждый отзыв проходит ручную
          модерацию. Поиск — по городу и объекту, без публикации персональных
          данных.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="/reviews">Смотреть отзывы</Button>
          <Button href={TELEGRAM_BOT_LINK} variant="secondary">
            Оставить отзыв в Telegram
          </Button>
        </div>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        <Section title="Как работает модерация">
          <p>
            Отзыв отправляется через Telegram-бот и попадает в очередь со
            статусом <strong>pending</strong>.
          </p>
          <p>
            Модератор проверяет текст, убирает персональные данные и принимает
            решение: опубликовать, отклонить или запросить правки.
          </p>
          <p>На сайте видны только одобренные отзывы.</p>
        </Section>

        <Section title="Что нельзя публиковать">
          <ul className="list-inside list-disc space-y-1">
            <li>Телефоны, email, ЕГН, ЛНЧ, паспортные данные</li>
            <li>ФИО и полный адрес частных лиц</li>
            <li>Оскорбления, угрозы, дискриминация</li>
            <li>Необоснованные обвинения</li>
          </ul>
        </Section>

        <Section title="Право ответа">
          <p>
            Арендодатель, агентство или управляющая компания может подать
            официальный ответ на опубликованный отзыв.
          </p>
          <p>
            Ответ тоже проходит модерацию и публикуется рядом с отзывом без
            раскрытия личных данных третьих лиц.
          </p>
          <Button href="/reply" variant="ghost" className="mt-2">
            Дать ответ
          </Button>
        </Section>
      </div>
    </main>
  );
}
