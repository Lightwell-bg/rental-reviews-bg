-- site_settings — публичные настройки сайта (счётчики, аналитика)
-- Чтение: anon (для вставки на страницы). Запись: service_role (web /admin).

CREATE TABLE IF NOT EXISTS site_settings (
  key        text        PRIMARY KEY,
  value      text        NOT NULL DEFAULT '',
  label      text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE site_settings IS 'Настройки сайта; value — HTML/JS сниппеты для head и body';

INSERT INTO site_settings (key, value, label) VALUES
  (
    'analytics_head',
    '',
    'Код в <head>: Google Analytics, Google Tag Manager, Meta Pixel, верификация'
  ),
  (
    'analytics_body',
    '',
    'Код перед </body>: Яндекс.Метрика, GTM noscript, чат-виджеты'
  )
ON CONFLICT (key) DO NOTHING;
