import React, { useEffect, useState } from 'react';
import api from '../services/api';
import './ConvergeLightboxPayment.css';

const ConvergeLightboxPayment = () => {
  const [ready, setReady] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentResult, setPaymentResult] = useState(null);
  
  const [formData, setFormData] = useState({
    clubId: '201',
    amount: '1.00',
    customerCode: ''
  });

  // Load the Lightbox library
  useEffect(() => {
    const src = "https://api.convergepay.com/hosted-payments/PayWithConverge.js";

    const s = document.createElement("script");
    s.src = src;
    s.onload = () => {
      console.log("Converge Lightbox script loaded successfully");
      setReady(true);
    };
    s.onerror = () => {
      console.error("Failed to load Converge Lightbox script");
      setError("Failed to load payment system");
    };
    document.head.appendChild(s);
    
    return () => { 
      if (document.head.contains(s)) {
        document.head.removeChild(s); 
      }
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Get a fresh session token for this payment
  const getToken = async () => {
    try {
      setIsLoading(true);
      setError('');
      setPaymentResult(null);

      console.log('Getting Converge session token...');

      const response = await api.post('/converge/session-token', {
        clubId: formData.clubId,
        amount: formData.amount,
        transactionType: "ccsale",
        customerCode: formData.customerCode || undefined
      });

      if (response.success && response.ssl_txn_auth_token) {
        console.log('Session token received:', response.ssl_txn_auth_token.substring(0, 20) + '...');
        setSessionToken(response.ssl_txn_auth_token);
        return response.ssl_txn_auth_token;
      } else {
        throw new Error(response.error || response.message || "Could not get session token");
      }
    } catch (error) {
      console.error('Error getting session token:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = async () => {
    try {
      if (!ready) {
        setError("Payment system not ready. Please wait...");
        return;
      }

      setIsLoading(true);
      setError('');
      setPaymentResult(null);

      // Get a fresh session token
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get session token");
      }

      const paymentFields = { ssl_txn_auth_token: token };

      const callback = {
        onError: (err) => { 
          console.error("Converge error:", err); 
          setError("Payment error occurred. Please try again.");
          setIsLoading(false);
        },
        onCancelled: () => { 
          console.log("Payment cancelled by user");
          setIsLoading(false);
        },
        onDeclined: (resp) => { 
          console.warn("Payment declined:", resp); 
          setError(`Payment declined: ${resp.ssl_result_message || 'Card was declined'}`);
          setIsLoading(false);
        },
        onApproval: async (resp) => {
          console.log("Payment approved:", resp);
          // resp typically includes ssl_token for rebilling (when requested in session)
          const result = {
            success: true,
            transactionId: resp.ssl_txn_id,
            authorizationCode: resp.ssl_approval_code,
            cardType: resp.ssl_card_type,
            cardLastFour: resp.ssl_card_number,
            amount: resp.ssl_amount,
            vaultToken: resp.ssl_token, // This is the vault token for rebilling
            message: 'Payment processed successfully!',
            fullResponse: resp
          };
          setPaymentResult(result);
          setIsLoading(false);
        }
      };

      // global from PayWithConverge.js
      if (window.PayWithConverge && window.PayWithConverge.open) {
        window.PayWithConverge.open(paymentFields, callback);
      } else {
        throw new Error("Converge payment system not available");
      }
    } catch (error) {
      console.error('Error opening payment modal:', error);
      setError(error.message || 'Failed to open payment modal');
      setIsLoading(false);
    }
  };

  return (
    <div className="converge-lightbox-payment">
      <div className="payment-container">
        <h2>Converge Lightbox Payment</h2>
        <p className="description">
          This component uses Converge's Lightbox for SAQ-A compliant payment processing. 
          Card data never touches your server - it's processed directly by Converge.
        </p>

        <div className="info-box">
          <h3>✅ SAQ-A Compliant</h3>
          <p>
            This method is fully SAQ-A compliant because:
          </p>
          <ul>
            <li>Card data is processed directly by Converge</li>
            <li>No sensitive data touches your server</li>
            <li>Uses Converge's hosted payment modal</li>
            <li>Returns a vault token for future rebilling</li>
          </ul>
        </div>

        <div className="payment-form">
          <h3>Payment Information</h3>
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
              <label htmlFor="amount">Amount ($):</label>
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
            <div className="form-group">
              <label htmlFor="customerCode">Customer Code (Optional):</label>
              <input
                type="text"
                id="customerCode"
                name="customerCode"
                value={formData.customerCode}
                onChange={handleInputChange}
                placeholder="CUST123"
              />
            </div>
          </div>

          <button 
            onClick={openModal}
            disabled={!ready || isLoading}
            className="pay-button"
          >
            {!ready ? 'Loading Payment System...' : 
             isLoading ? 'Processing Payment...' : 
             `Pay $${formData.amount}`}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {paymentResult && (
          <div className="payment-result">
            <h3>✅ Payment Successful!</h3>
            
            <div className="transaction-details">
              <h4>Transaction Details:</h4>
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
                <strong>Card Number:</strong>
                <span>{paymentResult.cardLastFour}</span>
              </div>
              <div className="detail-row">
                <strong>Amount:</strong>
                <span>${paymentResult.amount}</span>
              </div>
              <div className="detail-row">
                <strong>Result:</strong>
                <span className="success-text">{paymentResult.message}</span>
              </div>
            </div>

            <div className="vault-token-display">
              <h4>VAULT TOKEN (for webstrcustr table):</h4>
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

            <div className="full-response">
              <h4>Full Response (for debugging):</h4>
              <pre>{JSON.stringify(paymentResult.fullResponse, null, 2)}</pre>
            </div>
          </div>
        )}

        <div className="info-section">
          <h3>About This Implementation</h3>
          <ul>
            <li><strong>Method:</strong> Converge Lightbox (SAQ-A compliant)</li>
            <li><strong>Compliance:</strong> Fully SAQ-A compliant (card data never touches server)</li>
            <li><strong>Token:</strong> Returns real vault token for rebilling</li>
            <li><strong>Security:</strong> Uses Converge's hosted payment modal</li>
            <li><strong>Purpose:</strong> Production-ready payment processing</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ConvergeLightboxPayment;
