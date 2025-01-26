"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const SuccessPage = () => {
  const searchParams = useSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  useEffect(() => {
    // Assuming response from 2Checkout includes success message
    const params = Object.fromEntries(searchParams.entries());
    if (params) {
      setPaymentStatus(params.payment_status || "Payment status unknown.");
    }
  }, [searchParams]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold text-center mb-4">
        Payment {paymentStatus === "Success" ? "Successful" : "Failed"}
      </h1>
      <p className="text-center">{paymentStatus}</p>
    </div>
  );
};

export default SuccessPage;
