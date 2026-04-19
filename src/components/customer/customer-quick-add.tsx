'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { UserPlus, Loader2, Mail, Phone, User, Calendar, X } from 'lucide-react';
import { CREATE_CUSTOMER } from '@/lib/graphql/customers';
import { useCartStore } from '@/lib/store/cart.store';
import { cn } from '@/lib/utils';

interface CustomerQuickAddProps {
  className?: string;
  onSuccess?: (customer: any) => void;
}

const inp = 'w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-teal/30';

export function CustomerQuickAdd({ className, onSuccess }: CustomerQuickAddProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', sex: '', ageYears: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const setPosCustomer = useCartStore((s) => s.setPosCustomer);

  const [createCustomer, { loading }] = useMutation(CREATE_CUSTOMER, {
    onCompleted: (data) => {
      const c = data?.createCustomer;
      if (c) {
        setPosCustomer({ id: c.id, customerCode: c.customerCode, name: c.name });
        onSuccess?.(c);
        setIsOpen(false);
        setFormData({ name: '', phone: '', email: '', sex: '', ageYears: '' });
        setErrors({});
      }
    },
    onError: (err) => {
      if (err.message.includes('Phone already')) setErrors({ phone: 'Phone number already registered' });
      else if (err.message.includes('Email already')) setErrors({ email: 'Email already registered' });
      else setErrors({ _form: err.message });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Name is required';
    if (formData.phone && !/^(\+233|0)?[0-9]{9,10}$/.test(formData.phone.replace(/[\s-]/g, ''))) errs.phone = 'Invalid Ghana phone number';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Invalid email';
    if (formData.ageYears && (isNaN(Number(formData.ageYears)) || Number(formData.ageYears) < 0 || Number(formData.ageYears) > 130)) errs.ageYears = 'Age must be 0-130';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    await createCustomer({
      variables: {
        input: {
          name: formData.name.trim(),
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          sex: formData.sex || undefined,
          ageYears: formData.ageYears ? Number(formData.ageYears) : undefined,
        },
      },
    });
  };

  if (!isOpen) {
    return (
      <button type="button" onClick={() => setIsOpen(true)}
        className={cn('flex items-center gap-2 w-full px-3 py-2.5 text-sm rounded-xl font-semibold transition-all', className)}
        style={{ background: 'rgba(13,148,136,0.1)', color: '#0d9488', border: '1px solid rgba(13,148,136,0.2)' }}>
        <UserPlus size={15} /> New Customer
      </button>
    );
  }

  return (
    <div className={cn('rounded-2xl p-5 space-y-4', className)}
      style={{ background: 'var(--surface-card)', border: '1px solid var(--surface-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Add New Customer</h3>
        <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg p-1.5 transition-colors hover:bg-surface-hover" style={{ color: 'var(--text-muted)' }}>
          <X size={16} />
        </button>
      </div>

      {errors._form && (
        <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
          {errors._form}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Name — required */}
        <div>
          <label className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            <User size={11} /> Name *
          </label>
          <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
            className={cn(inp, errors.name && 'ring-2 ring-red-400')} autoFocus
            style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
            placeholder="Customer full name" />
          {errors.name && <p className="text-[10px] mt-0.5" style={{ color: '#dc2626' }}>{errors.name}</p>}
        </div>

        {/* Phone + Email — 2 columns */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              <Phone size={11} /> Phone
            </label>
            <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className={cn(inp, errors.phone && 'ring-2 ring-red-400')}
              style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
              placeholder="024 123 4567" />
            {errors.phone && <p className="text-[10px] mt-0.5" style={{ color: '#dc2626' }}>{errors.phone}</p>}
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              <Mail size={11} /> Email
            </label>
            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
              className={cn(inp, errors.email && 'ring-2 ring-red-400')}
              style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
              placeholder="email@example.com" />
            {errors.email && <p className="text-[10px] mt-0.5" style={{ color: '#dc2626' }}>{errors.email}</p>}
          </div>
        </div>

        {/* Sex + Age — 2 columns */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sex</label>
            <select value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value })}
              className={inp} style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}>
              <option value="">Not specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              <Calendar size={11} /> Age
            </label>
            <input type="number" min="0" max="130" value={formData.ageYears} onChange={e => setFormData({ ...formData, ageYears: e.target.value })}
              className={cn(inp, errors.ageYears && 'ring-2 ring-red-400')}
              style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
              placeholder="Years" />
            {errors.ageYears && <p className="text-[10px] mt-0.5" style={{ color: '#dc2626' }}>{errors.ageYears}</p>}
          </div>
        </div>

        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          📧 If email is provided, receipts will be sent automatically after each purchase.
        </p>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', boxShadow: '0 2px 8px rgba(13,148,136,0.3)' }}>
            {loading ? <><Loader2 size={15} className="animate-spin" /> Creating...</> : <><UserPlus size={15} /> Add Customer</>}
          </button>
          <button type="button" onClick={() => setIsOpen(false)}
            className="rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
            style={{ border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
