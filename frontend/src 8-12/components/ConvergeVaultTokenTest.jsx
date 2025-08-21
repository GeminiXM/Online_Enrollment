import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import './ConvergeVaultTokenTest.css';

const ConvergeVaultTokenTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionToken, setSessionToken] = useState(null);
  const [isConvergeLoaded, setIsConvergeLoaded] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  
  const cardNumberRef = useRef(null);
  const cardExpRef = useRef(null);
  const cardCvvRef = useRef(null);

  const [formData, setFormData] = useState({
    clubId: '001',
    amount: '1.00', // Small amount for testing
    customerCode: `CUST_${Date.now()}`
  });

  // Load Converge Checkout.js script
  useEffect(() => {
    const loadConvergeScript = () => {
      if (window.ConvergeCheckout) {
        setIsConvergeLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://api.convergepay.com/hosted-payments/checkout.js';
      script.async = true;
      script.onload = () => {
        console.log('Converge Checkout.js loaded successfully');
        setIsConvergeLoaded(true);
      };
      script.onerror = () => {
        console.error('Failed to load Converge Checkout.js');
        setError('Failed to load payment system. Please refresh the page.');
      };
      document.head.appendChild(script);
    };

    loadConvergeScript();
  }, []);

  // Initialize payment when Converge is loaded and we have a session token
  useEffect(() => {
    if (isConvergeLoaded && sessionToken && window.ConvergeCheckout) {
      initializeConvergeCheckout();
    }
  }, [isConvergeLoaded, sessionToken]);

  const initializeConvergeCheckout = () => {
    try {
      console.log('Initializing Converge Checkout with session token');
      
      // Configure Converge Checkout with the session token
      window.ConvergeCheckout.configure({
        ssl_txn_auth_token: sessionToken
      });

      // Attach hosted fields to DOM elements
      window.ConvergeCheckout.attach('card-number', cardNumberRef.current);
      window.ConvergeCheckout.attach('card-exp', cardExpRef.current);
      window.ConvergeCheckout.attach('card-cvv', cardCvvRef.current);

      console.log('Converge Checkout initialized successfully');
    } catch (error) {
      console.error('Error initializing Converge Checkout:', error);
      setError('Failed to initialize payment system. Please refresh the page.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getSessionToken = async () => {
    try {
      setIsLoading(true);
      setError('');
      setPaymentResult(null);

      console.log('Requesting Converge session token...');

      const response = await api.post('/payment/converge-token', {
        clubId: formData.clubId,
        amount: formData.amount,
        currency: 'USD',
        customerCode: formData.customerCode,
        transactionType: 'ccsale'
      });

      if (response.success && response.ssl_txn_auth_token) {
        console.log('Session token received successfully');
        setSessionToken(response.ssl_txn_auth_token);
      } else {
        throw new Error(response.message || 'Failed to get session token');
      }
    } catch (error) {
      console.error('Error getting session token:', error);
      setError(error.message || 'Failed to initialize payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const processPayment = async () => {
    try {
      setIsLoading(true);
      setError('');

      if (!window.ConvergeCheckout) {
        throw new Error('Payment system not loaded');
      }

      console.log('Processing payment with Converge Checkout...');

      // Process the payment using Converge Checkout
      const result = await window.ConvergeCheckout.pay();

      console.log('Payment result:', result);

      if (result && result.ssl_result === '0') {
        // Payment successful
        const paymentData = {
          success: true,
          transactionId: result.ssl_txn_id,
          authorizationCode: result.ssl_approval_code,
          cardType: result.ssl_card_type,
          cardLastFour: result.ssl_card_number,
          amount: result.ssl_amount,
          vaultToken: result.ssl_token, // This is the vault token for rebilling
          message: 'Payment processed successfully!'
        };

        console.log('Payment successful:', paymentData);
        console.log('VAULT TOKEN FOR REBILLING:', result.ssl_token);
        setPaymentResult(paymentData);
      } else {
        // Payment failed
        const errorMessage = result?.ssl_result_message || 'Payment was declined';
        console.error('Payment failed:', errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      const errorMessage = error.message || 'Payment processing failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="converge-vault-token-test">
      <div className="test-container">
        <h2>Converge Vault Token Test</h2>
        <p className="description">
          This component processes a real credit card payment and shows you the vault token 
          that gets returned for rebilling. This is the token you store in the <code>webstrcustr</code> table.
        </p>

        <div className="setup-form">
          <h3>Step 1: Setup Payment</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="clubId">Club ID:</label>
              <input
                type="text"
                id="clubId"
                name="clubId"
                value={formData.clubId}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="amount">Amount:</label>
              <input
                type="text"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="1.00"
                required
              />
            </div>
          </div>
          <button 
            onClick={getSessionToken}
            disabled={isLoading || !isConvergeLoaded}
            className="setup-button"
          >
            {isLoading ? 'Getting Session Token...' : 'Initialize Payment Form'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {sessionToken && (
          <div className="payment-form">
            <h3>Step 2: Enter Credit Card Information</h3>
            <p className="warning">
              ⚠️ This will process a REAL payment of ${formData.amount}. Use a test card if needed.
            </p>
            
            <div className="form-group">
              <label htmlFor="cardNumber">Card Number</label>
              <div 
                ref={cardNumberRef} 
                className="converge-field"
                id="cardNumber"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cardExp">Expiration Date</label>
                <div 
                  ref={cardExpRef} 
                  className="converge-field"
                  id="cardExp"
                />
              </div>

              <div className="form-group">
                <label htmlFor="cardCvv">CVV</label>
                <div 
                  ref={cardCvvRef} 
                  className="converge-field"
                  id="cardCvv"
                />
              </div>
            </div>

            <button
              onClick={processPayment}
              disabled={isLoading}
              className="pay-button"
            >
              {isLoading ? 'Processing Payment...' : `Process $${formData.amount} Payment`}
            </button>
          </div>
        )}

        {paymentResult && (
          <div className="payment-result">
            <h3>✅ Payment Successful!</h3>
            
            <div className="result-details">
              <div className="detail-row">
                <strong>Transaction ID:</strong>
                <span>{paymentResult.transactionId}</span>
              </div>
              <div className="detail-row">
                <strong>Authorization Code:</strong>
                <span>{paymentResult.authorizationCode}</span>
              </div>
              <div className="detail-row">
                <strong>Card Type:</strong>
                <span>{paymentResult.cardType}</span>
              </div>
              <div className="detail-row">
                <strong>Card Last 4:</strong>
                <span>{paymentResult.cardLastFour}</span>
              </div>
              <div className="detail-row">
                <strong>Amount:</strong>
                <span>${paymentResult.amount}</span>
              </div>
            </div>

            <div className="vault-token-display">
              <label><strong>VAULT TOKEN (for webstrcustr table):</strong></label>
              <div className="token-box">
                <code>{paymentResult.vaultToken}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(paymentResult.vaultToken)}
                  className="copy-button"
                  title="Copy to clipboard"
                >
                  📋 Copy
                </button>
              </div>
            </div>

            <div className="usage-note">
              <h4>How to use this vault token:</h4>
              <ol>
                <li>Store this vault token in your <code>webstrcustr</code> table</li>
                <li>Use it for future rebilling without requiring card data</li>
                <li>This token is linked to the customer's card in Converge's vault</li>
                <li>You can use the <code>/api/payment/converge-rebill</code> endpoint with this token</li>
              </ol>
            </div>
          </div>
        )}

        <div className="info-section">
          <h3>About Converge Vault Tokens</h3>
          <ul>
            <li><strong>Vault Token:</strong> Returned after successful payment, used for rebilling</li>
            <li><strong>Session Token:</strong> Used to initialize payment form (15-minute validity)</li>
            <li><strong>SAQ-A Compliant:</strong> Card data never touches your servers</li>
            <li><strong>Rebilling:</strong> Use vault token with <code>ssl_cvv2cvc2_indicator=N</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ConvergeVaultTokenTest;
