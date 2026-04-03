import type { PharmaNewsItem } from './types';

/** Curated operational + regulatory awareness when live RSS is unavailable. */
export const PHARMA_NEWS_FALLBACK: PharmaNewsItem[] = [
  {
    category: 'awareness',
    title:
      'Ghana FDA: verify POM dispensing against valid prescriptions and retain Rx records per Pharmacy Council guidance.',
  },
  {
    category: 'awareness',
    title:
      'FEFO stock rotation: always dispense batches nearest expiry first to protect patients and reduce write-offs.',
  },
  {
    category: 'awareness',
    title:
      'Cold-chain medicines: monitor storage temperature logs; break in chain can void product quality.',
  },
  {
    category: 'awareness',
    title:
      'GRA VAT: prescription-only medicines may be treated differently from OTC — align POS tax flags with your adviser.',
  },
  {
    category: 'awareness',
    title:
      'Controlled medicines: maintain register entries, witness signatures, and dual pharmacist checks where required.',
  },
  {
    category: 'awareness',
    title:
      'Pharmacovigilance: report suspected adverse reactions to national authorities per local reporting rules.',
  },
  {
    category: 'awareness',
    title:
      'Counterfeit risk: source only from licensed wholesalers; verify invoices and batch documentation on receipt.',
  },
  {
    category: 'awareness',
    title:
      'Patient counselling: document key advice for high-risk therapies to support continuity of care.',
  },
];

/** When industry RSS is unavailable — supply chain, pricing, market structure. */
export const PHARMA_MARKET_FALLBACK: PharmaNewsItem[] = [
  {
    category: 'industry',
    title:
      'Global API pricing and freight still drive landed cost for generics — watch supplier invoices against last cost history.',
  },
  {
    category: 'industry',
    title:
      'Biosimilar and specialty launches often shift demand from originator brands; review fast-mover lists monthly.',
  },
  {
    category: 'industry',
    title:
      'Regional stock-outs: wholesalers may allocate by branch — diversify suppliers for critical SKUs.',
  },
  {
    category: 'industry',
    title:
      'Regulatory labelling changes (new warnings) can require shelf action — scan FDA/EMA summaries weekly.',
  },
];
