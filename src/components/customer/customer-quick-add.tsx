'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { UserPlus, Loader2, Mail, Phone } from 'lucide-react';
import { CREATE_CUSTOMER } from '@/lib/graphql/customers';
import { useCartStore } from '@/lib/store/cart.store';
import { cn } from '@/lib/utils';

interface CustomerQuickAddProps {
  className?: string;
  onSuccess?: (customer: any) => void;
}

export function CustomerQuickAdd({ className, onSuccess }: CustomerQuickAddProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const setPosCustomer = useCartStore((s) => s.setPosCustomer);
  
  const [createCustomer, { loading }] = useMutation(CREATE_CUSTOMER, {
    onCompleted: (data) => {
      const customer = data?.createCustomer;
      if (customer) {
        setPosCustomer({
          id: customer.id,
          customerCode: customer.customerCode,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
        });
        onSuccess?.(customer);
        setIsOpen(false);
        setFormData({ name: '', phone: '', email: '' });
        setErrors({});
      }
    },
    onError: (error) => {
      if (error.message.includes('Phone already registered')) {
        setErrors({ phone: 'This phone number is already registered' });
      } else if (error.message.includes('Email already registered')) {
        setErrors({ email: 'This email is already registered' });
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (formData.phone && !/^(\+233|0)?[0-9]{9}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Invalid Ghana phone number';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    await createCustomer({
      variables: {
        input: {
          name: formData.name.trim(),
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
        },
      },
    });
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-all",
          "bg-teal/10 text-teal hover:bg-teal/20",
          className
        )}
      >
        <UserPlus size={16} />
        <span>New Customer</span>
      </button>
    );
  }

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 p-4 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Add New Customer</h3>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={cn(
              "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal/20 focus:border-teal",
              errors.name && "border-red-300"
            )}
            placeholder="Enter customer name"
            autoFocus
          />
          {errors.name && (
            <p className="text-red-600 text-xs mt-1">{errors.name}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Phone size={14} className="inline mr-1" />
            Phone (Optional)
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className={cn(
              "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal/20 focus:border-teal",
              errors.phone && "border-red-300"
            )}
            placeholder="024 123 4567 or +233 24 123 4567"
          />
          {errors.phone && (
            <p className="text-red-600 text-xs mt-1">{errors.phone}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Mail size={14} className="inline mr-1" />
            Email (Optional)
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={cn(
              "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal/20 focus:border-teal",
              errors.email && "border-red-300"
            )}
            placeholder="customer@example.com"
          />
          {errors.email && (
            <p className="text-red-600 text-xs mt-1">{errors.email}</p>
          )}
          <p className="text-gray-500 text-xs mt-1">
            Customers will receive receipts via email
          </p>
        </div>
        
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-teal text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Add Customer
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
