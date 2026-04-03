'use client';

/**
 * Print POS receipt in a hidden iframe (srcdoc). Avoids blank previews caused by
 * `visibility` tricks + Framer Motion transforms / backdrop-filter on modal ancestors.
 * Pattern aligned with `exportPrintablePdf` in `lib/reports/pdf-export.ts`.
 */

function receiptDocumentStyles(): string {
  return `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 20px;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: #fff;
      color: #0d1b1e;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt-wrap { max-width: 420px; margin: 0 auto; }
    .bg-surface-card { background: #fff !important; }
    .bg-teal, .print-receipt-header { background: #006d77 !important; color: #fff !important; }
    .text-gold { color: #e8a838 !important; }
    .text-teal-100 { color: rgba(255,255,255,0.88) !important; }
    .text-white { color: #fff !important; }
    .text-content-primary { color: #0d1b1e !important; }
    .text-content-secondary, .text-content-muted { color: #4a6670 !important; }
    .border-surface-border { border-color: #e8edf0 !important; }
    .p-6 { padding: 1.5rem !important; }
    .p-4 { padding: 1rem !important; }
    .mb-1 { margin-bottom: 0.25rem !important; }
    .mb-3 { margin-bottom: 0.75rem !important; }
    .mb-4 { margin-bottom: 1rem !important; }
    .mb-6 { margin-bottom: 1.5rem !important; }
    .mt-1 { margin-top: 0.25rem !important; }
    .mt-2 { margin-top: 0.5rem !important; }
    .mt-4 { margin-top: 1rem !important; }
    .mt-8 { margin-top: 2rem !important; }
    .pt-2 { padding-top: 0.5rem !important; }
    .my-4 { margin-top: 1rem !important; margin-bottom: 1rem !important; }
    .flex { display: flex !important; }
    .inline-flex { display: inline-flex !important; }
    .inline-block { display: inline-block !important; }
    .tabular-nums { font-variant-numeric: tabular-nums !important; }
    .gap-0 { gap: 0 !important; }
    .leading-none { line-height: 1 !important; }
    .flex-1 { flex: 1 1 0% !important; }
    .items-baseline { align-items: baseline !important; }
    .items-center { align-items: center !important; }
    .items-start { align-items: flex-start !important; }
    .justify-between { justify-content: space-between !important; }
    .justify-center { justify-content: center !important; }
    .gap-1 { gap: 0.25rem !important; }
    .gap-2 { gap: 0.5rem !important; }
    .pr-2 { padding-right: 0.5rem !important; }
    .text-center { text-align: center !important; }
    .text-right { text-align: right !important; }
    .text-xl { font-size: 1.25rem !important; line-height: 1.75rem !important; }
    .text-lg { font-size: 1.125rem !important; line-height: 1.75rem !important; }
    .text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
    .text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
    .pos-receipt-meta { font-size: 11px !important; line-height: 1.35 !important; }
    .font-bold { font-weight: 700 !important; }
    .font-medium { font-weight: 500 !important; }
    .font-mono { font-family: ui-monospace, monospace !important; }
    .leading-snug { line-height: 1.375 !important; }
    .tracking-tight { letter-spacing: -0.025em !important; }
    .space-y-2 > * + * { margin-top: 0.5rem !important; }
    .space-y-3 > * + * { margin-top: 0.75rem !important; }
    .border-t { border-top-width: 1px !important; border-top-style: solid !important; }
    .border-dashed { border-style: dashed !important; }
    hr { border: 0; border-top: 1px dashed #e8edf0; margin: 1rem 0; }
    svg { display: block; max-width: 100%; height: auto; }
    @media print {
      body { padding: 0; }
      .receipt-wrap { max-width: none; }
    }
  `;
}

export function printPosReceiptFromElement(printArea: HTMLElement): void {
  const inner = printArea.innerHTML;
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PharmaPOS — Receipt</title>
  <style>${receiptDocumentStyles()}</style>
</head>
<body>
  <div class="receipt-wrap">${inner}</div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.setAttribute(
    'style',
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none',
  );
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  if (!win) {
    iframe.remove();
    return;
  }

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    iframe.remove();
  };

  const printOnce = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          win.focus();
          win.print();
        } catch {
          /* ignore */
        }
      });
    });
  };

  const onLoad = () => {
    win.addEventListener('afterprint', () => cleanup(), { once: true });
    printOnce();
    window.setTimeout(cleanup, 180_000);
  };

  iframe.addEventListener('load', onLoad, { once: true });

  try {
    iframe.srcdoc = fullHtml;
  } catch {
    iframe.removeEventListener('load', onLoad);
    const doc = iframe.contentDocument;
    if (!doc) {
      iframe.remove();
      return;
    }
    doc.open();
    doc.write(fullHtml);
    doc.close();
    onLoad();
  }
}
