# GARMENTOS — Initial Codebase Audit

**Repository:** jayr6741/ApparelSync-CRM  
**Branch reviewed:** garmentos-dev  
**Audit date:** 2026-11-17  
**Scope:** Static review of repository metadata, README, package manifest, Supabase SQL, POS checkout, product types, Supabase client, financial service, loyalty service, and test-file inventory.

## Executive assessment

ApparelSync is a useful UI and workflow starter for a garment-retail POS/CRM. It is **not production-ready as a multi-tenant SaaS**. The most urgent gaps are database access isolation, destructive migration safety, atomic checkout/stock handling, garment variants, and India-specific business configuration.

This is a static source review. Tests and production build were **not executed** in this audit because the repository was inspected through GitHub source access rather than a local runtime.

## Existing foundation (source-verified)

- Next.js 14 / React 18 application using the App Router.
- Supabase JavaScript client with PostgreSQL.
- Existing dashboard areas include inventory, scanner/POS, customers, orders, reports, and settings.
- Existing code includes product/category CRUD, barcode/QR scanning, customer records, PDF invoice generation, loyalty helpers, and financial-report utilities.
- Vitest and Testing Library are configured; test files exist for acceptance, negative, inventory, scanner, orders, dashboard, loyalty, analytics, and Supabase integration.
- Existing product model has a single SKU, price, and stock_quantity; it does not currently model garment size/colour variants.

## Critical findings

### P0 — Public database policies allow unrestricted access

The SQL migrations create policies such as FOR ALL USING (true) WITH CHECK (true) for categories, products, sale_items, customers, and point_transactions. RLS being enabled does not make these tables private when policies allow every operation. The frontend also uses the public anon key, which is expected for a Supabase browser client; the actual security boundary must therefore be correctly enforced by RLS and server-side business logic.

**Required:** Design tenant-aware policies and membership checks before putting real shop/customer/sales data into this database. Do not deploy this configuration for real customers.

### P0 — Initial migration drops existing business tables

20260705172127_init_schema.sql begins by dropping sale_items, products, and categories with CASCADE. Re-running this migration can delete existing data and dependent objects. This is unsafe for production migration workflows.

**Required:** Replace destructive reset-style migrations with forward-only, non-destructive migrations. Back up and verify data before any schema migration.

### P0 — POS checkout is not atomic or concurrency-safe

The scanner checkout writes the sale, then loops over cart items to insert sale lines and update stock as separate browser-side requests. If one step fails, the sale can be partially saved. Stock is calculated from the quantity previously loaded in the browser and then overwritten, so concurrent checkouts can oversell or lose updates.

**Required:** Move checkout into a PostgreSQL function/RPC or trusted server endpoint using a database transaction, row locking/conditional stock updates, server-side price validation, and idempotency protection. Create sale, sale lines, stock movements, and loyalty changes in one transaction.

### P1 — No garment size/colour variant inventory model

The current Product and CartItem types represent a product with one stock quantity. Apparel inventory needs variant-level SKU/barcode and quantity, such as Style → Colour → Size → SKU → Stock.

**Required:** Add product variants and inventory movements; keep style-level product information separate from sellable variants.

### P1 — India localization is incomplete

The README/settings and financial utilities contain BDT currency and Bangladesh-oriented payment methods/sample data (for example bKash, Nagad, PayPal). Financial CSV headers also use BDT. This is not ready for an India-first garment SaaS.

**Required:** Use INR as the default currency, configure GST (CGST/SGST/IGST with tax-inclusive/exclusive pricing), Indian invoice fields, UPI/cash/card payment labels, and configurable regional settings. Tax behavior must be validated with an Indian accounting professional before production use.

### P1 — Financial reporting mixes browser-local sample data and database data

financialService.ts seeds sample transactions into localStorage and merges them with Supabase sales. This can make reports show synthetic/demo transactions alongside real business transactions, and localStorage is browser/device-specific rather than a shared source of truth.

**Required:** Separate demo fixtures from production data. Reports should be derived from tenant-scoped persisted sales, refunds, expenses, purchases, and payments.

### P1 — Loyalty updates are multi-step and can partially fail

The loyalty helper logs a point transaction, reads the customer's current balance, and updates the balance in separate requests. It can continue after a transaction-log insert error and has no database-level atomicity or concurrency protection.

**Required:** Process point-ledger insertion and balance update inside the same database transaction, with validation and idempotency.

### P1 — Environment configuration is coupled to the starter Supabase project

.env.example and src/lib/supabaseClient.ts contain fallback values for the original Supabase project. The anon key is a public client key, not a service-role secret, but the project URL/key should not be silently hard-coded into the GARMENTOS app.

**Required:** Require environment variables, fail clearly when missing, and configure a separate GARMENTOS Supabase project. Never put a service-role key in browser code or a public environment variable.

### P2 — GPL-3.0 obligations need to be planned

The repository includes GPL-3.0 text and an attribution statement naming the original authors. Commercial use is possible under GPL-3.0, but distributing a modified/derivative covered work has source-disclosure and license-notice obligations. The repository's additional attribution wording should be reviewed for compatibility and exact obligations before commercial distribution.

**Required:** Preserve copyright/license notices and obtain qualified legal review before choosing a closed-source distribution or hosted product model.

## Recommended GARMENTOS implementation sequence

1. **Safety baseline:** preserve upstream attribution, establish a clean GARMENTOS brand layer, remove starter-project hard-coded configuration, and create a migration/backup policy.
2. **SaaS foundation:** tenant/shop, users, memberships, roles/permissions, branches, and tenant isolation with verified RLS.
3. **Garment catalogue:** brands, categories, styles/products, colours, sizes, variant SKUs/barcodes, pricing, and variant stock.
4. **Inventory:** stock ledger, opening stock, purchase receiving, supplier returns, transfers, adjustments, low-stock alerts.
5. **POS:** variant-aware cart, barcode scanning, discounts, GST, payment splits, atomic checkout, returns/exchanges, and invoice numbering.
6. **CRM & loyalty:** customer profiles, purchase history, consent-aware messaging, and transactional rewards.
7. **Finance & reports:** persisted expenses/purchases/refunds, cashbook, GST summaries, margins, and exports.
8. **SaaS operations:** subscription plans, usage limits, onboarding, audit logs, backups, monitoring, and support tooling.
9. **Quality gates:** automated tests, RLS tests using multiple tenants, migration tests, concurrency tests, accessibility, and production build/deployment checks.

## Immediate next engineering task

Do not start by changing colours or renaming every screen. First implement the secure SaaS data foundation and a safe schema migration strategy. The current unrestricted RLS policies and destructive migration must be addressed before real data is entered.

## Files reviewed

- README.md, package.json, .env.example, LICENSE
- supabase/migrations/20260705172127_init_schema.sql
- supabase/migrations/20260726000000_enhance_customers_schema.sql
- supabase/migration.sql
- src/app/dashboard/scanner/page.tsx
- src/app/dashboard/inventory/page.tsx
- src/app/dashboard/orders/page.tsx
- src/lib/types.ts, src/lib/supabaseClient.ts
- src/lib/financialService.ts, src/lib/loyalty.ts

## Limitations

This report does not claim that the README's stated test count or clean build was independently reproduced. A local dependency install, test run, build, complete route-by-route review, and multi-tenant security test are still required.