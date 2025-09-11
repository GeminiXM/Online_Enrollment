import React, { useState, useEffect } from 'react';
import { useClub } from '../context/ClubContext';
import api from '../services/api.js';
import './ConvergeHPPTest.css';

// Cloudflare tunnel configuration for Converge HPP testing
// Update this URL to match your Cloudflare tunnel for the backend
const BACKEND_HTTPS = process.env.REACT_APP_BACKEND_HTTPS || 'https://frederick-pam-ones-testing.trycloudflare.com';

const ConvergeHPPTest = () => {
  const { selectedClub } = useClub();
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Test data for demonstration
  const testMemberData = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "555-123-4567",
    address: "123 Main Street",
    city: "Anytown",
    state: "CA",
    zipCode: "12345"
  };

  const testAmount = "45.62";

  const testIntegration = async () => {
    setLoading(true);
    setError('');
    setTestResult(null);

    try {
      const response = await api.get(`${BACKEND_HTTPS}/api/payment/converge-hpp/test?clubId=${selectedClub?.id || '001'}`);
      setTestResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Test failed');
    } finally {
      setLoading(false);
    }
  };

  const testSessionToken = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post(`${BACKEND_HTTPS}/api/payment/converge-hpp/session-token`, {
        amount: testAmount,
        orderId: `TEST-${Date.now()}`,
        customerId: `${testMemberData.firstName} ${testMemberData.lastName}`,
        clubId: selectedClub?.id || '001',
        addToken: true,
        memberData: testMemberData
      });

      setTestResult(prev => ({
        ...prev,
        sessionTokenTest: {
          success: true,
          hasToken: !!response.data.ssl_txn_auth_token,
          tokenLength: response.data.ssl_txn_auth_token?.length || 0,
          tokenPreview: response.data.ssl_txn_auth_token?.substring(0, 20) + "..."
        }
      }));
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Session token test failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="converge-hpp-test">
      <div className="test-header">
        <h1>Converge HPP Integration Test</h1>
        <p>This page tests the new Converge Hosted Payment Page integration without affecting the existing payment flow.</p>
      </div>

      <div className="test-section">
        <h2>Integration Status</h2>
        <button 
          onClick={testIntegration}
          disabled={loading}
          className="test-button"
        >
          {loading ? 'Testing...' : 'Test Integration'}
        </button>

        {testResult && (
          <div className={`test-result ${testResult.ok ? 'success' : 'error'}`}>
            <h3>Test Results</h3>
            <div className="result-details">
              <p><strong>Status:</strong> {testResult.ok ? 'SUCCESS' : 'FAILED'}</p>
              <p><strong>Message:</strong> {testResult.message || testResult.error}</p>
              <p><strong>Club ID:</strong> {testResult.clubId}</p>
              
              {testResult.convergeInfo && (
                <div className="converge-info">
                  <h4>Converge Configuration:</h4>
                  <p><strong>Merchant ID:</strong> {testResult.convergeInfo.merchant_id}</p>
                  <p><strong>User ID:</strong> {testResult.convergeInfo.converge_user_id}</p>
                  <p><strong>PIN:</strong> {testResult.convergeInfo.converge_pin}</p>
                  <p><strong>URL:</strong> {testResult.convergeInfo.converge_url_process}</p>
                  <p><strong>Credentials Configured:</strong> {testResult.hasCredentials ? 'Yes' : 'No'}</p>
                </div>
              )}

              {testResult.endpoints && (
                <div className="endpoints">
                  <h4>Available Endpoints:</h4>
                  <ul>
                    <li><strong>Session Token:</strong> {testResult.endpoints.sessionToken}</li>
                    <li><strong>Store Vault Token:</strong> {testResult.endpoints.storeVaultToken}</li>
                    <li><strong>Log Payment Response:</strong> {testResult.endpoints.logPaymentResponse}</li>
                  </ul>
                </div>
              )}

              {testResult.sessionTokenTest && (
                <div className="session-token-test">
                  <h4>Session Token Test:</h4>
                  <p><strong>Success:</strong> {testResult.sessionTokenTest.success ? 'Yes' : 'No'}</p>
                  <p><strong>Has Token:</strong> {testResult.sessionTokenTest.hasToken ? 'Yes' : 'No'}</p>
                  <p><strong>Token Length:</strong> {testResult.sessionTokenTest.tokenLength}</p>
                  <p><strong>Token Preview:</strong> {testResult.sessionTokenTest.tokenPreview}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        )}
      </div>

      <div className="test-section">
        <h2>Session Token Test</h2>
        <p>Test creating a session token with member data:</p>
        
        <div className="test-data">
          <h4>Test Member Data:</h4>
          <pre>{JSON.stringify(testMemberData, null, 2)}</pre>
          <p><strong>Test Amount:</strong> ${testAmount}</p>
        </div>

        <button 
          onClick={testSessionToken}
          disabled={loading || !testResult?.hasCredentials}
          className="test-button"
        >
          {loading ? 'Testing...' : 'Test Session Token'}
        </button>
      </div>

      <div className="test-section">
        <h2>Integration Notes</h2>
        <div className="notes">
          <ul>
            <li>This integration uses the working Converge HPP implementation from the separate project</li>
            <li>It replaces hardcoded values with real member data from the enrollment process</li>
            <li>Vault tokens are stored using the <code>web_proc_InsertWebStrcustr</code> stored procedure</li>
            <li>The integration is ready for use but not yet in production</li>
            <li>It can replace the existing ConvergeLightboxPayment component when ready</li>
          </ul>
        </div>
      </div>

      <div className="test-section">
        <h2>Next Steps</h2>
        <div className="next-steps">
          <ol>
            <li>Verify Converge credentials are properly configured in the database</li>
            <li>Test the session token creation with real member data</li>
            <li>Test the full payment flow in a development environment</li>
            <li>Integrate the ConvergeHPP component into the enrollment flow</li>
            <li>Replace ConvergeLightboxPayment when ready for production</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ConvergeHPPTest;
