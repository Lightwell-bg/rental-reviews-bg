-- Обновить подписи плейсхолдеров SEO (после 003_page_seo.sql)

UPDATE site_settings
SET label = '/reviews/[id] — title ({title}, {city}, {target}, {property}, {excerpt})'
WHERE key = 'seo_review_detail_title';

UPDATE site_settings
SET label = '/reviews/[id] — description ({title}, {city}, {target}, {property}, {excerpt})'
WHERE key = 'seo_review_detail_description';
