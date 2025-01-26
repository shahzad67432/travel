"use client"
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchParamsComponent />
    </Suspense>
  );
}

function SearchParamsComponent() {
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
    <>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-center mb-4">
          JazzCash Payment Gateway
        </h1>

        {!transactionResult && (
          <form
            name="jsform"
            method="post"
            action="https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/"
            className="bg-gray-100 p-4 rounded shadow"
          >
            {/* Add required fields */}
            <input type="hidden" name="pp_Version" value="1.1" />
            <input type="hidden" name="pp_TxnType" value="MWALLET" />
            <input type="hidden" name="pp_MerchantID" value="MC148142" />
            <input type="hidden" name="pp_Password" value="null" />
            <input type="hidden" name="pp_TxnCurrency" value="PKR" />
            <input
              type="hidden"
              name="pp_ReturnURL"
              value="http://localhost:3000/"
            />
            <input type="hidden" name="pp_Amount" value="10000" />
            <input
              type="hidden"
              name="pp_TxnDateTime"
              value={new Date()
                .toISOString()
                .replace(/[-:.TZ]/g, "")
                .slice(0, 14)}
            />
            <input
              type="hidden"
              name="pp_TxnExpiryDateTime"
              value={new Date(Date.now() + 3600 * 1000) // 1 hour from now
                .toISOString()
                .replace(/[-:.TZ]/g, "")
                .slice(0, 14)}
            />
            <input type="hidden" name="pp_BillReference" value="TestRef123" />
            <input
              type="hidden"
              name="pp_Description"
              value="Test transaction"
            />
            <input type="hidden" name="salt" value="null" />

            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Pay Now
            </button>
          </form>
        )}

        {transactionResult && (
          <div className="bg-green-100 p-4 rounded shadow">
            <h2 className="text-xl font-bold mb-2">Transaction Result</h2>
            <pre className="bg-gray-100 p-2 rounded">
              {JSON.stringify(transactionResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </>
  );
}
