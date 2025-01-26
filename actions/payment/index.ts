"use server"
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import querystring from 'querystring';

// JazzCash Gateway URLs
const JAZZCASH_SANDBOX_URL = 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/';
const JAZZCASH_LIVE_URL = 'https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/';

interface JazzCashPaymentParams {
    [key: string]: string; // Allow dynamic string indexing
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
      pp_Amount: (amount * 100).toString().padStart(12, '0'),
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
      .map(key => paymentParams[key])
      .join('&');
  
    const signature = crypto
      .createHmac('sha256', integrityKey)
      .update(hashString)
      .digest('hex');
  
    return { 
      gatewayUrl: process.env.NODE_ENV === 'production' ? JAZZCASH_LIVE_URL : JAZZCASH_SANDBOX_URL, 
      paymentParams, 
      signature 
    };
  }

  
  export async function initiateJazzCashPayment(amount: number, description: string) {
    try {
      // Validate inputs
      if (!amount || amount <= 0) {
        throw new Error('Invalid amount');
      }
  
      // Ensure all required environment variables are present
      const requiredEnvVars = [
        'JAZZCASH_MERCHANT_ID',
        'JAZZCASH_MERCHANT_PASSWORD',
        'JAZZCASH_INTEGRITY_KEY',
        'JAZZCASH_RETURN_URL'
      ];
  
      requiredEnvVars.forEach(varName => {
        if (!process.env[varName]) {
          throw new Error(`Missing environment variable: ${varName}`);
        }
      });
  
      const { gatewayUrl, paymentParams, signature } = await createJazzCashPayment(amount, description);
  
      // Detailed logging for debugging
      console.log('Payment Initiation Details:', {
        gatewayUrl,
        paymentParams: JSON.stringify(paymentParams, null, 2),
        signature
      });
  
      // Prepare form submission details with additional checks
      const formData = { 
        ...paymentParams, 
        pp_SecureHash: signature 
      };
  
      // Validate form data
      Object.entries(formData).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          throw new Error(`Undefined form data: ${key}`);
        }
      });
  
      return { 
        url: gatewayUrl, 
        method: 'POST', 
        formData: formData 
      };
    } catch (error) {
      console.error('JazzCash Payment Initiation Error:', error);
      
      // More informative error handling
      if (error instanceof Error) {
        throw new Error(`Payment initiation failed: ${error.message}`);
      }
      
      throw new Error('Unexpected error during payment initiation');
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