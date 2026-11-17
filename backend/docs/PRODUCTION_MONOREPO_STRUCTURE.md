# GARMENTOS — Production Monorepo Architecture

This is the target production-grade repository layout. It separates deployable applications, shared contracts, database lifecycle and infrastructure. The current repository is being migrated in stages; the target layout must not be confused with the current implemented state.

## Target repository tree

```text
garmentos/
├── apps/
│   ├── web/                         # Next.js web frontend
│   │   ├── src/
│   │   │   ├── app/                 # App Router pages/layouts
│   │   │   ├── components/          # Web UI components
│   │   │   ├── features/            # Web feature screens/hooks
│   │   │   ├── lib/                 # API client, browser utilities
│   │   │   └── styles/
│   │   ├── public/
│   │   ├── tests/
│   │   ├── next.config.*
│   │   └── package.json
│   │
│   ├── mobile/                      # React Native + Expo (Android/iOS)
│   │   ├── src/
│   │   │   ├── app/                 # Navigation / route screens
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   ├── hooks/
│   │   │   ├── lib/                 # API client, secure token storage
│   │   │   └── theme/
│   │   ├── assets/
│   │   ├── app.config.ts
│   │   └── package.json
│   │
│   └── api/                         # Node.js + Express REST API
│       ├── src/
│       │   ├── config/              # Env and app configuration
│       │   ├── database/            # pg pool, transaction helpers
│       │   ├── middleware/          # Auth, tenant, validation, rate limit
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── tenants/
│       │   │   ├── users/
│       │   │   ├── catalog/         # Products, categories, variants
│       │   │   ├── inventory/
│       │   │   ├── customers/
│       │   │   ├── sales/
│       │   │   ├── orders/
│       │   │   ├── payments/
│       │   │   ├── reports/
│       │   │   └── settings/
│       │   ├── jobs/                # Background jobs / scheduled tasks
│       │   ├── utils/
│       │   ├── app.ts               # Express app composition
│       │   └── server.ts            # Process entry point
│       ├── tests/
│       └── package.json
│
├── packages/
│   ├── contracts/                   # API DTOs, shared types, schemas
│   ├── config/                      # Shared lint/TS config
│   └── utils/                       # Only platform-neutral utilities
│
├── database/
│   ├── migrations/                  # Ordered, immutable SQL migrations
│   ├── seeds/                       # Development/demo seed data
│   └── scripts/                     # Backup, restore, migration tooling
│
├── infra/
│   ├── docker/                      # Local/dev Dockerfiles and compose
│   ├── deploy/                      # VPS/release deployment config
│   ├── nginx/                       # Reverse proxy and TLS examples
│   └── monitoring/                  # Health/metrics/logging config
│
├── docs/
│   ├── architecture/
│   ├── development/
│   ├── deployment/
│   └── security/
│
├── scripts/                         # Repo-level maintenance scripts
├── .github/
│   └── workflows/                   # CI checks and release workflows
├── .env.example                     # Non-secret local template only
├── package.json                     # Workspace root scripts
├── package-lock.json
└── README.md
```

## Runtime architecture

```text
Browser ── HTTPS ──┐
                   ├── Nginx / TLS ── API service ── PostgreSQL
Android / iOS ─────┘                    │
                                       ├── background jobs (when needed)
                                       └── object storage (only if file uploads are needed)
```

The web and mobile apps call the same API. Neither client connects directly to PostgreSQL. Database credentials, session signing secrets and payment secrets stay only in the API/server environment.

## Production conventions

- **Monorepo workspaces:** use npm workspaces at the root. Keep app-specific dependencies inside each app. Pin compatible Node and package-manager versions.
- **API module boundaries:** each business module owns its routes, schemas, service/use-cases and repository/data access. HTTP handlers should not contain large SQL/business workflows.
- **PostgreSQL:** use parameterized SQL, explicit transactions for checkout/stock/payment flows, versioned migrations, indexes and tested backup/restore.
- **Multi-tenancy:** derive shop/tenant scope from the authenticated identity and membership on the server. Never trust a client-supplied tenant ID. Add automated cross-tenant isolation tests.
- **Validation:** validate all incoming API payloads at the boundary. Return consistent error shapes and request IDs.
- **Security:** HTTPS, secure session/token handling, CSRF protection where cookie auth is used, rate limits, least-privilege DB role, secret management and audit logs.
- **Observability:** structured logs, health/readiness checks, error monitoring and database pool metrics.
- **Testing:** unit tests for services, integration tests against a disposable PostgreSQL database, API tests and end-to-end tests for critical checkout journeys.
- **CI/CD:** lint, typecheck, tests, build and migration validation before deploy. Deploy migrations as a controlled release step; never auto-run destructive SQL on application startup.
- **Files:** do not commit .env files, production database dumps, credentials, uploaded customer documents or build artifacts.

## Migration plan from current repository

The existing Next.js website is currently at repository root in `src/`, and an initial Expo app is in `mobile/`. An Express starter is in `backend/`. This is transitional, not the final layout.

Move in controlled steps:

1. Add root npm workspaces and workspace scripts; verify current root web app still builds.
2. Move the current Next.js app and its config/assets into `apps/web/` using a dedicated refactor PR/commit. Update CI, deployment and import paths, then build and test.
3. Move `mobile/` to `apps/mobile/`; update Expo config, scripts and CI.
4. Move `backend/` to `apps/api/`; split app composition from server entry and introduce module boundaries.
5. Move API contracts into `packages/contracts/`; share types without sharing server-only code.
6. Move database connection access exclusively into the API. Keep SQL migrations in `database/migrations/`.
7. Replace every remaining Supabase auth/query/storage/realtime usage with the corresponding self-hosted service. Only after zero remaining references and passing tests should the Supabase SDK, config and legacy Supabase migrations be removed.
8. Add Docker Compose for local PostgreSQL and API development, then production deployment configuration for the VPS.

Do not perform all directory moves and the Supabase rewrite in one giant change. Keep each step reviewable and green.

## Current implementation status (do not overstate)

- Current Next.js app remains at root `src/`; it has not yet been moved to `apps/web/`.
- Expo starter is currently at `mobile/`; it is not a complete mobile product.
- Express/PostgreSQL starter is currently at `backend/`; it is not yet the final `apps/api/` service.
- Authentication, complete feature APIs, tenant enforcement and production hardening are not complete.
- Legacy web pages still need their Supabase calls migrated and verified.
- The target production structure described above is an architecture plan, not a claim that every folder or feature is already implemented.
