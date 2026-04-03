'use client';

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function section(title: string, body: string): string {
  return `
    <section class="section">
      <h2>${esc(title)}</h2>
      ${body}
    </section>
  `;
}

function styles(): string {
  return `
    :root { --teal:#006D77; --tealDark:#004E57; --text:#0D1B1E; --muted:#4A6670; --line:#E8EDF0; --bg:#F8FAFB; }
    * { box-sizing:border-box; }
    body { margin:0; font-family: Inter, Arial, sans-serif; color:var(--text); background:var(--bg); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .wrap { max-width: 980px; margin: 0 auto; padding: 24px; }
    .brand { display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid var(--line); padding-bottom:12px; margin-bottom:16px; }
    .brand h1 { margin:0; font-size:18px; color:var(--tealDark); }
    .brand p { margin:2px 0 0; color:var(--muted); font-size:12px; }
    .chip { background:var(--teal); color:white; border-radius:999px; padding:6px 10px; font-size:11px; font-weight:700; }
    .section { background:white; border:1px solid var(--line); border-radius:12px; padding:14px; margin:12px 0; }
    .section h2 { margin:0 0 10px; font-size:14px; color:var(--tealDark); }
    .kpis { display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; }
    .kpi { border:1px solid var(--line); border-radius:10px; padding:10px; background:#fff; }
    .kpi .label { font-size:11px; color:var(--muted); text-transform:uppercase; }
    .kpi .value { font-size:18px; font-weight:700; margin-top:4px; }
    ul, ol { margin:8px 0 0 18px; padding:0; }
    li { margin:5px 0; line-height:1.45; }
    .small { font-size:12px; color:var(--muted); }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    th, td { border:1px solid var(--line); padding:8px; vertical-align:top; text-align:left; }
    th { background:#F0F7F8; color:var(--tealDark); font-size:11px; text-transform:uppercase; }
    .page-break { page-break-before: always; }
    @media print {
      body { background: #fff; }
      .wrap { padding: 0; }
    }
  `;
}

function buildPrintDocumentHtml(title: string, subtitle: string, bodyHtml: string, generatedAt: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${esc(title)}</title>
    <style>${styles()}</style>
  </head>
  <body>
    <div class="wrap">
      <header class="brand">
        <div>
          <h1>PharmaPOS Pro · ${esc(title)}</h1>
          <p>${esc(subtitle)}</p>
        </div>
        <span class="chip">Decision Brief</span>
      </header>
      <p class="small">Generated: ${esc(generatedAt)} (Africa/Accra)</p>
      ${bodyHtml}
    </div>
  </body>
</html>`;
}

/**
 * Opens print / Save as PDF with content fully loaded. Uses a hidden iframe so the
 * preview is not blank (popup + immediate print often races layout in Chrome/Safari).
 */
export function exportPrintablePdf(title: string, subtitle: string, bodyHtml: string): void {
  const now = new Date().toLocaleString('en-GH', { timeZone: 'Africa/Accra' });
  const fullHtml = buildPrintDocumentHtml(title, subtitle, bodyHtml, now);

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
    openPrintPopupFallback(fullHtml);
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

  const afterReady = () => {
    win.addEventListener('afterprint', () => cleanup(), { once: true });
    printOnce();
    window.setTimeout(cleanup, 180_000);
  };

  const onIframeLoad = () => afterReady();

  iframe.addEventListener('load', onIframeLoad, { once: true });

  try {
    iframe.srcdoc = fullHtml;
  } catch {
    iframe.removeEventListener('load', onIframeLoad);
    const doc = iframe.contentDocument;
    if (!doc) {
      iframe.remove();
      openPrintPopupFallback(fullHtml);
      return;
    }
    doc.open();
    doc.write(fullHtml);
    doc.close();
    window.setTimeout(afterReady, 0);
  }
}

function openPrintPopupFallback(fullHtml: string): void {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=900');
  if (!win) return;
  win.document.open();
  win.document.write(fullHtml);
  win.document.close();
  const schedule = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        win.focus();
        win.print();
      });
    });
  };
  if (win.document.readyState === 'complete') schedule();
  else win.addEventListener('load', schedule, { once: true });
}

export function buildCfoPdfHtml(briefing: Record<string, any>): string {
  const alerts = (briefing.alerts ?? []) as Array<{ severity?: string; title?: string; message?: string; action?: string }>;
  const ratios = (briefing.keyRatios ?? []) as Array<{ name: string; value: string; benchmark: string; status: string; interpretation: string }>;
  const recs = ((briefing.investmentIntelligence?.recommendations ?? []) as Array<{ title?: string; rationale?: string; estimatedRoi12MonthPct?: number; estimatedInvestmentFormatted?: string; urgency?: string; paybackMonths?: number; type?: string }>);
  const rev = briefing.revenueIntelligence ?? {};
  const wc = briefing.workingCapital ?? {};

  return [
    section(
      'Executive Snapshot',
      `<div class="kpis">
        <div class="kpi"><div class="label">Health Score</div><div class="value">${esc(briefing.healthScoreNumeric ?? 0)}/100</div></div>
        <div class="kpi"><div class="label">Month Revenue</div><div class="value">${esc(briefing.monthRevenueFormatted ?? 'GH¢0.00')}</div></div>
        <div class="kpi"><div class="label">Cash Runway</div><div class="value">${esc(Math.round(Number(wc.cashRunwayDays ?? 0)))} days</div></div>
      </div>
      <p>${esc(briefing.executiveSummary ?? 'No executive summary available.')}</p>`
    ),
    section(
      'Revenue Intelligence',
      `<ul>
        <li><strong>Trend:</strong> ${esc(rev.trendSignal ?? 'N/A')}</li>
        <li><strong>MoM Growth:</strong> ${esc(typeof rev.momGrowthPct === 'number' ? `${rev.momGrowthPct.toFixed(1)}%` : 'N/A')}</li>
        <li><strong>Projected Next Month:</strong> ${esc(rev.projectedNextMonthFormatted ?? 'N/A')}</li>
      </ul>
      <p>${esc(rev.insight ?? 'No revenue insight available.')}</p>`
    ),
    section(
      'CFO Alerts and Actions',
      alerts.length
        ? `<ol>${alerts.map((a) => `<li><strong>[${esc(a.severity ?? 'INFO')}] ${esc(a.title ?? 'Alert')}</strong>: ${esc(a.message ?? '')}${a.action ? `<br/><span class="small">Action: ${esc(a.action)}</span>` : ''}</li>`).join('')}</ol>`
        : '<p>No active alerts. Financial indicators are currently stable.</p>'
    ),
    section(
      'Key Financial Ratios',
      ratios.length
        ? `<table><thead><tr><th>Ratio</th><th>Value</th><th>Benchmark</th><th>Status</th><th>Interpretation</th></tr></thead><tbody>
            ${ratios.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.value)}</td><td>${esc(r.benchmark)}</td><td>${esc(r.status)}</td><td>${esc(r.interpretation)}</td></tr>`).join('')}
          </tbody></table>`
        : '<p>No ratio data available.</p>'
    ),
    section(
      'Investment Intelligence',
      recs.length
        ? `<ol>${recs.map((r) => `<li><strong>${esc(r.title ?? 'Recommendation')}</strong> (${esc(r.type ?? 'N/A')}, ${esc(r.urgency ?? 'N/A')})<br/>${esc(r.rationale ?? '')}<br/><span class="small">Estimated ROI: ${esc(typeof r.estimatedRoi12MonthPct === 'number' ? `${r.estimatedRoi12MonthPct.toFixed(0)}%` : 'N/A')} · Investment: ${esc(r.estimatedInvestmentFormatted ?? 'N/A')} · Payback: ${esc(r.paybackMonths ?? 'N/A')} months</span></li>`).join('')}</ol>`
        : '<p>No investment recommendations this cycle.</p>'
    ),
  ].join('');
}

export function buildAuditPdfHtml(report: Record<string, any>): string {
  const allFindings = (report.allFindings ?? []) as Array<{ severity?: string; category?: string; title?: string; description?: string; recommendation?: string; financialImpactFormatted?: string; regulatoryReference?: string }>;
  const riskMatrix = (report.riskMatrix ?? []) as Array<{ riskTitle?: string; riskType?: string; likelihood?: string; impact?: string; inherentRisk?: string; recommendedControl?: string }>;
  const staff = (report.staffProfiles ?? []) as Array<{ userId?: string; role?: string; riskScore?: number; riskRating?: string; summary?: string }>;

  return [
    section(
      'Audit Executive Opinion',
      `<div class="kpis">
        <div class="kpi"><div class="label">Overall Risk</div><div class="value">${esc(report.overallRiskScore ?? 0)} (${esc(report.overallRiskRating ?? 'N/A')})</div></div>
        <div class="kpi"><div class="label">Critical Findings</div><div class="value">${esc(report.criticalFindingsCount ?? 0)}</div></div>
        <div class="kpi"><div class="label">Financial Exposure</div><div class="value">${esc(report.totalFinancialExposureFormatted ?? 'GH¢0.00')}</div></div>
      </div>
      <p><strong>Opinion:</strong> ${esc(report.auditorOpinion ?? 'N/A')}</p>
      <p>${esc(report.opinionNarrative ?? 'No narrative available.')}</p>`
    ),
    section(
      'Immediate Action Plan',
      `<pre style="white-space:pre-wrap; font-family:Inter,Arial,sans-serif; margin:0;">${esc(report.immediateActionPlan ?? 'No immediate actions required.')}</pre>`
    ),
    `<div class="page-break"></div>`,
    section(
      'All Findings (Full Detail)',
      allFindings.length
        ? `<ol>${allFindings.map((f) => `<li><strong>[${esc(f.severity ?? 'INFO')}] ${esc(f.title ?? 'Finding')}</strong> <span class="small">(${esc(f.category ?? 'General')}${f.financialImpactFormatted ? ` · Impact ${esc(f.financialImpactFormatted)}` : ''})</span><br/>${esc(f.description ?? '')}${f.regulatoryReference ? `<br/><span class="small">Regulatory: ${esc(f.regulatoryReference)}</span>` : ''}<br/><em>Recommendation:</em> ${esc(f.recommendation ?? '')}</li>`).join('')}</ol>`
        : '<p>No findings for this period.</p>'
    ),
    section(
      'Risk Matrix',
      riskMatrix.length
        ? `<table><thead><tr><th>Risk</th><th>Type</th><th>Likelihood</th><th>Impact</th><th>Inherent</th><th>Control</th></tr></thead><tbody>
          ${riskMatrix.map((r) => `<tr><td>${esc(r.riskTitle)}</td><td>${esc(r.riskType)}</td><td>${esc(r.likelihood)}</td><td>${esc(r.impact)}</td><td>${esc(r.inherentRisk)}</td><td>${esc(r.recommendedControl)}</td></tr>`).join('')}
        </tbody></table>`
        : '<p>No risk matrix data.</p>'
    ),
    section(
      'Staff Intelligence Summary',
      staff.length
        ? `<ul>${staff.slice(0, 20).map((s) => `<li><strong>${esc((s.userId ?? '').slice(0, 8))}…</strong> · ${esc(s.role ?? 'N/A')} · Score ${esc(s.riskScore ?? 0)} (${esc(s.riskRating ?? 'N/A')})<br/><span class="small">${esc(s.summary ?? '')}</span></li>`).join('')}</ul>`
        : '<p>No staff profile activity in this period.</p>'
    ),
  ].join('');
}

export function openMailClient(subject: string, body: string): void {
  const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = url;
}
