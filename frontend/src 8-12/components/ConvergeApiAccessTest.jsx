import React, { useState } from 'react';
import apiService from '../services/api';
import './ConvergeApiAccessTest.css';

const ConvergeApiAccessTest = () => {
  const [clubId, setClubId] = useState('201');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      console.log('Making API request...');
      const response = await apiService.testConvergeApiAccess({ clubId });
      console.log('API response received:', response);
      console.log('Response data:', response.data);
      // Use response.data if it exists, otherwise use response directly
      const resultData = response.data || response;
      console.log('Using result data:', resultData);
      setResults(resultData);
    } catch (err) {
      console.error('API error:', err);
      setError(err.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="converge-api-access-test">
      <h2>Converge API Access Test</h2>
      <p>This test tries multiple approaches to access the Converge API to help diagnose access issues.</p>
      
      <div className="test-controls">
        <div className="input-group">
          <label htmlFor="clubId">Club ID:</label>
          <input
            type="text"
            id="clubId"
            value={clubId}
            onChange={(e) => setClubId(e.target.value)}
            placeholder="Enter club ID"
          />
        </div>
        
        <button 
          onClick={handleTest} 
          disabled={loading || !clubId}
          className="test-button"
        >
          {loading ? 'Testing...' : 'Test API Access'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}

      {results && (
        <div className="test-results">
          <h3>Test Results</h3>
          <p>Debug: Results received - {JSON.stringify(results).substring(0, 100)}...</p>
          
          <div className="credentials-info">
            <h4>Credentials Used</h4>
            <p><strong>Merchant ID:</strong> {results.credentials.merchant_id}</p>
            <p><strong>User ID:</strong> {results.credentials.user_id}</p>
            <p><strong>PIN Length:</strong> {results.credentials.pin_length} characters</p>
          </div>

          <div className="summary">
            <h4>Summary</h4>
            <p><strong>Total Tests:</strong> {results.summary.totalTests}</p>
            <p><strong>Successful Tests:</strong> {results.summary.successfulTests}</p>
            <p><strong>HTML Responses:</strong> {results.summary.htmlResponses}</p>
            <p><strong>Recommendation:</strong> {results.summary.recommendation}</p>
          </div>

          <div className="test-details">
            <h4>Test Details</h4>
            {results.testResults.map((test, index) => (
              <div key={index} className={`test-result ${test.success ? 'success' : 'failure'}`}>
                <h5>{test.test}</h5>
                <div className="test-info">
                  <p><strong>Status:</strong> {test.status}</p>
                  <p><strong>Success:</strong> {test.success ? 'Yes' : 'No'}</p>
                  <p><strong>HTML Response:</strong> {test.isHtml ? 'Yes' : 'No'}</p>
                  {test.error && <p><strong>Error:</strong> {test.error}</p>}
                  {test.responsePreview && (
                    <div className="response-preview">
                      <strong>Response Preview:</strong>
                      <pre>{test.responsePreview}</pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="recommendations">
            <h4>What This Means</h4>
            {results.summary.successfulTests > 0 ? (
              <div className="success-recommendation">
                <p>✅ Some API access methods are working! You can use the successful test methods.</p>
                <p>Check the successful tests above to see which approach works for your account.</p>
              </div>
            ) : (
              <div className="failure-recommendation">
                <p>❌ No direct API access is available for your Converge account.</p>
                <p><strong>You need to contact Converge support to:</strong></p>
                <ul>
                  <li>Enable direct API access for your account</li>
                  <li>Configure API credentials with proper permissions</li>
                  <li>Verify the API endpoints are properly configured</li>
                  <li>Ensure your account supports the VirtualMerchant API</li>
                </ul>
                <p><strong>Alternative:</strong> You may need to use Converge's web-based payment forms instead of direct API calls.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConvergeApiAccessTest;
