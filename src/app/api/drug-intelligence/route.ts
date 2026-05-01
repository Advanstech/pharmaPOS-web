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

const SYSTEM_PROMPT = `You are Azzay Pharmacy Pro's clinical drug intelligence engine for a Ghana pharmacy.
You provide accurate, concise, Ghana-context-aware drug information for pharmacy staff.
Always respond in valid JSON matching the exact schema provided.
Use plain language suitable for pharmacy staff (not patients).
For Ghana context: reference NHIS coverage, Ghana FDA classification, local brand names where known.
Never recommend specific doses without noting "consult prescriber for individual dosing".
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

Return ONLY valid JSON with this exact structure:
{
  "name": "${name}",
  "genericName": "${genericName || name}",
  "classification": "${classification}",
  "whatItDoes": "1-2 sentence plain-language summary of what this drug does",
  "indications": ["condition 1", "condition 2", "condition 3"],
  "mechanism": "Plain language explanation of how it works (1-2 sentences)",
  "adultDose": "Typical adult dosage and frequency",
  "pediatricDose": "Pediatric dosing or null if not applicable",
  "renalAdjustment": "Renal dose adjustment note or null",
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

function buildFallback(name: string, genericName: string, classification: string): DrugIntelligence {
  return {
    name,
    genericName: genericName || name,
    classification,
    whatItDoes: `${name} is a pharmaceutical product. Consult a pharmacist or prescriber for detailed clinical information.`,
    indications: ['Consult product monograph for indications'],
    mechanism: 'Mechanism of action information not available offline. Connect to internet for AI-powered drug intelligence.',
    adultDose: 'See product label or consult prescriber',
    pediatricDose: null,
    renalAdjustment: null,
    commonSideEffects: ['See product information leaflet'],
    seriousSideEffects: ['Report any serious adverse effects to Ghana FDA'],
    contraindications: ['See product information leaflet'],
    pregnancySafety: 'Consult prescriber before use in pregnancy',
    lactationSafety: 'Consult prescriber before use while breastfeeding',
    storageConditions: 'Store below 30°C, away from direct sunlight and moisture',
    foodInteractions: null,
    counsellingPoints: [
      'Take as directed by your prescriber or pharmacist',
      'Complete the full course if prescribed',
      'Report any unusual side effects to your pharmacist',
      'Keep out of reach of children',
    ],
    nhisStatus: 'Unknown — check Ghana NHIS formulary',
    localAlternatives: [],
    learnMoreLinks: [
      { label: 'Ghana FDA', url: 'https://www.fdaghana.gov.gh/' },
      { label: 'WHO Essential Medicines', url: 'https://www.who.int/medicines/publications/essentialmedicines/en/' },
    ],
    disclaimer: 'For pharmacy staff education only. Not a substitute for clinical judgment or patient counselling by a licensed pharmacist.',
    generatedAt: new Date().toISOString(),
  };
}
