import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const cache = new Map<string, { data: InteractionResult; ts: number }>();
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12h

export interface DrugPair {
  name: string;
  genericName?: string;
}

export interface Interaction {
  drug1: string;
  drug2: string;
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CONTRAINDICATED';
  description: string;
  clinicalEffect: string;
  management: string;
  canOverride: boolean;
}

export interface InteractionResult {
  drugs: string[];
  interactions: Interaction[];
  overallRisk: 'SAFE' | 'CAUTION' | 'WARNING' | 'DANGER';
  summary: string;
  checkedAt: string;
}

const SYSTEM_PROMPT = `You are a clinical drug interaction checker for a Ghana pharmacy POS system.
Check for drug-drug interactions between the provided medications.
Respond ONLY in valid JSON. Be accurate and clinically relevant.
Severity levels: MINOR (monitor), MODERATE (use with caution), MAJOR (avoid if possible), CONTRAINDICATED (never combine).
CONTRAINDICATED interactions cannot be overridden by any staff role.`;

export async function POST(request: Request) {
  try {
    const body = await request.json() as { drugs: DrugPair[] };
    const drugs = body.drugs ?? [];

    if (drugs.length < 2) {
      return NextResponse.json({
        drugs: drugs.map(d => d.name),
        interactions: [],
        overallRisk: 'SAFE',
        summary: 'No interactions to check — need at least 2 drugs.',
        checkedAt: new Date().toISOString(),
      } as InteractionResult);
    }

    const drugNames = drugs.map(d => d.genericName || d.name);
    const cacheKey = [...drugNames].sort().join('::').toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.data, { headers: { 'X-Cache': 'HIT' } });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(buildSafeResult(drugNames));
    }

    const prompt = `Check drug interactions between: ${drugNames.map((n, i) => `${i + 1}. ${n}`).join(', ')}.

Return ONLY valid JSON:
{
  "drugs": ${JSON.stringify(drugNames)},
  "interactions": [
    {
      "drug1": "drug name",
      "drug2": "drug name",
      "severity": "MINOR|MODERATE|MAJOR|CONTRAINDICATED",
      "description": "Brief description of the interaction",
      "clinicalEffect": "What happens clinically",
      "management": "How to manage this interaction",
      "canOverride": true/false (false only for CONTRAINDICATED)
    }
  ],
  "overallRisk": "SAFE|CAUTION|WARNING|DANGER",
  "summary": "One sentence overall assessment",
  "checkedAt": "${new Date().toISOString()}"
}

If no interactions exist, return empty interactions array and overallRisk: "SAFE".`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      return NextResponse.json(buildSafeResult(drugNames));
    }

    const json = await response.json() as { choices: Array<{ message: { content: string } }> };
    const content = json.choices?.[0]?.message?.content ?? '{}';
    const data = JSON.parse(content) as InteractionResult;

    cache.set(cacheKey, { data, ts: Date.now() });
    return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } });
  } catch (err) {
    console.error('[drug-interactions] Error:', err);
    return NextResponse.json({ error: 'Interaction check failed' }, { status: 500 });
  }
}

function buildSafeResult(drugNames: string[]): InteractionResult {
  return {
    drugs: drugNames,
    interactions: [],
    overallRisk: 'SAFE',
    summary: 'Interaction check unavailable offline. Consult a pharmacist for drug interaction guidance.',
    checkedAt: new Date().toISOString(),
  };
}
