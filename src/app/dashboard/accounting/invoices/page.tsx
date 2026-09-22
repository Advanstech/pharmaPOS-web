'use client';

import { useState, useMemo } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { ArrowLeft, Download, Plus, Search, Filter as FilterIcon } from 'lucide-react';
import Link from 'next/link';
import AccountingFilters, { FilterState } from '@/components/accounting/AccountingFilters';
import AccountingDataTable, { Column, Action } from '@/components/accounting/AccountingDataTable';
import { SUPPLIER_INVOICES } from '@/lib/graphql/accounting.queries';
import { StatusBadge } from '@/components/accounting/AccountingDataTable';
import { formatGhs } from '@/lib/utils';

const INVOICE_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'yellow' },
  { value: 'MATCHED', label: 'Matched', color: 'blue' },
  { value: 'PARTIAL', label: 'Partial', color: 'orange' },
  { value: 'PAID', label: 'Paid', color: 'green' },
  { value: 'OVERDUE', label: 'Overdue', color: 'red' },
];

const initialFilters: FilterState = {
  search: '',
  dateRange: { start: '', end: '' },
  supplierIds: [],
  status: [],
  amountRange: { min: '', max: '' },
  category: '',
  createdBy: '',
};

export default function InvoicesListPage() {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  // Fetch invoices
  const { data: invoicesData, loading, error } = useQuery(SUPPLIER_INVOICES, {
    fetchPolicy: 'cache-and-network',
  });

  // Filter invoices based on filter state
  const filteredInvoices = useMemo(() => {
    let invoices = invoicesData?.supplierInvoices || [];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      invoices = invoices.filter((invoice: any) =>
        invoice.invoiceNumber?.toLowerCase().includes(searchLower) ||
        invoice.supplierName?.toLowerCase().includes(searchLower)
      );
    }

    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      invoices = invoices.filter((invoice: any) => {
        if (!invoice.dueDate) return true;
        const dueDate = new Date(invoice.dueDate);
        if (filters.dateRange.start && dueDate < new Date(filters.dateRange.start)) return false;
        if (filters.dateRange.end && dueDate > new Date(filters.dateRange.end)) return false;
        return true;
      });
    }

    // Supplier filter
    if (filters.supplierIds.length > 0) {
      invoices = invoices.filter((invoice: any) =>
        filters.supplierIds.includes(invoice.supplierId)
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      invoices = invoices.filter((invoice: any) =>
        filters.status.includes(invoice.status)
      );
    }

    // Amount range filter
    if (filters.amountRange.min || filters.amountRange.max) {
      invoices = invoices.filter((invoice: any) => {
        const amount = invoice.balancePesewas / 100;
        if (filters.amountRange.min && amount < parseFloat(filters.amountRange.min)) return false;
        if (filters.amountRange.max && amount > parseFloat(filters.amountRange.max)) return false;
        return true;
      });
    }

    return invoices;
  }, [invoicesData?.supplierInvoices, filters]);

  // Get unique suppliers for filter dropdown
  const suppliers = useMemo(() => {
    const supplierMap = new Map();
    invoicesData?.supplierInvoices?.forEach((invoice: any) => {
      if (!supplierMap.has(invoice.supplierId)) {
        supplierMap.set(invoice.supplierId, {
          id: invoice.supplierId,
          name: invoice.supplierName,
        });
      }
    });
    return Array.from(supplierMap.values());
  }, [invoicesData?.supplierInvoices]);

  // Table columns
  const columns: Column<any>[] = [
    {
      key: 'invoiceNumber',
      title: 'Invoice #',
      sortable: true,
      render: (value: string, record: any) => (
        <Link
          href={`/dashboard/accounting/invoices/${record.id}`}
          className="text-teal hover:underline font-medium"
        >
          {value}
        </Link>
      ),
    },
    {
      key: 'supplierName',
      title: 'Supplier',
      sortable: true,
    },
    {
      key: 'invoiceDate',
      title: 'Invoice Date',
      sortable: true,
      render: (value: string) => value ? new Date(value).toLocaleDateString('en-GH') : '—',
    },
    {
      key: 'dueDate',
      title: 'Due Date',
      sortable: true,
      render: (value: string, record: any) => {
        if (!value) return '—';
        const dueDate = new Date(value);
        const today = new Date();
        const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return (
          <div>
            <div>{dueDate.toLocaleDateString('en-GH')}</div>
            {daysDiff < 0 && record.status !== 'PAID' && (
              <div className="text-xs text-red-600">{Math.abs(daysDiff)} days overdue</div>
            )}
            {daysDiff >= 0 && daysDiff <= 7 && record.status !== 'PAID' && (
              <div className="text-xs text-yellow-600">Due in {daysDiff} days</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'totalAmountFormatted',
      title: 'Total Amount',
      align: 'right',
      render: (_: any, record: any) => record.totalAmountFormatted || '—',
    },
    {
      key: 'paidAmountFormatted',
      title: 'Paid Amount',
      align: 'right',
      render: (_: any, record: any) => record.paidAmountFormatted || 'GH₵0.00',
    },
    {
      key: 'balanceFormatted',
      title: 'Balance',
      align: 'right',
      sortable: true,
      render: (value: string) => (
        <span className="font-mono font-semibold">{value}</span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => <StatusBadge status={value} />,
    },
  ];

  // Table actions
  const actions: Action<any>[] = [
    {
      key: 'view',
      label: 'View Details',
      icon: Search,
      onClick: (record: any) => {
        window.location.href = `/dashboard/accounting/invoices/${record.id}`;
      },
    },
    {
      key: 'pay',
      label: 'Record Payment',
      icon: Download,
      onClick: (record: any) => {
        if (record.status === 'PAID') return;
        window.location.href = `/dashboard/accounting/invoices/${record.id}?action=pay`;
      },
    },
    {
      key: 'download',
      label: 'Download PDF',
      icon: Download,
      onClick: (record: any) => {
        // TODO: Implement PDF download
        console.log('Download PDF for invoice:', record.id);
      },
    },
  ];

  // Bulk actions
  const handleBulkExport = () => {
    const selectedInvoices = filteredInvoices.filter((invoice: any) =>
      selectedRowKeys.includes(invoice.id)
    );
    console.log('Exporting invoices:', selectedInvoices);
    // TODO: Implement bulk export
  };

  const handleBulkPay = () => {
    const selectedInvoices = filteredInvoices.filter((invoice: any) =>
      selectedRowKeys.includes(invoice.id)
    );
    console.log('Bulk pay invoices:', selectedInvoices);
    // TODO: Implement bulk payment
  };

  return (
    <div className="p-4 md:p-8" style={{ background: 'var(--surface-base)', minHeight: '100%' }}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/accounting"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Accounting
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">Supplier Invoices</h1>
          <p className="mt-1 text-sm font-medium text-content-secondary">
            Manage and track supplier invoices with payment status
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {selectedRowKeys.length > 0 && (
            <>
              <button
                onClick={handleBulkPay}
                className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-4 py-2.5 text-sm font-medium text-content-primary hover:bg-surface-hover"
                style={{ background: 'var(--surface-card)' }}
              >
                <Download className="h-4 w-4" />
                Pay Selected ({selectedRowKeys.length})
              </button>
              <button
                onClick={handleBulkExport}
                className="inline-flex items-center gap-2 rounded-lg border border-surface-border px-4 py-2.5 text-sm font-medium text-content-primary hover:bg-surface-hover"
                style={{ background: 'var(--surface-card)' }}
              >
                <Download className="h-4 w-4" />
                Export Selected
              </button>
            </>
          )}
          
          <Link
            href="/dashboard/invoices/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal/90"
          >
            <Plus className="h-4 w-4" />
            Upload Invoice
          </Link>
        </div>
      </div>

      {/* Filters */}
      <AccountingFilters
        filters={filters}
        onFiltersChange={setFilters}
        suppliers={suppliers}
        statusOptions={INVOICE_STATUSES}
        showAmountRange={true}
        showSupplierFilter={true}
        showCategory={false}
        showCreatedBy={false}
      />

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          {
            label: 'Total Invoices',
            value: filteredInvoices.length,
            color: 'var(--text-primary)',
          },
          {
            label: 'Overdue',
            value: filteredInvoices.filter((inv: any) => {
              if (!inv.dueDate || inv.status === 'PAID') return false;
              return new Date(inv.dueDate) < new Date();
            }).length,
            color: '#dc2626',
          },
          {
            label: 'Due This Week',
            value: filteredInvoices.filter((inv: any) => {
              if (!inv.dueDate || inv.status === 'PAID') return false;
              const dueDate = new Date(inv.dueDate);
              const weekFromNow = new Date();
              weekFromNow.setDate(weekFromNow.getDate() + 7);
              return dueDate >= new Date() && dueDate <= weekFromNow;
            }).length,
            color: '#f59e0b',
          },
          {
            label: 'Total Balance',
            value: formatGhs(
              filteredInvoices
                .filter((inv: any) => inv.status !== 'PAID')
                .reduce((sum: number, inv: any) => sum + (inv.balancePesewas || 0), 0) / 100
            ),
            color: 'var(--text-primary)',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4 border border-surface-border"
            style={{ background: 'var(--surface-card)' }}
          >
            <p className="text-xs font-medium text-content-secondary">{stat.label}</p>
            <p className="mt-1 text-xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <AccountingDataTable
        data={filteredInvoices}
        columns={columns}
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        actions={actions}
        pagination={{
          current: 1,
          pageSize: 25,
          total: filteredInvoices.length,
          onChange: (page, pageSize) => {
            console.log('Page changed:', page, pageSize);
            // TODO: Implement pagination
          },
        }}
        emptyText="No invoices found matching your criteria"
        bordered
        size="middle"
      />
    </div>
  );
}
