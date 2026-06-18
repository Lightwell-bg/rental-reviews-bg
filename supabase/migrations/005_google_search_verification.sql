-- Google Search Console: HTML-файл верификации в корне сайта (/admin/settings)

INSERT INTO site_settings (key, value, label) VALUES
  (
    'google_site_verification_filename',
    '',
    'Google Search Console — имя файла (например google123….html)'
  ),
  (
    'google_site_verification_content',
    '',
    'Google Search Console — содержимое HTML-файла'
  )
ON CONFLICT (key) DO NOTHING;
