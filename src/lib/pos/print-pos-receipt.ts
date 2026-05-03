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
      padding: 4px;
      /* Epson/thermal receipt fonts — narrow, high-density, print-optimised */
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 11px;
      line-height: 1.2;
      background: #fff;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt-wrap { max-width: 280px; margin: 0 auto; }

    /* Brand header */
    .receipt-brand {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: -0.02em;
      text-transform: uppercase;
    }
    .receipt-sub {
      font-size: 9px;
      font-weight: 700;
      color: #000;
      margin-top: 1px;
    }

    /* Item names */
    .receipt-item-name {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
    }

    /* Hide the screen-only success banner when printing */
    .no-print { display: none !important; }

    .bg-surface-card { background: #fff !important; }
    .text-content-primary { color: #000 !important; }
    .text-content-secondary, .text-content-muted { color: #000 !important; }
    .border-surface-border { border-color: #000 !important; }

    .px-5 { padding-left: 0 !important; padding-right: 0 !important; }
    .py-4 { padding-top: 0.4rem !important; padding-bottom: 0.4rem !important; }
    .mb-1 { margin-bottom: 0.1rem !important; }
    .mb-2 { margin-bottom: 0.2rem !important; }
    .mb-3 { margin-bottom: 0.3rem !important; }
    .mb-4 { margin-bottom: 0.4rem !important; }
    .mt-1 { margin-top: 0.1rem !important; }
    .mt-2 { margin-top: 0.2rem !important; }
    .mt-3 { margin-top: 0.3rem !important; }
    .mt-4 { margin-top: 0.4rem !important; }
    .mt-5 { margin-top: 0.5rem !important; }
    .pt-1 { padding-top: 0.1rem !important; }
    .pt-2 { padding-top: 0.2rem !important; }
    .my-2 { margin-top: 0.2rem !important; margin-bottom: 0.2rem !important; }
    .my-3 { margin-top: 0.3rem !important; margin-bottom: 0.3rem !important; }
    .pr-2 { padding-right: 0.2rem !important; }

    .flex { display: flex !important; }
    .flex-1 { flex: 1 1 0% !important; }
    .items-baseline { align-items: baseline !important; }
    .items-center { align-items: center !important; }
    .justify-between { justify-content: space-between !important; }
    .justify-center { justify-content: center !important; }
    .gap-1 { gap: 0.1rem !important; }
    .gap-2 { gap: 0.2rem !important; }

    .text-center { text-align: center !important; }
    .text-right { text-align: right !important; }
    .text-base { font-size: 12px !important; }
    .text-sm { font-size: 11px !important; }
    .text-xs { font-size: 10px !important; }

    .font-bold { font-weight: 800 !important; }
    .font-black { font-weight: 900 !important; }
    .font-medium, .font-semibold { font-weight: 700 !important; }
    .font-mono { font-family: 'Courier New', Courier, monospace !important; font-weight: 700 !important; }
    .tracking-tight { letter-spacing: -0.01em !important; }

    .pos-receipt-meta {
      font-family: 'Courier New', Courier, monospace !important;
      font-size: 8px !important;
      line-height: 1.1 !important;
      font-weight: 700 !important;
      word-break: break-all;
    }

    .space-y-1\\.5 > * + * { margin-top: 0.2rem !important; }
    .space-y-2 > * + * { margin-top: 0.2rem !important; }
    .border-t { border-top: 1px solid #000 !important; }
    .border-b { border-bottom: 1px solid #000 !important; }
    .border-dashed { border-style: dashed !important; }
    hr { border: 0; border-top: 1px dashed #000; margin: 0.3rem 0; }

    svg { display: none !important; }

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
  <title>Azzay Pharmacy — Receipt</title>
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
