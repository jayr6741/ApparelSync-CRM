# GARMENTOS backend

Express + TypeScript API and the single home for PostgreSQL database assets and engineering documentation.

## Install and run
```powershell
npm install
Copy-Item .env.example .env
# Configure DATABASE_URL and a random AUTH_SECRET (32+ characters)
npm run dev
```

API health: `GET http://localhost:4000/api/health`.

## Current API foundation
- `POST /api/v1/auth/register` — create user, shop and owner membership atomically.
- `POST /api/v1/auth/login` — verify password and return a signed bearer token.
- `GET/POST /api/v1/categories` — tenant-scoped categories.
- `GET/POST /api/v1/products` — tenant-scoped garment product master.
- `POST /api/v1/products/:productId/variants` — create size/colour variants in a transaction.

Send `Authorization: Bearer <token>` to protected endpoints.

## Database
Apply `database/migrations/001_initial_postgresql.sql` followed by `002_garment_catalog_foundation.sql` to a NEW empty development database. Do not apply the old Supabase SQL under `database/legacy-supabase/` to PostgreSQL.

## Quality checks
```powershell
npm run typecheck
npm run build
```

The API, web and mobile modules are still under development. See `docs/IMPLEMENTATION_STATUS.md` for the module-by-module acceptance checklist.
