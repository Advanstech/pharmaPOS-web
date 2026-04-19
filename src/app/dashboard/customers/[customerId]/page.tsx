'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client';
import Link from 'next/link';
import { gql } from '@apollo/client';
import {
  ArrowLeft, User, ShoppingBag, Mail, Phone, CreditCard, Calendar,
  Loader2, AlertTriangle, Receipt, ChevronDown,
} from 'lucide-react';
import { CUSTOMER_SALES } from '@/lib/graphql/customers';
import { useState } from 'react';

const CUSTOMER_DETAIL = gql`
  query CustomerDetail($id: ID!) {
    customer(id: $id) {
      id
      branchId
      customerCode
      name
      hasPhone
      email
      hasEmail
      receiptPreference
      marketingConsent
      sex
      ageYears
      hasGhanaCard
      createdAt
    }
  }
`;

function formatGhs(pesewas: number) {
  return `GH₵ ${(pesewas / 100).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

export default function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const [expandedSale, setExpandedSale] = useState<string | null>(null);

  const { data, loading, error } = useQuery(CUSTOMER_DETAIL, {
    variables: { id: customerId },
    fetchPolicy: 'cache-and-network',
  });

  const { data: salesData, loading: salesLoading } = useQuery(CUSTOMER_SALES, {
    variables: { customerId, limit: 30 },
    fetchPolicy: 'cache-and-network',
  });

  const customer = data?.customer;
  const sales = salesData?.customerSales ?? [];
  const totalSpent = sales.reduce((sum: number, s: any) => sum + s.totalAmountPesewas, 0);

  if (loading && !customer) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--surface-base)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-teal" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
        <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h2 className="text-lg font-bold text-red-700">Customer not found</h2>
          <Link href="/dashboard/customers" className="mt-4 inline-block rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white">
            Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      <Link href="/dashboard/customers" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Customers
      </Link>

      {/* Profile Header */}
      <div className="mb-6 overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #004e57 0%, #006d77 50%, #0e7490 100%)', boxShadow: '0 4px 24px rgba(0,109,119,0.3)' }}>
        <div className="relative px-6 py-8">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="relative z-10 flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white"
              style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)' }}>
              <User size={28} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{customer.name || 'Walk-in Customer'}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                <span className="font-mono">{customer.customerCode}</span>
                {customer.sex && <span>· {customer.sex === 'male' ? 'Male' : customer.sex === 'female' ? 'Female' : customer.sex}</span>}
                {customer.ageYears && <span>· {customer.ageYears} yrs</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {customer.email && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                    <Mail size={11} /> {customer.email}
                  </span>
                )}
                {customer.hasPhone && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                    <Phone size={11} /> Phone on file
                  </span>
                )}
                {customer.hasGhanaCard && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                    <CreditCard size={11} /> Ghana Card
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: Customer Info + Stats */}
        <div className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Purchases</p>
              <p className="mt-1 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{sales.length}</p>
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Spent</p>
              <p className="mt-1 text-xl font-bold text-teal">{formatGhs(totalSpent)}</p>
            </div>
          </div>

          {/* Customer Details */}
          <div className="rounded-xl border" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}>
            <div className="border-b px-4 py-3" style={{ borderColor: 'var(--surface-border)' }}>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Customer Details</h3>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--surface-border)' }}>
              <Row label="Code" value={customer.customerCode} mono />
              <Row label="Name" value={customer.name || 'Walk-in'} />
              <Row label="Sex" value={customer.sex ? (customer.sex === 'male' ? 'Male' : customer.sex === 'female' ? 'Female' : customer.sex) : undefined} />
              <Row label="Age" value={customer.ageYears ? `${customer.ageYears} years` : undefined} />
              <Row label="Email" value={customer.email} />
              <Row label="Receipt Pref." value={customer.receiptPreference || 'print'} />
              <Row label="Marketing" value={customer.marketingConsent ? 'Opted in' : 'No'} />
              <Row label="Phone" value={customer.hasPhone ? 'On file (encrypted)' : undefined} />
              <Row label="Ghana Card" value={customer.hasGhanaCard ? 'On file (encrypted)' : undefined} />
              <Row label="Registered" value={new Date(customer.createdAt).toLocaleDateString('en-GH', { dateStyle: 'medium' })} />
            </div>
          </div>
        </div>

        {/* Right: Transaction History */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-card)' }}>
            <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: 'var(--surface-border)' }}>
              <div className="flex items-center gap-2">
                <Receipt size={14} style={{ color: 'var(--color-teal)' }} />
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Purchase History</h3>
              </div>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{sales.length} transactions</span>
            </div>

            {salesLoading && sales.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-teal" />
              </div>
            ) : sales.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <ShoppingBag className="mx-auto mb-3 h-10 w-10 opacity-20" />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No purchases yet</p>
              </div>
            ) : (
              <div>
                {sales.map((sale: any) => (
                  <div key={sale.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <button
                      type="button"
                      onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                      className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-[rgba(0,0,0,0.015)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(0,109,119,0.08)' }}>
                          <ShoppingBag size={14} style={{ color: 'var(--color-teal)' }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {sale.totalFormatted}
                            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                              · {sale.itemCount} item{sale.itemCount !== 1 ? 's' : ''}
                            </span>
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {new Date(sale.createdAt).toLocaleString('en-GH', { timeZone: 'Africa/Accra', dateStyle: 'medium', timeStyle: 'short' })}
                            {' · '}Cashier: {sale.cashierName}
                          </p>
                        </div>
                      </div>
                      <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: expandedSale === sale.id ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                    </button>

                    {expandedSale === sale.id && sale.items && (
                      <div className="px-5 pb-3">
                        <div className="rounded-lg border" style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-base)' }}>
                          <table className="w-full text-xs">
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-muted)' }}>
                                <th className="px-3 py-2 text-left font-bold">Product</th>
                                <th className="px-3 py-2 text-center font-bold">Qty</th>
                                <th className="px-3 py-2 text-right font-bold">Price</th>
                                <th className="px-3 py-2 text-right font-bold">Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sale.items.map((item: any, i: number) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)' }}>{item.productName}</td>
                                  <td className="px-3 py-2 text-center font-mono" style={{ color: 'var(--text-secondary)' }}>{item.quantity}</td>
                                  <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>{formatGhs(item.unitPricePesewas)}</td>
                                  <td className="px-3 py-2 text-right">
                                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${item.classification === 'POM' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                      {item.classification}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className={`text-xs font-medium ${mono ? 'font-mono' : ''}`}
        style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {value ?? '—'}
      </span>
    </div>
  );
}
