'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Contact, Hash, Loader2, X } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart.store';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { SEARCH_CUSTOMERS, CREATE_CUSTOMER } from '@/lib/graphql/customers';
import { CustomerQuickAdd } from '@/components/customer/customer-quick-add';

export function PosCustomerAttach() {
  const { isOnline } = useNetworkStatus();
  const posCustomer = useCartStore((s) => s.posCustomer);
  const setPosCustomer = useCartStore((s) => s.setPosCustomer);

  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 280);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading } = useQuery<{
    searchCustomers: Array<{
      id: string;
      customerCode: string;
      name?: string | null;
    }>;
  }>(SEARCH_CUSTOMERS, {
    variables: { query: debounced, limit: 8 },
    skip: debounced.length < 2 || !isOnline,
    fetchPolicy: 'network-only',
  });

  const [createWalkIn, { loading: creating }] = useMutation(CREATE_CUSTOMER);

  const handleWalkIn = async () => {
    if (!isOnline) return;
    try {
      const { data: d } = await createWalkIn({ variables: { input: {} } });
      const c = d?.createCustomer;
      if (c) {
        setPosCustomer({
          id: c.id,
          customerCode: c.customerCode,
          name: c.name ?? null,
        });
        setQ('');
        setDebounced('');
      }
    } catch {
      /* surfaced via network layer / toast elsewhere if needed */
    }
  };

  const hits = data?.searchCustomers ?? [];

  return (
    <div
      className="shrink-0 px-3 py-2 space-y-2"
      style={{ borderBottom: '1px solid var(--surface-border)' }}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        <Contact size={12} aria-hidden />
        Customer <span className="font-normal normal-case opacity-70">(optional)</span>
      </div>

      {posCustomer ? (
        <div
          className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm"
          style={{ background: 'var(--surface-hover)' }}
        >
          <div className="min-w-0">
            <p className="font-mono font-semibold truncate" style={{ color: 'var(--color-teal)' }}>
              {posCustomer.customerCode}
            </p>
            {posCustomer.name ? (
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                {posCustomer.name}
              </p>
            ) : (
              <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                No name on file
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPosCustomer(null)}
            className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-red-50"
            style={{ color: '#dc2626' }}
            aria-label="Clear customer"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-1.5">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by PP- code…"
              disabled={!isOnline}
              className="min-w-0 flex-1 rounded-lg border px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-500/30"
              style={{
                borderColor: 'var(--surface-border)',
                background: 'var(--surface-base)',
                color: 'var(--text-primary)',
              }}
              autoComplete="off"
            />
          </div>
          {!isOnline && (
            <p className="text-[10px] font-medium" style={{ color: '#b45309' }}>
              Customer search needs a connection. Checkout without a customer ref, or attach after you are online.
            </p>
          )}
          {debounced.length >= 2 && isOnline && (
            <div className="max-h-28 overflow-y-auto space-y-1">
              {loading && (
                <div className="flex items-center gap-2 py-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 size={12} className="animate-spin" />
                  Searching…
                </div>
              )}
              {!loading && hits.length === 0 && (
                <p className="text-[11px] py-1" style={{ color: 'var(--text-muted)' }}>
                  No match for that code.
                </p>
              )}
              {hits.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    setPosCustomer({
                      id: h.id,
                      customerCode: h.customerCode,
                      name: h.name ?? null,
                    });
                    setQ('');
                    setDebounced('');
                  }}
                  className="w-full text-left rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-teal-50"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span className="font-mono font-semibold" style={{ color: 'var(--color-teal)' }}>
                    {h.customerCode}
                  </span>
                  {h.name ? <span className="ml-2 opacity-80">{h.name}</span> : null}
                </button>
              ))}
            </div>
          )}
          
          {showQuickAdd ? (
            <CustomerQuickAdd
              onSuccess={(customer) => {
                setShowQuickAdd(false);
              }}
            />
          ) : (
            <>
              <button
                type="button"
                onClick={() => void handleWalkIn()}
                disabled={!isOnline || creating}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-colors min-h-[40px] disabled:opacity-50"
                style={{
                  border: '1px solid var(--surface-border)',
                  color: 'var(--text-secondary)',
                  background: 'var(--surface-base)',
                }}
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Hash size={14} />}
                New walk-in ref (no details)
              </button>
              
              <CustomerQuickAdd
                className="mt-2"
                onSuccess={() => setShowQuickAdd(false)}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
