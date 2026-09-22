import { NextResponse } from 'next/server';
import { hasRequiredRole, verifyBearerJwt } from '@/lib/security/jwt-auth';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { fetchOpenAiWithTimeout } from '@/lib/security/openai-timeout';
import { recordAiMetric } from '@/lib/security/ai-metrics';

export const runtime = 'nodejs';
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;
const ROUTE_KEY = 'drug-intelligence';
const ALLOWED_ROLES = [
  'owner',
  'se_admin',
  'manager',
  'head_pharmacist',
  'pharmacist',
  'technician',
  'cashier',
  'chemical_cashier',
] as const;

// Simple in-memory cache (edge-safe alternative: use Redis via API)
const cache = new Map<string, { data: DrugIntelligence; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h
const MAX_CACHE_ENTRIES = 1000;

export interface DrugIntelligence {
  name: string;
  genericName: string;
  classification: string;
  // Core clinical
  whatItDoes: string;          // 1-2 sentence plain-language summary
  indications: string[];       // What conditions it treats
  mechanism: string;           // How it works (plain language)
  // Dosage
  adultDose: string;
  pediatricDose: string | null;
  renalAdjustment: string | null;
  // Safety
  commonSideEffects: string[];
  seriousSideEffects: string[];
  contraindications: string[];
  pregnancySafety: string;     // e.g. "Category B — generally safe"
  lactationSafety: string;
  // Practical
  storageConditions: string;
  foodInteractions: string | null;
  counsellingPoints: string[]; // What to tell the patient/customer
  // Ghana-specific
  nhisStatus: string;          // "Covered", "Not covered", "Unknown"
  localAlternatives: string[]; // Common local brand names
  // Links
  learnMoreLinks: Array<{ label: string; url: string }>;
  // Meta
  disclaimer: string;
  generatedAt: string;
}

const SYSTEM_PROMPT = `You are PharmaPOS Pro's clinical drug intelligence engine for a Ghana pharmacy.
You provide accurate, concise, Ghana-context-aware drug information for pharmacy staff.
Always respond in valid JSON matching the exact schema provided.
Use plain language suitable for pharmacy staff (not patients).
For Ghana context: reference NHIS coverage, Ghana FDA classification, local brand names where known.

CRITICAL DOSAGE INSTRUCTIONS:
- Provide SPECIFIC adult dosing with exact mg amounts, frequency, and max daily dose
- Include pediatric dosing with mg/kg calculations where applicable
- Mention renal/hepatic adjustments with specific dose reductions
- Always note "consult prescriber for individual dosing" after giving standard doses
- Include common Ghana-specific formulations when known

Always include a disclaimer that this is for staff education only, not patient advice.`;

function pruneCache(now: number): void {
  for (const [key, value] of cache.entries()) {
    if (now - value.ts >= CACHE_TTL) {
      cache.delete(key);
    }
  }
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  const oldestKeys = [...cache.entries()]
    .sort((a, b) => a[1].ts - b[1].ts)
    .slice(0, cache.size - MAX_CACHE_ENTRIES)
    .map(([key]) => key);
  for (const key of oldestKeys) {
    cache.delete(key);
  }
}

function buildPrompt(name: string, genericName: string, classification: string): string {
  return `Provide drug intelligence for: "${name}" (generic: "${genericName || name}", classification: "${classification}").

DOSAGE REQUIREMENTS - BE SPECIFIC:
- Adult dose: Include exact mg amounts (e.g., "500mg-1g every 4-6 hours, max 4g/day")
- Pediatric: Include mg/kg dosing (e.g., "10-15mg/kg every 4-6 hours, max 60mg/kg/day")
- Always specify frequency (e.g., "BD/TDS/QDS", "every X hours")
- Include max daily limits where applicable

Return ONLY valid JSON with this exact structure:
{
  "name": "${name}",
  "genericName": "${genericName || name}",
  "classification": "${classification}",
  "whatItDoes": "1-2 sentence plain-language summary of what this drug does",
  "indications": ["condition 1", "condition 2", "condition 3"],
  "mechanism": "Plain language explanation of how it works (1-2 sentences)",
  "adultDose": "SPECIFIC adult dose: e.g., 500mg-1g every 4-6 hours orally, maximum 4g per day. Note: consult prescriber for individual dosing.",
  "pediatricDose": "SPECIFIC pediatric dose: e.g., 10-15mg/kg every 4-6 hours, max 60mg/kg/day. Not recommended under 2 months.",
  "renalAdjustment": "Specific dose reduction for renal impairment, or null if not applicable",
  "commonSideEffects": ["side effect 1", "side effect 2", "side effect 3"],
  "seriousSideEffects": ["serious effect 1", "serious effect 2"],
  "contraindications": ["contraindication 1", "contraindication 2"],
  "pregnancySafety": "Pregnancy safety category and brief note",
  "lactationSafety": "Breastfeeding safety note",
  "storageConditions": "Storage temperature and conditions",
  "foodInteractions": "Food/drink interactions or null",
  "counsellingPoints": ["Key point to tell patient 1", "Key point 2", "Key point 3", "Key point 4"],
  "nhisStatus": "Covered / Not covered / Unknown — with brief note",
  "localAlternatives": ["local brand 1", "local brand 2"],
  "learnMoreLinks": [
    {"label": "MedlinePlus", "url": "https://medlineplus.gov/druginfo/meds/a[code].html"},
    {"label": "WHO Essential Medicines", "url": "https://www.who.int/medicines/publications/essentialmedicines/en/"},
    {"label": "Ghana FDA", "url": "https://www.fdaghana.gov.gh/"}
  ],
  "disclaimer": "For pharmacy staff education only. Not a substitute for clinical judgment or patient counselling by a licensed pharmacist.",
  "generatedAt": "${new Date().toISOString()}"
}`;
}

export async function POST(request: Request) {
  try {
    recordAiMetric(ROUTE_KEY, 'requests_total');
    const auth = await verifyBearerJwt(request);
    if (!auth.ok) {
      recordAiMetric(ROUTE_KEY, 'auth_denied');
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (!hasRequiredRole(auth.payload, ALLOWED_ROLES)) {
      recordAiMetric(ROUTE_KEY, 'role_denied');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const limited = await enforceRateLimit(request, ROUTE_KEY, MAX_REQUESTS_PER_WINDOW, WINDOW_MS);
    if (!limited.allowed) {
      recordAiMetric(ROUTE_KEY, 'rate_limited');
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds ?? 60) } },
      );
    }

    const body = await request.json() as { name?: string; genericName?: string; classification?: string };
    const name = (body.name ?? '').trim();
    const genericName = (body.genericName ?? '').trim();
    const classification = (body.classification ?? 'OTC').trim();

    if (!name) {
      return NextResponse.json({ error: 'Drug name is required' }, { status: 400 });
    }

    const cacheKey = `${name.toLowerCase()}::${genericName.toLowerCase()}`;
    pruneCache(Date.now());
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, s-maxage=86400' },
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Return a structured fallback if no API key
      return NextResponse.json(buildFallback(name, genericName, classification), {
        headers: { 'X-Cache': 'FALLBACK' },
      });
    }

    const response = await fetchOpenAiWithTimeout(apiKey, {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildPrompt(name, genericName, classification) },
        ],
        temperature: 0.2,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
    });

    if (!response.ok) {
      recordAiMetric(ROUTE_KEY, 'openai_error');
      const err = await response.text();
      console.error('[drug-intelligence] OpenAI error:', err);
      return NextResponse.json(buildFallback(name, genericName, classification), {
        headers: { 'X-Cache': 'FALLBACK' },
      });
    }

    recordAiMetric(ROUTE_KEY, 'openai_success');
    const json = await response.json() as { choices: Array<{ message: { content: string } }> };
    const content = json.choices?.[0]?.message?.content ?? '{}';
    const data = JSON.parse(content) as DrugIntelligence;

    cache.set(cacheKey, { data, ts: Date.now() });

    return NextResponse.json(data, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, s-maxage=86400' },
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'OPENAI_TIMEOUT') {
      recordAiMetric(ROUTE_KEY, 'openai_timeout');
      return NextResponse.json({ error: 'Upstream AI timeout' }, { status: 504 });
    }
    recordAiMetric(ROUTE_KEY, 'server_error');
    console.error('[drug-intelligence] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch drug intelligence' }, { status: 500 });
  }
}

// Local drug database with actual clinical information - used as intelligent fallback
const LOCAL_DRUG_DB: Record<string, Partial<DrugIntelligence>> = {
  paracetamol: {
    whatItDoes: 'Analgesic and antipyretic. Inhibits prostaglandin synthesis in the CNS.',
    indications: ['Mild to moderate pain', 'Fever reduction', 'Headache', 'Muscle aches'],
    mechanism: 'Inhibits cyclooxygenase (COX) enzymes in the central nervous system, reducing prostaglandin production responsible for pain and fever.',
    adultDose: '500mg-1g every 4-6 hours orally. Maximum 4g per day. For extended-release: 1.3g every 8 hours, max 3.9g/day.',
    pediatricDose: '10-15mg/kg every 4-6 hours (max 60mg/kg/day). Neonates: 10mg/kg every 6-8 hours. Under 3 months: consult prescriber.',
    renalAdjustment: 'No dose adjustment needed in renal impairment. Preferred over NSAIDs in renal disease.',
    commonSideEffects: ['Rare at therapeutic doses', 'Nausea (high doses)', 'Insomnia (high doses)'],
    seriousSideEffects: ['Hepatotoxicity (overdose >4g/day)', 'Severe allergic reaction (rare)', 'Blood disorders (rare)'],
    contraindications: ['Severe hepatic impairment', 'Hypersensitivity to paracetamol', 'Severe alcoholism'],
    pregnancySafety: 'Category A — safe throughout pregnancy. Preferred analgesic in pregnancy.',
    lactationSafety: 'Compatible with breastfeeding. Excreted in breast milk in small amounts.',
    storageConditions: 'Store below 30°C, protected from moisture and sunlight.',
    foodInteractions: 'Can be taken with or without food. Alcohol increases hepatotoxicity risk.',
    counsellingPoints: [
      'Do not exceed 4g per day (adults) — watch combination cold/flu products',
      'Take with food if stomach upset occurs',
      'Seek immediate help if overdose suspected (within 4 hours for antidote)',
      'Check all medications for hidden paracetamol content',
    ],
    nhisStatus: 'Covered — on NHIS essential medicines list',
    localAlternatives: ['Panadol', 'Crocin', 'Calpol', 'Adol'],
  },
  amoxicillin: {
    whatItDoes: 'Broad-spectrum beta-lactam antibiotic. Bactericidal by inhibiting cell wall synthesis.',
    indications: ['Respiratory tract infections', 'Ear/nose/throat infections', 'UTIs', 'Dental abscess', 'H. pylori eradication'],
    mechanism: 'Inhibits bacterial cell wall synthesis by binding to penicillin-binding proteins (PBPs), causing cell lysis.',
    adultDose: '250mg-500mg TDS orally (severe: 750mg-1g TDS). Max 6g/day. Duration: 5-7 days typically.',
    pediatricDose: '20-40mg/kg/day in divided doses TDS. Severe: 40-60mg/kg/day. Neonates: 30mg/kg BD.',
    renalAdjustment: 'CrCl 10-30: 250-500mg BD. CrCl <10: 250-500mg daily.',
    commonSideEffects: ['Diarrhea', 'Nausea', 'Skin rash', 'Vaginal yeast infection'],
    seriousSideEffects: ['Severe allergic reaction/anaphylaxis', 'Clostridioides difficile colitis', 'Stevens-Johnson syndrome'],
    contraindications: ['Penicillin allergy', 'Infectious mononucleosis (causes rash)', 'Severe renal impairment without adjustment'],
    pregnancySafety: 'Category B — generally safe. Crosses placenta but no teratogenic effects.',
    lactationSafety: 'Compatible. Small amounts in breast milk; may cause diarrhea or thrush in infant.',
    storageConditions: 'Store capsules/tablets below 25°C. Reconstituted suspension: refrigerator, discard after 14 days.',
    foodInteractions: 'Best on empty stomach (1hr before or 2hr after food) but can take with food to reduce GI upset.',
    counsellingPoints: [
      'Complete full course even if feeling better',
      'Take at evenly spaced intervals (every 8 hours for TDS)',
      'Seek immediate care for rash with swelling/breathing difficulty',
      'Report severe diarrhea (may be C. difficile)',
    ],
    nhisStatus: 'Covered — first-line antibiotic on NHIS',
    localAlternatives: ['Augmentin (with clavulanate)', 'Trimox', 'Moxatag'],
  },
  metformin: {
    whatItDoes: 'Biguanide oral hypoglycemic. Reduces hepatic glucose production and improves insulin sensitivity.',
    indications: ['Type 2 diabetes mellitus', 'Polycystic ovary syndrome (off-label)', 'Metabolic syndrome', 'Prediabetes'],
    mechanism: 'Decreases hepatic glucose production (gluconeogenesis), increases peripheral insulin sensitivity, reduces intestinal glucose absorption.',
    adultDose: 'Start 500mg BD with meals, increase weekly by 500mg. Maintenance: 1g BD or 850mg BD. Max: 2g daily immediate-release, 2g extended-release.',
    pediatricDose: 'Children 10-16 years: Start 500mg BD. Max: 2g/day. Under 10 years: not recommended.',
    renalAdjustment: 'eGFR 30-45: max 500mg daily. eGFR <30: contraindicated. Check eGFR before starting.',
    commonSideEffects: ['GI upset (nausea, diarrhea)', 'Metallic taste', 'Vitamin B12 deficiency (long-term)', 'Loss of appetite'],
    seriousSideEffects: ['Lactic acidosis (rare, fatal)', 'Severe hypoglycemia (when combined with sulfonylureas)', 'Macrocytic anemia (B12 deficiency)'],
    contraindications: ['Severe renal impairment (eGFR <30)', 'Acute/chronic metabolic acidosis', 'Severe liver disease', 'Heart failure'],
    pregnancySafety: 'Category B — insulin preferred. Safe if needed, crosses placenta minimally.',
    lactationSafety: 'Compatible. Low levels in breast milk. Monitor infant for hypoglycemia.',
    storageConditions: 'Store below 25°C, protected from moisture.',
    foodInteractions: 'Take with meals to reduce GI upset. Avoid excessive alcohol (lactic acidosis risk).',
    counsellingPoints: [
      'Take with meals to reduce stomach upset',
      'Report unexplained muscle pain, weakness, or breathing difficulty immediately',
      'Annual vitamin B12 testing recommended',
      'Carry diabetes identification and glucose source',
    ],
    nhisStatus: 'Covered — first-line diabetes medication on NHIS',
    localAlternatives: ['Glucophage', 'Diaformin', 'Metomin'],
  },
  ibuprofen: {
    whatItDoes: 'Non-steroidal anti-inflammatory drug (NSAID). Analgesic, anti-inflammatory, antipyretic.',
    indications: ['Pain relief (mild-moderate)', 'Inflammatory conditions', 'Dysmenorrhea', 'Fever', 'Osteoarthritis'],
    mechanism: 'Non-selective COX-1 and COX-2 inhibitor, reducing prostaglandin synthesis responsible for pain, inflammation, and fever.',
    adultDose: '200-400mg every 4-6 hours. Max OTC: 1.2g/day. Prescription: up to 2.4g/day (3.2g/day under supervision).',
    pediatricDose: '5-10mg/kg every 6-8 hours. Max: 40mg/kg/day. Under 6 months: consult prescriber.',
    renalAdjustment: 'Avoid or use lowest effective dose in CKD. Risk of acute kidney injury.',
    commonSideEffects: ['Stomach upset/ulcers', 'Heartburn', 'Dizziness', 'Fluid retention'],
    seriousSideEffects: ['GI bleeding/perforation', 'Acute kidney injury', 'Cardiovascular events (MI, stroke)', 'Severe allergic reaction'],
    contraindications: ['Active GI bleeding/ulcer', 'Severe heart failure', 'Third trimester pregnancy', 'Severe renal impairment', 'NSAID hypersensitivity'],
    pregnancySafety: 'Category D in third trimester, Category C earlier. Avoid in late pregnancy (fetal ductus arteriosus closure).',
    lactationSafety: 'Compatible. Minimal transfer to breast milk. Safe for short-term use.',
    storageConditions: 'Store below 30°C, protected from moisture.',
    foodInteractions: 'Take with food or milk to reduce GI upset. Avoid alcohol (GI bleeding risk).',
    counsellingPoints: [
      'Take with food to protect stomach',
      'Avoid if history of stomach ulcers or bleeding',
      'Stop and seek care for black stools, vomiting blood, or severe stomach pain',
      'Do not use in last 3 months of pregnancy',
    ],
    nhisStatus: 'Covered — OTC and prescription strengths on NHIS',
    localAlternatives: ['Advil', 'Nurofen', 'Brufen'],
  },
  omeprazole: {
    whatItDoes: 'Proton pump inhibitor (PPI). Reduces gastric acid secretion by irreversibly inhibiting H+/K+ ATPase.',
    indications: ['Gastroesophageal reflux disease (GERD)', 'Peptic ulcer disease', 'H. pylori eradication', 'Zollinger-Ellison syndrome', 'NSAID ulcer prophylaxis'],
    mechanism: 'Irreversibly inhibits the H+/K+ ATPase proton pump in gastric parietal cells, blocking final step of acid production.',
    adultDose: 'GERD: 20mg daily × 4-8 weeks. Peptic ulcer: 20-40mg daily × 4-8 weeks. H. pylori: 20mg BD with antibiotics.',
    pediatricDose: '1-12 years: 0.7-3.3mg/kg/day (max 20mg). Over 12 years: 20-40mg daily.',
    renalAdjustment: 'No adjustment needed. Not significantly renally cleared.',
    commonSideEffects: ['Headache', 'Diarrhea or constipation', 'Nausea', 'Abdominal pain'],
    seriousSideEffects: ['Clostridioides difficile colitis', 'Pneumonia (aspiration risk)', 'Hypomagnesemia (long-term)', 'Vitamin B12 deficiency', 'Fracture risk (long-term high dose)'],
    contraindications: ['Hypersensitivity to PPIs', 'Concomitant rilpivirine or nelfinavir', 'Severe liver disease (for high doses)'],
    pregnancySafety: 'Category C — use if benefits outweigh risks. Consider antacids/H2 blockers first.',
    lactationSafety: 'Compatible. Minimal transfer to breast milk. Consider timing dose after feeds.',
    storageConditions: 'Store capsules below 25°C. Reconstituted suspension: refrigerator, stable 30 days.',
    foodInteractions: 'Take 30-60 minutes before food (best before breakfast). No other significant food interactions.',
    counsellingPoints: [
      'Take 30-60 minutes before breakfast (before acid secretion begins)',
      'Do not crush/chew delayed-release capsules',
      'Long-term use requires magnesium and B12 monitoring',
      'Complete full treatment course for ulcers (4-8 weeks)',
    ],
    nhisStatus: 'Covered — essential GI medication on NHIS',
    localAlternatives: ['Losec', 'Prilosec', 'Omez'],
  },
  amlodipine: {
    whatItDoes: 'Dihydropyridine calcium channel blocker. Vasodilator for hypertension and angina.',
    indications: ['Hypertension', 'Chronic stable angina', 'Vasospastic angina', 'Heart failure (with caution)'],
    mechanism: 'Blocks L-type calcium channels in vascular smooth muscle and myocardium, causing vasodilation and reduced peripheral resistance.',
    adultDose: 'Hypertension: 5mg daily initially, adjust to 2.5-10mg daily. Angina: 5-10mg daily. Max: 10mg daily.',
    pediatricDose: '6-17 years: 2.5-5mg daily. Under 6 years: safety not established.',
    renalAdjustment: 'No adjustment needed. Hepatically metabolized. Use caution in severe hepatic impairment (start 2.5mg).',
    commonSideEffects: ['Peripheral edema (ankle swelling)', 'Headache', 'Flushing', 'Dizziness', 'Fatigue'],
    seriousSideEffects: ['Severe hypotension', 'Worsening angina (rare initially)', 'Acute liver injury (rare)'],
    contraindications: ['Severe aortic stenosis', 'Cardiogenic shock', 'Unstable angina', 'Severe hypotension'],
    pregnancySafety: 'Category C — use if benefits outweigh risks. Risk of maternal hypotension.',
    lactationSafety: 'Compatible. Small amounts in breast milk. No adverse effects reported.',
    storageConditions: 'Store below 30°C, protected from moisture and light.',
    foodInteractions: 'Can be taken with or without food. Grapefruit juice increases levels (avoid).',
    counsellingPoints: [
      'Take at same time daily (morning preferred for BP control)',
      'Report severe ankle swelling or breathing difficulty',
      'Do not stop abruptly (rebound hypertension)',
      'Avoid grapefruit juice while taking this medication',
    ],
    nhisStatus: 'Covered — first-line antihypertensive on NHIS',
    localAlternatives: ['Norvasc', 'Istin', 'Amloc'],
  },
  ciprofloxacin: {
    whatItDoes: 'Fluoroquinolone antibiotic. Broad-spectrum bactericidal.',
    indications: ['Complicated UTIs', 'Prostatitis', 'Anthrax (post-exposure)', 'Severe gastroenteritis', 'Skin/soft tissue infections'],
    mechanism: 'Inhibits bacterial DNA gyrase (topoisomerase II) and topoisomerase IV, preventing DNA replication and transcription.',
    adultDose: '250-750mg BD orally. Severe: 400mg IV BD. Max: 1.5g/day. Duration: 7-14 days (varies by infection).',
    pediatricDose: 'Limited use in children. If needed: 20-30mg/kg/day divided BD. Under 18 years: generally avoid (joint damage risk).',
    renalAdjustment: 'CrCl 30-50: 250-500mg q18h. CrCl 5-29: 250-500mg q24h.',
    commonSideEffects: ['Nausea', 'Diarrhea', 'Headache', 'Insomnia', 'Photosensitivity'],
    seriousSideEffects: ['Tendon rupture (especially with steroids)', 'Peripheral neuropathy (may be permanent)', 'QT prolongation/arrhythmia', 'Aortic aneurysm/dissection', 'Seizures'],
    contraindications: ['Concurrent tizanidine', 'Quinolone allergy', 'Pregnancy', 'Under 18 years (unless no alternative)', 'QT prolongation risk'],
    pregnancySafety: 'Category C — contraindicated. Risk of fetal cartilage/joint damage.',
    lactationSafety: 'Not recommended. Excreted in breast milk. Risk of infant joint damage.',
    storageConditions: 'Store below 30°C, protected from light and moisture.',
    foodInteractions: 'Do not take with dairy/antacids (reduces absorption). Separate by 2-4 hours. Avoid caffeine (increased effects).',
    counsellingPoints: [
      'Drink plenty of fluids',
      'Avoid dairy products, antacids within 2-4 hours of dose',
      'Stop immediately and report: tendon pain, numbness/tingling, palpitations',
      'Avoid excessive sunlight — photosensitivity risk',
      'Avoid caffeine — may increase side effects',
    ],
    nhisStatus: 'Covered — reserved antibiotic on NHIS (2nd/3rd line)',
    localAlternatives: ['Cipro', 'Ciproxin', 'Cifloc'],
  },
  azithromycin: {
    whatItDoes: 'Macrolide antibiotic. Broad-spectrum, bacteriostatic (bactericidal at high concentrations).',
    indications: ['Respiratory infections', 'Skin/soft tissue infections', 'Sexually transmitted infections (chlamydia)', 'H. pylori', 'Mycobacterium avium complex (MAC) prophylaxis'],
    mechanism: 'Binds to 50S ribosomal subunit, inhibiting bacterial protein synthesis.',
    adultDose: '500mg daily × 3 days OR 500mg day 1 then 250mg days 2-5. Chlamydia: 1g single dose.',
    pediatricDose: '10mg/kg day 1, then 5mg/kg days 2-5 (max 500mg day 1, 250mg subsequent).',
    renalAdjustment: 'No adjustment needed. Hepatically metabolized. Use caution in severe hepatic impairment.',
    commonSideEffects: ['GI upset (nausea, diarrhea)', 'Abdominal pain', 'Headache', 'Altered taste'],
    seriousSideEffects: ['QT prolongation/ventricular arrhythmia', 'Severe allergic reaction', 'Hepatotoxicity', 'C. difficile colitis'],
    contraindications: ['Macrolide allergy', 'Severe hepatic impairment', 'QT prolongation risk', 'Concurrent pimozide'],
    pregnancySafety: 'Category B — generally considered safe. Used when needed in pregnancy.',
    lactationSafety: 'Compatible. Small amounts in breast milk. Observe infant for GI upset.',
    storageConditions: 'Store below 30°C, protected from moisture. Reconstituted suspension: room temp, stable 10 days.',
    foodInteractions: 'Can take with or without food. Food may reduce stomach upset.',
    counsellingPoints: [
      'Complete all doses even if feeling better',
      'Take at same time each day',
      'Report severe diarrhea or heart palpitations',
      'Can be taken with food to reduce stomach upset',
    ],
    nhisStatus: 'Covered — alternative antibiotic on NHIS',
    localAlternatives: ['Zithromax', 'Zithrocin', 'Azithral'],
  },
  atorvastatin: {
    whatItDoes: 'HMG-CoA reductase inhibitor (statin). Lipid-lowering agent.',
    indications: ['Hypercholesterolemia', 'Mixed dyslipidemia', 'Cardiovascular risk reduction', 'Post-MI/stroke prevention'],
    mechanism: 'Inhibits HMG-CoA reductase, blocking cholesterol synthesis in liver. Increases LDL receptor expression, enhancing LDL clearance.',
    adultDose: 'Start 10-20mg daily, adjust every 4 weeks. Max: 80mg daily. Typical maintenance: 10-40mg.',
    pediatricDose: '10-17 years (familial hypercholesterolemia): 10mg daily initially. Max: 20mg daily.',
    renalAdjustment: 'No adjustment needed. Minimal renal excretion.',
    commonSideEffects: ['Muscle aches/myalgia', 'Headache', 'GI upset', 'Elevated liver enzymes'],
    seriousSideEffects: ['Rhabdomyolysis (muscle breakdown)', 'Acute liver failure', 'New-onset diabetes (increased risk)'],
    contraindications: ['Active liver disease', 'Pregnancy/breastfeeding', 'Hypersensitivity', 'Concurrent cyclosporine + high-dose atorvastatin'],
    pregnancySafety: 'Category X — absolutely contraindicated. Risk of fetal malformation. Stop 3+ months before conception.',
    lactationSafety: 'Contraindicated. Excreted in breast milk. Cholesterol essential for infant development.',
    storageConditions: 'Store below 25°C, protected from moisture and light.',
    foodInteractions: 'Can take any time of day. Best at bedtime (peak cholesterol synthesis at night). Avoid grapefruit juice (>1L/day).',
    counsellingPoints: [
      'Take at same time daily (evening preferred)',
      'Report unexplained muscle pain, weakness, or dark urine immediately',
      'Avoid excessive grapefruit juice',
      'Liver function tests needed before starting and periodically',
      'Must not be used in pregnancy — inform prescriber if planning pregnancy',
    ],
    nhisStatus: 'Covered — essential cardiovascular medication on NHIS',
    localAlternatives: ['Lipitor', 'Sortis', 'Storvas'],
  },
  lisinopril: {
    whatItDoes: 'ACE inhibitor (ACE-I). Antihypertensive, cardioprotective.',
    indications: ['Hypertension', 'Heart failure (with reduced EF)', 'Post-MI cardioprotection', 'Diabetic nephropathy'],
    mechanism: 'Inhibits angiotensin-converting enzyme (ACE), blocking conversion of angiotensin I to II (vasoconstrictor). Reduces aldosterone, decreases BP and preload/afterload.',
    adultDose: 'HTN: 10mg daily initially (5mg if on diuretics), adjust to 20-40mg daily. Heart failure: 2.5-5mg initially, titrate to 20-40mg.',
    pediatricDose: '6+ years: 0.07mg/kg (max 5mg) daily initially. Titrate to 0.6mg/kg (max 40mg). Under 6: not recommended.',
    renalAdjustment: 'CrCl <30: start 2.5mg daily. Monitor closely. Risk of hyperkalemia and worsening renal function.',
    commonSideEffects: ['Dry cough (10-15% — hallmark of ACE-I)', 'Dizziness', 'Hyperkalemia', 'Fatigue'],
    seriousSideEffects: ['Angioedema (airway obstruction risk)', 'Acute kidney injury', 'Severe hypotension', 'Neutropenia/agranulocytosis (rare)'],
    contraindications: ['History of angioedema with ACE-I', 'Hereditary/idiopathic angioedema', 'Bilateral renal artery stenosis', 'Pregnancy (2nd/3rd trimester)'],
    pregnancySafety: 'Category D — contraindicated in 2nd/3rd trimester. Teratogenic (fetal renal failure). Stop if pregnancy detected.',
    lactationSafety: 'Not recommended. Excreted in breast milk in small amounts.',
    storageConditions: 'Store below 30°C, protected from moisture and light.',
    foodInteractions: 'Can take with or without food. Avoid potassium supplements/salt substitutes (hyperkalemia risk).',
    counsellingPoints: [
      'Report facial/lip swelling or breathing difficulty immediately (angioedema)',
      'Rise slowly from sitting/lying (dizziness risk)',
      'Dry cough is common side effect — do not stop without consulting prescriber',
      'Avoid salt substitutes containing potassium',
      'Contraindicated in pregnancy — inform prescriber if planning pregnancy',
    ],
    nhisStatus: 'Covered — first-line antihypertensive/heart failure drug on NHIS',
    localAlternatives: ['Zestril', 'Prinivil', 'Lisoril'],
  },
  metronidazole: {
    whatItDoes: 'Nitroimidazole antimicrobial/antiprotozoal. Bactericidal against anaerobes.',
    indications: ['Bacterial vaginosis', 'Trichomoniasis', 'Giardiasis', 'Amoebiasis', 'Anaerobic infections', 'H. pylori', 'C. difficile'],
    mechanism: 'Forms toxic metabolites that disrupt bacterial DNA structure and inhibit nucleic acid synthesis. Active against anaerobes and protozoa.',
    adultDose: 'Anaerobic: 400-500mg TDS × 7-10 days. Bacterial vaginosis: 400mg BD × 7 days or 2g single dose. Giardia: 2g daily × 3 days.',
    pediatricDose: 'Anaerobic: 7.5mg/kg TDS (max 400mg). Amoebiasis: 10mg/kg TDS × 5-10 days. Giardia: 5mg/kg TDS × 5-10 days.',
    renalAdjustment: 'No adjustment usually needed. Hepatically metabolized. Remove during hemodialysis (give post-HD).',
    commonSideEffects: ['Metallic taste', 'Nausea', 'Headache', 'Dark urine (harmless)', 'Dry mouth'],
    seriousSideEffects: ['Peripheral neuropathy (long-term use)', 'Seizures', 'Aseptic meningitis', 'Severe hepatic injury'],
    contraindications: ['First trimester pregnancy (for trichomoniasis)', 'History of blood dyscrasias', 'Concurrent disulfiram (within 2 weeks)', 'Cockayne syndrome'],
    pregnancySafety: 'Category B — avoid in 1st trimester for trichomoniasis. Considered safe in 2nd/3rd trimesters.',
    lactationSafety: 'Compatible. Excreted in breast milk. May cause loose stools in infant. Can defer feeding 12-24hr after high dose.',
    storageConditions: 'Store below 30°C, protected from light.',
    foodInteractions: 'Take with food to reduce GI upset. ABSOLUTELY NO ALCOHOL during treatment and 48 hours after (disulfiram reaction).',
    counsellingPoints: [
      'NO ALCOHOL during treatment and for 48 hours after last dose (severe reaction)',
      'Dark urine is normal and harmless',
      'Take with food to reduce nausea',
      'Metallic taste is common side effect',
      'Complete full course to prevent resistance',
    ],
    nhisStatus: 'Covered — essential antiparasitic/antianaerobic on NHIS',
    localAlternatives: ['Flagyl', 'Metrogyl', 'Amebil'],
  },
  artemether: {
    whatItDoes: 'Artemisinin derivative antimalarial. Rapid-acting blood schizonticide.',
    indications: ['Uncomplicated Plasmodium falciparum malaria', 'Severe malaria (IV artesunate preferred)', 'Multidrug-resistant malaria'],
    mechanism: 'Forms free radicals inside malaria parasites, damaging parasite proteins and membranes. Rapid parasite clearance.',
    adultDose: 'Artemether-lumefantrine (Coartem): 4 tablets initially, then 4 tablets at 8, 24, 36, 48, 60 hours (total 24 tablets over 3 days). Weight-based for <35kg.',
    pediatricDose: 'Artemether-lumefantrine: Weight-based dosing. 5-14kg: 1 tablet per dose. 15-24kg: 2 tablets. 25-34kg: 3 tablets. 35kg+: 4 tablets. Same schedule as adults.',
    renalAdjustment: 'No adjustment needed. Hepatically metabolized.',
    commonSideEffects: ['Headache', 'Dizziness', 'GI upset', 'Cough', 'Weakness'],
    seriousSideEffects: ['QT prolongation', 'Delayed hemolysis (post-treatment)', 'Severe allergic reaction'],
    contraindications: ['First trimester pregnancy (first-line)', 'Severe hepatic/renal impairment', 'Concurrent CYP3A4 inducers (reduces efficacy)', 'Hypersensitivity'],
    pregnancySafety: 'Category C — safe in 2nd/3rd trimester. First trimester: use only if quinine not available.',
    lactationSafety: 'Compatible. Very low levels in breast milk. Infant should receive full dose directly if malaria-positive.',
    storageConditions: 'Store below 30°C, in original packaging.',
    foodInteractions: 'Take with fatty meal or milk (increases absorption 2-3 fold). Avoid on empty stomach.',
    counsellingPoints: [
      'Take with food or milk to improve absorption',
      'Complete ALL 6 doses over 3 days — missing doses causes treatment failure',
      'Repeat dose if vomiting occurs within 1 hour',
      'Report return of fever within 14 days (possible resistance/reinfection)',
      'Avoid grapefruit juice (increases levels)',
    ],
    nhisStatus: 'Covered — first-line antimalarial on NHIS (ACTs free for under-5s and pregnant women)',
    localAlternatives: ['Coartem (Artemether-lumefantrine)', 'Lonart', 'Amatem', 'Artefan'],
  },
  'artemether-lumefantrine': {
    whatItDoes: 'Artemisinin-based combination therapy (ACT). Rapid-acting + long-acting antimalarial.',
    indications: ['Uncomplicated Plasmodium falciparum malaria', 'First-line malaria treatment (Ghana/WHO)'],
    mechanism: 'Artemether rapidly clears parasites; lumefantrine eliminates remaining parasites and prevents recrudescence.',
    adultDose: '4 tablets at 0, 8, 24, 36, 48, 60 hours (6 doses over 3 days). Total: 24 tablets for adults ≥35kg.',
    pediatricDose: 'Weight-based: 5-14kg=1 tab, 15-24kg=2 tabs, 25-34kg=3 tabs, ≥35kg=4 tabs. Same 6-dose schedule.',
    renalAdjustment: 'No adjustment needed.',
    commonSideEffects: ['Headache', 'Dizziness', 'Loss of appetite', 'Cough', 'Weakness'],
    seriousSideEffects: ['QT prolongation', 'Severe allergic reaction'],
    contraindications: ['First trimester pregnancy (unless quinine unavailable)', 'Severe malaria (use IV artesunate)', 'Concurrent strong CYP3A4 inducers'],
    pregnancySafety: 'Safe 2nd/3rd trimester. First trimester: use only if quinine not available.',
    lactationSafety: 'Compatible. Minimal excretion in breast milk.',
    storageConditions: 'Store below 30°C, dry place.',
    foodInteractions: 'MUST take with fatty food/milk. Fat increases absorption 2-3 fold.',
    counsellingPoints: [
      'ALWAYS take with food or milk (very important for effectiveness)',
      'Complete all 6 doses — fever may improve after 1-2 doses but parasite clearance requires full course',
      'If vomiting within 1 hour: repeat dose',
      'Report fever returning within 2 weeks',
    ],
    nhisStatus: 'Covered — primary ACT on NHIS (free for under-5s, pregnant women)',
    localAlternatives: ['Coartem', 'Lonart', 'Amatem'],
  },
};

function getDrugFromLocalDB(name: string, genericName: string, classification: string): DrugIntelligence {
  // Try to match by name or generic name
  const searchKey = name.toLowerCase().trim();
  const genericKey = (genericName || name).toLowerCase().trim();
  
  // Direct match
  let match = LOCAL_DRUG_DB[searchKey] || LOCAL_DRUG_DB[genericKey];
  
  // Partial match (e.g., "Panadol" matches "paracetamol")
  if (!match) {
    const keys = Object.keys(LOCAL_DRUG_DB);
    for (const key of keys) {
      if (searchKey.includes(key) || key.includes(searchKey) ||
          genericKey.includes(key) || key.includes(genericKey)) {
        match = LOCAL_DRUG_DB[key];
        break;
      }
    }
  }
  
  if (match) {
    return {
      name,
      genericName: genericName || name,
      classification,
      whatItDoes: match.whatItDoes || '',
      indications: match.indications || [],
      mechanism: match.mechanism || '',
      adultDose: match.adultDose || '',
      pediatricDose: match.pediatricDose || null,
      renalAdjustment: match.renalAdjustment || null,
      commonSideEffects: match.commonSideEffects || [],
      seriousSideEffects: match.seriousSideEffects || [],
      contraindications: match.contraindications || [],
      pregnancySafety: match.pregnancySafety || '',
      lactationSafety: match.lactationSafety || '',
      storageConditions: match.storageConditions || '',
      foodInteractions: match.foodInteractions || null,
      counsellingPoints: match.counsellingPoints || [],
      nhisStatus: match.nhisStatus || 'Unknown — check Ghana NHIS formulary',
      localAlternatives: match.localAlternatives || [],
      learnMoreLinks: [
        { label: 'Ghana FDA', url: 'https://www.fdaghana.gov.gh/' },
        { label: 'WHO Essential Medicines', url: 'https://www.who.int/medicines/publications/essentialmedicines/en/' },
      ],
      disclaimer: 'For pharmacy staff education only. Not a substitute for clinical judgment or patient counselling by a licensed pharmacist.',
      generatedAt: new Date().toISOString(),
    };
  }
  
  // Ultimate fallback - generic response but with better structure
  return {
    name,
    genericName: genericName || name,
    classification,
    whatItDoes: `${name} is a ${classification} pharmaceutical agent. Consult standard references for detailed clinical information.`,
    indications: ['Consult standard pharmacology references for indications'],
    mechanism: 'Mechanism of action varies by drug class. Refer to pharmacology texts.',
    adultDose: 'Standard adult dosing not available in local database. Consult: BNF, WHO Essential Medicines List, or Ghana Standard Treatment Guidelines.',
    pediatricDose: 'Pediatric dosing not available in local database. Consult pediatric dosing references.',
    renalAdjustment: 'Renal adjustment not available in local database. Consult prescribing information.',
    commonSideEffects: ['Consult product monograph for side effect profile'],
    seriousSideEffects: ['Report serious adverse reactions to Ghana FDA PV Unit'],
    contraindications: ['Consult product information for contraindications'],
    pregnancySafety: 'Refer to pregnancy safety category in product monograph',
    lactationSafety: 'Refer to lactation safety data in product monograph',
    storageConditions: 'Store as per manufacturer\'s instructions on product label',
    foodInteractions: null,
    counsellingPoints: [
      'Verify patient identity and allergies before dispensing',
      'Confirm indication and prescriber authorization',
      'Provide patient information leaflet when available',
      'Document counseling provided in patient record',
    ],
    nhisStatus: 'Verify NHIS coverage status in current formulary',
    localAlternatives: [],
    learnMoreLinks: [
      { label: 'Ghana FDA', url: 'https://www.fdaghana.gov.gh/' },
      { label: 'WHO Essential Medicines', url: 'https://www.who.int/medicines/publications/essentialmedicines/en/' },
      { label: 'Ghana Standard Treatment Guidelines', url: 'https://www.moh.gov.gh/' },
    ],
    disclaimer: 'For pharmacy staff education only. Not a substitute for clinical judgment or patient counselling by a licensed pharmacist.',
    generatedAt: new Date().toISOString(),
  };
}

function buildFallback(name: string, genericName: string, classification: string): DrugIntelligence {
  // Use intelligent local database first
  return getDrugFromLocalDB(name, genericName, classification);
}
