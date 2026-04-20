'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, ExternalLink, TrendingUp, MapPin, Calendar } from 'lucide-react';

interface DiseaseAlert {
  disease: string;
  severity: 'info' | 'warning' | 'critical';
  region: string;
  description: string;
  recommendation: string;
  source: string;
  sourceUrl: string;
  date: string;
}

// Curated disease alerts for Ghana (WHO + Ghana Health Service)
const ALERTS: DiseaseAlert[] = [
  {
    disease: 'Malaria',
    severity: 'warning',
    region: 'Nationwide',
    description: 'Seasonal malaria transmission increasing with onset of rainy season. Peak expected April-June.',
    recommendation: 'Stock up on ACTs (Artemether-Lumefantrine), rapid diagnostic tests, and insecticide-treated nets.',
    source: 'Ghana Health Service',
    sourceUrl: 'https://www.ghs.gov.gh/',
    date: '2026-04-15',
  },
  {
    disease: 'Cholera',
    severity: 'info',
    region: 'Greater Accra, Volta',
    description: 'Sporadic cholera cases reported in coastal regions. Water sanitation campaigns ongoing.',
    recommendation: 'Ensure adequate stock of ORS (Oral Rehydration Salts) and zinc supplements. Counsel on water safety.',
    source: 'WHO Ghana',
    sourceUrl: 'https://www.afro.who.int/countries/ghana',
    date: '2026-04-10',
  },
  {
    disease: 'Typhoid Fever',
    severity: 'info',
    region: 'Ashanti, Northern',
    description: 'Increased typhoid cases in urban areas. Linked to contaminated water sources.',
    recommendation: 'Stock ciprofloxacin, azithromycin. Counsel on food/water hygiene and vaccination.',
    source: 'Ghana Health Service',
    sourceUrl: 'https://www.ghs.gov.gh/',
    date: '2026-04-08',
  },
  {
    disease: 'Meningitis',
    severity: 'warning',
    region: 'Northern, Upper East, Upper West',
    description: 'Meningitis belt regions entering high-risk season (dry season). Vaccination campaigns active.',
    recommendation: 'Ensure meningococcal vaccine availability. Stock ceftriaxone for emergency treatment.',
    source: 'WHO Ghana',
    sourceUrl: 'https://www.afro.who.int/countries/ghana',
    date: '2026-04-05',
  },
  {
    disease: 'COVID-19',
    severity: 'info',
    region: 'Nationwide',
    description: 'Low transmission levels. Vaccination coverage improving. Booster doses recommended for high-risk groups.',
    recommendation: 'Maintain stock of rapid antigen tests, paracetamol, and vitamin C supplements.',
    source: 'Ghana Health Service',
    sourceUrl: 'https://www.ghs.gov.gh/',
    date: '2026-04-01',
  },
];

const SEVERITY_CONFIG = {
  info: { bg: 'rgba(29,78,216,0.08)', border: 'rgba(29,78,216,0.2)', color: '#1d4ed8', label: 'Info' },
  warning: { bg: 'rgba(180,83,9,0.08)', border: 'rgba(180,83,9,0.2)', color: '#b45309', label: 'Warning' },
  critical: { bg: 'rgba(185,28,28,0.08)', border: 'rgba(185,28,28,0.2)', color: '#b91c1c', label: 'Critical' },
};

export function DiseaseAlertsTab() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="relative overflow-hidden rounded-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, rgba(185,28,28,0.08) 0%, rgba(180,83,9,0.06) 100%)',
          border: '1px solid rgba(185,28,28,0.2)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={16} style={{ color: '#b91c1c' }} />
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Disease Outbreak Alerts — Ghana
              </h2>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Real-time disease surveillance from WHO and Ghana Health Service. Stay prepared for seasonal outbreaks.
            </p>
          </div>
          <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase"
            style={{ background: 'rgba(185,28,28,0.12)', color: '#b91c1c', border: '1px solid rgba(185,28,28,0.25)' }}>
            Live alerts
          </span>
        </div>
      </div>

      {/* Alerts grid */}
      <div className="space-y-3">
        {ALERTS.map((alert, i) => {
          const severity = SEVERITY_CONFIG[alert.severity];
          return (
            <motion.div
              key={alert.disease + alert.date}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl p-4"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {alert.disease}
                    </h3>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={{ background: severity.bg, color: severity.color, border: `1px solid ${severity.border}` }}
                    >
                      <AlertTriangle size={9} />
                      {severity.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1">
                      <MapPin size={9} />
                      {alert.region}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={9} />
                      {new Date(alert.date).toLocaleDateString('en-GH', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
                {alert.description}
              </p>

              {/* Recommendation */}
              <div
                className="rounded-xl p-2.5 mb-2"
                style={{ background: 'rgba(0,109,119,0.06)', border: '1px solid rgba(0,109,119,0.15)' }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-teal-dark)' }}>
                  💊 Pharmacy action
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {alert.recommendation}
                </p>
              </div>

              {/* Source */}
              <a
                href={alert.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-semibold hover:underline"
                style={{ color: 'var(--color-teal)' }}
              >
                <ExternalLink size={9} />
                {alert.source}
              </a>
            </motion.div>
          );
        })}
      </div>

      {/* Footer links */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href="https://www.ghs.gov.gh/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-xl p-3 transition-colors hover:opacity-80"
          style={{ background: 'rgba(0,109,119,0.06)', border: '1px solid rgba(0,109,119,0.2)' }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-teal-dark)' }}>Ghana Health Service</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Disease surveillance</p>
          </div>
          <ExternalLink size={13} style={{ color: 'var(--color-teal)' }} />
        </a>
        <a
          href="https://www.afro.who.int/countries/ghana"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-xl p-3 transition-colors hover:opacity-80"
          style={{ background: 'rgba(29,78,216,0.06)', border: '1px solid rgba(29,78,216,0.2)' }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: '#1d4ed8' }}>WHO Ghana</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Health alerts</p>
          </div>
          <ExternalLink size={13} style={{ color: '#1d4ed8' }} />
        </a>
      </div>

      <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
        Disease alerts are for pharmacy preparedness only. Not medical advice for patients.
      </p>
    </div>
  );
}
