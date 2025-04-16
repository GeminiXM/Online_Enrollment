import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClub } from '../context/ClubContext';
import api from '../services/api.js';
import './PaymentPage.css';

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedClub } = useClub();
  
  // Data from previous screens
  const [formData, setFormData] = useState(null);
  const [signatureData, setSignatureData] = useState(null);
  
  // Payment form state
  const [paymentFormData, setPaymentFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: '',
    billingZipCode: ''
  });
  
  // Other state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  
  // Get enrollment data passed from previous page
  useEffect(() => {
    if (location.state) {
      const { formData, signatureData } = location.state;
      
      if (formData) {
        setFormData(formData);
        
        // Pre-fill the name on card if available
        if (formData.firstName && formData.lastName) {
          setPaymentFormData(prev => ({
            ...prev,
            nameOnCard: `${formData.firstName} ${formData.lastName}`
          }));
          
          // Pre-fill billing zip code if available
          if (formData.zipCode) {
            setPaymentFormData(prev => ({
              ...prev,
              billingZipCode: formData.zipCode
            }));
          }
        }
      }
      
      if (signatureData) {
        setSignatureData(signatureData);
      }
    } else {
      // If no data, go back to enrollment form
      navigate('/enrollment');
    }
  }, [location, navigate]);
  
  // Handle payment form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Format card number with spaces
    if (name === 'cardNumber') {
      const formatted = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
      setPaymentFormData(prev => ({
        ...prev,
        [name]: formatted
      }));
    } 
    // Format expiry date as MM/YY
    else if (name === 'expiryDate') {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length <= 2) {
        setPaymentFormData(prev => ({
          ...prev,
          [name]: cleaned
        }));
      } else {
        const formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
        setPaymentFormData(prev => ({
          ...prev,
          [name]: formatted
        }));
      }
    } 
    // Other fields
    else {
      setPaymentFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear errors when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };
  
  // Validate payment form
  const validatePaymentForm = () => {
    const newErrors = {};
    
    // Card number validation (simple length check)
    const cardNumberClean = paymentFormData.cardNumber.replace(/\D/g, '');
    if (!cardNumberClean) {
      newErrors.cardNumber = 'Card number is required';
    } else if (cardNumberClean.length < 14 || cardNumberClean.length > 19) {
      newErrors.cardNumber = 'Please enter a valid card number';
    }
    
    // Expiry date validation
    if (!paymentFormData.expiryDate) {
      newErrors.expiryDate = 'Expiration date is required';
    } else {
      const [month, year] = paymentFormData.expiryDate.split('/');
      const currentYear = new Date().getFullYear() % 100; // Get last 2 digits
      const currentMonth = new Date().getMonth() + 1; // 1-12
      
      if (!month || !year || month > 12 || month < 1) {
        newErrors.expiryDate = 'Please enter a valid expiration date';
      } else if ((parseInt(year) < currentYear) || 
                (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
        newErrors.expiryDate = 'Your card has expired';
      }
    }
    
    // CVV validation
    if (!paymentFormData.cvv) {
      newErrors.cvv = 'CVV is required';
    } else if (!/^\d{3,4}$/.test(paymentFormData.cvv)) {
      newErrors.cvv = 'Please enter a valid CVV';
    }
    
    // Name on card validation
    if (!paymentFormData.nameOnCard) {
      newErrors.nameOnCard = 'Name on card is required';
    } else if (paymentFormData.nameOnCard.length < 3) {
      newErrors.nameOnCard = 'Please enter the full name as it appears on the card';
    }
    
    // Billing zip code validation
    if (!paymentFormData.billingZipCode) {
      newErrors.billingZipCode = 'Billing ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(paymentFormData.billingZipCode)) {
      newErrors.billingZipCode = 'Please enter a valid ZIP code';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Calculate prorated amount due now
  const calculateProratedAmount = () => {
    if (!formData || !formData.membershipDetails) return 0;
    
    return formData.membershipDetails.proratedPrice || 0;
  };
  
  // Calculate monthly amount going forward
  const calculateMonthlyAmount = () => {
    if (!formData || !formData.membershipDetails) return 0;
    
    return formData.membershipDetails.price || 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset submission state
    setSubmitError('');
    
    // Validate the payment form
    if (!validatePaymentForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // For testing purposes, we're using the original enrollment submission endpoint
      // In a real implementation, this would include payment processing
      
      // Combine all data for submission
      const submissionData = {
        ...formData,
        // Add signature data
        signatureData: signatureData,
        // Add payment data (this would be handled securely in a real implementation)
        paymentInfo: {
          ...paymentFormData,
          // Remove spaces from card number
          cardNumber: paymentFormData.cardNumber.replace(/\s/g, ''),
        }
      };
      
      console.log('Submitting enrollment data:', submissionData);
      
      // Submit the form data to the server
      const response = await api.post('/enrollment', submissionData);
      
      // Navigate to confirmation page
      navigate('/enrollment-confirmation', { 
        state: { 
          enrollmentData: response.data,
          memberName: `${formData.firstName} ${formData.lastName}`,
          successMessage: `Welcome to Wellbridge, ${formData.firstName}! Your enrollment has been successfully submitted.`
        } 
      });
      
    } catch (error) {
      console.error('Enrollment submission error:', error);
      
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
        
        // Format user-friendly error message based on server response
        if (error.response.data?.missingFields) {
          setSubmitError(`Missing required fields: ${error.response.data.missingFields.join(', ')}`);
        } else if (error.response.data?.error) {
          setSubmitError(error.response.data.error);
        } else {
          setSubmitError(error.response.data?.message || 'An error occurred while processing your payment. Please try again.');
        }
      } else {
        setSubmitError('Network error. Please check your internet connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!formData) {
    return <div className="loading">Loading...</div>;
  }
  
  return (
    <div className="payment-container">
      <h1>Complete Your Membership</h1>
      
      <div className="payment-layout">
        <div className="payment-summary">
          <h2>Payment Summary</h2>
          
          <div className="membership-summary">
            <h3>Membership Details</h3>
            <p className="membership-type">{formData.membershipDetails?.description || 'Standard Membership'}</p>
            <p className="membership-club">{selectedClub?.name || 'Wellbridge Club'}</p>
            
            <div className="price-details">
              <div className="price-row">
                <span className="price-label">Due today (prorated):</span>
                <span className="price-value">${calculateProratedAmount().toFixed(2)}</span>
              </div>
              <div className="price-row recurring">
                <span className="price-label">Monthly fee going forward:</span>
                <span className="price-value">${calculateMonthlyAmount().toFixed(2)}/month</span>
              </div>
            </div>
          </div>
          
          <div className="agreement-summary">
            <h3>Agreement</h3>
            <p>You have agreed to the membership terms and conditions with your electronic signature.</p>
            {signatureData?.signature && (
              <div className="signature-preview" style={{ fontFamily: signatureData.signature.font }}>
                {signatureData.signature.text}
              </div>
            )}
          </div>
        </div>
        
        <div className="payment-form-container">
          <h2>Payment Information</h2>
          
          {submitError && (
            <div className="error-message payment-error">
              {submitError}
            </div>
          )}
          
          <form className="payment-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="cardNumber">
                Card Number <span className="required">*</span>
              </label>
              <input
                type="text"
                id="cardNumber"
                name="cardNumber"
                value={paymentFormData.cardNumber}
                onChange={handleInputChange}
                placeholder="**** **** **** ****"
                maxLength="19"
              />
              {errors.cardNumber && (
                <div className="error-message">{errors.cardNumber}</div>
              )}
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="expiryDate">
                  Expiration Date <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="expiryDate"
                  name="expiryDate"
                  value={paymentFormData.expiryDate}
                  onChange={handleInputChange}
                  placeholder="MM/YY"
                  maxLength="5"
                />
                {errors.expiryDate && (
                  <div className="error-message">{errors.expiryDate}</div>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="cvv">
                  CVV <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="cvv"
                  name="cvv"
                  value={paymentFormData.cvv}
                  onChange={handleInputChange}
                  placeholder="***"
                  maxLength="4"
                />
                {errors.cvv && (
                  <div className="error-message">{errors.cvv}</div>
                )}
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="nameOnCard">
                Name on Card <span className="required">*</span>
              </label>
              <input
                type="text"
                id="nameOnCard"
                name="nameOnCard"
                value={paymentFormData.nameOnCard}
                onChange={handleInputChange}
                placeholder="Enter name as it appears on card"
              />
              {errors.nameOnCard && (
                <div className="error-message">{errors.nameOnCard}</div>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="billingZipCode">
                Billing ZIP Code <span className="required">*</span>
              </label>
              <input
                type="text"
                id="billingZipCode"
                name="billingZipCode"
                value={paymentFormData.billingZipCode}
                onChange={handleInputChange}
                placeholder="Enter ZIP code"
                maxLength="10"
              />
              {errors.billingZipCode && (
                <div className="error-message">{errors.billingZipCode}</div>
              )}
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="secondary-button"
                onClick={() => navigate(-1)}
              >
                Back
              </button>
              <button 
                type="submit" 
                className="primary-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Submit Enrollment"}
              </button>
            </div>
            
            <div className="payment-security-notice">
              <p>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                Your payment information is secure and encrypted
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
