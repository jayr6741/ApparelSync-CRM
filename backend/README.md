# GARMENTOS backend

Express + TypeScript API and the single home for PostgreSQL database assets and engineering documentation.

## Install and configure
```powershell
npm install
Copy-Item .env.example .env
# Edit .env: set DATABASE_URL and a random AUTH_SECRET (32+ characters)
```

## Database setup
Create an empty PostgreSQL database and a database role with permission to create tables, indexes and extensions. Then run:
```powershell
npm run db:migrate
```
Migrations run in filename order and are recorded in `schema_migrations`. For a production deployment, back up the database first and test restore on a separate database. Do not run legacy Supabase SQL.

## Start the API
```powershell
npm run dev
```
Health: `GET http://localhost:4000/api/health`.

## Current API
- `POST /api/v1/auth/register` and `POST /api/v1/auth/login`
- `GET/POST /api/v1/categories`
- `GET/POST /api/v1/products`
- `GET /api/v1/variants`
- `GET/POST /api/v1/products/:productId/variants`
- `GET/POST/PATCH /api/v1/customers`
- `GET/POST /api/v1/suppliers`
- `GET/POST /api/v1/purchases` and `POST /api/v1/purchases/:purchaseId/receive`
- `GET /api/v1/sales` and `POST /api/v1/sales/checkout`

Protected endpoints require `Authorization: Bearer <token>`.

## Quality checks
```powershell
npm run typecheck
npm run build
npm run db:migrate:prod
```

See `docs/IMPLEMENTATION_STATUS.md` for the honest module checklist. The application is still under development and is not production-ready.
