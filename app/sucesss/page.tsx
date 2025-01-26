"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const SuccessPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchParamsComponent />
    </Suspense>
  );
};

const SearchParamsComponent = () => {
  const searchParams = useSearchParams();
  const [transactionResult, setTransactionResult] = useState<any>(null);

  useEffect(() => {
    const params: any = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    if (Object.keys(params).length) {
      setTransactionResult(params);
    }
  }, [searchParams]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold text-center mb-4">Transaction Success</h1>

      {transactionResult ? (
        <div className="bg-green-100 p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-2">Transaction Result</h2>
          <pre className="bg-gray-100 p-2 rounded">
            {JSON.stringify(transactionResult, null, 2)}
          </pre>
        </div>
      ) : (
        <p className="text-center">No transaction data found.</p>
      )}
    </div>
  );
};

export default SuccessPage;
