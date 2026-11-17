# GARMENTOS implementation status

The 38-page GARMENTOS module specification is the product baseline. A module is complete only after its screens, API, PostgreSQL schema, authorization, validation, audit trail and workflow tests exist.

## Delivered foundations and vertical slices
- [x] Three independent app folders and independent environment examples.
- [x] PostgreSQL pool and health endpoint.
- [x] Web registration/login connected to API; password hashing, JWT verification, dashboard session gate and logout.
- [x] Registration provisions Main Branch, Main Warehouse, POS register and Retail price list (requires migrations 002+).
- [x] Tenant-scoped garment categories/products and size-colour variant APIs.
- [x] Web inventory list and initial product/variant creation form.
- [x] Tenant-scoped customer list/create/update API and customer directory.
- [x] Supplier list/create API and supplier screen.
- [x] Purchase order create/list/receive API and screen; receipt updates stock balances and stock movement ledger transactionally.
- [x] POS checkout API foundation with invoice sequencing, idempotency key, payment split ledger, stock validation/decrement, tax snapshot and audit event (requires migration 004).
- [x] GitHub Actions CI workflow for backend, web and mobile install/typecheck/build.

## Still pending
- [ ] POS cart/scanner/checkout UI, receipt print/share and cash drawer integration.
- [ ] Return, refund, exchange and order fulfilment workflows.
- [ ] Purchase partial receipts, purchase returns, supplier payments and supplier ledger.
- [ ] Opening stock, adjustments, stock counts, transfers, reorder and ageing.
- [ ] Product edit/archive, full variant matrix, images/storage, size charts, attributes and import/export.
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
CI is configured but has not yet been confirmed green. Database migrations have not been executed against PostgreSQL in this environment. Do not claim production readiness until migrations, builds, tests, security review and backup/restore checks pass.
