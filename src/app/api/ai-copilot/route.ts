import { NextResponse } from 'next/server';
import { hasRequiredRole, verifyBearerJwt } from '@/lib/security/jwt-auth';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { fetchOpenAiWithTimeout } from '@/lib/security/openai-timeout';
import { recordAiMetric } from '@/lib/security/ai-metrics';

export const runtime = 'nodejs';
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const ROUTE_KEY = 'ai-copilot';
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

const SYSTEM_PROMPT = `You are PharmaPOS Pro's AI Copilot — an intelligent pharmacy assistant for a Ghana community pharmacy.

You help pharmacy staff with:
- Drug information (indications, dosage, side effects, interactions, counselling)
- Clinical guidance (prescription review, drug interactions, therapeutic alternatives)
- Inventory intelligence (stock management, reorder guidance, expiry management)
- Sales support (product information, pricing, customer counselling)
- Financial intelligence (revenue, cash flow, profitability)
- Ghana-specific context (NHIS coverage, Ghana FDA regulations, local brands, GRA tax)
- Compliance (Ghana FDA, GRA, GMDC requirements)

Rules:
- Be concise and practical — pharmacy staff are busy
- Always note when something requires a licensed pharmacist's judgment
- For drug interactions: always recommend consulting a pharmacist for MAJOR/CONTRAINDICATED interactions
- Never give specific medical advice to patients — only staff guidance
- Ghana context: use GHS (Ghana Cedis), reference NHIS, Ghana FDA, GRA where relevant
- Keep responses under 200 words unless detail is specifically needed
- Use bullet points for lists
- End clinical responses with "⚠️ Advisory only — consult a licensed pharmacist for patient-specific decisions"`;

interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
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
        {
          status: 429,
          headers: { 'Retry-After': String(limited.retryAfterSeconds ?? 60) },
        },
      );
    }

    const body = await request.json() as {
      message: string;
      role?: string;
      history?: HistoryMessage[];
    };

    const { message, role = 'cashier', history = [] } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        reply: 'AI Copilot is not configured. Please contact your system administrator to set up the OpenAI API key.',
      });
    }

    const roleContext = `The user is a ${role.replace(/_/g, ' ')} at a Ghana pharmacy.`;

    const messages = [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\n${roleContext}` },
      ...history.slice(-8).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const response = await fetchOpenAiWithTimeout(apiKey, {
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.4,
        max_tokens: 400,
    });

    if (!response.ok) {
      recordAiMetric(ROUTE_KEY, 'openai_error');
      const err = await response.text();
      console.error('[ai-copilot] OpenAI error:', err);
      return NextResponse.json({
        reply: 'I\'m having trouble connecting to the AI service. Please try again in a moment.',
      });
    }

    recordAiMetric(ROUTE_KEY, 'openai_success');
    const json = await response.json() as { choices: Array<{ message: { content: string } }> };
    const reply = json.choices?.[0]?.message?.content ?? 'I could not generate a response. Please try again.';

    return NextResponse.json({ reply });
  } catch (err) {
    if (err instanceof Error && err.message === 'OPENAI_TIMEOUT') {
      recordAiMetric(ROUTE_KEY, 'openai_timeout');
      return NextResponse.json({ error: 'Upstream AI timeout' }, { status: 504 });
    }
    recordAiMetric(ROUTE_KEY, 'server_error');
    console.error('[ai-copilot] Error:', err);
    return NextResponse.json({ error: 'Copilot request failed' }, { status: 500 });
  }
}
