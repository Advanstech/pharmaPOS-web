'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, BookOpen, ChevronRight, CheckCircle2,
  Clock, Star, BrainCircuit, Sparkles, ExternalLink,
} from 'lucide-react';

interface LearningModule {
  id: string;
  title: string;
  category: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  keyPoints: string[];
  externalUrl: string;
  icon: string;
}

const MODULES: LearningModule[] = [
  {
    id: 'malaria-treatment',
    title: 'Malaria Treatment in Ghana',
    category: 'Clinical',
    duration: '8 min',
    level: 'Beginner',
    description: 'Ghana\'s first-line malaria treatment protocols, ACT dosing, and patient counselling.',
    keyPoints: [
      'Artemether-Lumefantrine is Ghana\'s first-line ACT for uncomplicated malaria',
      'Always take with food or milk to improve absorption',
      'Complete the full 3-day course even if feeling better',
      'Refer severe malaria cases to hospital immediately',
      'Rapid diagnostic tests (RDTs) should confirm diagnosis before treatment',
    ],
    externalUrl: 'https://www.ghs.gov.gh/malaria',
    icon: '🦟',
  },
  {
    id: 'antibiotic-stewardship',
    title: 'Antibiotic Stewardship',
    category: 'Clinical',
    duration: '10 min',
    level: 'Intermediate',
    description: 'Responsible antibiotic dispensing to combat antimicrobial resistance in Ghana.',
    keyPoints: [
      'Never dispense antibiotics without a valid prescription (POM)',
      'Counsel patients to complete the full course',
      'Amoxicillin and cotrimoxazole are common first-line choices',
      'Fluoroquinolones (ciprofloxacin) should be reserved for specific indications',
      'Report suspected antibiotic resistance to Ghana FDA',
    ],
    externalUrl: 'https://www.who.int/health-topics/antimicrobial-resistance',
    icon: '🦠',
  },
  {
    id: 'diabetes-management',
    title: 'Diabetes Medicines in Ghana',
    category: 'Clinical',
    duration: '12 min',
    level: 'Intermediate',
    description: 'Oral antidiabetics, insulin, and patient counselling for diabetes management.',
    keyPoints: [
      'Metformin is first-line for Type 2 diabetes — take with food to reduce GI side effects',
      'Counsel on hypoglycaemia signs: sweating, trembling, confusion',
      'Insulin requires refrigeration — counsel on storage',
      'NHIS covers metformin and some insulins',
      'Regular blood glucose monitoring is essential',
    ],
    externalUrl: 'https://www.who.int/health-topics/diabetes',
    icon: '💉',
  },
  {
    id: 'hypertension-medicines',
    title: 'Hypertension Medicines',
    category: 'Clinical',
    duration: '10 min',
    level: 'Intermediate',
    description: 'Antihypertensive drug classes, counselling, and adherence support.',
    keyPoints: [
      'Amlodipine (calcium channel blocker) — common first-line in Ghana',
      'ACE inhibitors (lisinopril) — avoid in pregnancy, watch for dry cough',
      'Counsel on medication adherence — hypertension is a lifelong condition',
      'Lifestyle modifications: reduce salt, exercise, stop smoking',
      'NHIS covers most first-line antihypertensives',
    ],
    externalUrl: 'https://www.who.int/health-topics/hypertension',
    icon: '❤️',
  },
  {
    id: 'ghana-fda-compliance',
    title: 'Ghana FDA Compliance for Pharmacies',
    category: 'Regulatory',
    duration: '15 min',
    level: 'Advanced',
    description: 'Ghana FDA regulations, POM dispensing rules, and pharmacy compliance requirements.',
    keyPoints: [
      'POM (Prescription-Only Medicines) require a valid prescription before dispensing',
      'Controlled drugs require dual pharmacist sign-off',
      'Prescriptions are valid for 30 days only — never extend',
      'GMDC prescriber licence must be validated for all Rx',
      'Maintain dispensing records for FDA inspection',
    ],
    externalUrl: 'https://www.fdaghana.gov.gh/',
    icon: '⚖️',
  },
  {
    id: 'patient-counselling',
    title: 'Effective Patient Counselling',
    category: 'Skills',
    duration: '8 min',
    level: 'Beginner',
    description: 'Communication skills for pharmacy staff when counselling patients and customers.',
    keyPoints: [
      'Use plain language — avoid medical jargon with patients',
      'The "show and tell" method: demonstrate how to take medication',
      'Ask patients to repeat back instructions to confirm understanding',
      'Always mention: what it\'s for, how to take it, side effects to watch for',
      'Refer complex clinical questions to the pharmacist',
    ],
    externalUrl: 'https://www.who.int/publications/i/item/9789241548465',
    icon: '💬',
  },
];

const LEVEL_COLORS = {
  Beginner: { bg: 'rgba(21,128,61,0.08)', color: '#15803d', border: 'rgba(21,128,61,0.2)' },
  Intermediate: { bg: 'rgba(180,83,9,0.08)', color: '#b45309', border: 'rgba(180,83,9,0.2)' },
  Advanced: { bg: 'rgba(109,40,217,0.08)', color: '#6d28d9', border: 'rgba(109,40,217,0.2)' },
};

export function StaffLearningTab() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(MODULES.map(m => m.category)))];
  const filtered = filter === 'All' ? MODULES : MODULES.filter(m => m.category === filter);

  const toggleComplete = (id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="relative overflow-hidden rounded-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, rgba(109,40,217,0.08) 0%, rgba(0,109,119,0.06) 100%)',
          border: '1px solid rgba(109,40,217,0.2)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap size={16} style={{ color: '#6d28d9' }} />
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Staff Learning Centre
              </h2>
              <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                style={{ background: 'rgba(109,40,217,0.1)', color: '#6d28d9', border: '1px solid rgba(109,40,217,0.2)' }}>
                NEW
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Drug education modules for pharmacy staff. Learn at your own pace.
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold" style={{ color: 'var(--color-teal)' }}>
              {completed.size}/{MODULES.length}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>completed</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-border)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--color-teal-dark), var(--color-teal))' }}
            initial={{ width: 0 }}
            animate={{ width: `${(completed.size / MODULES.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
            style={
              filter === cat
                ? { background: 'var(--color-teal)', color: '#fff' }
                : { background: 'var(--surface-card)', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' }
            }
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Modules */}
      <div className="space-y-3">
        {filtered.map((module, i) => {
          const isExpanded = expanded === module.id;
          const isDone = completed.has(module.id);
          const levelStyle = LEVEL_COLORS[module.level];

          return (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'var(--surface-card)',
                border: `1px solid ${isDone ? 'rgba(21,128,61,0.3)' : 'var(--surface-border)'}`,
              }}
            >
              {/* Module header */}
              <button
                onClick={() => setExpanded(isExpanded ? null : module.id)}
                className="flex w-full items-start gap-3 p-4 text-left"
              >
                <span className="text-2xl shrink-0 mt-0.5">{module.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {module.title}
                    </p>
                    {isDone && <CheckCircle2 size={16} className="shrink-0 mt-0.5" style={{ color: '#15803d' }} />}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                      style={{ background: levelStyle.bg, color: levelStyle.color, border: `1px solid ${levelStyle.border}` }}>
                      {module.level}
                    </span>
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      <Clock size={9} /> {module.duration}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {module.category}
                    </span>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {module.description}
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  className="shrink-0 mt-1 transition-transform"
                  style={{
                    color: 'var(--text-muted)',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              {/* Expanded content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="px-4 pb-4 pt-0"
                      style={{ borderTop: '1px solid var(--surface-border)' }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider mt-3 mb-2" style={{ color: 'var(--text-muted)' }}>
                        Key learning points
                      </p>
                      <div className="space-y-2 mb-4">
                        {module.keyPoints.map((point, j) => (
                          <div key={j} className="flex items-start gap-2.5">
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white mt-0.5"
                              style={{ background: 'var(--color-teal)' }}
                            >
                              {j + 1}
                            </span>
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                              {point}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <a
                          href={module.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors hover:opacity-80"
                          style={{ background: 'rgba(0,109,119,0.08)', color: 'var(--color-teal-dark)', border: '1px solid rgba(0,109,119,0.2)' }}
                        >
                          <ExternalLink size={11} />
                          Learn more
                        </a>
                        <button
                          onClick={() => toggleComplete(module.id)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white transition-all"
                          style={{
                            background: isDone ? '#15803d' : 'var(--color-teal)',
                          }}
                        >
                          <CheckCircle2 size={12} />
                          {isDone ? 'Completed ✓' : 'Mark as complete'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* AI-powered learning hint */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(0,109,119,0.08) 0%, rgba(232,168,56,0.06) 100%)',
          border: '1px solid rgba(0,109,119,0.2)',
        }}
      >
        <div className="flex items-start gap-3">
          <BrainCircuit size={18} style={{ color: 'var(--color-teal)' }} className="shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Ask the AI Copilot
              </p>
              <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase"
                style={{ background: 'rgba(0,109,119,0.1)', color: 'var(--color-teal-dark)', border: '1px solid rgba(0,109,119,0.2)' }}>
                <Sparkles size={7} /> AI
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Have a question about any drug or clinical topic? Use the AI Copilot (bottom-right button) to get instant answers tailored to your role.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
