import React, { useState } from 'react';
import api from '../services/api';
import './ConvergeTokenTest.css';

const ConvergeTokenTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenResult, setTokenResult] = useState(null);
  const [formData, setFormData] = useState({
    clubId: '001',
    amount: '50.00',
    customerCode: `CUST_${Date.now()}`,
    transactionType: 'ccsale'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateToken = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      setError('');
      setTokenResult(null);

      console.log('Requesting Converge session token with data:', formData);

      const response = await api.post('/payment/converge-token', formData);

      console.log('Converge token response:', response);

      if (response.success && response.ssl_txn_auth_token) {
        setTokenResult({
          success: true,
          token: response.ssl_txn_auth_token,
          message: response.message,
          isDemo: response.isDemo || false
        });
      } else {
        throw new Error(response.message || 'Failed to generate token');
      }
    } catch (error) {
      console.error('Error generating token:', error);
      setError(error.message || 'Failed to generate token. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="converge-token-test">
      <div className="test-container">
        <h2>Converge Token Generation Test</h2>
        <p className="description">
          This component tests the Converge session token generation. 
          The token returned here is what you would store in the <code>webstrcustr</code> table.
        </p>

        <form onSubmit={generateToken} className="test-form">
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
              placeholder="50.00"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="customerCode">Customer Code:</label>
            <input
              type="text"
              id="customerCode"
              name="customerCode"
              value={formData.customerCode}
              onChange={handleInputChange}
              placeholder="CUST_123456"
            />
          </div>

          <div className="form-group">
            <label htmlFor="transactionType">Transaction Type:</label>
            <select
              id="transactionType"
              name="transactionType"
              value={formData.transactionType}
              onChange={handleInputChange}
            >
              <option value="ccsale">ccsale (Sale)</option>
              <option value="ccauthonly">ccauthonly (Authorization Only)</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="generate-button"
          >
            {isLoading ? 'Generating Token...' : 'Generate Session Token'}
          </button>
        </form>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {tokenResult && (
          <div className="token-result">
            <h3>Token Generated Successfully!</h3>
            
            <div className="result-details">
              <div className="detail-row">
                <strong>Status:</strong>
                <span className="success">✅ {tokenResult.message}</span>
              </div>
              
              <div className="detail-row">
                <strong>Demo Mode:</strong>
                <span>{tokenResult.isDemo ? 'Yes' : 'No'}</span>
              </div>
              
              <div className="detail-row">
                <strong>Token Length:</strong>
                <span>{tokenResult.token.length} characters</span>
              </div>
            </div>

            <div className="token-display">
              <label><strong>Session Token (for webstrcustr table):</strong></label>
              <div className="token-box">
                <code>{tokenResult.token}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(tokenResult.token)}
                  className="copy-button"
                  title="Copy to clipboard"
                >
                  📋 Copy
                </button>
              </div>
            </div>

            <div className="usage-note">
              <h4>How to use this token:</h4>
              <ol>
                <li>Store this token in your <code>webstrcustr</code> table</li>
                <li>Use it to initialize Converge hosted payment fields</li>
                <li>The token is valid for 15 minutes and single-use</li>
                <li>When payment is processed, you'll receive a vault token for rebilling</li>
              </ol>
            </div>
          </div>
        )}

        <div className="info-section">
          <h3>About Converge Tokenization</h3>
          <ul>
            <li><strong>Session Token:</strong> Used to initialize hosted payment fields (15-minute validity)</li>
            <li><strong>Vault Token:</strong> Returned after successful payment for future rebilling</li>
            <li><strong>SAQ-A Compliant:</strong> Card data never touches your servers</li>
            <li><strong>Database Storage:</strong> Store the vault token in <code>webstrcustr</code> table</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ConvergeTokenTest;
