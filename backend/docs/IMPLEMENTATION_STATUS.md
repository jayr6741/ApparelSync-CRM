# GARMENTOS implementation status

The 38-page GARMENTOS module specification is the product baseline. A module is complete only after its screens, API, PostgreSQL schema, authorization, validation, audit trail and workflow tests exist.

## Delivered foundations and vertical slices
- [x] Three independent app folders and independent environment examples.
- [x] PostgreSQL pool and health endpoint.
- [x] Web registration/login connected to API; password hashing, JWT verification, dashboard session gate and logout.
- [x] Registration provisions Main Branch, Main Warehouse, POS register and Retail price list (requires migrations 002+).
- [x] Tenant-scoped garment categories/products and size-colour variant APIs; web inventory list/create.
- [x] Tenant-scoped customer list/create/update API and directory.
- [x] Supplier list/create API and screen.
- [x] Purchase order create/list/receive API and UI; stock receipt updates stock balances and movement ledger transactionally.
- [x] POS transactional checkout API, invoice sequencing, idempotency, split-tender ledger, stock validation/decrement, tax snapshot and audit event.
- [x] POS web screen for variant search, cart, stock limits and cash checkout.
- [x] GitHub Actions CI workflow for backend, web and mobile install/typecheck/build (first run not yet confirmed green).

## Still pending
- [ ] POS card/UPI/split tender UI, receipt print/share and cash drawer integration.
- [ ] Returns, refunds, exchanges, order reservation and fulfilment.
- [ ] Purchase partial receipts, purchase returns, supplier payments and supplier ledger.
- [ ] Opening stock, adjustments, stock counts, transfers, reorder and ageing.
- [ ] Product edit/archive, full variant matrix, images/storage, size charts, attributes, import/export.
- [ ] Barcode lookup/label printing.
- [ ] Persistent refresh-token/session revocation, email verification and password reset.
- [ ] Tenant profile/onboarding, GSTIN and business settings.
- [ ] Customer ledger, loyalty, segmentation and consent.
- [ ] GST/HSN configuration, intra/inter-state tax snapshots and accountant-reviewed GST reports.
- [ ] Double-entry accounting, cash/bank, expenses, receivables/payables and reconciliation.
- [ ] Staff, permissions, branch scope and attendance.
- [ ] Sales, margin, stock, customer, supplier and employee reports.
- [ ] Online storefront/cart/checkout.
- [ ] Notification centre and integrations.
- [ ] SaaS plans, trials, entitlement enforcement and verified billing webhooks.
- [ ] Mobile authentication and real workflows.
- [ ] Offline cache, transaction outbox and conflict handling.
- [ ] API/web/mobile E2E, tenant isolation, security/load tests, deployment, monitoring and backup/restore drill.

## Verification
CI is configured but not yet confirmed green. Migrations have not been executed against PostgreSQL in this environment. Do not claim production readiness until migrations, builds, tests, security review and backup/restore checks pass.
