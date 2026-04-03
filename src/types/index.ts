/**
 * Local type definitions — copied from packages/shared-types
 * so apps/web is fully self-contained at deploy time.
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

/** Drug classification — Ghana FDA categories */
export type Classification = 'OTC' | 'POM' | 'CONTROLLED';

/** Branch type — determines POM dispensing capability */
export type BranchType = 'pharmaceutical' | 'chemical' | 'both';

/** Staff roles — 8 roles with distinct permissions */
export type UserRole =
  | 'owner'
  | 'se_admin'
  | 'manager'
  | 'head_pharmacist'
  | 'pharmacist'
  | 'technician'
  | 'cashier'
  | 'chemical_cashier';

/** Payment methods — Ghana-native MoMo providers + standard */
export type PaymentMethod =
  | 'CASH'
  | 'MTN_MOMO'
  | 'VODAFONE_CASH'
  | 'AIRTELTIGO_MONEY'
  | 'CARD'
  | 'SPLIT';

/** Prescription lifecycle */
export type PrescriptionStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'APPROVED'
  | 'DISPENSED'
  | 'ARCHIVED'
  | 'REJECTED';

/** Drug interaction severity — Ghana FDA enforcement levels */
export type InteractionSeverity = 'MINOR' | 'MODERATE' | 'MAJOR' | 'CONTRAINDICATED';

/** Sale status */
export type SaleStatus = 'DRAFT' | 'COMPLETED' | 'REFUNDED' | 'VOIDED';

/** Image source pipeline */
export type ImageSource = 'DRUG_DB' | 'DALLE3' | 'MANUAL_UPLOAD' | 'PLACEHOLDER';

// ─── Product ─────────────────────────────────────────────────────────────────

export interface ProductImage {
  id: string;
  cdnUrl: string;
  urlThumb: string;
  source: ImageSource;
  isApproved: boolean;
}

export interface InventoryBatch {
  batchNumber: string;
  quantity: number;
  /** ISO date string */
  expiryDate: string;
}

export interface ProductInventory {
  quantityOnHand: number;
  reorderLevel: number;
  batches: InventoryBatch[];
}

/** Supplier summary on product card */
export interface ProductSupplier {
  id: string;
  name: string;
  /** AI performance score 0-100 */
  aiScore: number | null;
}

export interface ProductCategory {
  id: string;
  name: string;
}

/** Full product — as returned by SearchProducts query */
export interface Product {
  id: string;
  name: string;
  genericName: string | null;
  barcode: string | null;
  /** Price in GHS pence (integer × 100) — always GHS, never USD */
  unitPrice: number;
  classification: Classification;
  branchType: BranchType;
  /** Ghana GRA: POM medicines are VAT exempt */
  vatExempt: boolean;
  /** Ghana FDA: requires approved prescription before sale */
  requiresRx: boolean;
  isActive: boolean;
  image: ProductImage | null;
  inventory: ProductInventory | null;
  supplier: ProductSupplier | null;
  category: ProductCategory | null;
}

// ─── Cart ────────────────────────────────────────────────────────────────────

/** Single item in the POS cart */
export interface CartItem {
  productId: string;
  name: string;
  /** Price in GHS (decimal) — always GHS, never USD */
  unitPriceGhs: number;
  quantity: number;
  /** Ghana GRA: exempt items skip 15% VAT calculation */
  vatExempt: boolean;
  /** Ghana FDA: POM items require approved Rx before checkout */
  requiresRx: boolean;
  /** Approved prescription ID — required if requiresRx = true */
  prescriptionId?: string;
}

/** Tender line for split payments */
export interface TenderLine {
  method: PaymentMethod;
  /** Amount in GHS */
  amountGhs: number;
  /** MoMo reference — required for mobile money tenders */
  momoReference?: string;
}

// ─── Offline ─────────────────────────────────────────────────────────────────

/** Stripped-down product for Dexie.js offline cache */
export interface OfflineProduct {
  id: string;
  name: string;
  genericName: string | null;
  barcode: string | null;
  /** Price in GHS pence */
  unitPrice: number;
  classification: Classification;
  branchType: BranchType;
  vatExempt: boolean;
  requiresRx: boolean;
  branchId: string;
  quantityOnHand: number;
  imageThumb: string | null;
  supplierName: string | null;
  /** ISO timestamp — used for 7-day TTL check */
  lastSyncedAt: string;
}

/** Customer attached at POS — persisted with cart for checkout / receipt. */
export interface PosAttachedCustomer {
  id: string;
  customerCode: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

/** Queued sale for offline sync — includes idempotency key */
export interface OfflineSale {
  /** UUID — used as idempotency key on sync */
  id: string;
  branchId: string;
  cashierId: string;
  items: CartItem[];
  tenders: TenderLine[];
  totalGhs: number;
  vatGhs: number;
  prescriptionId: string | null;
  /** Optional — must exist in branch when sale syncs */
  customerId?: string | null;
  /** Denormalized for receipt before sync */
  customerCode?: string | null;
  customerName?: string | null;
  createdAt: string;
  /** 0 = pending, 1 = synced (Dexie indexed as number for query) */
  synced: 0 | 1;
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  /** Present when returned from `login` / `me` (API User.email). */
  email?: string | null;
  role: UserRole;
  branch_id: string;
}

export interface TokenPair {
  access_token: string;
  /** Stored in httpOnly cookie — not in localStorage */
  refresh_token: string;
  expires_in: number;
}

// ─── Sale ────────────────────────────────────────────────────────────────────

export interface Sale {
  id: string;
  branchId: string;
  cashierId: string;
  items: CartItem[];
  tenders: TenderLine[];
  /** Total in GHS */
  totalGhs: number;
  /** VAT amount in GHS (15% on non-exempt items) */
  vatGhs: number;
  status: SaleStatus;
  prescriptionId: string | null;
  /** Idempotency key — prevents duplicate offline sync */
  idempotencyKey: string;
  createdAt: string;
}

// ─── Supplier ────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  /** AI performance score 0-100: delivery + accuracy + complaints */
  aiScore: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface SupplierInvoice {
  id: string;
  supplierId: string;
  invoiceNumber: string;
  invoiceDate: string;
  /** Total in GHS pence */
  totalAmountGhs: number;
  status: 'PENDING' | 'MATCHED' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  /** Raw extracted JSON from GPT-4o */
  extractedData: Record<string, unknown>;
  createdAt: string;
}

// ─── Prescription ─────────────────────────────────────────────────────────────

export interface PrescriptionItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  dosageInstructions: string | null;
}

/** Full prescription — Ghana FDA lifecycle */
export interface Prescription {
  id: string;
  branchId: string;
  customerId: string;
  /** Prescriber GMDC licence number — validated on creation */
  prescriberLicenceNo: string;
  prescriberName: string;
  prescribedDate: string;
  /** Ghana FDA: Rx valid for exactly 30 days — never extendable */
  expiryDate: string;
  status: PrescriptionStatus;
  items: PrescriptionItem[];
  /** Number of pharmacist sign-offs — controlled drugs require >= 2 */
  approvalCount: number;
  /** S3 key for scanned PDF — required after dispensing */
  s3PdfKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DrugInteraction {
  drug1Id: string;
  drug1Name: string;
  drug2Id: string;
  drug2Name: string;
  severity: InteractionSeverity;
  description: string;
  /** Ghana FDA: CONTRAINDICATED = hard block, no override possible */
  canOverride: boolean;
}
