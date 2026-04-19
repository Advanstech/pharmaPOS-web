'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Sparkles } from 'lucide-react';

// ── Suggestion banks per context ──────────────────────────────────────────────

const SUGGESTIONS: Record<string, string[]> = {
  // Expense descriptions by category
  'expense:FUEL': [
    'Fuel for delivery vehicle — weekly refill',
    'Petrol for pharmacy delivery motorcycle',
    'Diesel for generator — power outage backup',
    'Fuel for staff transport to supplier warehouse',
  ],
  'expense:UTILITIES': [
    'Electricity bill — monthly payment',
    'Water bill — quarterly payment',
    'Internet subscription — monthly broadband',
    'Phone airtime for pharmacy hotline',
    'Electricity prepaid meter top-up',
  ],
  'expense:RENT': [
    'Monthly shop rent — main branch',
    'Rent payment for storage facility',
    'Quarterly rent advance — pharmacy premises',
  ],
  'expense:SALARIES': [
    'Staff salary payment — monthly payroll',
    'Overtime payment for weekend shift',
    'Bonus payment — end of quarter performance',
    'SSNIT contribution — employer portion',
  ],
  'expense:MAINTENANCE': [
    'AC unit repair and servicing',
    'Pharmacy shelving replacement',
    'POS terminal repair',
    'Refrigerator maintenance for cold chain drugs',
    'Plumbing repair — washroom',
    'Electrical wiring fix — dispensary area',
  ],
  'expense:MARKETING': [
    'Flyers and banners for health awareness campaign',
    'Social media advertising — monthly budget',
    'Community health screening sponsorship',
    'Radio advertisement — local FM station',
  ],
  'expense:LICENSES': [
    'Ghana FDA pharmacy licence renewal',
    'GRA tax clearance certificate',
    'GMDC professional licence renewal',
    'Business operating permit — district assembly',
    'Fire safety certificate renewal',
  ],
  'expense:BANK_CHARGES': [
    'Monthly bank maintenance fee',
    'MoMo merchant transaction charges',
    'POS card terminal monthly fee',
    'Wire transfer fee — supplier payment',
  ],
  'expense:MISCELLANEOUS': [
    'Office supplies — printer paper, pens, folders',
    'Cleaning supplies for pharmacy',
    'Staff uniforms and name badges',
    'First aid kit replenishment',
    'Courier service for document delivery',
  ],

  // Invoice notes
  'invoice:notes': [
    'All items received in good condition',
    'Partial delivery — remaining items expected next week',
    'Some items near expiry — discounted pricing applied',
    'Delivery delayed by 3 days from original schedule',
    'Quality check completed — all items passed inspection',
    'Cold chain items verified — temperature log attached',
    'Invoice matches purchase order — ready for payment',
    'Discrepancy noted — 2 items short of invoice quantity',
  ],

  // Stock adjustment reasons
  'stock:reason': [
    'Damaged stock — broken packaging during delivery',
    'Expired stock write-off — past expiry date',
    'Cycle count correction — physical count differs from system',
    'Returned by customer — product recall',
    'Spillage — liquid medication container leaked',
    'Theft/shrinkage — unaccounted loss',
    'Sample given to healthcare professional',
    'Transferred to another branch',
    'Correction after inventory audit',
  ],

  // Price change reasons
  'price:reason': [
    'Supplier price increase — new pricing effective this month',
    'Bulk purchase discount applied',
    'Exchange rate adjustment — imported product',
    'Seasonal pricing adjustment',
    'Competitor price matching',
    'Cost reduction from new supplier agreement',
    'Ghana GRA tax rate change',
    'Promotional pricing — limited time offer',
  ],

  // General notes
  'general:notes': [
    'Follow up required next week',
    'Approved by branch manager',
    'Pending verification — documents attached',
    'Urgent — requires immediate attention',
    'Completed as per standard procedure',
    'Customer requested special packaging',
  ],

  // Expense approval notes
  'expense:approval': [
    'Approved — receipt verified and amount confirmed',
    'Approved — within monthly budget allocation',
    'Approved — essential operational expense',
    'Approved — pre-authorized by branch manager',
    'Approved for reimbursement via MoMo',
    'Approved — supporting documents verified',
  ],

  // Expense rejection reasons
  'expense:rejection': [
    'Rejected — receipt not attached or unclear',
    'Rejected — amount exceeds approval limit, needs owner sign-off',
    'Rejected — duplicate submission, already processed',
    'Rejected — expense not within approved categories',
    'Rejected — insufficient supporting documentation',
    'Rejected — personal expense, not business-related',
    'Rejected — budget for this category exhausted this month',
    'Rejected — please resubmit with correct merchant details',
  ],

  // Refund reasons
  'refund:reason': [
    'Customer returned unused medication — still sealed',
    'Wrong product dispensed — pharmacist error',
    'Customer allergic reaction — doctor advised discontinuation',
    'Duplicate purchase — customer bought same item twice',
    'Product defective — manufacturer packaging issue',
    'Price overcharge — system error at checkout',
    'Customer changed prescription — doctor updated medication',
    'Product recalled by manufacturer',
  ],

  // End-of-day closing notes
  'eod:closing': [
    'All cash counted and balanced — no discrepancies',
    'Register balanced. Smooth day, no incidents',
    'Cash short by small amount — likely rounding on change',
    'Cash over by small amount — customer overpaid, could not return',
    'MoMo payments verified against terminal receipts — all matched',
    'One refund processed today — customer returned sealed product',
    'Power outage for 30 minutes — generator kicked in, no sales lost',
    'Slow day — fewer walk-ins than usual, possibly due to rain',
    'Busy day — long queues during lunch hour, may need extra cashier',
    'Expired stock removed from shelf — 3 items written off',
    'New stock received from Danadams — all items checked and shelved',
    'Customer complaint about pricing — escalated to manager',
    'POS system ran smoothly — no technical issues',
    'Internet was intermittent — some sales processed offline and synced',
    'Prescription queue cleared — all verified Rx dispensed',
    'Cold chain products checked — fridge temperature normal at 4\u00B0C',
    'Closing early today — public holiday tomorrow',
    'Handover to night shift completed — register count verified by both',
  ],

  // Stock transfer notes
  'transfer:notes': [
    'Restocking chemical shop — low stock on fast-moving OTC items',
    'Weekly replenishment for Spintex branch',
    'Urgent transfer — customer waiting at destination branch',
    'Transferring slow-moving stock to branch with higher demand',
    'Balancing inventory across branches after stock count',
    'New product launch — distributing initial stock to all branches',
    'Seasonal demand shift — moving cold & flu products to busier branch',
    'Returning excess stock to main branch warehouse',
    'Pre-holiday stock distribution — ensuring both branches are stocked',
    'Transfer requested by branch manager for weekend coverage',
    'Moving near-expiry stock to higher-turnover branch',
    'Consolidating stock after supplier delivery to main branch',
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────

interface SmartTextareaProps {
  value: string;
  onChange: (value: string) => void;
  context: string; // e.g. 'expense:FUEL', 'invoice:notes', 'stock:reason'
  placeholder?: string;
  rows?: number;
  className?: string;
  required?: boolean;
}

export function SmartTextarea({
  value, onChange, context, placeholder, rows = 3, className, required,
}: SmartTextareaProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const ref = useRef<HTMLTextAreaElement>(null);

  const allSuggestions = useMemo(() => {
    // Try exact context first, then fallback to category
    const exact = SUGGESTIONS[context];
    if (exact) return exact;
    const category = context.split(':')[0];
    const fallback = Object.entries(SUGGESTIONS)
      .filter(([k]) => k.startsWith(category + ':'))
      .flatMap(([, v]) => v);
    return fallback.length > 0 ? fallback : SUGGESTIONS['general:notes'] || [];
  }, [context]);

  useEffect(() => {
    if (!value.trim()) {
      setFiltered(allSuggestions.slice(0, 5));
    } else {
      const q = value.toLowerCase();
      const matches = allSuggestions.filter(s => s.toLowerCase().includes(q));
      setFiltered(matches.slice(0, 5));
    }
  }, [value, allSuggestions]);

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className={className}
      />

      {/* Quick suggestion chips — always visible when focused and empty */}
      {showSuggestions && filtered.length > 0 && (
        <div className="mt-1.5">
          <div className="flex items-center gap-1 mb-1">
            <Sparkles size={10} style={{ color: 'var(--color-teal, #0d9488)' }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted, #94a3b8)' }}>
              Quick suggestions
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filtered.map((suggestion, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  onChange(suggestion);
                  setShowSuggestions(false);
                }}
                className="rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'var(--surface-base, #f1f5f9)',
                  border: '1px solid var(--surface-border, #e2e8f0)',
                  color: 'var(--text-secondary, #475569)',
                }}
              >
                {suggestion.length > 50 ? suggestion.slice(0, 50) + '…' : suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// Add refund reasons to the suggestion bank
SUGGESTIONS['refund:reason'] = [
  'Customer returned product — wrong medication dispensed',
  'Customer allergic reaction — product unsuitable',
  'Customer changed mind — within 24-hour return window',
  'Wrong dosage dispensed — pharmacist correction',
  'Duplicate sale — customer charged twice',
  'Product defective — damaged packaging on inspection',
  'Product expired — near-expiry item sold in error',
  'Price dispute — customer overcharged',
  'Insurance claim rejected — customer cannot afford',
  'Doctor changed prescription — different medication needed',
  'Customer found cheaper alternative elsewhere',
  'Product recall — manufacturer safety notice',
];
