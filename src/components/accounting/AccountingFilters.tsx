'use client';

import { useState } from 'react';
import { Filter, X, Calendar, Search, DollarSign } from 'lucide-react';

export interface FilterState {
  search: string;
  dateRange: { start: string; end: string };
  supplierIds: string[];
  status: string[];
  amountRange: { min: string; max: string };
  category: string;
  createdBy: string;
}

interface AccountingFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  suppliers?: Array<{ id: string; name: string }>;
  categories?: string[];
  staffMembers?: Array<{ id: string; name: string }>;
  statusOptions?: Array<{ value: string; label: string; color?: string }>;
  showAmountRange?: boolean;
  showCategory?: boolean;
  showCreatedBy?: boolean;
  showSupplierFilter?: boolean;
}

const DEFAULT_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'yellow' },
  { value: 'MATCHED', label: 'Matched', color: 'blue' },
  { value: 'PARTIAL', label: 'Partial', color: 'orange' },
  { value: 'PAID', label: 'Paid', color: 'green' },
  { value: 'OVERDUE', label: 'Overdue', color: 'red' },
];

export default function AccountingFilters({
  filters,
  onFiltersChange,
  suppliers = [],
  categories = [],
  staffMembers = [],
  statusOptions = DEFAULT_STATUSES,
  showAmountRange = true,
  showCategory = false,
  showCreatedBy = false,
  showSupplierFilter = true,
}: AccountingFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      dateRange: { start: '', end: '' },
      supplierIds: [],
      status: [],
      amountRange: { min: '', max: '' },
      category: '',
      createdBy: '',
    });
  };

  const hasActiveFilters = 
    filters.search ||
    filters.dateRange.start ||
    filters.dateRange.end ||
    filters.supplierIds.length > 0 ||
    filters.status.length > 0 ||
    filters.amountRange.min ||
    filters.amountRange.max ||
    (showCategory && filters.category) ||
    (showCreatedBy && filters.createdBy);

  return (
    <div className="rounded-lg border border-surface-border" style={{ background: 'var(--surface-card)' }}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
              <input
                type="text"
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-surface-border text-sm"
                style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* Quick Status Filters */}
            <div className="flex items-center gap-2">
              {statusOptions.slice(0, 3).map((status) => (
                <button
                  key={status.value}
                  onClick={() => {
                    const newStatus = filters.status.includes(status.value)
                      ? filters.status.filter(s => s !== status.value)
                      : [...filters.status, status.value];
                    updateFilter('status', newStatus);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filters.status.includes(status.value)
                      ? `bg-${status.color}-100 text-${status.color}-700 border-${status.color}-300`
                      : 'border border-surface-border text-content-secondary hover:bg-surface-hover'
                  }`}
                  style={{
                    background: filters.status.includes(status.value) 
                      ? `var(--color-${status.color}-100)` 
                      : undefined,
                    color: filters.status.includes(status.value) 
                      ? `var(--color-${status.color}-700)` 
                      : 'var(--text-secondary)',
                  }}
                >
                  {status.label}
                </button>
              ))}
            </div>

            {/* Expand/Collapse */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-border text-sm font-medium text-content-primary hover:bg-surface-hover"
              style={{ background: 'var(--surface-base)' }}
            >
              <Filter className="h-4 w-4" />
              {isExpanded ? 'Less Filters' : 'More Filters'}
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-teal text-white">
                  {Object.values(filters).filter(v => 
                    Array.isArray(v) ? v.length > 0 : 
                    typeof v === 'object' ? (v.start || v.end || v.min || v.max) :
                    v
                  ).length}
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-content-muted hover:text-content-primary"
              >
                <X className="h-4 w-4" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-surface-border">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1.5">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Date Range
                </label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, start: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-border text-sm"
                    style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}
                  />
                  <input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-border text-sm"
                    style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* Supplier Filter */}
              {showSupplierFilter && suppliers.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-content-secondary mb-1.5">
                    Suppliers
                  </label>
                  <select
                    multiple
                    value={filters.supplierIds}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value);
                      updateFilter('supplierIds', values);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-surface-border text-sm"
                    style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}
                  >
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category Filter */}
              {showCategory && categories.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-content-secondary mb-1.5">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => updateFilter('category', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-surface-border text-sm"
                    style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Created By Filter */}
              {showCreatedBy && staffMembers.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-content-secondary mb-1.5">
                    Created By
                  </label>
                  <select
                    value={filters.createdBy}
                    onChange={(e) => updateFilter('createdBy', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-surface-border text-sm"
                    style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}
                  >
                    <option value="">All Staff</option>
                    {staffMembers.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount Range */}
              {showAmountRange && (
                <div>
                  <label className="block text-xs font-medium text-content-secondary mb-1.5">
                    <DollarSign className="inline h-3 w-3 mr-1" />
                    Amount Range (GHS)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.amountRange.min}
                      onChange={(e) => updateFilter('amountRange', { ...filters.amountRange, min: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-surface-border text-sm"
                      style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.amountRange.max}
                      onChange={(e) => updateFilter('amountRange', { ...filters.amountRange, max: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-surface-border text-sm"
                      style={{ background: 'var(--surface-base)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              )}

              {/* All Statuses */}
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1.5">
                  Status
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {statusOptions.map((status) => (
                    <label key={status.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.status.includes(status.value)}
                        onChange={(e) => {
                          const newStatus = e.target.checked
                            ? [...filters.status, status.value]
                            : filters.status.filter(s => s !== status.value);
                          updateFilter('status', newStatus);
                        }}
                        className="rounded border-surface-border"
                      />
                      <span style={{ color: 'var(--text-primary)' }}>{status.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
