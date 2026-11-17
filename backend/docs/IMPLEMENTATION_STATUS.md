# GARMENTOS implementation status

The 38-page GarmentOS module specification is the product baseline. A module is complete only after its screens, API, PostgreSQL schema, authorization, validation, audit trail and workflow tests exist.

## Delivered foundations and vertical slices
- [x] Three independent app folders and separate environment examples.
- [x] PostgreSQL pool and health endpoint.
- [x] Registration/login API with password hashing and shop membership.
- [x] Web registration/login connected to API; dashboard session gate and logout.
- [x] Registration provisions the initial Main Branch, Main Warehouse, POS register and Retail price list (requires migrations 002+).
- [x] Tenant-scoped garment categories/products and size-colour variant APIs.
- [x] Web inventory list and initial garment/variant creation form.
- [x] Tenant-scoped customer list/create/update API and customer directory.
- [x] Supplier list/create API and supplier screen.
- [x] Purchase order create/list/receive API; stock receipts update stock balances and append stock movement ledger rows in one DB transaction.
- [x] Purchase order screen with supplier, variant, quantity, unit cost, GST rate and stock receipt.
- [x] Branch, warehouse, price-list, stock ledger and audit foundation migrations.
- [x] GitHub Actions CI workflow for backend, web and mobile installation/typecheck/build.

## Still pending
- [ ] Persistent refresh-token/session revocation, email verification and password reset.
- [ ] Tenant profile/onboarding, GSTIN and business settings.
- [ ] Product edit/archive, full variant matrix, images, size charts, attributes, import/export.
- [ ] Barcode lookup/printing and scanner-to-variant lookup.
- [ ] Opening stock, stock adjustments, stock counts, transfers, reorder and stock ageing.
- [ ] POS atomic checkout, idempotency, split payments, invoice numbering and receipts.
- [ ] Returns, refunds, exchanges, order reservation and fulfilment.
- [ ] Purchase partial receipts, purchase returns, supplier payments and supplier ledger.
- [ ] Customer ledger, loyalty, segmentation and consent.
- [ ] GST/HSN configuration, intra/inter-state tax snapshots and accountant-review GST reports.
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
CI is now configured to install and check each app on pushes and pull requests to garmentos-dev. The first CI run must be reviewed before treating any build as passing. Do not treat this repository as production-ready until migrations, tests and backup/restore checks pass.
