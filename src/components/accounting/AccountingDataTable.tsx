'use client';

import React, { useState } from 'react';
import {
  ChevronDown, 
  ChevronUp, 
  MoreHorizontal, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  CreditCard,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
} from 'lucide-react';

export interface Column<T> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface Action<T> {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (record: T, index: number) => void;
  danger?: boolean;
  disabled?: boolean;
}

interface AccountingDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  rowSelection?: {
    selectedRowKeys: string[];
    onChange: (selectedRowKeys: string[], selectedRows: T[]) => void;
  };
  actions?: Action<T>[];
  rowKey?: keyof T | ((record: T) => string);
  emptyText?: string;
  size?: 'small' | 'middle' | 'large';
  bordered?: boolean;
  showHeader?: boolean;
  scroll?: { x?: number; y?: number };
}

type SortDirection = 'asc' | 'desc' | null;

export default function AccountingDataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  pagination,
  rowSelection,
  actions = [],
  rowKey = 'id',
  emptyText = 'No data available',
  size = 'middle',
  bordered = false,
  showHeader = true,
  scroll,
}: AccountingDataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T | null;
    direction: SortDirection;
  }>({ key: null, direction: null });

  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;

    const key = column.key as keyof T;
    let direction: SortDirection = 'asc';
    
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
      }
    }

    setSortConfig({ key: direction ? key : null, direction });
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;

    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return String(record[rowKey] ?? index);
  };

  const toggleRowExpansion = (key: string | number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  const handleSelectAll = (checked: boolean) => {
    if (rowSelection) {
      const keys = checked ? data.map((record, index) => getRowKey(record, index)) : [];
      rowSelection.onChange(keys, checked ? data : []);
    }
  };

  const handleSelectRow = (key: string, checked: boolean, record: T) => {
    if (rowSelection) {
      const selectedKeys = new Set(rowSelection.selectedRowKeys);
      if (checked) {
        selectedKeys.add(key);
      } else {
        selectedKeys.delete(key);
      }
      rowSelection.onChange(Array.from(selectedKeys), 
        data.filter((r, i) => selectedKeys.has(getRowKey(r, i)))
      );
    }
  };

  const sizeClasses = {
    small: 'text-xs',
    middle: 'text-sm',
    large: 'text-base',
  };

  const paddingClasses = {
    small: 'px-2 py-1.5',
    middle: 'px-4 py-3',
    large: 'px-6 py-4',
  };

  return (
    <div className={`rounded-lg border border-surface-border overflow-hidden ${bordered ? 'border' : ''}`} 
         style={{ background: 'var(--surface-card)' }}>
      {/* Table */}
      <div className="overflow-x-auto" style={{ scrollBehavior: 'smooth' }}>
        <table className="w-full" style={{ minWidth: scroll?.x || 'auto' }}>
          {showHeader && (
            <thead style={{ background: 'var(--surface-base)' }}>
              <tr>
                {rowSelection && (
                  <th className={`text-left font-medium text-content-secondary ${paddingClasses[size]}`}>
                    <input
                      type="checkbox"
                      checked={rowSelection.selectedRowKeys.length === data.length && data.length > 0}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = rowSelection.selectedRowKeys.length > 0 && rowSelection.selectedRowKeys.length < data.length;
                        }
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-surface-border"
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={`font-medium text-content-secondary ${paddingClasses[size]}`}
                    style={{ 
                      width: column.width,
                      textAlign: column.align || 'left',
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span>{column.title}</span>
                      {column.sortable && (
                        <button
                          onClick={() => handleSort(column)}
                          className="p-0.5 hover:bg-surface-hover rounded"
                        >
                          {sortConfig.key === column.key ? (
                            sortConfig.direction === 'asc' ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : sortConfig.direction === 'desc' ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3 opacity-30" />
                            )
                          ) : (
                            <ChevronDown className="h-3 w-3 opacity-30" />
                          )}
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                {actions.length > 0 && (
                  <th className={`text-center font-medium text-content-secondary ${paddingClasses[size]}`}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
          )}
          
          <tbody>
            {loading ? (
              <tr>
                <td 
                  colSpan={columns.length + (rowSelection ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                  className="text-center py-8"
                >
                  <div className="inline-flex items-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal border-t-transparent" />
                    <span className="text-content-secondary">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length + (rowSelection ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                  className="text-center py-12 text-content-muted"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              sortedData.map((record, index) => {
                const key = getRowKey(record, index);
                const isSelected = rowSelection?.selectedRowKeys.includes(key);
                const isExpanded = expandedRows.has(key);
                
                return (
                  <tr 
                    key={key}
                    className={`border-t border-surface-border transition-colors ${
                      isSelected ? 'bg-teal/5' : 'hover:bg-surface-hover'
                    }`}
                  >
                    {rowSelection && (
                      <td className={paddingClasses[size]}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(key, e.target.checked, record)}
                          className="rounded border-surface-border"
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td 
                        key={String(column.key)}
                        className={`${paddingClasses[size]} ${sizeClasses[size]}`}
                        style={{ 
                          textAlign: column.align || 'left',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {column.render 
                          ? column.render(record[column.key], record, index)
                          : record[column.key]
                        }
                      </td>
                    ))}
                    {actions.length > 0 && (
                      <td className={`${paddingClasses[size]} text-center`}>
                        <div className="relative inline-block">
                          <button
                            onClick={() => toggleRowExpansion(key)}
                            className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors"
                          >
                            <MoreHorizontal className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                          </button>
                          
                          {isExpanded && (
                            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-surface-border py-1 z-10"
                                 style={{ background: 'var(--surface-card)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                              {actions.map((action) => (
                                <button
                                  key={action.key}
                                  onClick={() => {
                                    action.onClick(record, index);
                                    toggleRowExpansion(key);
                                  }}
                                  disabled={action.disabled}
                                  className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                                    action.danger 
                                      ? 'text-red-600 hover:bg-red-50' 
                                      : 'text-content-primary hover:bg-surface-hover'
                                  } ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  {action.icon && <action.icon className="h-4 w-4" />}
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="border-t border-surface-border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-content-secondary">
              Showing {((pagination.current - 1) * pagination.pageSize) + 1} to{' '}
              {Math.min(pagination.current * pagination.pageSize, pagination.total)} of{' '}
              {pagination.total} entries
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => pagination.onChange(pagination.current - 1, pagination.pageSize)}
                disabled={pagination.current === 1}
                className="px-3 py-1.5 rounded-lg text-sm border border-surface-border disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  background: 'var(--surface-base)', 
                  color: 'var(--text-primary)' 
                }}
              >
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.ceil(pagination.total / pagination.pageSize) }, (_, i) => i + 1)
                  .filter(page => 
                    page === 1 || 
                    page === Math.ceil(pagination.total / pagination.pageSize) ||
                    Math.abs(page - pagination.current) <= 1
                  )
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="px-2 text-content-muted">...</span>
                      )}
                      <button
                        onClick={() => pagination.onChange(page, pagination.pageSize)}
                        className={`px-3 py-1.5 rounded-lg text-sm ${
                          page === pagination.current
                            ? 'bg-teal text-white'
                            : 'border border-surface-border'
                        }`}
                        style={{ 
                          background: page === pagination.current ? undefined : 'var(--surface-base)', 
                          color: page === pagination.current ? undefined : 'var(--text-primary)' 
                        }}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
              </div>
              
              <button
                onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
                disabled={pagination.current === Math.ceil(pagination.total / pagination.pageSize)}
                className="px-3 py-1.5 rounded-lg text-sm border border-surface-border disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  background: 'var(--surface-base)', 
                  color: 'var(--text-primary)' 
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Status badge component for consistent status display
export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const statusConfig: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
    PENDING: { color: 'yellow', icon: Clock },
    MATCHED: { color: 'blue', icon: CheckCircle },
    PARTIAL: { color: 'orange', icon: CreditCard },
    PAID: { color: 'green', icon: CheckCircle },
    OVERDUE: { color: 'red', icon: AlertCircle },
    APPROVED: { color: 'blue', icon: CheckCircle },
    REJECTED: { color: 'red', icon: X },
    REIMBURSED: { color: 'green', icon: CheckCircle },
  };

  const config = statusConfig[status] || { color: 'gray', icon: FileText };
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-700 border border-${config.color}-300 ${className}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}
