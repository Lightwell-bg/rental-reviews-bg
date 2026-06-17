# SQL-миграции

## Новый проект — один файл

Supabase Dashboard → **SQL Editor** → выполнить:

**`001_init.sql`**

## Уже развёрнутая БД

| Файл | Когда |
|------|--------|
| `upgrade_legacy.sql` | БД без полей автора (`author_*`) |
| `002_address_fields.sql` | БД без адресных полей |

Порядок для старой БД: `upgrade_legacy.sql` (если нужно) → `002_address_fields.sql`.

Подробнее: [docs/DEPLOY.md](../../docs/DEPLOY.md)
