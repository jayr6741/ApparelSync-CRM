# GARMENTOS API backend

Express + TypeScript REST API starter. PostgreSQL is accessed only from this server.

## Run locally (PowerShell)

```powershell
cd backend
npm install
Copy-Item .env.example .env
# Edit .env with your private PostgreSQL DATABASE_URL
npm run dev
```

Health check: `GET http://localhost:4000/api/health`.

## Current implementation

- Express server
- PostgreSQL connection pool
- API health endpoint

Authentication, tenant authorization, product/customer/sales routes and business logic are not implemented yet. Do not treat this starter as production-ready.
