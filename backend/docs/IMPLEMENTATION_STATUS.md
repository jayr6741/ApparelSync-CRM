# GARMENTOS implementation status

The 38-page GARMENTOS module specification is the product baseline. A module is complete only after its screens, API, PostgreSQL schema, authorization, validation, audit trail and workflow tests exist.

## Delivered foundations and vertical slices
- [x] Three independent app folders and independent environment examples.
- [x] PostgreSQL migration runner for ordered SQL files.
- [x] Web registration/login connected to API; password hashing, JWT and persisted revocable sessions.
- [x] Registration provisions Main Branch, Main Warehouse, POS register and Retail price list (requires migrations 002+).
- [x] Tenant-scoped garment categories/products/variants; web inventory list/create.
- [x] Tenant-scoped customer API and web directory.
- [x] Supplier API and web screen.
- [x] Purchase order create/list/receive API and web workflow; receipt updates stock balances and movement ledger transactionally.
- [x] POS transactional checkout API and web/mobile cash checkout foundation.
- [x] Invoice sequence, idempotency, payment ledger, stock validation/decrement, tax snapshot and audit event.
- [x] Tenant-scoped sales overview reports and recent sales dashboard.
- [x] Stock list, warehouse list and transactional opening/adjustment/damage quantity API with movement/audit records; web stock view and adjustment form.
- [x] Transactional sales return/refund API with partial-quantity validation, idempotency, optional restock, refund ledger and audit event (migration 005).
- [x] GitHub Actions CI configured for backend, web and mobile; first run not yet confirmed green.

## Still pending
- [ ] POS UPI/card/split tender UI, receipt print/share and cash drawer integration.
- [x] Web returns/refunds workflow: select invoice, fetch sale lines, enter partial quantities, choose refund method, optional restock, view return history.
- [ ] Mobile returns screen, exchange workflow, purchase returns and return authorization.
- [ ] Purchase partial receipts, purchase returns, supplier payments and supplier ledger.
- [ ] Stock counts, inter-warehouse transfers, reorder alerts and ageing.
- [ ] Product edit/archive, full variant matrix, images/storage, size charts, attributes, import/export.
- [ ] Barcode lookup/label printing.
- [ ] Email verification and password reset.
- [ ] Tenant profile/onboarding, GSTIN and business settings.
- [ ] Customer ledger, loyalty, segmentation and consent.
- [ ] GST/HSN configuration, intra/inter-state tax snapshots and accountant-reviewed GST reports.
- [ ] Double-entry accounting, cash/bank, expenses, receivables/payables and reconciliation.
- [ ] Staff, permissions, branch scope and attendance.
- [ ] Detailed sales, margin, stock, customer, supplier and employee reports.
- [ ] Online storefront/cart/checkout.
- [ ] Notification centre and integrations.
- [ ] SaaS plans, trials, entitlement enforcement and verified billing webhooks.
- [ ] Mobile secure persistent session, offline cache, sync outbox and conflict resolution.
- [ ] API/web/mobile E2E, tenant isolation, security/load tests, deployment, monitoring and backup/restore drill.

## Verification
CI is configured but not confirmed green. Migrations have not been executed against PostgreSQL in this environment. Do not claim production readiness until migrations, builds, tests, security review and backup/restore checks pass.
