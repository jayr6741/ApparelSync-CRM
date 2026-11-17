# GARMENTOS folder structure and development order

## Target monorepo

```text
GARMENTOS/
├── src/                         # Existing Next.js website (frontend, for now)
│   ├── app/                      # Website pages and UI
│   ├── components/               # Reusable web components
│   └── lib/                      # Web-only helpers; no direct DB access
├── mobile/                       # React Native + Expo Android/iOS app
│   ├── App.tsx
│   └── app.json
├── backend/                      # Express + TypeScript REST API
│   ├── src/
│   │   ├── config/               # Environment configuration
│   │   ├── db/                   # PostgreSQL pool and transaction helpers
│   │   ├── middleware/           # Authentication, validation, rate limits
│   │   ├── modules/              # auth, shops, products, variants, stock,
│   │   │                         # customers, sales, orders, reports
│   │   ├── routes/               # HTTP routes
│   │   ├── services/             # Business rules
│   │   └── server.ts
│   ├── .env.example
│   └── package.json
├── database/
│   ├── migrations/               # Versioned PostgreSQL SQL migrations
│   └── README.md
├── packages/
│   └── shared/                   # Shared API types and validation contracts
├── docs/                          # Architecture, setup and operations guides
├── package.json                  # Existing web app package (root, for now)
└── README.md
```

**Current repository note:** the existing Next.js website remains at the repository root in `src/`. Do not move it yet; first make the API work and migrate the website away from Supabase. A later dedicated refactor can move the Next.js app into `frontend/` without mixing that change with database migration.

## What each part does

- `src/`: browser UI only. It calls the backend over HTTP; it must not import `pg` or connect directly to PostgreSQL.
- `mobile/`: Android and iOS UI. It calls the same backend API as the website.
- `backend/`: trusted server. Authentication, shop/tenant authorization, validation, business logic and PostgreSQL queries live here.
- `database/`: SQL schema and ordered migrations.
- `packages/shared/`: types and API contracts shared by web and mobile.

## Start one by one (Windows PowerShell)

### Step 1 — Install prerequisites

Install Node.js LTS and PostgreSQL. Confirm:

```powershell
node -v
npm -v
psql --version
```

### Step 2 — Configure PostgreSQL

Create a local database and a dedicated application role. Use a strong password. Configure the private connection string in `backend/.env` using `backend/.env.example` as a template.

Do not commit `.env` files. Do not put DATABASE_URL in a NEXT_PUBLIC_ variable or in the mobile app.

### Step 3 — Start the API backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
# Edit .env and set DATABASE_URL
npm run dev
```

Open `http://localhost:4000/api/health`. A successful response should show API status ok and database connected. This starter health endpoint is the first backend milestone; business APIs are not implemented yet.

### Step 4 — Start the website

Open a second PowerShell terminal at the repository root:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. Existing pages still need migration from Supabase to the backend before the website is PostgreSQL-only.

### Step 5 — Start the mobile app

Open a third terminal:

```powershell
cd mobile
npm install
```

Set `EXPO_PUBLIC_API_URL` to the backend address reachable from the phone. For a physical phone on the same Wi-Fi, use the computer's LAN IP (for example `http://192.168.x.x:4000`), not `localhost`.

```powershell
npm start
```

Scan the Expo QR code with Expo Go. Ensure Windows Firewall permits the development ports on the private network.

### Step 6 — Build features in this order

1. PostgreSQL migration runner, schema validation and backup/restore test.
2. Authentication: register, login, logout, current-user endpoint, secure HTTP-only session cookies for web and a secure token strategy for mobile.
3. Shop creation, staff membership and tenant isolation.
4. Categories, garment styles/products, colours, sizes, variant SKUs and barcodes.
5. Inventory and stock movement ledger.
6. Customers and customer history.
7. Sales/POS checkout as one PostgreSQL transaction (sale, items, stock, loyalty).
8. Orders, invoices, GST and payment records.
9. Reports and dashboard.
10. Mobile barcode camera, POS workflow and offline/error handling.
11. Automated tests, production build, security review and deployment.

## Important safety rules

- Never connect the browser or mobile app directly to PostgreSQL.
- Never trust a shop_id sent by the client; derive allowed shop access from the authenticated session.
- Use parameterized SQL and transactions for multi-step writes.
- Back up existing data before any migration. Do not run destructive legacy Supabase migrations.
- Do not delete old Supabase code until all its imports and queries have been replaced and lint, tests and production build pass.
- The repository is still in migration. The starter backend is not a finished production API and must not be exposed publicly without authentication, rate limiting, validation, HTTPS and security review.
