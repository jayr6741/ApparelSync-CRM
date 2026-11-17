# GARMENTOS PostgreSQL

- SQL migrations live in `migrations/`.
- Backups and local database dumps must not be committed.
- Apply the baseline only to a new/empty database after reviewing it.
- Never run destructive legacy migrations against production.
- Keep tenant/shop ownership checks and data mutations inside the trusted backend.
