import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './ConvergeHostedPayment.css';

const ConvergeHostedPayment = ({ 
  clubId, 
  amount, 
  customerInfo, 
  onPaymentSuccess, 
  onPaymentError,
  onCancel 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionToken, setSessionToken] = useState(null);
  const [isConvergeLoaded, setIsConvergeLoaded] = useState(false);
  
  const cardNumberRef = useRef(null);
  const cardExpRef = useRef(null);
  const cardCvvRef = useRef(null);
  const convergeCheckoutRef = useRef(null);

  const navigate = useNavigate();

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

  const getSessionToken = async () => {
    try {
      setIsLoading(true);
      setError('');

      console.log('Requesting Converge session token...');

      const response = await api.post('/payment/converge-token', {
        clubId,
        amount: amount.toFixed(2),
        currency: 'USD',
        customerCode: customerInfo?.customerId || `CUST_${Date.now()}`,
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

  const handlePayment = async () => {
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
         onPaymentSuccess(paymentData);
       } else {
        // Payment failed
        const errorMessage = result?.ssl_result_message || 'Payment was declined';
        console.error('Payment failed:', errorMessage);
        setError(errorMessage);
        onPaymentError(errorMessage);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      const errorMessage = error.message || 'Payment processing failed. Please try again.';
      setError(errorMessage);
      onPaymentError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1);
    }
  };

  // Start the payment process when component mounts
  useEffect(() => {
    if (clubId && amount && customerInfo) {
      getSessionToken();
    }
  }, [clubId, amount, customerInfo]);

  return (
    <div className="converge-hosted-payment">
      <div className="payment-container">
        <h2>Payment Information</h2>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {isLoading && !sessionToken && (
          <div className="loading-message">
            Initializing payment system...
          </div>
        )}

        {sessionToken && (
          <div className="payment-form">
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

            <div className="payment-summary">
              <h3>Payment Summary</h3>
              <div className="summary-row">
                <span>Amount:</span>
                <span>${amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="button-group">
              <button
                type="button"
                onClick={handlePayment}
                disabled={isLoading}
                className="pay-button"
              >
                {isLoading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
              </button>
              
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="security-notice">
          <p>
            <strong>🔒 Secure Payment</strong><br />
            Your payment information is processed securely by Converge. 
            We never store your card details on our servers.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConvergeHostedPayment;
