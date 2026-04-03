import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  /** Plural noun for the footer summary (default: sales). */
  itemLabelPlural?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  itemLabelPlural = 'sales',
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  const showNav = totalPages > 1;

  return (
    <div
      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderTop: '1px solid var(--surface-border)', background: 'var(--surface-base)' }}
    >
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Showing{' '}
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          {startItem}
        </span>{' '}
        to{' '}
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          {endItem}
        </span>{' '}
        of{' '}
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          {totalItems}
        </span>{' '}
        {totalItems === 1 ? itemLabelPlural.replace(/s$/, '') : itemLabelPlural}
        {!showNav && (
          <span className="ml-1 text-xs opacity-80">· Page size {itemsPerPage} (more load as you record sales)</span>
        )}
      </p>

      {showNav && (
        <>
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{
                border: '1px solid var(--surface-border)',
                background: 'var(--surface-card)',
                color: 'var(--text-secondary)',
              }}
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{
                border: '1px solid var(--surface-border)',
                background: 'var(--surface-card)',
                color: 'var(--text-secondary)',
              }}
            >
              Next
            </button>
          </div>
          <div className="hidden sm:block">
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 disabled:opacity-50"
                style={{
                  border: '1px solid var(--surface-border)',
                  background: 'var(--surface-card)',
                  color: 'var(--text-secondary)',
                }}
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <span
                className="relative inline-flex items-center px-4 py-2 text-sm font-semibold"
                style={{
                  borderTop: '1px solid var(--surface-border)',
                  borderBottom: '1px solid var(--surface-border)',
                  background: 'var(--surface-base)',
                  color: 'var(--text-primary)',
                }}
              >
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 disabled:opacity-50"
                style={{
                  border: '1px solid var(--surface-border)',
                  background: 'var(--surface-card)',
                  color: 'var(--text-secondary)',
                }}
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
