import React, { useState, useEffect } from 'react';
import './FluidPayModal.css';

const FluidPayModal = ({ isOpen, onClose, onSuccess, clubId, amount: propAmount = 10.00 }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenizer, setTokenizer] = useState(null);
  const [isTokenizerLoaded, setIsTokenizerLoaded] = useState(false);
  const [amount, setAmount] = useState(propAmount.toString());
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [billingInfo, setBillingInfo] = useState({
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'US'
  });

  // Update amount when prop changes
  useEffect(() => {
    setAmount(parseFloat(propAmount).toFixed(2));
  }, [propAmount]);

  // Load FluidPay tokenizer script
  useEffect(() => {
    if (!isOpen) return;

    const loadTokenizer = () => {
      if (window.Tokenizer) {
        setIsTokenizerLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://app.fluidpay.com/tokenizer/tokenizer.js';
      script.onload = () => {
        setIsTokenizerLoaded(true);
      };
      script.onerror = () => {
        setError('Failed to load FluidPay tokenizer');
      };
      document.head.appendChild(script);
    };

    loadTokenizer();
  }, [isOpen]);

  // Initialize tokenizer when script is loaded
  useEffect(() => {
    if (!isOpen || !isTokenizerLoaded || tokenizer) return;

    try {
      const tokenizerInstance = new window.Tokenizer({
        url: '', // Use current domain
        apikey: 'pub_31FUYRENhNiAvspejegbLoPD2he', // Public API key for frontend
        container: '#tokenizer-container',
        submission: (response) => {
          handleTokenizerResponse(response);
        },
        onLoad: () => {
          console.log('FluidPay tokenizer loaded successfully');
        },
        onPaymentChange: (type) => {
          console.log('Payment type changed:', type);
        },
        validCard: (card) => {
          console.log('Valid card detected:', card);
        },
        settings: {
          payment: {
            types: ['card'],
            card: {
              strict_mode: false,
              requireCVV: true
            }
          },
          user: {
            showInline: true,
            showName: true,
            showEmail: true,
            showPhone: true,
            showTitle: true
          },
          billing: {
            show: true,
            showTitle: true
          }
        }
      });

      setTokenizer(tokenizerInstance);
    } catch (error) {
      console.error('Error initializing tokenizer:', error);
      setError('Failed to initialize payment form');
    }
  }, [isOpen, isTokenizerLoaded, tokenizer]);

  const handleTokenizerResponse = async (response) => {
    console.log('Tokenizer response:', response);

    if (response.status === 'success') {
      try {
        setIsLoading(true);
        setError('');

        // Prepare payment data
        const paymentData = {
          clubId: clubId || '292',
          amount: parseFloat(amount),
          token: response.token,
          customerInfo: {
            firstName: response.user?.first_name || customerInfo.firstName,
            lastName: response.user?.last_name || customerInfo.lastName,
            email: response.user?.email || customerInfo.email,
            phone: response.user?.phone || customerInfo.phone
          },
          billing: {
            address: response.billing?.address_line_1 || billingInfo.address,
            city: response.billing?.city || billingInfo.city,
            state: response.billing?.state || billingInfo.state,
            zip: response.billing?.postal_code || billingInfo.zip,
            country: response.billing?.country || billingInfo.country
          }
        };

        console.log('Processing payment with data:', paymentData);

        // Process the payment
        const response_data = await fetch('/api/payment/process-fluidpay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData)
        });

        const result = await response_data.json();
        console.log('Payment processing result:', result);

        if (result.success) {
          // Success - show vault token and other details
          const successData = {
            transactionId: result.transactionId,
            vaultToken: result.vaultToken,
            authorizationCode: result.authorizationCode,
            cardInfo: result.cardInfo,
            cardNumber: result.cardNumber, // Include the masked card number from backend
            cardType: result.cardType, // Include the card type from backend
            expirationDate: result.expirationDate, // Include the formatted expiration date from backend
            amount: amount,
            customerInfo: paymentData.customerInfo,
            billing: paymentData.billing
          };

          onSuccess(successData);
          onClose();
        } else {
          setError(result.message || 'Payment processing failed');
        }
      } catch (error) {
        console.error('Error processing payment:', error);
        setError('Payment processing failed: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    } else if (response.status === 'error') {
      setError('Payment form error: ' + response.msg);
    } else if (response.status === 'validation') {
      setError('Please check your payment information');
    }
  };

  const handleSubmit = () => {
    if (!tokenizer) {
      setError('Payment form not ready');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Submit the tokenizer form
      tokenizer.submit(amount);
    } catch (error) {
      console.error('Error submitting payment:', error);
      setError('Failed to submit payment');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (tokenizer) {
      try {
        // Clean up tokenizer if needed
        tokenizer.destroy?.();
      } catch (error) {
        console.warn('Error destroying tokenizer:', error);
      }
    }
    setTokenizer(null);
    setError('');
    setIsLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fluidpay-modal-overlay">
      <div className="fluidpay-modal">
        <div className="fluidpay-modal-header">
          <h2>FluidPay Payment Test</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="fluidpay-modal-content">
          <div className="form-section">
            <h3>Payment Details</h3>
            <div className="form-group">
              <label>Amount ($):</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Customer Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>First Name:</label>
                <input
                  type="text"
                  value={customerInfo.firstName}
                  onChange={(e) => setCustomerInfo({...customerInfo, firstName: e.target.value})}
                  disabled={isLoading}
                />
              </div>
              <div className="form-group">
                <label>Last Name:</label>
                <input
                  type="text"
                  value={customerInfo.lastName}
                  onChange={(e) => setCustomerInfo({...customerInfo, lastName: e.target.value})}
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                  disabled={isLoading}
                />
              </div>
              <div className="form-group">
                <label>Phone:</label>
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Billing Address</h3>
            <div className="form-group">
              <label>Address:</label>
              <input
                type="text"
                value={billingInfo.address}
                onChange={(e) => setBillingInfo({...billingInfo, address: e.target.value})}
                disabled={isLoading}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>City:</label>
                <input
                  type="text"
                  value={billingInfo.city}
                  onChange={(e) => setBillingInfo({...billingInfo, city: e.target.value})}
                  disabled={isLoading}
                />
              </div>
              <div className="form-group">
                <label>State:</label>
                <input
                  type="text"
                  value={billingInfo.state}
                  onChange={(e) => setBillingInfo({...billingInfo, state: e.target.value})}
                  disabled={isLoading}
                />
              </div>
              <div className="form-group">
                <label>ZIP:</label>
                <input
                  type="text"
                  value={billingInfo.zip}
                  onChange={(e) => setBillingInfo({...billingInfo, zip: e.target.value})}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Payment Information</h3>
            <div id="tokenizer-container" className="tokenizer-container">
              {!isTokenizerLoaded && (
                <div className="loading-message">Loading payment form...</div>
              )}
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button
              className="submit-button"
              onClick={handleSubmit}
              disabled={isLoading || !tokenizer || !isTokenizerLoaded}
            >
              {isLoading ? 'Processing...' : `Process $${amount}`}
            </button>
            <button className="cancel-button" onClick={handleClose} disabled={isLoading}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FluidPayModal;
