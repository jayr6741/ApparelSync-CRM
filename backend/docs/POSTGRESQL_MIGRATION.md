# GARMENTOS: Supabase to Self-Hosted PostgreSQL Migration

## Decision

GARMENTOS will use a self-managed PostgreSQL database and a server-side application API. Supabase services are not part of the target architecture.

## Target architecture

- Web UI: existing Next.js 14 App Router application.
- API: Next.js Route Handlers initially; keep all database access on the server. A separate Express service can be split out later without changing the database contract.
- Database: PostgreSQL 16+ on the user's VPS/private network.
- Driver: node-postgres (`pg`) with parameterized SQL and explicit transactions.
- Authentication: application-managed password hashes (Node.js scrypt or bcrypt) and signed, HTTP-only, secure cookies. Never trust a user/shop ID sent by the browser.
- Files: local/private object storage or an explicitly selected storage provider; no Supabase Storage dependency.
- Authorization: derive user identity from the verified server session, then scope every query by the authenticated shop membership.

## Important current-state findings

The current branch still imports `@supabase/supabase-js` from `src/lib/supabaseClient.ts`. Supabase data access is used in the dashboard, customer, inventory, orders, and scanner pages. Login and registration pages also need their current authentication behavior inspected and replaced. Settings contains Supabase-specific labels. The project has a Supabase migration history and an initial schema that must be treated as source material only; Supabase-managed auth/storage/realtime behavior will not exist on a plain PostgreSQL server.

The existing `supabase/migrations/20261117000000_garmentos_saas_foundation.sql` was created for the earlier Supabase-based approach. It is **not** a deployment migration for the self-hosted PostgreSQL target. Do not apply it to production. It must be reconciled into clean PostgreSQL migrations after the legacy schema has been inspected.

## Migration phases

1. **Schema inventory and backup**
   - Inspect every existing migration and table definition.
   - Produce a clean, ordered PostgreSQL schema under `database/migrations`.
   - Define a repeatable data export/import plan. Never run destructive schema resets against a live database.
2. **Database runtime**
   - Add a server-only PostgreSQL connection pool.
   - Add readiness/health checks and environment validation.
   - Keep `DATABASE_URL` private; do not prefix it with `NEXT_PUBLIC_`.
3. **Authentication and tenant isolation**
   - Add users, password hashes, shops, memberships, sessions, and role constraints.
   - Add register/login/logout/session endpoints.
   - Enforce shop membership and role authorization in every API handler.
4. **Feature API migration**
   - Convert dashboard, customers, inventory, orders/POS, scanner, settings, and reports from browser-side Supabase queries to authenticated API calls.
   - Make checkout, stock deduction, returns, and loyalty ledger updates atomic PostgreSQL transactions.
5. **Remove Supabase**
   - Remove all Supabase imports, package dependencies, environment variables, Supabase dashboard instructions, and Supabase-only migrations after replacements are tested.
6. **Verification and deployment**
   - Run lint, typecheck, tests, production build, migration tests, and cross-shop authorization tests.
   - Deploy only after backup, restore test, and production environment configuration.

## Safety / deployment notes

- No database has been provisioned or connected by this repository change.
- No migration has been run against a live database.
- Existing user accounts/passwords cannot be assumed portable from Supabase Auth. Account migration requires a deliberate reset/invitation strategy unless a supported password-hash migration is available.
- Existing Supabase Storage files and realtime subscriptions need separate migration/replacement decisions.
- Do not commit database passwords, JWT secrets, or production connection strings.
- Do not delete the existing Supabase code until all pages have working API replacements; the application would otherwise stop working mid-migration.

## Local environment

Copy `.env.example` to `.env.local` and configure a private `DATABASE_URL`, a strong `AUTH_SECRET`, and `APP_URL`. The final variable set will be updated as the API and authentication modules are implemented.
