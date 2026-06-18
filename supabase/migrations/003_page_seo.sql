-- SEO: title и description для публичных страниц (редактируются в /admin/settings)

INSERT INTO site_settings (key, value, label) VALUES
  (
    'seo_site_brand',
    'Rental Reviews BG',
    'Название сайта в суффиксе вкладки (%s · …)'
  ),
  (
    'seo_home_title',
    'Rental Reviews BG',
    'Главная — title'
  ),
  (
    'seo_home_description',
    'Проверенные отзывы об опыте аренды недвижимости в Болгарии. Читайте опыт других арендаторов и делитесь своим через Telegram-бот.',
    'Главная — description'
  ),
  (
    'seo_reviews_title',
    'Каталог отзывов',
    '/reviews — title'
  ),
  (
    'seo_reviews_description',
    'Одобренные отзывы об аренде в Болгарии — фильтр по городу, типу и оценке.',
    '/reviews — description'
  ),
  (
    'seo_review_detail_title',
    '{title}',
    '/reviews/[id] — title ({title}, {city}, {target}, {property}, {excerpt})'
  ),
  (
    'seo_review_detail_description',
    '{excerpt}',
    '/reviews/[id] — description ({title}, {city}, {target}, {property}, {excerpt})'
  ),
  (
    'seo_privacy_title',
    'Политика данных',
    '/privacy — title'
  ),
  (
    'seo_privacy_description',
    'Как мы обрабатываем персональные данные на Rental Reviews BG.',
    '/privacy — description'
  ),
  (
    'seo_rules_title',
    'Правила публикации',
    '/rules — title'
  ),
  (
    'seo_rules_description',
    'Правила подачи и модерации отзывов на Rental Reviews BG.',
    '/rules — description'
  ),
  (
    'seo_report_title',
    'Пожаловаться на отзыв',
    '/report — title'
  ),
  (
    'seo_report_description',
    'Сообщить о нарушении или ошибке в опубликованном отзыве.',
    '/report — description'
  ),
  (
    'seo_reply_title',
    'Ответ на отзыв',
    '/reply — title'
  ),
  (
    'seo_reply_description',
    'Подать ответ второй стороны на опубликованный отзыв.',
    '/reply — description'
  )
ON CONFLICT (key) DO NOTHING;
