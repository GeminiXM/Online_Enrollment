import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './ConvergeCheckoutTest.css';

const ConvergeCheckoutTest = () => {
  const [sessionToken, setSessionToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [amount, setAmount] = useState('10.00');
  const [billingInfo, setBillingInfo] = useState({
    firstName: 'John',
    lastName: 'Doe',
    address: '123 Main St',
    city: 'Denver',
    state: 'CO',
    zipCode: '80202',
    email: 'test@example.com'
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Load Checkout.js script dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://api.convergepay.com/hosted-payments/PayWithConverge.js'; // Production URL
    script.async = true;
    script.onload = () => {
      console.log('Checkout.js script loaded successfully');
    };
    script.onerror = () => {
      console.error('Failed to load Checkout.js script');
      setError('Failed to load payment system');
    };
    document.body.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src*="PayWithConverge.js"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  // Request session token from backend
  const fetchSessionToken = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Requesting session token...');
      const response = await axios.post('/api/payment/get-session-token');
      console.log('Session token response:', response.data);
      setSessionToken(response.data.sessionToken);
    } catch (error) {
      console.error('Error fetching session token:', error);
      setError('Failed to initialize payment system: ' + (error.response?.data?.error || error.message));
    }
    setLoading(false);
  };

  // Initialize payment fields once session token is ready
  useEffect(() => {
    if (sessionToken && window.Checkout) {
      console.log('Initializing Checkout.js with session token:', sessionToken);
      try {
        window.Checkout.configure({
          sessionId: sessionToken,
          fields: {
            cardNumber: { containerId: 'card-number' },
            expiryMonth: { containerId: 'expiry-month' },
            expiryYear: { containerId: 'expiry-year' },
            cvv: { containerId: 'cvv' },
          },
          styles: {
            input: { 
              color: '#000', 
              fontSize: '16px',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            },
          },
          onError: (error) => {
            console.error('Checkout error:', error);
            setError('Payment form error: ' + error.message);
          },
          onCancel: () => {
            console.log('Payment canceled');
            setError('Payment was canceled');
          },
        });
        console.log('Checkout.js configured successfully');
      } catch (error) {
        console.error('Error configuring Checkout.js:', error);
        setError('Failed to configure payment form: ' + error.message);
      }
    }
  }, [sessionToken]);

  // Handle form submit: Generate temp token and send to backend for processing
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!window.Checkout) {
      setError('Payment system not loaded');
      return;
    }

    setPaymentLoading(true);
    setError(null);
    setResult(null);

    console.log('Generating temporary token...');
    window.Checkout.generateToken((result) => {
      console.log('Token generation result:', result);
      if (result.success && result.token) {
        console.log('Temporary token generated:', result.token);
        // Send temp token, amount, and other details to backend for processing
        processPayment(result.token, amount, billingInfo);
      } else {
        console.error('Token generation failed:', result.message);
        setError('Failed to process card: ' + result.message);
        setPaymentLoading(false);
      }
    });
  };

  const processPayment = async (tempToken, amount, billingInfo) => {
    try {
      console.log('Processing payment with temp token:', tempToken);
      const response = await axios.post('/api/payment/process-payment', { 
        tempToken, 
        amount, 
        billingInfo 
      });
      console.log('Payment processing response:', response.data);
      
      if (response.data.success) {
        const vaultToken = response.data.vaultToken;
        setResult({
          success: true,
          message: 'Payment successful!',
          transactionId: response.data.txnId,
          vaultToken: vaultToken,
          amount: amount
        });
        console.log('Payment successful, vault token:', vaultToken);
      } else {
        setError('Payment failed: ' + response.data.message);
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      setError('Payment processing failed: ' + (error.response?.data?.error || error.message));
    }
    setPaymentLoading(false);
  };

  const handleBillingInfoChange = (field, value) => {
    setBillingInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="converge-checkout-test">
      <div className="container">
        <h1>Converge Checkout.js Test</h1>
        <p>This page tests the secure Checkout.js integration with real credit cards.</p>
        
        <div className="test-info">
          <h3>Test Information</h3>
          <ul>
            <li>Uses Converge's Checkout.js (iframe-based secure fields)</li>
            <li>Card data never touches our servers</li>
            <li>Generates temporary token from card data</li>
            <li>Processes payment via XML API</li>
            <li>Returns vault token for future rebilling</li>
          </ul>
        </div>

        <div className="payment-form">
          <h2>Payment Form</h2>
          
          <div className="form-section">
            <h3>Step 1: Initialize Payment System</h3>
            <button 
              onClick={fetchSessionToken} 
              disabled={loading || sessionToken}
              className="btn btn-primary"
            >
              {loading ? 'Loading...' : sessionToken ? 'Payment System Ready' : 'Load Payment Form'}
            </button>
          </div>

          {sessionToken && (
            <form onSubmit={handleSubmit} className="payment-form-fields">
              <h3>Step 2: Enter Payment Details</h3>
              
              <div className="amount-section">
                <label htmlFor="amount">Amount ($):</label>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.01"
                  min="0.01"
                  required
                  className="form-control"
                />
              </div>

              <div className="billing-section">
                <h4>Billing Information</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name:</label>
                    <input
                      type="text"
                      id="firstName"
                      value={billingInfo.firstName}
                      onChange={(e) => handleBillingInfoChange('firstName', e.target.value)}
                      required
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name:</label>
                    <input
                      type="text"
                      id="lastName"
                      value={billingInfo.lastName}
                      onChange={(e) => handleBillingInfoChange('lastName', e.target.value)}
                      required
                      className="form-control"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="address">Address:</label>
                  <input
                    type="text"
                    id="address"
                    value={billingInfo.address}
                    onChange={(e) => handleBillingInfoChange('address', e.target.value)}
                    required
                    className="form-control"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city">City:</label>
                    <input
                      type="text"
                      id="city"
                      value={billingInfo.city}
                      onChange={(e) => handleBillingInfoChange('city', e.target.value)}
                      required
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="state">State:</label>
                    <input
                      type="text"
                      id="state"
                      value={billingInfo.state}
                      onChange={(e) => handleBillingInfoChange('state', e.target.value)}
                      required
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="zipCode">ZIP Code:</label>
                    <input
                      type="text"
                      id="zipCode"
                      value={billingInfo.zipCode}
                      onChange={(e) => handleBillingInfoChange('zipCode', e.target.value)}
                      required
                      className="form-control"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email:</label>
                  <input
                    type="email"
                    id="email"
                    value={billingInfo.email}
                    onChange={(e) => handleBillingInfoChange('email', e.target.value)}
                    required
                    className="form-control"
                  />
                </div>
              </div>

              <div className="card-section">
                <h4>Card Information (Secure iframe fields)</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="card-number">Card Number:</label>
                    <div id="card-number" className="iframe-container"></div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="expiry-month">Expiry Month:</label>
                    <div id="expiry-month" className="iframe-container"></div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="expiry-year">Expiry Year:</label>
                    <div id="expiry-year" className="iframe-container"></div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="cvv">CVV:</label>
                    <div id="cvv" className="iframe-container"></div>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={paymentLoading}
                className="btn btn-success"
              >
                {paymentLoading ? 'Processing Payment...' : 'Pay Now'}
              </button>
            </form>
          )}

          {error && (
            <div className="error-message">
              <h3>Error</h3>
              <p>{error}</p>
            </div>
          )}

          {result && (
            <div className="success-message">
              <h3>Payment Result</h3>
              <div className="result-details">
                <p><strong>Status:</strong> {result.message}</p>
                <p><strong>Amount:</strong> ${result.amount}</p>
                <p><strong>Transaction ID:</strong> {result.transactionId}</p>
                <p><strong>Vault Token:</strong> {result.vaultToken}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConvergeCheckoutTest;
