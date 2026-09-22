import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy for pharmaceutical image search APIs.
 * Tries multiple sources with graceful fallbacks.
 * GET /api/product-image?name=Paracetamol+500mg
 */
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name');
  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Name parameter required (min 2 chars)' }, { status: 400 });
  }

  const errors: string[] = [];

  // Source 1: RxImage API (NIH — free, real pharmaceutical photos)
  try {
    const rxUrl = `https://rximage.nlm.nih.gov/api/rximage/1/rxnav?name=${encodeURIComponent(name)}&resolution=600`;
    const rxRes = await fetch(rxUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Azzay Pharmacy/1.0' },
    });
    if (rxRes.ok) {
      const rxData = await rxRes.json();
      const images = rxData?.nlmRxImages ?? [];
      if (images.length > 0) {
        return NextResponse.json({ source: 'RxImage (NIH)', imageUrl: images[0].imageUrl, confidence: 95, total: images.length });
      }
    }
    errors.push('RxImage: no results');
  } catch (e) {
    errors.push(`RxImage: ${e instanceof Error ? e.message : 'failed'}`);
  }

  // Source 2: OpenFDA
  try {
    const fdaUrl = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(name)}"&limit=1`;
    const fdaRes = await fetch(fdaUrl, { signal: AbortSignal.timeout(8000) });
    if (fdaRes.ok) {
      const fdaData = await fdaRes.json();
      const results = fdaData?.results ?? [];
      if (results.length > 0 && results[0].openfda?.brand_name) {
        return NextResponse.json({
          source: 'OpenFDA',
          imageUrl: null,
          drugName: results[0].openfda.brand_name[0],
          manufacturer: results[0].openfda.manufacturer_name?.[0] ?? null,
          confidence: 70,
          message: `Found "${results[0].openfda.brand_name[0]}" in FDA database. No image available — try uploading manually.`,
        });
      }
    }
    errors.push('OpenFDA: no results');
  } catch (e) {
    errors.push(`OpenFDA: ${e instanceof Error ? e.message : 'failed'}`);
  }

  // Source 3: Generate a placeholder search URL for manual lookup
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(name + ' pharmaceutical product image')}&tbm=isch`;

  return NextResponse.json({
    source: null,
    imageUrl: null,
    searchUrl: googleSearchUrl,
    message: `No image found for "${name}" in pharmaceutical databases. You can search Google Images or upload manually.`,
    errors,
  });
}
