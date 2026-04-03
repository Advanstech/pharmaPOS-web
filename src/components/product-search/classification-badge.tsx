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
      className="inline-flex max-w-full shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-wide sm:gap-1 sm:px-2 sm:text-[11px]"
      style={{ background: cfg.bg, color: cfg.text }}
      aria-label={`Classification: ${cfg.label}`}
    >
      <span aria-hidden="true" className="shrink-0 text-[0.65rem] sm:text-[0.7rem]">
        {cfg.icon}
      </span>
      <span className="truncate">{cfg.label}</span>
    </span>
  );
}
