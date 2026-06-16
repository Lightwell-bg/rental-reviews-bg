export const metadata = {
  title: "Правила публикации",
};

export default function RulesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold text-zinc-900">
        Правила публикации
      </h1>
      <p className="mt-2 text-zinc-600">
        Отзывы подаются через Telegram-бот и публикуются после ручной
        модерации.
      </p>

      <div className="prose prose-zinc mt-8 max-w-none space-y-8 text-sm leading-relaxed text-zinc-700">
        <section>
          <h2 className="text-lg font-semibold text-zinc-900">
            Что можно публиковать
          </h2>
          <ul className="mt-3 list-inside list-disc space-y-1">
            <li>Личный опыт аренды или сдачи жилья в Болгарии</li>
            <li>Факты о состоянии объекта, условиях договора, взаимодействии</li>
            <li>Отзывы об агентствах и управляющих компаниях</li>
            <li>Привязка к городу, району, объекту — без точного адреса частного лица</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">
            Что запрещено
          </h2>
          <ul className="mt-3 list-inside list-disc space-y-1">
            <li>Телефоны, email, ЕГН, ЛНЧ, паспортные данные</li>
            <li>ФИО и полный домашний адрес физических лиц</li>
            <li>Оскорбления, угрозы, дискриминация</li>
            <li>Необоснованные обвинения в преступлениях</li>
            <li>Реклама и спам</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">Модерация</h2>
          <p className="mt-3">
            Каждый отзыв проверяется модератором. Статусы: на проверке,
            опубликован, отклонён, нужны правки, спор, снят. На сайте видны
            только опубликованные отзывы.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">
            Право ответа
          </h2>
          <p className="mt-3">
            Вторая сторона может подать официальный ответ через форму на сайте
            или Telegram-бот. Ответ проходит ту же модерацию.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">Жалобы</h2>
          <p className="mt-3">
            Если считаете отзыв недостоверным или нарушающим правила —
            воспользуйтесь кнопкой «Пожаловаться» на странице отзыва.
          </p>
        </section>
      </div>
    </main>
  );
}
