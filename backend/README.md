# GARMENTOS backend

Express + TypeScript API and the single home for PostgreSQL database assets and project engineering documentation.

## Install and run

```powershell
npm install
Copy-Item .env.example .env
# Edit .env: set DATABASE_URL and AUTH_SECRET
npm run dev
```

Health check: GET http://localhost:4000/api/health.

## Build and checks

```powershell
npm run typecheck
npm run build
npm start
```

## Database

- Clean PostgreSQL migrations: database/migrations/
- Historical Supabase SQL reference only: database/legacy-supabase/
- Never apply legacy Supabase migrations to self-hosted PostgreSQL.
- Backups and database dumps must not be committed.
- Keep PostgreSQL credentials and auth secrets in this folder's local .env only.

## Documentation

Architecture, audit, development and migration documents are in docs/.

## Current implementation status

The API currently contains an Express server, PostgreSQL connection pool and health endpoint. Authentication, tenant authorization, catalog, inventory, customer, sales/POS and reporting APIs are not implemented yet. Frontend Supabase integrations have not yet been fully migrated. This is not production-ready.
