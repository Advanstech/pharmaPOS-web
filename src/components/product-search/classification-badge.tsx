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
    label: 'POM',
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
      className="inline-flex shrink-0 items-center justify-center rounded-[5px] border px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wider"
      style={{
        background: cfg.bg,
        color: cfg.text,
        borderColor: cfg.text,
      }}
      title={cfg.label}
      aria-label={`Classification: ${cfg.label}`}
    >
      {cfg.label}
    </span>
  );
}
