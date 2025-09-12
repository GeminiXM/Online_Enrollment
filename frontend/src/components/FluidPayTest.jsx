import React, { useState } from 'react';
import { useClub } from '../context/ClubContext';
import api from '../services/api.js';
import './FluidPayTest.css';

const FluidPayTest = () => {
  const { selectedClub } = useClub();
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Test data for demonstration
  const testCustomerInfo = {
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

  const testFluidPayInfo = async () => {
    setLoading(true);
    setError('');
    setTestResult(null);

    try {
      const response = await api.get(`/payment/fluidpay-info?clubId=${selectedClub?.id || '254'}`);
      setTestResult(prev => ({
        ...prev,
        fluidPayInfo: response.data
      }));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'FluidPay info test failed');
    } finally {
      setLoading(false);
    }
  };

  const testFluidPayConnection = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post(`/payment/test-fluidpay`, {
        clubId: selectedClub?.id || '254',
        amount: testAmount,
        customerInfo: testCustomerInfo
      });

      setTestResult(prev => ({
        ...prev,
        connectionTest: response.data
      }));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'FluidPay connection test failed');
    } finally {
      setLoading(false);
    }
  };

  const testFluidPayPayment = async () => {
    setLoading(true);
    setError('');

    try {
      // For testing, we'll use a mock token since we can't generate a real one without the tokenizer
      const mockToken = `test_token_${Date.now()}`;
      
      const response = await api.post(`/payment/process-fluidpay`, {
        clubId: selectedClub?.id || '254',
        amount: testAmount,
        token: mockToken,
        customerInfo: testCustomerInfo,
        user: testCustomerInfo,
        billing: {
          address: testCustomerInfo.address,
          city: testCustomerInfo.city,
          state: testCustomerInfo.state,
          zip: testCustomerInfo.zipCode
        }
      });

      setTestResult(prev => ({
        ...prev,
        paymentTest: response.data
      }));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'FluidPay payment test failed');
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setError('');
    setTestResult(null);

    try {
      // Test 1: FluidPay Info
      await testFluidPayInfo();
      
      // Test 2: Connection Test
      await testFluidPayConnection();
      
      // Test 3: Payment Processing (with mock token)
      await testFluidPayPayment();
      
    } catch (err) {
      setError(err.message || 'Test suite failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fluidpay-test">
      <div className="test-header">
        <h2>FluidPay Integration Test</h2>
        <p>Test FluidPay payment processor integration and endpoints</p>
        <p><strong>Selected Club:</strong> {selectedClub?.name} (ID: {selectedClub?.id})</p>
      </div>

      <div className="test-controls">
        <button 
          onClick={testFluidPayInfo}
          disabled={loading}
          className="test-btn"
        >
          Test FluidPay Info
        </button>
        
        <button 
          onClick={testFluidPayConnection}
          disabled={loading}
          className="test-btn"
        >
          Test Connection
        </button>
        
        <button 
          onClick={testFluidPayPayment}
          disabled={loading}
          className="test-btn"
        >
          Test Payment (Mock Token)
        </button>
        
        <button 
          onClick={runAllTests}
          disabled={loading}
          className="test-btn primary"
        >
          Run All Tests
        </button>
      </div>

      {loading && (
        <div className="loading">
          <p>Running tests...</p>
        </div>
      )}

      {error && (
        <div className="error">
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}

      {testResult && (
        <div className="test-results">
          <h3>Test Results</h3>
          
          {testResult.fluidPayInfo && (
            <div className="test-section">
              <h4>FluidPay Info Test</h4>
              <pre>{JSON.stringify(testResult.fluidPayInfo, null, 2)}</pre>
            </div>
          )}
          
          {testResult.connectionTest && (
            <div className="test-section">
              <h4>Connection Test</h4>
              <pre>{JSON.stringify(testResult.connectionTest, null, 2)}</pre>
            </div>
          )}
          
          {testResult.paymentTest && (
            <div className="test-section">
              <h4>Payment Test (Mock Token)</h4>
              <pre>{JSON.stringify(testResult.paymentTest, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      <div className="test-info">
        <h3>Test Information</h3>
        <ul>
          <li><strong>Test Amount:</strong> ${testAmount}</li>
          <li><strong>Test Customer:</strong> {testCustomerInfo.firstName} {testCustomerInfo.lastName}</li>
          <li><strong>Test Email:</strong> {testCustomerInfo.email}</li>
          <li><strong>Available Endpoints:</strong>
            <ul>
              <li>GET /api/payment/fluidpay-info</li>
              <li>POST /api/payment/test-fluidpay</li>
              <li>POST /api/payment/process-fluidpay</li>
            </ul>
          </li>
        </ul>
        
        <div className="test-note">
          <h4>Database Configuration</h4>
          <p>The FluidPay tests now use real credentials from the database. Make sure your database has valid FluidPay credentials configured for the selected club.</p>
        </div>
      </div>
    </div>
  );
};

export default FluidPayTest;
