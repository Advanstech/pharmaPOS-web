'use client';

import { useQuery, useMutation } from '@apollo/client';
import { useState, useEffect } from 'react';
import { X, Package, Save, Search, DollarSign } from 'lucide-react';
import { SUPPLIER_WITH_PRODUCTS_QUERY } from '@/lib/graphql/suppliers.queries';
import { BULK_UPDATE_PRODUCT_PRICES } from '@/lib/graphql/pricing.mutations';

type SupplierProduct = {
  id: string;
  name: string;
  genericName?: string;
  barcode?: string;
  unitPrice: number;
  classification: string;
  branchType: string;
  isActive: boolean;
  quantityOnHand: number;
  reorderLevel: number;
  stockStatus: string;
  sold7d: number;
  sold30d: number;
};

type SupplierWithProducts = {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  aiScore?: number;
  isActive: boolean;
  totalProducts: number;
  products: SupplierProduct[];
};

interface SupplierProductsModalProps {
  supplierId: string;
  supplierName: string;
  open: boolean;
  onClose: () => void;
}

export function SupplierProductsModal({
  supplierId,
  supplierName,
  open,
  onClose,
}: SupplierProductsModalProps) {
  const { data, loading, refetch } = useQuery<{ supplierWithProducts: SupplierWithProducts }>(
    SUPPLIER_WITH_PRODUCTS_QUERY,
    {
      variables: { id: supplierId },
      skip: !open,
      fetchPolicy: 'cache-and-network',
    },
  );

  const [bulkUpdatePrices] = useMutation(BULK_UPDATE_PRODUCT_PRICES, {
    onCompleted: () => {
      refetch();
    },
  });

  const [search, setSearch] = useState('');
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSearch('');
      setEditedPrices({});
    }
  }, [open]);

  const products = data?.supplierWithProducts?.products ?? [];
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.genericName?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase()),
  );

  const handlePriceChange = (productId: string, newPriceGhs: string) => {
    const pricePesewas = Math.round(parseFloat(newPriceGhs) * 100);
    if (!isNaN(pricePesewas) && pricePesewas >= 0) {
      setEditedPrices((prev) => ({ ...prev, [productId]: pricePesewas }));
    }
  };

  const handleSave = async () => {
    if (Object.keys(editedPrices).length === 0) return;

    setIsSaving(true);
    try {
      await bulkUpdatePrices({
        variables: {
          input: {
            updates: Object.entries(editedPrices).map(([productId, unitPriceGhsPesewas]) => ({
              productId,
              unitPriceGhsPesewas,
              reason: 'Bulk price update via supplier products',
            })),
          },
        },
      });
      setEditedPrices({});
    } catch (error) {
      console.error('Failed to update prices:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = Object.keys(editedPrices).length > 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl shadow-2xl"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--surface-border)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--surface-border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'rgba(13,148,136,0.1)' }}
            >
              <Package size={20} style={{ color: '#0d9488' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {supplierName}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {products.length} products · Edit prices
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[rgba(0,0,0,0.05)]"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search bar */}
        <div className="border-b px-6 py-3" style={{ borderColor: 'var(--surface-border)' }}>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, generic name, or barcode..."
              className="w-full rounded-xl py-2 pl-10 pr-4 text-sm outline-none"
              style={{
                background: 'var(--surface-base)',
                border: '1px solid var(--surface-border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Products table */}
        <div className="overflow-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" style={{ color: 'var(--color-teal)' }} />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {search ? 'No products match your search' : 'No products found for this supplier'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead
                className="sticky top-0 text-xs font-bold uppercase tracking-wider"
                style={{ background: 'var(--surface-card)', color: 'var(--text-muted)' }}
              >
                <tr>
                  <th className="px-6 py-3 text-left">Product</th>
                  <th className="px-6 py-3 text-left">Classification</th>
                  <th className="px-6 py-3 text-center">Stock</th>
                  <th className="px-6 py-3 text-right">Current Price</th>
                  <th className="px-6 py-3 text-right">New Price (GHS)</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const currentPriceGhs = (product.unitPrice / 100).toFixed(2);
                  const editedPrice = editedPrices[product.id];
                  const newPriceGhs = editedPrice !== undefined ? (editedPrice / 100).toFixed(2) : '';
                  const isChanged = editedPrice !== undefined && editedPrice !== product.unitPrice;

                  return (
                    <tr
                      key={product.id}
                      className="border-b transition-colors hover:bg-[rgba(0,0,0,0.02)]"
                      style={{ borderColor: 'var(--surface-border)' }}
                    >
                      <td className="px-6 py-3">
                        <div>
                          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {product.name}
                          </div>
                          {product.genericName && (
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {product.genericName}
                            </div>
                          )}
                          {product.barcode && (
                            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {product.barcode}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            background:
                              product.classification === 'CONTROLLED'
                                ? 'rgba(220,38,38,0.1)'
                                : product.classification === 'POM'
                                  ? 'rgba(217,119,6,0.1)'
                                  : 'rgba(13,148,136,0.1)',
                            color:
                              product.classification === 'CONTROLLED'
                                ? '#dc2626'
                                : product.classification === 'POM'
                                  ? '#d97706'
                                  : '#0d9488',
                          }}
                        >
                          {product.classification}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {product.quantityOnHand}
                        </div>
                        <div
                          className="text-[10px]"
                          style={{
                            color:
                              product.stockStatus === 'out'
                                ? '#dc2626'
                                : product.stockStatus === 'critical'
                                  ? '#f97316'
                                  : product.stockStatus === 'low'
                                    ? '#eab308'
                                    : 'var(--text-muted)',
                          }}
                        >
                          {product.stockStatus}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign size={12} style={{ color: 'var(--text-muted)' }} />
                          <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {currentPriceGhs}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newPriceGhs}
                          onChange={(e) => handlePriceChange(product.id, e.target.value)}
                          placeholder="0.00"
                          className="w-24 rounded-lg px-2 py-1 text-right text-sm outline-none transition-all"
                          style={{
                            background: isChanged ? 'rgba(13,148,136,0.1)' : 'var(--surface-base)',
                            border: isChanged ? '1px solid #0d9488' : '1px solid var(--surface-border)',
                            color: 'var(--text-primary)',
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-4" style={{ borderColor: 'var(--surface-border)' }}>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {hasChanges ? (
              <span className="font-semibold" style={{ color: '#0d9488' }}>
                {Object.keys(editedPrices).length} price(s) changed
              </span>
            ) : (
              'No changes'
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors hover:bg-[rgba(0,0,0,0.05)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
              }}
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
