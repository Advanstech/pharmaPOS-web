'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function InvoicesPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to OCR upload flow available to invoice roles
    router.push('/dashboard/invoices/upload');
  }, [router]);
  
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-content-muted">Redirecting to invoice upload...</p>
    </div>
  );
}
