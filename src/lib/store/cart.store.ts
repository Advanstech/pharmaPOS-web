import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem, PaymentMethod, PosAttachedCustomer } from '@/types';

interface CartState {
  items: CartItem[];
  prescriptionId: string | null;
  paymentMethod: PaymentMethod | null;
  posCustomer: PosAttachedCustomer | null;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setPrescriptionId: (id: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setPosCustomer: (c: PosAttachedCustomer | null) => void;
  clearCart: () => void;
  totalGhs: () => number;
  totalVatGhs: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      prescriptionId: null,
      paymentMethod: null,
      posCustomer: null,

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        }),

      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: quantity <= 0
            ? state.items.filter((i) => i.productId !== productId)
            : state.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
        })),

      setPrescriptionId: (id) => set({ prescriptionId: id }),
      setPaymentMethod: (method) => set({ paymentMethod: method }),
      setPosCustomer: (c) => set({ posCustomer: c }),
      clearCart: () =>
        set({ items: [], prescriptionId: null, paymentMethod: null, posCustomer: null }),

      // All values in GHS (stored as integer pence ÷ 100)
      totalGhs: () =>
        get().items.reduce((sum, i) => sum + (i.unitPriceGhs * i.quantity), 0),

      // Ghana VAT: 15% on non-exempt items only
      totalVatGhs: () =>
        get().items
          .filter((i) => !i.vatExempt)
          .reduce((sum, i) => sum + (i.unitPriceGhs * i.quantity * 0.15), 0),
    }),
    {
      name: 'pharmapos-cart',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : ({} as Storage),
      ),
    },
  ),
);
