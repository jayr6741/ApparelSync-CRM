# GARMENTOS implementation status

The 38-page GARMENTOS module specification is the product baseline. A module is complete only after its screens, API, PostgreSQL schema, authorization, validation, audit trail and workflow tests exist.

## Delivered foundations and vertical slices
- [x] Three independent app folders and environment examples.
- [x] PostgreSQL pool and health endpoint.
- [x] Web and mobile registration/login connected to API (mobile session is currently in-memory only).
- [x] Web dashboard session gate and logout.
- [x] Registration provisions Main Branch, Main Warehouse, POS register and Retail price list (requires migrations 002+).
- [x] Tenant-scoped garment categories/products/variants; web product list/create.
- [x] Tenant-scoped customer API and web directory.
- [x] Supplier API and web screen.
- [x] Purchase order create/list/receive API and web workflow; stock ledger updated transactionally.
- [x] POS transactional checkout API and web/mobile cash checkout foundation.
- [x] Invoice sequence, idempotency key, payment ledger, stock check/decrement, tax snapshot and audit event.
- [x] GitHub Actions CI configured for all three apps (first run not confirmed green).

## Still pending
- [ ] Mobile persistent secure session, offline cache, sync outbox and conflict resolution.
- [ ] POS UPI/card/split tender UI, receipt print/share, cash drawer and barcode scanner integration.
- [ ] Returns, refunds, exchanges, order reservation and fulfilment.
- [ ] Purchase partial receipts, purchase returns, supplier payments and supplier ledger.
- [ ] Opening stock, adjustments, stock counts, transfers, reorder and ageing.
- [ ] Product edit/archive, full variant matrix, images/storage, size charts, attributes and import/export.
- [ ] Barcode lookup/label printing.
- [ ] Refresh-token/session revocation, email verification and password reset.
- [ ] Tenant profile/onboarding, GSTIN and business settings.
- [ ] Customer ledger, loyalty, segmentation and consent.
- [ ] GST/HSN configuration, intra/inter-state tax snapshots and accountant-reviewed GST reports.
- [ ] Double-entry accounting, cash/bank, expenses, receivables/payables and reconciliation.
- [ ] Staff, permissions, branch scope and attendance.
- [ ] Sales, margin, stock, customer, supplier and employee reports.
- [ ] Online storefront/cart/checkout.
- [ ] Notification centre and integrations.
- [ ] SaaS plans, trials, entitlement enforcement and verified billing webhooks.
- [ ] API/web/mobile E2E, tenant isolation, security/load tests, deployment, monitoring and backup/restore drill.

## Verification
CI is configured but not confirmed green. Migrations have not been executed against PostgreSQL in this environment. Do not claim production readiness until migrations, builds, tests, security review and backup/restore checks pass.
