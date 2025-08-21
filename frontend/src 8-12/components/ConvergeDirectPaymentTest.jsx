import React, { useState } from 'react';
import api from '../services/api';
import './ConvergeDirectPaymentTest.css';

const ConvergeDirectPaymentTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentResult, setPaymentResult] = useState(null);
  
  const [formData, setFormData] = useState({
    clubId: '201',
    amount: '1.00',
    cardNumber: '',
    expiryDate: '',
    cvv: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const processPayment = async () => {
    try {
      setIsLoading(true);
      setError('');
      setPaymentResult(null);

      console.log('Processing direct Converge payment...');

      const response = await api.post('/payment/converge-direct-payment', {
        clubId: formData.clubId,
        amount: formData.amount,
        cardNumber: formData.cardNumber,
        expiryDate: formData.expiryDate,
        cvv: formData.cvv
      });

      if (response.success) {
        console.log('Payment result:', response);
        setPaymentResult(response.paymentResponse);
      } else {
        throw new Error(response.message || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      setError(error.message || 'Failed to process payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="converge-direct-payment-test">
      <div className="test-container">
        <h2>Converge Direct Payment Test</h2>
        <p className="description">
          This component processes payments directly through Converge's VirtualMerchant API 
          since hosted payments isn't enabled on your account. This will return a vault token 
          for rebilling.
        </p>

        <div className="warning-box">
          <h3>⚠️ Important Note</h3>
          <p>
            This method processes card data directly on the server (not SAQ-A compliant). 
            For production use, you should:
          </p>
          <ul>
            <li>Contact Converge to enable Hosted Payments service</li>
            <li>Use the hosted payment fields for SAQ-A compliance</li>
            <li>Only use this direct method as a temporary solution</li>
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
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cardNumber">Card Number:</label>
              <input
                type="text"
                id="cardNumber"
                name="cardNumber"
                value={formData.cardNumber}
                onChange={handleInputChange}
                placeholder="4111111111111111"
                maxLength="16"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="expiryDate">Expiry Date:</label>
              <input
                type="text"
                id="expiryDate"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
                placeholder="MM/YY"
                maxLength="5"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="cvv">CVV:</label>
              <input
                type="text"
                id="cvv"
                name="cvv"
                value={formData.cvv}
                onChange={handleInputChange}
                placeholder="123"
                maxLength="4"
                required
              />
            </div>
          </div>

          <button 
            onClick={processPayment}
            disabled={isLoading}
            className="process-button"
          >
            {isLoading ? 'Processing Payment...' : 'Process Payment'}
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
                <span>{paymentResult.ssl_txn_id}</span>
              </div>
              <div className="detail-row">
                <strong>Authorization Code:</strong>
                <span>{paymentResult.ssl_approval_code}</span>
              </div>
              <div className="detail-row">
                <strong>Card Type:</strong>
                <span>{paymentResult.ssl_card_type}</span>
              </div>
              <div className="detail-row">
                <strong>Card Number:</strong>
                <span>{paymentResult.ssl_card_number}</span>
              </div>
              <div className="detail-row">
                <strong>Amount:</strong>
                <span>${paymentResult.ssl_amount}</span>
              </div>
              <div className="detail-row">
                <strong>Result:</strong>
                <span className="success-text">{paymentResult.ssl_result_message}</span>
              </div>
            </div>

            <div className="vault-token-display">
              <h4>VAULT TOKEN (for webstrcustr table):</h4>
              <div className="token-box">
                <code>{paymentResult.ssl_token}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(paymentResult.ssl_token)}
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
          <h3>About This Test</h3>
          <ul>
            <li><strong>Method:</strong> Direct VirtualMerchant API call (server-side)</li>
            <li><strong>Compliance:</strong> Not SAQ-A compliant (card data touches server)</li>
            <li><strong>Token:</strong> Returns real vault token for rebilling</li>
            <li><strong>Purpose:</strong> Alternative when hosted payments isn't available</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ConvergeDirectPaymentTest;
