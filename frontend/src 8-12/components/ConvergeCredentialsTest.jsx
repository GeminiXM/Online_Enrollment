import React, { useState } from 'react';
import api from '../services/api';
import './ConvergeCredentialsTest.css';

const ConvergeCredentialsTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState(null);
  
  const [formData, setFormData] = useState({
    clubId: '201'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const testCredentials = async () => {
    try {
      setIsLoading(true);
      setError('');
      setTestResult(null);

      console.log('Testing Converge credentials...');

      const response = await api.post('/payment/converge-test-credentials', {
        clubId: formData.clubId
      });

      if (response.success) {
        console.log('Credentials test result:', response);
        setTestResult(response);
      } else {
        throw new Error(response.message || 'Failed to test credentials');
      }
    } catch (error) {
      console.error('Error testing credentials:', error);
      setError(error.message || 'Failed to test credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="converge-credentials-test">
      <div className="test-container">
        <h2>Converge Credentials Test</h2>
        <p className="description">
          This component tests your Converge credentials to see if they work with both the 
          VirtualMerchant endpoint and the hosted payments endpoint.
        </p>

        <div className="setup-form">
          <h3>Test Credentials</h3>
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
          <button 
            onClick={testCredentials}
            disabled={isLoading}
            className="test-button"
          >
            {isLoading ? 'Testing Credentials...' : 'Test Credentials'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {testResult && (
          <div className="test-result">
            <h3>Test Results</h3>
            
            <div className="credentials-info">
              <h4>Credentials Retrieved:</h4>
              <div className="detail-row">
                <strong>Merchant ID:</strong>
                <span>{testResult.credentials.merchant_id}</span>
              </div>
              <div className="detail-row">
                <strong>User ID:</strong>
                <span>{testResult.credentials.user_id}</span>
              </div>
              <div className="detail-row">
                <strong>PIN Length:</strong>
                <span>{testResult.credentials.pin_length} characters</span>
              </div>
            </div>

            <div className="endpoint-tests">
              <div className={`endpoint-test ${testResult.virtualMerchantTest.success ? 'success' : 'error'}`}>
                <h4>VirtualMerchant Endpoint Test</h4>
                <div className="detail-row">
                  <strong>Status:</strong>
                  <span>{testResult.virtualMerchantTest.status}</span>
                </div>
                <div className="detail-row">
                  <strong>SSL Result:</strong>
                  <span>{testResult.virtualMerchantTest.ssl_result}</span>
                </div>
                <div className="detail-row">
                  <strong>Message:</strong>
                  <span>{testResult.virtualMerchantTest.ssl_result_message}</span>
                </div>
                <div className="detail-row">
                  <strong>Success:</strong>
                  <span className={testResult.virtualMerchantTest.success ? 'success-text' : 'error-text'}>
                    {testResult.virtualMerchantTest.success ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
              </div>

              <div className={`endpoint-test ${testResult.hostedPaymentsTest.success ? 'success' : 'error'}`}>
                <h4>Hosted Payments Endpoint Test</h4>
                <div className="detail-row">
                  <strong>Status:</strong>
                  <span>{testResult.hostedPaymentsTest.status}</span>
                </div>
                <div className="detail-row">
                  <strong>SSL Result:</strong>
                  <span>{testResult.hostedPaymentsTest.ssl_result}</span>
                </div>
                <div className="detail-row">
                  <strong>Message:</strong>
                  <span>{testResult.hostedPaymentsTest.ssl_result_message}</span>
                </div>
                <div className="detail-row">
                  <strong>Success:</strong>
                  <span className={testResult.hostedPaymentsTest.success ? 'success-text' : 'error-text'}>
                    {testResult.hostedPaymentsTest.success ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
              </div>
            </div>

            <div className="analysis">
              <h4>Analysis:</h4>
              {testResult.virtualMerchantTest.success && testResult.hostedPaymentsTest.success ? (
                <p className="success-text">
                  ✅ Both endpoints work! Your credentials are valid and you should be able to process payments.
                </p>
              ) : testResult.virtualMerchantTest.success && !testResult.hostedPaymentsTest.success ? (
                <p className="warning-text">
                  ⚠️ VirtualMerchant works but hosted payments doesn't. This might mean:
                  <ul>
                    <li>Your account doesn't have hosted payments enabled</li>
                    <li>You need different credentials for hosted payments</li>
                    <li>There's an issue with the hosted payments endpoint</li>
                  </ul>
                </p>
              ) : !testResult.virtualMerchantTest.success && testResult.hostedPaymentsTest.success ? (
                <p className="warning-text">
                  ⚠️ Hosted payments works but VirtualMerchant doesn't. This is unusual.
                </p>
              ) : (
                <p className="error-text">
                  ❌ Neither endpoint works. This suggests:
                  <ul>
                    <li>Your credentials are incorrect</li>
                    <li>Your account is not active</li>
                    <li>You're using test credentials in production or vice versa</li>
                    <li>There's a network connectivity issue</li>
                  </ul>
                </p>
              )}
            </div>
          </div>
        )}

        <div className="info-section">
          <h3>About This Test</h3>
          <ul>
            <li><strong>VirtualMerchant Test:</strong> Tests basic API connectivity with a simple query</li>
            <li><strong>Hosted Payments Test:</strong> Tests the specific endpoint used for session tokens</li>
            <li><strong>Credentials:</strong> Retrieved from your database using <code>procConvergeItemSelect1</code></li>
            <li><strong>Purpose:</strong> Helps identify if the issue is with credentials or the specific endpoint</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ConvergeCredentialsTest;
