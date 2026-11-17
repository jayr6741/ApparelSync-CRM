# GARMENTOS

Garment retail management SaaS with separate web, mobile and API applications.

## Repository structure

```text
GARMENTOS/
├── frontend/   # Next.js web application
├── mobile/     # Expo / React Native application
├── backend/    # Express REST API + PostgreSQL access
├── database/   # PostgreSQL migrations and database documentation
├── docs/       # Architecture, audit and development documentation
├── packages/   # Shared packages
└── package.json
```

## Environment files

Each application has its own tracked example file. Copy it to a local, ignored environment file and set your own values:

- Web: `frontend/.env.example` → `frontend/.env.local`
- Mobile: `mobile/.env.example` → `mobile/.env`
- API: `backend/.env.example` → `backend/.env`

Never commit real `.env` files. PostgreSQL credentials and authentication secrets belong only in `backend/.env`. The frontend and mobile app must communicate with the API; they must never connect directly to PostgreSQL.

## Install

Use Node.js 20 or newer. From the repository root:

```bash
npm install
```

## Run applications

```bash
npm run dev:web
npm run dev:api
npm run dev:mobile
```

Run each command in a separate terminal. For a physical phone, set `EXPO_PUBLIC_API_URL` in `mobile/.env` to the computer's LAN IP or deployed HTTPS API URL, not localhost.

## Build and typecheck

```bash
npm run build:web
npm run build:api
npm run typecheck:api
```

## Database

PostgreSQL schema and migrations are maintained in `database/migrations/`. Configure the database connection only in `backend/.env`.

## Current implementation note

The repository structure and independent environment templates are in place. This does not mean the legacy web screens have all been migrated from Supabase to the Express API yet; that migration must be completed and tested module by module before production use.
