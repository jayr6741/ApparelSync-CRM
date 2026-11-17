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
- [x] Purchase order create/list/detail API and web workflow; full and partial receipts update stock balances and movement ledger transactionally.
- [x] Supplier ledger summary/entries API, payment recording endpoint and supplier web ledger/payment screen.
- [x] POS transactional checkout API and web/mobile cash checkout foundation.
- [x] Mobile sales history, tenant-scoped customer directory and returns history tabs backed by the PostgreSQL API.
- [x] Invoice sequence, idempotency, payment ledger, stock validation/decrement, tax snapshot and audit event.
- [x] Tenant-scoped sales overview reports and recent sales dashboard.
- [x] Stock list, warehouse list and transactional opening/adjustment/damage quantity API with movement/audit records; web stock view and adjustment form.
- [x] Inter-warehouse stock transfer API, transfer documents/items, row-locked stock movement pair, audit event and web transfer form/history (migration 008).
- [x] Transactional sales return/refund API with partial-quantity validation, idempotency, optional restock, refund ledger and audit event (migration 005).
- [x] GitHub Actions CI configured for backend, web and mobile; first run not yet confirmed green.

## Still pending
- [x] POS UI: cash/UPI/card/bank transfer/wallet/gift-card/other tenders, split payment rows, amount balancing and optional transaction references; basic browser receipt print added.
- [ ] Receipt with full line-item/tax/payment breakdown, receipt share, cash drawer integration and payment-provider settlement.
- [x] Web returns/refunds workflow: select invoice, fetch sale lines, enter partial quantities, choose refund method, optional restock, view return history.
- [ ] Mobile returns screen, exchange workflow and return authorization (purchase returns API/web workflow delivered).
- [x] Purchase returns API + PostgreSQL migration: only received/unreturned quantities can be returned; sellable stock is decremented transactionally, stock movement/audit rows are written, and supplier ledger records the return as a credit.
- [x] Supplier payment allocation against a selected purchase bill in the supplier UI; API validates the bill belongs to the supplier and rejects allocations above its outstanding balance.
- [ ] Supplier credit notes and payment reconciliation.
- [ ] Purchase receipt document/history with per-delivery audit lines; stock counts, reorder alerts and ageing.
- [ ] Product edit/archive, full variant matrix, images/storage, size charts, attributes, import/export.
- [x] POS camera barcode scan, manual SKU/barcode lookup, Code 128 label preview and single-label print workflow.
- [ ] Bulk barcode label generation and print-sheet layouts.
- [ ] Email verification and password reset.
- [ ] Tenant profile/onboarding, GSTIN and business settings.
- [x] Tenant-scoped reward points ledger endpoint with row locking, balance validation, tier update and audit event; POS customer selection and automatic earn-on-checkout transaction.
- [ ] Customer ledger, reward redemption at checkout, segmentation and consent.
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
