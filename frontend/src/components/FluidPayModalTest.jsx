import React, { useState } from 'react';
import FluidPayModal from './FluidPayModal';
import './FluidPayModalTest.css';

const FluidPayModalTest = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [results, setResults] = useState([]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handlePaymentSuccess = (result) => {
    console.log('Payment successful:', result);
    setLastResult(result);
    setResults(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 results
  };

  const clearResults = () => {
    setLastResult(null);
    setResults([]);
  };

  return (
    <div className="fluidpay-modal-test">
      <div className="test-header">
        <h1>FluidPay Real Payment Test</h1>
        <p>This will process a real credit card payment using FluidPay's hosted tokenizer.</p>
        <p><strong>Warning:</strong> This will charge the entered amount to the provided credit card.</p>
      </div>

      <div className="test-actions">
        <button className="open-modal-button" onClick={handleOpenModal}>
          Open Payment Modal
        </button>
        <button className="clear-results-button" onClick={clearResults}>
          Clear Results
        </button>
      </div>

      {lastResult && (
        <div className="latest-result">
          <h2>Latest Payment Result</h2>
          <div className="result-card">
            <div className="result-header">
              <span className="status success">✓ SUCCESS</span>
              <span className="amount">${lastResult.amount}</span>
            </div>
            <div className="result-details">
              <div className="detail-group">
                <h4>Transaction Details</h4>
                <p><strong>Transaction ID:</strong> {lastResult.transactionId}</p>
                <p><strong>Authorization Code:</strong> {lastResult.authorizationCode}</p>
                <p><strong>Amount:</strong> ${lastResult.amount}</p>
              </div>
              
              <div className="detail-group">
                <h4>Vault Token</h4>
                <div className="vault-token">
                  <code>{lastResult.vaultToken}</code>
                  <button 
                    className="copy-button"
                    onClick={() => navigator.clipboard.writeText(lastResult.vaultToken)}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="detail-group">
                <h4>Card Information</h4>
                <p><strong>Last 4:</strong> {lastResult.cardInfo?.last4 || 'N/A'}</p>
                <p><strong>Card Type:</strong> {lastResult.cardInfo?.cardType || 'N/A'}</p>
              </div>

              <div className="detail-group">
                <h4>Customer Information</h4>
                <p><strong>Name:</strong> {lastResult.customerInfo?.firstName} {lastResult.customerInfo?.lastName}</p>
                <p><strong>Email:</strong> {lastResult.customerInfo?.email}</p>
                <p><strong>Phone:</strong> {lastResult.customerInfo?.phone}</p>
              </div>

              <div className="detail-group">
                <h4>Billing Address</h4>
                <p><strong>Address:</strong> {lastResult.billing?.address}</p>
                <p><strong>City:</strong> {lastResult.billing?.city}</p>
                <p><strong>State:</strong> {lastResult.billing?.state}</p>
                <p><strong>ZIP:</strong> {lastResult.billing?.zip}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="results-history">
          <h2>Payment History</h2>
          <div className="results-list">
            {results.map((result, index) => (
              <div key={index} className="result-summary">
                <div className="summary-header">
                  <span className="status success">✓</span>
                  <span className="amount">${result.amount}</span>
                  <span className="timestamp">{new Date().toLocaleString()}</span>
                </div>
                <div className="summary-details">
                  <span><strong>Transaction:</strong> {result.transactionId}</span>
                  <span><strong>Vault Token:</strong> {result.vaultToken}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="test-info">
        <h3>Test Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <strong>Environment:</strong> Production FluidPay
          </div>
          <div className="info-item">
            <strong>Public API Key:</strong> pub_31FUYRENhNiAvspejegbLoPD2he
          </div>
          <div className="info-item">
            <strong>Base URL:</strong> https://app.fluidpay.com
          </div>
          <div className="info-item">
            <strong>Tokenizer:</strong> Hosted Payment Fields
          </div>
          <div className="info-item">
            <strong>Security:</strong> PCI Compliant (No card data touches our servers)
          </div>
          <div className="info-item">
            <strong>Club ID:</strong> 292 (Colorado Athletic Clubs)
          </div>
        </div>
      </div>

      <FluidPayModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handlePaymentSuccess}
        clubId="292"
      />
    </div>
  );
};

export default FluidPayModalTest;
