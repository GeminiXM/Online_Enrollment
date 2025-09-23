import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClub } from '../context/ClubContext';
import api from '../services/api.js';
import './PaymentPage.css';

const FluidPayPaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedClub } = useClub();
  
  // State management
  const [formData, setFormData] = useState(null);
  const [fluidPayInfo, setFluidPayInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [isLoadingFluidPay, setIsLoadingFluidPay] = useState(false);

  // Get enrollment data passed from ContractPage
  useEffect(() => {
    if (location.state && location.state.formData) {
      console.log("FluidPayPaymentPage - FormData received:", location.state.formData);
      setFormData(location.state.formData);
    } else {
      console.error("FluidPayPaymentPage - No form data received");
      navigate('/enrollment');
    }
  }, [location.state, navigate]);

  // Calculate prorated amount for payment
  const calculateProratedAmount = () => {
    if (!formData) return 0;
    
    // Use totalCollected from ContractPage if available
    if (formData.totalCollected) {
      return parseFloat(formData.totalCollected);
    }
    
    // Fallback calculation
    const enrollmentFee = parseFloat(formData.enrollmentFee || 0);
    const proratedDues = parseFloat(formData.proratedDues || 0);
    const proratedAddOns = parseFloat(formData.proratedAddOns || 0);
    const ptPackageAmount = parseFloat(formData.ptPackageAmount || 0);
    
    return enrollmentFee + proratedDues + proratedAddOns + ptPackageAmount;
  };

  // Fetch FluidPay processor information
  const fetchFluidPayInfo = async () => {
    if (!formData?.club) return;
    
    setIsLoadingFluidPay(true);
    try {
      const response = await api.get(`/payment/fluidpay-info?clubId=${formData.club}`);
      console.log('FluidPay info result:', response.data);
      
      if (response.data && response.data.success) {
        setFluidPayInfo(response.data.fluidPayInfo);
      } else {
        setErrorMessage('Failed to load FluidPay payment processor information');
      }
    } catch (error) {
      console.error('Error fetching FluidPay info:', error);
      setErrorMessage('Failed to load payment processor information');
    } finally {
      setIsLoadingFluidPay(false);
    }
  };

  // Process FluidPay payment
  const processFluidPayPayment = async () => {
    if (!formData || !fluidPayInfo) return;
    
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      const amount = calculateProratedAmount();
      
      console.log('Processing FluidPay payment:', {
        amount,
        clubId: formData.club
      });
      
      const response = await api.post('/payment/fluidpay', {
        amount: amount.toFixed(2),
        clubId: formData.club,
        memberData: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || formData.cellPhone,
          address: formData.address || formData.address1,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode
        }
      });
      
      if (response.data && response.data.success) {
        console.log('FluidPay payment successful:', response.data);
        setPaymentSuccess(true);
        setPaymentResult(response.data);
        
        // Submit enrollment to backend
        await submitEnrollment(response.data);
      } else {
        throw new Error(response.data?.message || 'Payment failed');
      }
    } catch (error) {
      console.error('FluidPay payment error:', error);
      setErrorMessage(error.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit enrollment data to backend
  const submitEnrollment = async (paymentData) => {
    if (!formData) return;
    
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      // Prepare enrollment data
      const enrollmentData = {
        ...formData,
        paymentInfo: {
          transactionId: paymentData.transaction_id || paymentData.id,
          last4: paymentData.last4 || '',
          cardType: paymentData.card_type || '',
          expirationDate: paymentData.expiration_date || '',
          processorName: 'FLUIDPAY'
        },
        contractPDF: null // Will be generated in confirmation page
      };
      
      console.log('Submitting enrollment data to database:', enrollmentData);
      
      const response = await api.post('/enrollment', enrollmentData);
      
      if (response.data && response.data.success) {
        console.log('Enrollment submitted successfully:', response.data);
        
        // Navigate to confirmation page
        navigate('/enrollment-confirmation', { 
          state: { 
            enrollmentData: response.data,
            memberName: `${formData.firstName} ${formData.lastName}`,
            successMessage: `Welcome to ${selectedClub?.name || 'the club'}, ${formData.firstName}! Your enrollment has been successfully submitted.`,
            paymentResponse: paymentData,
            formData: formData,              
            signatureData: location.state.signatureData,     
            initialedSections: location.state.initialedSections,
            membershipNumber: response.data.custCode,
            transactionId: response.data.transactionId,
            amountBilled: calculateProratedAmount().toFixed(2)
          } 
        });
      } else {
        throw new Error(response.data?.message || 'Enrollment submission failed');
      }
    } catch (error) {
      console.error('Enrollment submission error:', error);
      setErrorMessage('Payment was processed successfully, but there was an error completing your enrollment. Please contact customer support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load FluidPay info when component mounts
  useEffect(() => {
    if (formData?.club) {
      fetchFluidPayInfo();
    }
  }, [formData?.club]);

  if (!formData) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="payment-container">
      <h1>Complete Your Membership</h1>
      
      <div className="payment-layout">
        <div className="payment-summary">
          <h2>Payment Summary</h2>
          
          <div className="processor-info">
            <h3>Payment Processor Information</h3>
            <div className="processor-details">
              <p className="processor-name">
                <span className="detail-label">Processor:</span> 
                <span className="detail-value">FluidPay</span>
              </p>
              
              {fluidPayInfo && (
                <div className="processor-config">
                  <p className="detail-item">
                    <span className="detail-label">Merchant ID:</span>
                    <span className="detail-value">{fluidPayInfo.merchant_id}</span>
                  </p>
                  <p className="detail-item">
                    <span className="detail-label">Base URL:</span>
                    <span className="detail-value">{fluidPayInfo.fluidpay_base_url ? '✓ Configured' : '⚠️ Missing'}</span>
                  </p>
                  <p className="detail-item">
                    <span className="detail-label">API Key:</span>
                    <span className="detail-value">{fluidPayInfo.fluidpay_api_key ? '✓ Configured' : '⚠️ Missing'}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="due-today">
            <div className="due-today-amount">${calculateProratedAmount().toFixed(2)}</div>
            <div className="price-label">Due Today</div>
          </div>

          <div className="payment-breakdown">
            <h3>Payment Breakdown</h3>
            <div className="breakdown-item">
              <span>Enrollment Fee</span>
              <span>${parseFloat(formData.enrollmentFee || 0).toFixed(2)}</span>
            </div>
            <div className="breakdown-item">
              <span>Prorated Dues</span>
              <span>${parseFloat(formData.proratedDues || 0).toFixed(2)}</span>
            </div>
            {parseFloat(formData.proratedAddOns || 0) > 0 && (
              <div className="breakdown-item">
                <span>Prorated Add-ons</span>
                <span>${parseFloat(formData.proratedAddOns || 0).toFixed(2)}</span>
              </div>
            )}
            {parseFloat(formData.ptPackageAmount || 0) > 0 && (
              <div className="breakdown-item">
                <span>Personal Training</span>
                <span>${parseFloat(formData.ptPackageAmount || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="breakdown-total">
              <span><strong>Total Due Today</strong></span>
              <span><strong>${calculateProratedAmount().toFixed(2)}</strong></span>
            </div>
          </div>

          <div className="monthly-summary">
            <h3>Going Forward</h3>
            <div className="monthly-amount">
              <span>Monthly Dues</span>
              <span>${parseFloat(formData.monthlyDues || formData.membershipDetails?.price || 0).toFixed(2)}</span>
            </div>
            {formData.serviceAddons && formData.serviceAddons.length > 0 && (
              <div className="monthly-addons">
                {formData.serviceAddons.map((addon, index) => (
                  <div key={index} className="breakdown-item">
                    <span>{addon.description || addon.name}</span>
                    <span>${parseFloat(addon.price || addon.monthly || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="member-info">
            <h3>Member Information</h3>
            <div className="member-details">
              <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
              <p><strong>Email:</strong> {formData.email}</p>
              <p><strong>Phone:</strong> {formData.phone || formData.cellPhone}</p>
              <p><strong>Club:</strong> {selectedClub?.name}</p>
            </div>
          </div>
        </div>

        <div className="payment-form-section">
          <div className="legal-notice">
            <h2>Payment Authorization</h2>
            <p>
              By completing this payment, you authorize ongoing monthly billing for your membership 
              and any selected services. Your membership will continue until you provide written 
              notice of cancellation as outlined in your membership agreement.
            </p>
            <p>
              <strong>Payment Method:</strong> Your payment information will be securely stored 
              for future monthly billing. You may update your payment method at any time by 
              contacting the club.
            </p>
          </div>

          <div className="payment-form">
            <h2>Secure Payment</h2>
            
            {isLoadingFluidPay && (
              <div className="loading-message">
                <p>Loading FluidPay payment processor...</p>
              </div>
            )}
            
            {errorMessage && (
              <div className="error-message">
                <p>{errorMessage}</p>
                <button 
                  onClick={() => {
                    setErrorMessage('');
                    processFluidPayPayment();
                  }}
                  className="retry-button"
                >
                  Try Again
                </button>
              </div>
            )}
            
            {fluidPayInfo && !isLoadingFluidPay && !errorMessage && (
              <div className="fluidpay-payment-section">
                <p>FluidPay payment processor is ready.</p>
                <p><strong>Note:</strong> The FluidPay processor needs to be activated in your FluidPay dashboard before processing real payments.</p>
                
                <button 
                  onClick={processFluidPayPayment}
                  disabled={isSubmitting}
                  className="process-payment-button"
                >
                  {isSubmitting ? 'Processing Payment...' : 'Process Payment'}
                </button>
              </div>
            )}
            
            {isSubmitting && (
              <div className="submitting-message">
                <p>Processing your enrollment...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FluidPayPaymentPage;

