'use client'

import { useState, useEffect } from 'react';

function JazzCashPaymentButton({ 
  bookingId, 
  userId, 
  amount, 
  description 
}:any) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Call your backend endpoint to get payment initiation details
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          amount, 
          description,
          bookingId,
          userId 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to initiate payment');
      }

      const paymentData = await response.json();

      // Create form dynamically
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = paymentData.url;
      form.style.display = 'none';

      // Add all payment parameters as hidden fields
      Object.entries(paymentData.formData).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value as string;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();

    } catch (err) {
      console.error('Payment initiation error:', err);
      setError('Failed to initiate payment. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <button 
        onClick={handlePayment}
        disabled={isProcessing}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </button>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}

export default JazzCashPaymentButton;