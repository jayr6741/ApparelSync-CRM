# GARMENTOS

Garment retail management SaaS with three independently managed applications.

## Root structure

```text
GARMENTOS/
├── frontend/   # Next.js web application
├── mobile/     # Expo / React Native application
└── backend/    # Express API + PostgreSQL + migrations + project docs
```

GitHub's .github/ directory contains repository automation only; it is not an application.

## Independent installation

Install dependencies separately inside each application. There is no root npm workspace or root install.

### Web frontend
```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```
Web: http://localhost:3000

### API backend
```powershell
cd backend
npm install
Copy-Item .env.example .env
# Set DATABASE_URL and AUTH_SECRET in backend/.env
npm run dev
```
API health: http://localhost:4000/api/health

### Mobile app
```powershell
cd mobile
npm install
Copy-Item .env.example .env
# Set EXPO_PUBLIC_API_URL to your computer LAN IP for a physical phone
npm start
```

Run each app in a separate terminal. For a physical phone, do not use localhost as the API host; use the computer's LAN IP and ensure both devices are on the same network.

## PostgreSQL

All database material is under backend/database/. PostgreSQL credentials belong only in backend/.env. Frontend and mobile must call the backend API and must never connect directly to PostgreSQL.

The clean PostgreSQL baseline is in backend/database/migrations/. Historical Supabase SQL is retained under backend/database/legacy-supabase/ as reference only; do not apply it to the self-hosted PostgreSQL database. Supabase CLI temporary metadata has been removed from the repository.

## Project documentation

Architecture, audit and migration documents are under backend/docs/.

## Implementation status

GARMENTOS development is in progress on the `garmentos-dev` branch.

- The active dashboard, sales/invoice list, customer directory/search, inventory, purchasing, supplier ledger, POS checkout, returns and reports are being moved to the Express API backed by PostgreSQL.
- The old Supabase client and Supabase-only integration tests have been removed from the updated web workflow. Historical SQL under `backend/database/legacy-supabase/` is archival reference only and is not part of runtime configuration.
- The scanner route currently directs staff to the PostgreSQL POS workflow; a dedicated barcode-first POS flow still needs to be completed.
- Loyalty calculations and reward-ledger writes use a tenant-scoped PostgreSQL endpoint with transactional balance updates.
- Mobile is an initial login/catalog/checkout foundation and still needs the remaining operational screens.
- A clean dependency install, production builds, database migration run, automated test suite, end-to-end checks and security review are still required before production use.

Do not treat this branch as production-ready until those checks have passed.
