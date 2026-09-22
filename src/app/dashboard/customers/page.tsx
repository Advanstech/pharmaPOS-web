'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Contact, Pencil, UserPlus } from 'lucide-react';
import { SearchFieldWithClear } from '@/components/ui/search-field-with-clear';
import { Pagination } from '@/components/ui/pagination';
import {
  LIST_CUSTOMERS,
  SEARCH_CUSTOMERS,
  CREATE_CUSTOMER,
  UPDATE_CUSTOMER,
} from '@/lib/graphql/customers';
import { formatApolloError } from '@/lib/apollo/format-apollo-error';
import { useAuthStore } from '@/lib/store/auth.store';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

interface CustomerRow {
  id: string;
  customerCode: string;
  name?: string | null;
  hasPhone: boolean;
  email?: string | null;
  hasEmail?: boolean;
  receiptPreference?: string | null;
  sex?: string | null;
  ageYears?: number | null;
  hasGhanaCard: boolean;
  notes?: string | null;
  createdAt: string;
}

const EDIT_ROLES: UserRole[] = ['owner', 'se_admin', 'manager', 'head_pharmacist', 'pharmacist'];

const SEX_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Not specified' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

function formatSex(s?: string | null): string {
  if (!s) return '—';
  const m: Record<string, string> = {
    male: 'Male',
    female: 'Female',
    other: 'Other',
    prefer_not_to_say: 'Unspecified',
  };
  return m[s] ?? s;
}

function formatAccraDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GH', {
    timeZone: 'Africa/Accra',
    dateStyle: 'medium',
  });
}

export default function CustomersPage() {
  const { user } = useAuthStore();
  const reduceMotion = useReducedMotion();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showRegister, setShowRegister] = useState(false);
  const [editRow, setEditRow] = useState<CustomerRow | null>(null);

  const itemsPerPage = 10;
  const useServerSearch = search.trim().length >= 2;

  const { data: listData, loading: listLoading, error: listError, refetch: refetchList } = useQuery<{
    listCustomers: CustomerRow[];
  }>(LIST_CUSTOMERS, {
    variables: { limit: 100, offset: 0 },
    skip: !user || useServerSearch,
  });

  const { data: searchData, loading: searchLoading, error: searchError, refetch: refetchSearch } =
    useQuery<{
      searchCustomers: CustomerRow[];
    }>(SEARCH_CUSTOMERS, {
      variables: { query: search.trim(), limit: 50 },
      skip: !user || !useServerSearch,
      fetchPolicy: 'network-only',
    });

  const [updateError, setUpdateError] = useState<string>('');

  const [createCustomer, { loading: creating }] = useMutation(CREATE_CUSTOMER);
  const [updateCustomer, { loading: updating }] = useMutation(UPDATE_CUSTOMER);

  const canEdit = user && EDIT_ROLES.includes(user.role as UserRole);

  const rows = useMemo(() => {
    if (useServerSearch) return searchData?.searchCustomers ?? [];
    return listData?.listCustomers ?? [];
  }, [useServerSearch, searchData, listData]);

  const loading = useServerSearch ? searchLoading : listLoading;
  const error = listError || searchError;

  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage) || 1);
  const pagedRows = rows.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string)?.trim() || undefined;
    const phone = (fd.get('phone') as string)?.trim() || undefined;
    const email = (fd.get('email') as string)?.trim() || undefined;
    const sexRaw = (fd.get('sex') as string)?.trim();
    const ageStr = (fd.get('ageYears') as string)?.trim();
    const ageYears = ageStr ? parseInt(ageStr, 10) : undefined;
    const gh = (fd.get('ghanaCard') as string)?.trim() || undefined;
    const notes = (fd.get('notes') as string)?.trim() || undefined;
    try {
      await createCustomer({
        variables: {
          input: {
            ...(name ? { name } : {}),
            ...(phone ? { phone } : {}),
            ...(email ? { email } : {}),
            ...(sexRaw ? { sex: sexRaw } : {}),
            ...(ageYears != null && !Number.isNaN(ageYears) ? { ageYears } : {}),
            ...(gh ? { ghanaCardNumber: gh } : {}),
            ...(notes ? { notes } : {}),
          },
        },
      });
      setShowRegister(false);
      e.currentTarget.reset();
      await refetchList();
      if (search.trim().length >= 2) await refetchSearch();
    } catch {
      /* error surfaces via Apollo */
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editRow) return;
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string)?.trim() ?? '';
    const phone = (fd.get('phone') as string)?.trim() ?? '';
    const sexRaw = (fd.get('sex') as string)?.trim();
    const ageStr = (fd.get('ageYears') as string)?.trim();
    const gh = (fd.get('ghanaCard') as string)?.trim() ?? '';
    const removeGhana = fd.get('removeGhana') === 'on';
    const notes = (fd.get('notes') as string)?.trim() ?? '';
    const input: Record<string, unknown> = {
      customerId: editRow.id,
      name,
    };
    if (phone.length > 0) input.phone = phone;
    const emailVal = (fd.get('email') as string)?.trim() ?? '';
    if (emailVal.length > 0) input.email = emailVal;
    if (removeGhana) input.ghanaCardNumber = '';
    else if (gh.length > 0) input.ghanaCardNumber = gh;
    if (sexRaw) input.sex = sexRaw;
    if (notes.length > 0) input.notes = notes;
    if (ageStr === '') {
      input.ageYears = null;
    } else if (ageStr) {
      const n = parseInt(ageStr, 10);
      if (!Number.isNaN(n)) input.ageYears = n;
    }
    try {
      setUpdateError('');
      await updateCustomer({
        variables: {
          input: input as {
            customerId: string;
            name?: string;
            phone?: string;
            sex?: string;
            ageYears?: number | null;
            ghanaCardNumber?: string;
          },
        },
      });
      setEditRow(null);
      await refetchList();
      if (search.trim().length >= 2) await refetchSearch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      setUpdateError(msg);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400">
            <Contact size={22} aria-hidden />
            <h1 className="text-2xl font-bold tracking-tight text-content-primary">Customers</h1>
          </div>
          <p className="mt-1 text-sm text-content-secondary max-w-xl">
            Branch directory: public <span className="font-mono font-semibold">PP-</span> codes for receipts,
            optional demographics, Ghana Card, and clinical notes (stored encrypted). POS can attach a customer without opening
            this page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowRegister((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 min-h-[44px]"
        >
          <UserPlus size={18} />
          {showRegister ? 'Close form' : 'Register customer'}
        </button>
      </header>

      <AnimatePresence>
        {showRegister && (
          <motion.form
            initial={reduceMotion ? {} : { opacity: 0, y: -8 }}
            animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
            exit={reduceMotion ? {} : { opacity: 0, y: -8 }}
            onSubmit={(e) => void handleRegister(e)}
            className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm space-y-4"
          >
            <p className="text-sm font-medium text-content-primary">All fields optional except you must save to get a code.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-content-secondary">
                Name
                <input name="name" className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-content-secondary">
                Phone (mobile)
                <input name="phone" type="tel" className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-content-secondary sm:col-span-2">
                Email (for receipts &amp; promotions)
                <input name="email" type="email" placeholder="customer@example.com" className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-content-secondary">
                Sex
                <select name="sex" className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm">
                  {SEX_OPTIONS.map((o) => (
                    <option key={o.value || 'x'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-content-secondary">
                Approx. age (years)
                <input name="ageYears" type="number" min={0} max={130} className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-semibold text-content-secondary sm:col-span-2">
                Ghana Card number
                <input
                  name="ghanaCard"
                  type="password"
                  autoComplete="off"
                  className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm font-mono"
                  placeholder="Encrypted at rest"
                />
              </label>
              <label className="block text-xs font-semibold text-content-secondary sm:col-span-2">
                Clinical notes / diagnosis (encrypted)
                <textarea
                  name="notes"
                  rows={3}
                  maxLength={2000}
                  className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
                  placeholder="Medical history, allergies, observations..."
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-content-primary px-4 py-2 text-sm font-semibold text-surface-card disabled:opacity-50"
            >
              {creating ? 'Saving…' : 'Create customer'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="max-w-md">
        <SearchFieldWithClear
          value={search}
          onValueChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search by PP- code, email, or notes…"
          aria-label="Search customers"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {formatApolloError(error)}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-surface-border bg-surface-card shadow-sm">
        <table className="w-full text-left text-sm min-w-[600px]">
          <thead className="border-b border-surface-border bg-surface-hover/60 text-xs uppercase tracking-wide text-content-muted">
            <tr>
              <th className="px-4 py-3 hidden sm:table-cell">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3 hidden md:table-cell">Email</th>
              <th className="px-4 py-3 hidden lg:table-cell">Sex</th>
              <th className="px-4 py-3 hidden lg:table-cell">Age</th>
              <th className="px-4 py-3 hidden sm:table-cell">Phone</th>
              <th className="px-4 py-3 hidden lg:table-cell">Ghana Card</th>
              <th className="px-4 py-3 hidden lg:table-cell">Notes</th>
              <th className="px-4 py-3 hidden md:table-cell">Since</th>
              <th className="px-4 py-3 w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={canEdit ? 10 : 9} className="px-4 py-8 text-center text-content-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && pagedRows.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 10 : 9} className="px-4 py-8 text-center text-content-muted">
                  No customers match.
                </td>
              </tr>
            )}
            {!loading &&
              pagedRows.map((r) => (
                <tr key={r.id} className="border-b border-surface-border last:border-0 hover:bg-surface-hover/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-teal-700 dark:text-teal-400 hidden sm:table-cell">
                    {r.customerCode}
                  </td>
                  <td className="px-4 py-3 text-content-primary font-medium">{r.name?.trim() ? r.name : '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{r.email || '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">{formatSex(r.sex)}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">{r.ageYears != null ? r.ageYears : '—'}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">{r.hasPhone ? 'On file' : '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">{r.hasGhanaCard ? 'On file' : '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {r.notes ? (
                      <span className="line-clamp-1 text-xs text-content-secondary" title={r.notes}>
                        {r.notes}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-content-muted hidden md:table-cell">{formatAccraDate(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <a
                        href={`/dashboard/customers/${r.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition-colors hover:bg-surface-hover"
                        style={{ color: 'var(--color-teal)' }}
                      >
                        View
                      </a>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setEditRow(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-2 py-1 text-xs font-medium hover:bg-surface-hover"
                        >
                          <Pencil size={12} />
                          Edit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && totalItems > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          itemLabelPlural="customers"
        />
      )}

      <AnimatePresence>
        {editRow && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditRow(null)}
          >
            <motion.form
              initial={reduceMotion ? {} : { scale: 0.96 }}
              animate={reduceMotion ? {} : { scale: 1 }}
              exit={reduceMotion ? {} : { scale: 0.96 }}
              onClick={(ev) => ev.stopPropagation()}
              onSubmit={(e) => void handleUpdate(e)}
              className={cn(
                'w-full max-w-lg rounded-2xl border border-surface-border bg-surface-card p-6 shadow-xl space-y-4',
              )}
            >
              <h2 className="text-lg font-bold text-content-primary font-mono">{editRow.customerCode}</h2>
              <p className="text-[11px] font-mono text-content-muted break-all" title="Database primary key">
                System ID: {editRow.id}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-content-secondary sm:col-span-2">
                  Name
                  <input
                    name="name"
                    defaultValue={editRow.name ?? ''}
                    className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-content-secondary sm:col-span-2">
                  Email (for receipts &amp; promotions)
                  <input
                    name="email"
                    type="email"
                    defaultValue={editRow.email ?? ''}
                    placeholder="customer@example.com"
                    className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-content-secondary sm:col-span-2">
                  Phone (leave blank to keep on file)
                  <input
                    name="phone"
                    type="tel"
                    className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-content-secondary">
                  Sex
                  <select
                    name="sex"
                    defaultValue={editRow.sex ?? ''}
                    className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
                  >
                    {SEX_OPTIONS.map((o) => (
                      <option key={o.value || 'x'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-content-secondary">
                  Age
                  <input
                    name="ageYears"
                    type="number"
                    min={0}
                    max={130}
                    defaultValue={editRow.ageYears ?? ''}
                    className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-semibold text-content-secondary sm:col-span-2">
                  Ghana Card (leave blank to keep; enter only when adding or replacing)
                  <input
                    name="ghanaCard"
                    type="password"
                    autoComplete="off"
                    className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm font-mono"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-content-secondary sm:col-span-2">
                  <input type="checkbox" name="removeGhana" className="rounded border-surface-border" />
                  Remove stored Ghana Card
                </label>
                <label className="block text-xs font-semibold text-content-secondary sm:col-span-2">
                  Clinical notes / diagnosis (encrypted)
                  <textarea
                    name="notes"
                    rows={4}
                    maxLength={2000}
                    defaultValue={editRow.notes ?? ''}
                    className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
                    placeholder="Medical history, allergies, observations..."
                  />
                </label>
              </div>
              {updateError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
                  {updateError}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditRow(null)}
                  className="rounded-xl border border-surface-border px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {updating ? 'Saving…' : 'Save'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
