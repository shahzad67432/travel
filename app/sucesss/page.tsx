'use client'

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const params = Object.fromEntries(searchParams);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Payment Response</h1>
      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify(params, null, 2)}
      </pre>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}