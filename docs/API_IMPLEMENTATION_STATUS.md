# PharmaPOS Pro — API Implementation Status

**Last Updated**: April 19, 2026
**Status**: Production-Ready for May 2026 Launch
**Branches**: Azzay Pharmacy — Main Branch (Pharmaceutical) + Azzay Chemical Shop — Spintex (Chemical)

---

## System Architecture

| Component | Technology | URL |
|-----------|-----------|-----|
| **API** | NestJS + GraphQL + TypeORM | `localhost:4000/graphql` |
| **Web** | Next.js 16.2.3 (Turbopack) | `localhost:3000` |
| **Database** | Supabase PostgreSQL | Remote |
| **Cache** | Upstash Redis (TLS) | Remote |
| **Auth** | JWT (15min access / 24hr refresh) | — |

---

## ✅ Implemented Features

### 1. POS Terminal & Checkout
- Product search with barcode scanning
- Real-time stock validation (ok/low/critical/out)
- Shopping cart with quantity adjustment
- Payment methods: Cash, MoMo, Card
- Receipt generation + thermal printer support
- Customer quick-add with email capture
- Offline capability with sync queue
- **Mobile POS cart** — floating button + slide-up drawer on tablets/phones
- Ghana GRA VAT (15% on non-exempt items)
- POM enforcement (Ghana FDA compliant)

### 2. Inventory Management
- Live inventory list with stock status indicators
- Low stock alerts with reorder level tracking
- Expiry date tracking (30-day warning)
- Stock receiving workflow (GRN — Goods Received Note)
- Stock adjustments with GL posting (shrinkage, write-offs)
- Batch number & expiry tracking
- Stock count / cycle counting
- **Inter-branch stock transfers** (PENDING → IN_TRANSIT → RECEIVED)

### 3. Sales & Transactions
- Daily summary (sales count, revenue, VAT, avg sale)
- Recent sales list with detail pages
- Sale refund system (cashier request → manager approve, 24hr window)
- Inventory reversal on refund
- **End-of-day cash reconciliation** (cash + MoMo counting, variance detection)

### 4. Supplier Management
- Supplier list with health indicators
- Suspend/reactivate/delete suppliers
- Supplier products page with pagination
- Payment instructions (bank, MoMo, card, cheque)
- Supplier invoice upload (OCR pipeline)
- Invoice payment recording with GL posting

### 5. Staff Management
- Staff list with online/offline detection (30min inactivity = offline)
- Activity tracking (all GraphQL mutations logged)
- Staff detail page with activity log
- Role-based access control (8 roles)
- Photo upload (URL + file)

### 6. Customer Management
- Customer list with email, sex, age fields
- Customer detail page with purchase history
- Customer-sale association through POS checkout
- Customer quick-add form

### 7. Expense Management
- Expense creation with category, amount, merchant, payment method
- Manager approval/rejection workflow with GL posting
- Expense detail page with timeline
- Smart suggestions (SmartTextarea) for descriptions
- Expense analytics (by category, by staff)

### 8. Accounting & Financial System
- **Profit & Loss Statement** (Revenue, COGS, Gross Profit, OpEx, Net Profit)
- **Balance Sheet** (Assets = Liabilities + Equity, balance check)
- **Trial Balance** (all GL account balances)
- **Chart of Accounts** (Ghana pharmacy COA: 1xxx–5xxx)
- **Cash Flow Forecast** (7/30 day projections, cash runway)
- **CFO Briefing** (working capital, revenue intelligence, VAT compliance, investment recommendations)
- **GL Auto-Posting**:
  - Sales → Debit Cash, Credit Revenue + VAT Payable + COGS
  - Refunds → Reverse all sale GL entries
  - Expenses → Debit Expense account, Credit Cash
  - Stock Received → Debit Inventory, Credit Accounts Payable
  - Stock Adjustments → Debit Shrinkage/Write-off, Credit Inventory
  - Supplier Payments → Debit Accounts Payable, Credit Cash
- **Excel Workbook Export** (7 sheets: Executive Summary, Sales Ledger, P&L, Cash Flow, Expenses, Invoices, Top Products)

### 9. Prescription / POM Handling
- Prescription queue (PENDING → VERIFIED → DISPENSED)
- POM enforcement in POS (blocks add-to-cart without verified Rx)
- GMDC licence validation (24h cache)
- Prescription webhook for external integrations
- Rx expiry tracking (30-day limit)

### 10. Branch Management
- Branch switcher UI (owners/se_admin)
- Branch name + type badge in sidebar (💊 Pharmacy / 🧪 Chemical)
- Branch-scoped data (inventory, sales, expenses, staff)
- **Inter-branch stock transfers** with approval workflow

### 11. Reports & Analytics
- Revenue trends (7d/30d/90d/1y periods)
- Sales count & VAT collection
- Top products by revenue
- Expense analytics by category and staff
- Financial summary dashboard

### 12. Notifications
- Email (Resend / SendGrid / SES)
- SMS (Hubtel — Ghana)
- WhatsApp integration
- Low stock alerts
- Prescription ready notifications
- MoMo payment confirmations

### 13. Audit & Compliance
- Activity tracking interceptor (all GraphQL mutations)
- Audit log with user, timestamp, operation, duration
- Stock movement audit trail
- Expense approval audit trail
- Ghana FDA POM compliance
- Ghana GRA VAT compliance (15%)

---

## GraphQL API Reference

### Authentication
```graphql
mutation Login { login(input: { email, password }) { access_token refresh_token user { id name role branch_id } } }
mutation RefreshToken { refreshToken(token: "<refresh_token>") { access_token refresh_token } }
```

### POS / Sales
```graphql
mutation CreateSale { createSale(input: { items, tenders, idempotencyKey, customerId? }) { id totalFormatted status } }
query DailySummary { dailySummary(date?) { salesCount totalRevenueFormatted vatCollectedPesewas } }
query RecentSales { recentSales(limit?) { id totalFormatted status cashierName soldAt } }
mutation RefundSale { refundSale(saleId, reason) { id status } }
mutation RequestRefund { requestRefund(saleId, reason) { id status } }
mutation ApproveRefundRequest { approveRefundRequest(requestId, notes) { id status } }
```

### Inventory
```graphql
query Inventory { inventory { productId productName quantityOnHand reorderLevel stockStatus } }
mutation ReceiveStock { receiveStock(input: { productId, quantity, batchNumber?, expiryDate? }) { productId quantityOnHand } }
mutation AdjustStock { adjustStock(input: { productId, quantityDelta, reason }) { productId quantityOnHand } }
mutation CreateGRN { createGRN(input: { supplierId, items, notes? }) { id grnNumber status } }
```

### Stock Transfers
```graphql
mutation CreateStockTransfer { createStockTransfer(input: { toBranchId, items: [{ productId, quantity }], notes? }) { id status } }
mutation ApproveStockTransfer { approveStockTransfer(transferId) { id status } }
mutation ReceiveStockTransfer { receiveStockTransfer(transferId) { id status } }
mutation CancelStockTransfer { cancelStockTransfer(transferId, reason) { id status } }
query StockTransfers { stockTransfers(status?) { id fromBranchName toBranchName status items totalQuantity } }
```

### Expenses
```graphql
mutation CreateStaffExpense { createStaffExpense(input: { category, amountPesewas, description, expenseDate, paymentMethod }) { id status } }
mutation ApproveStaffExpense { approveStaffExpense(input: { expenseId, approve, notes?, reimbursementMethod? }) { id status } }
query StaffExpenses { staffExpenses(status?, startDate?, endDate?) { id category amountFormatted status createdByName } }
query StaffExpense { staffExpense(id) { id category amountFormatted description status approvalNotes } }
```

### Accounting
```graphql
query ProfitLoss { profitLoss(periodStart, periodEnd) { revenueFormatted cogsFormatted grossProfitFormatted netProfitFormatted } }
query BalanceSheet { balanceSheet(asOfDate?) { assets liabilities equity totalAssetsFormatted isBalanced } }
query TrialBalance { trialBalance(asOfDate?) { accountCode accountName totalDebit totalCredit balance } }
query ChartOfAccounts { chartOfAccounts { accountCode accountName accountType category balanceFormatted } }
query CashFlowForecast { cashFlowForecast { currentCashFormatted cashRunwayDays recommendation } }
query CfoBriefing { cfoBriefing { executiveSummary healthScoreNumeric alerts keyRatios } }
```

### Suppliers
```graphql
query Suppliers { suppliers { id name status productCount } }
mutation SuspendSupplier { suspendSupplier(id) { id status } }
query SupplierInvoices { supplierInvoices { id supplierName invoiceNumber status balanceFormatted } }
mutation RecordSupplierPayment { recordSupplierPayment(input: { invoiceId, amountPesewas, paymentMethod }) { id status } }
```

---

## Dashboard Navigation (Role-Based)

| Page | Route | Roles |
|------|-------|-------|
| Overview | `/dashboard` | All |
| Inventory | `/dashboard/inventory` | All |
| Sales | `/dashboard/transactions` | All |
| End of Day | `/dashboard/end-of-day` | Cashier+ |
| Stock Transfers | `/dashboard/transfers` | Manager+ |
| Suppliers | `/dashboard/suppliers` | Manager+ |
| Expenses | `/dashboard/expenses` | All |
| Accounting | `/dashboard/accounting` | Manager+ |
| Staff | `/dashboard/staff` | Manager+ |
| Customers | `/dashboard/customers` | All |
| Reports | `/dashboard/reports` | Manager+ |
| Prescriptions | `/dashboard/prescriptions` | Clinical+ |
| CFO Briefing | `/dashboard/cfo-briefing` | Owner/Admin |
| Settings | `/dashboard/settings` | All |
| POS Terminal | `/pos` | All |

---

## Chart of Accounts (Ghana Pharmacy)

| Code | Account | Type |
|------|---------|------|
| 1000 | Cash & Bank | Asset |
| 1100 | Accounts Receivable | Asset |
| 1200 | Inventory | Asset |
| 2100 | Accounts Payable | Liability |
| 2200 | VAT Payable (GRA 15%) | Liability |
| 3000 | Owner's Capital | Equity |
| 3100 | Retained Earnings | Equity |
| 4000 | Sales Revenue | Revenue |
| 5000 | Cost of Goods Sold | Expense |
| 5010 | Inventory Shrinkage | Expense |
| 5020 | Expired Stock Write-off | Expense |
| 5100–5900 | Operating Expenses | Expense |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `REDIS_URL` | Upstash Redis URL (rediss://) |
| `JWT_SECRET` | JWT signing secret |
| `WEB_URL` | Frontend URL for CORS |
| `RESEND_API_KEY` | Email service (optional) |
| `HUBTEL_CLIENT_ID` | SMS service — Ghana (optional) |
| `HUBTEL_CLIENT_SECRET` | SMS service secret |
| `OPENAI_API_KEY` | OCR processing (optional, has mock fallback) |

---

*Generated for Azzay Pharmacy — May 2026 Launch*
