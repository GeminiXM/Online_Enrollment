import React, { useState } from 'react';
import api from '../services/api';
import './DirectPaymentTest.css';

const DirectPaymentTest = () => {
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    amount: '1.00',
    firstName: 'Test',
    lastName: 'User',
    address: '123 Test St',
    city: 'Test City',
    state: 'TX',
    zipCode: '12345',
    email: 'test@example.com'
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Prepare card data
      const cardData = {
        cardNumber: formData.cardNumber.replace(/\s/g, ''),
        expiryDate: formData.expiryDate,
        cvv: formData.cvv
      };

      // Prepare customer data
      const customerData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        email: formData.email
      };

      console.log('Processing direct payment with:', {
        cardData: { ...cardData, cardNumber: cardData.cardNumber.substring(0, 4) + '****' },
        amount: formData.amount,
        customerData
      });

      // Call the direct payment endpoint
      const response = await api.processConvergeTokenizeAndPay(
        cardData,
        formData.amount,
        null, // convergeInfo will be retrieved from backend
        customerData
      );

      console.log('Payment response:', response);
      setResult(response);

      if (response.success) {
        // Clear sensitive data
        setFormData(prev => ({
          ...prev,
          cardNumber: '',
          expiryDate: '',
          cvv: ''
        }));
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="direct-payment-test">
      <h1>Direct Payment Test</h1>
      <p>Test direct payment processing with real credit cards</p>
      
      <form onSubmit={handleSubmit} className="payment-form">
        <div className="form-section">
          <h3>Card Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cardNumber">Card Number:</label>
              <input
                type="text"
                id="cardNumber"
                name="cardNumber"
                value={formData.cardNumber}
                onChange={handleInputChange}
                placeholder="4111 1111 1111 1111"
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="expiryDate">Expiry Date (MMYY):</label>
              <input
                type="text"
                id="expiryDate"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
                placeholder="1225"
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
                required
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Payment Details</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="amount">Amount ($):</label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                step="0.01"
                min="0.01"
                required
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Billing Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name:</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="lastName">Last Name:</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="address">Address:</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="city">City:</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="state">State:</label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="zipCode">ZIP Code:</label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Processing...' : 'Process Payment'}
        </button>
      </form>

      {error && (
        <div className="error-message">
          <h3>Error:</h3>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="result-message">
          <h3>Payment Result:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default DirectPaymentTest;

