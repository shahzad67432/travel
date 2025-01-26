"use server"
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import querystring from 'querystring';

// JazzCash Gateway URLs
const JAZZCASH_SANDBOX_URL = 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/';
const JAZZCASH_LIVE_URL = 'https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/';

interface JazzCashPaymentParams {
  pp_Version: string;
  pp_TxnType: string;
  pp_Language: string;
  pp_MerchantID: string;
  pp_SubMerchantID: string;
  pp_Password: string;
  pp_TxnRefNo: string;
  pp_Amount: string;
  pp_TxnCurrency: string;
  pp_TxnDateTime: string;
  pp_BillReference: string;
  pp_Description: string;
  pp_ReturnURL: string;
  pp_BankID: string;
}

export async function createJazzCashPayment(amount: number, description: string) {
  const merchantID = process.env.JAZZCASH_MERCHANT_ID!;
  const merchantPassword = process.env.JAZZCASH_MERCHANT_PASSWORD!;
  const integrityKey = process.env.JAZZCASH_INTEGRITY_KEY!;
  const returnURL = process.env.JAZZCASH_RETURN_URL!;

  const txnRefNo = `T${Date.now()}`;
  const txnDateTime = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];

  const paymentParams: JazzCashPaymentParams = {
    pp_Version: '1.1',
    pp_TxnType: 'MWALLET',
    pp_Language: 'EN',
    pp_MerchantID: merchantID,
    pp_SubMerchantID: '',
    pp_Password: merchantPassword,
    pp_TxnRefNo: txnRefNo,
    pp_Amount: (amount * 100).toString(),
    pp_TxnCurrency: 'PKR',
    pp_TxnDateTime: txnDateTime,
    pp_BillReference: `REF${Date.now()}`,
    pp_Description: description,
    pp_ReturnURL: returnURL,
    pp_BankID: 'JAZZCASH'
  };

  // Generate signature
  const sortedKeys = Object.keys(paymentParams).sort();
  const hashString = sortedKeys
    .filter(key => paymentParams[key as keyof JazzCashPaymentParams] !== '')
    .map(key => paymentParams[key as keyof JazzCashPaymentParams])
    .join('&');

  const signature = crypto
    .createHmac('sha256', integrityKey)
    .update(hashString)
    .digest('hex');

  return {
    gatewayUrl: process.env.NODE_ENV === 'production' 
      ? JAZZCASH_LIVE_URL 
      : JAZZCASH_SANDBOX_URL,
    paymentParams,
    signature
  };
}

export async function initiateJazzCashPayment(amount: number, description: string) {
  try {
    const { gatewayUrl, paymentParams, signature } = await createJazzCashPayment(amount, description);

    // Prepare form data
    const formData = {
      ...paymentParams,
      pp_SecureHash: signature
    };

    // Return form submission details
    return {
      url: gatewayUrl,
      method: 'POST',
      formData: formData
    };
  } catch (error) {
    console.error('JazzCash Payment Initiation Error:', error);
    throw new Error('Payment initiation failed');
  }
}

export async function verifyJazzCashPayment(request: NextRequest) {
  const body = await request.json();
  
  // Verify payment response
  const { pp_ResponseCode, pp_TxnRefNo, pp_Amount } = body;

  // Implement your verification logic
  if (pp_ResponseCode === '000') {
    // Payment successful
    return NextResponse.json({
      success: true,
      transactionId: pp_TxnRefNo,
      amount: parseInt(pp_Amount) / 100 // Convert back to original amount
    });
  } else {
    // Payment failed
    return NextResponse.json({
      success: false,
      error: 'Payment verification failed'
    }, { status: 400 });
  }
}

// API Route Handler
export async function POST(request: NextRequest) {
  try {
    const { amount, description } = await request.json();
    
    const paymentInitiation = await initiateJazzCashPayment(amount, description);

    return NextResponse.json(paymentInitiation);
  } catch (error) {
    return NextResponse.json(
      { error: 'Payment initialization failed' }, 
      { status: 500 }
    );
  }
}