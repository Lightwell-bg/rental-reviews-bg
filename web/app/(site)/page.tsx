import Image from "next/image";

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
    <section className="surface-card p-6">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-600">
        {children}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main>
      <section className="bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 py-12 sm:px-6 sm:py-14 lg:flex-row lg:items-center lg:gap-12">
          <div className="shrink-0">
            <Image
              src="/brand/icon-circle.png"
              alt=""
              width={128}
              height={128}
              className="h-28 w-28 drop-shadow-xl sm:h-32 sm:w-32"
              priority
            />
          </div>
          <div className="max-w-2xl text-center lg:text-left">
            <p className="text-sm font-medium uppercase tracking-wide text-brand-400">
              Болгария · аренда недвижимости
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Проверенные отзывы об опыте аренды
            </h1>
            <p className="mt-4 text-base leading-relaxed text-brand-100 sm:text-lg">
              Rental Reviews BG — независимая площадка, где арендаторы и
              арендодатели делятся реальным опытом. Каждый отзыв проходит ручную
              модерацию. Поиск — по городу и объекту, без публикации персональных
              данных.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Button href="/reviews" variant="inverse">
                Смотреть отзывы
              </Button>
              <Button
                href={TELEGRAM_BOT_LINK}
                variant="secondary"
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                Оставить отзыв в Telegram
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
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
      </div>
    </main>
  );
}
