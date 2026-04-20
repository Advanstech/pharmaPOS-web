import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.4,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[ai-copilot] OpenAI error:', err);
      return NextResponse.json({
        reply: 'I\'m having trouble connecting to the AI service. Please try again in a moment.',
      });
    }

    const json = await response.json() as { choices: Array<{ message: { content: string } }> };
    const reply = json.choices?.[0]?.message?.content ?? 'I could not generate a response. Please try again.';

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('[ai-copilot] Error:', err);
    return NextResponse.json({ error: 'Copilot request failed' }, { status: 500 });
  }
}
