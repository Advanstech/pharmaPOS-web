'use client';

interface ClassificationBadgeProps {
  classification: string;
}

// Colour + icon + text — never colour alone (ui-ux rule)
const CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  OTC: {
    label: 'OTC',
    bg: 'rgba(22,163,74,0.1)',
    text: '#15803d',
    icon: '✓',
  },
  POM: {
    label: 'POM ℞',
    bg: 'rgba(217,119,6,0.1)',
    text: '#b45309',
    icon: '℞',
  },
  CONTROLLED: {
    label: 'CTRL',
    bg: 'rgba(220,38,38,0.1)',
    text: '#b91c1c',
    icon: '⚠',
  },
};

export function ClassificationBadge({ classification }: ClassificationBadgeProps) {
  const cfg = CONFIG[classification] ?? CONFIG['OTC'];

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide"
      style={{ background: cfg.bg, color: cfg.text }}
      aria-label={`Classification: ${cfg.label}`}
    >
      <span aria-hidden="true">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}
