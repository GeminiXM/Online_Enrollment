import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClub } from '../context/ClubContext';
import api from '../services/api.js';
import CanvasContractPDF from './CanvasContractPDF.jsx';
import { generatePDFBuffer as generatePDFBufferNM } from './CanvasContractPDF.jsx';
import './ConvergeLightboxPayment.css';
import './SignatureSelector.css';

const ConvergeLightboxPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedClub } = useClub();
  
  // State management
  const [formData, setFormData] = useState(null);
  const [processorInfo, setProcessorInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [demoMode, setDemoMode] = useState(false);

  // Customer info from form data
  const customerInfo = {
    firstName: formData?.firstName || '',
    lastName: formData?.lastName || '',
    email: formData?.email || '',
    phone: formData?.phone || '',
    address: formData?.address || '',
    city: formData?.city || '',
    state: formData?.state || '',
    zipCode: formData?.zipCode || ''
  };

  // Calculate prorated amount for payment
  const calculateProratedAmount = () => {
    console.log('calculateProratedAmount called with formData:', formData);
    
    // Use totalCollected from ContractPage if available
    if (formData?.totalCollected) {
      console.log('Using totalCollected from ContractPage:', formData.totalCollected);
      return parseFloat(formData.totalCollected);
    }
    
    // Fallback calculation
    const enrollmentFee = parseFloat(formData?.enrollmentFee || 0);
    const proratedDues = parseFloat(formData?.proratedDues || 0);
    const proratedAddOns = parseFloat(formData?.proratedAddOns || 0);
    const ptPackageAmount = parseFloat(formData?.ptPackageAmount || 0);
    
    console.log('calculateProratedAmount using formData values:', {
      enrollmentFee,
      proratedDues,
      proratedAddOns,
      ptPackageAmount
    });
    
    return enrollmentFee + proratedDues + proratedAddOns + ptPackageAmount;
  };

  // Calculate monthly amount for payment
  const calculateMonthlyAmount = () => {
    if (!formData) {
      return 0;
    }
    
    // Get monthly dues from formData
    const monthlyDues = parseFloat(formData?.membershipDetails?.price || 0);
    
    // Get monthly add-ons
    const monthlyAddOns = parseFloat(formData?.monthlyAddOns || 0);
    
    return monthlyDues + monthlyAddOns;
  };

  // Calculate monthly amount (without tax)
  const calculateMonthlyAmount = () => {
    const monthlyDues = parseFloat(formData?.monthlyDues || 0);
    const monthlyAddOns = parseFloat(formData?.monthlyAddOns || 0);
    return monthlyDues + monthlyAddOns;
  };

  // Utility function to format dates without timezone shifts
  const formatDateWithoutTimezoneShift = (dateString) => {
    if (!dateString) return '';
    
    // Parse the date string - avoid timezone shifts by handling parts manually
    const parts = dateString.split(/[-T]/);
    if (parts.length >= 3) {
      const year = parseInt(parts[0], 10);
      // JavaScript months are 0-based, so subtract 1 from the month
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      
      // Create date with specific year, month, day in local timezone
      const date = new Date(year, month, day);
      
      // Format to mm/dd/yyyy
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    }
    
    // Fallback for unexpected format
    return dateString;
  };

  // Extract payment data from Converge response
  const extractPaymentData = (paymentResponse) => {
    console.log('Extracting payment data from Converge response:', paymentResponse);
    
    // Extract transaction token
    const transactionToken = paymentResponse.ssl_txn_auth_token || paymentResponse.token;
    
    // Extract card information
    const cardNumber = paymentResponse.ssl_card_number || '';
    const cardType = paymentResponse.ssl_card_type || '';
    const cardExpDate = paymentResponse.ssl_card_exp || '';
    const last4 = cardNumber.slice(-4) || '';
    
    // Extract transaction details
    const transactionId = paymentResponse.ssl_txn_id || '';
    const authorizationCode = paymentResponse.ssl_approval_code || '';
    const amount = paymentResponse.ssl_amount || calculateProratedAmount().toFixed(2);
    
    const paymentData = {
      processor: 'CONVERGE',
      token: transactionToken,
      cardNumber: last4 ? `****${last4}` : '',
      cardType: cardType,
      cardExpDate: cardExpDate,
      last4: last4,
      transactionId: transactionId,
      authorizationCode: authorizationCode,
      amount: amount,
      success: true
    };
    
    console.log('Extracted payment data:', paymentData);
    return paymentData;
  };

  // Handle successful payment response
  const handlePaymentSuccess = async (paymentResponse) => {
    console.log('Payment successful:', paymentResponse);
    
    // Extract payment data
    const paymentData = extractPaymentData(paymentResponse);
    
    if (!paymentData.token) {
      console.error('No transaction token in payment response');
      setErrorMessage('Payment completed but no transaction token received. Please contact support.');
      return;
    }
    
    // Store payment result for enrollment submission
    setPaymentResult(paymentData);
    setPaymentSuccess(true);
    setErrorMessage('');
    
    // Submit enrollment with payment data
    await finishEnrollment(paymentData);
  };

  // Finish enrollment process
  const finishEnrollment = async (paymentData) => {
    try {
      console.log('Finishing enrollment with payment data:', paymentData);
      
      // Generate contract PDF
      const contractPDF = await generatePDFBufferNM(formData);
      
      // Prepare enrollment data with payment information
      const enrollmentData = {
        ...formData,
        paymentInfo: {
          processor: 'CONVERGE',
          token: paymentData.token,
          last4: paymentData.last4,
          cardType: paymentData.cardType,
          expirationDate: paymentData.cardExpDate,
          transactionId: paymentData.transactionId,
          authorizationCode: paymentData.authorizationCode,
          amount: paymentData.amount
        },
        contractPDF: contractPDF
      };
      
      console.log('Submitting enrollment with payment data:', enrollmentData);
      
      // Submit enrollment to backend
      const enrollmentResponse = await api.submitEnrollment(enrollmentData);
      
      if (enrollmentResponse.success) {
        console.log('Enrollment submitted successfully:', enrollmentResponse);
        
        // Save contract PDF
        const saveResponse = await api.saveContractPDF(
          contractPDF,
          enrollmentResponse.membershipNumber || 'TEMP',
          `${formData?.firstName} ${formData?.lastName}`
        );
        
        console.log('Contract PDF saved:', saveResponse);
        
        // Navigate to confirmation page with all data
        navigate('/enrollment-confirmation', {
          state: {
            formData,
            paymentResult: paymentData,
            enrollmentData: enrollmentResponse,
            contractSaved: true
          }
        });
      } else {
        console.error('Enrollment submission failed:', enrollmentResponse);
        setErrorMessage('Payment successful but enrollment submission failed. Please contact support.');
        setIsSubmitting(false);
      }
      
    } catch (error) {
      console.error('Error finishing enrollment:', error);
      setErrorMessage('Payment successful but there was an error completing enrollment. Please contact support.');
      setIsSubmitting(false);
    }
  };

  // Handle lightbox response (for demo mode)
  const handleLightboxResponse = (event) => {
    if (event.origin !== window.location.origin) return;
    
    if (event.data.type === 'converge_payment_response') {
      const response = event.data.response;
      
      if (response.success) {
        handlePaymentSuccess(response);
      } else {
        setErrorMessage(response.message || 'Payment failed');
        setIsSubmitting(false);
      }
    }
  };

  // Load form data from location state
  useEffect(() => {
    if (location.state?.formData) {
      console.log('Using form data from location state');
      setFormData(location.state.formData);
      console.log('Location state family members:', location.state.familyMembers || []);
    } else {
      console.log('No form data in location state, navigating back to enrollment');
      navigate('/enrollment');
    }
  }, [location, navigate]);

  // Fetch Converge processor information
  useEffect(() => {
    const fetchConvergeInfo = async () => {
      if (!selectedClub?.id) return;
      
      console.log('Fetching Converge info for club:', selectedClub.id);
      
      try {
        const response = await api.getConvergeInfo(selectedClub.id);
        console.log('Converge API result:', response);
        
        if (response.success && response.convergeInfo) {
          console.log('Setting Converge processor info:', response.convergeInfo);
          setProcessorInfo(response.convergeInfo);
        } else {
          console.error('Failed to get Converge info:', response);
          setErrorMessage('Unable to load payment processor information.');
        }
      } catch (error) {
        console.error('Error fetching Converge info:', error);
        setErrorMessage('Unable to load payment processor information.');
      }
    };
    
    fetchConvergeInfo();
  }, [selectedClub]);

  // Cleanup event listener on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('message', handleLightboxResponse);
    };
  }, []);

  // Launch Converge Lightbox
const launchLightbox = async () => {
  console.log('Launching Converge Lightbox...');
    
    try {
      // Payment fields for Converge Lightbox (Virtual Merchant API)
    const paymentFields = {
        ssl_merchant_id: processorInfo.merchant_id.trim(),
        ssl_user_id: processorInfo.converge_user_id.trim(),
        ssl_pin: processorInfo.converge_pin.trim(),
        ssl_transaction_type: "ccsale",
        ssl_amount: calculateProratedAmount().toFixed(2),
        ssl_invoice_number: `INV-${Date.now()}`,
        ssl_description: `Membership Enrollment - ${formData?.membershipDetails?.membershipId || 'Standard'}`,
      ssl_first_name: customerInfo.firstName,
      ssl_last_name: customerInfo.lastName,
      ssl_avs_address: customerInfo.address,
      ssl_city: customerInfo.city,
      ssl_state: customerInfo.state,
      ssl_avs_zip: customerInfo.zipCode,
      ssl_phone: customerInfo.phone,
        ssl_email: customerInfo.email,
        ssl_cvv2_indicator: processorInfo.converge_cvv2_indicator || "N"
    };
    
    console.log('Payment fields:', paymentFields);
    console.log('Demo mode:', demoMode);
      console.log('Converge credentials being used:', {
        merchant_id: paymentFields.ssl_merchant_id,
        user_id: paymentFields.ssl_user_id,
        pin_length: paymentFields.ssl_pin.length,
        amount: paymentFields.ssl_amount,
        transaction_type: paymentFields.ssl_transaction_type
      });
    
    if (demoMode) {
      console.log('Using demo/simulation mode for Converge Lightbox');
      
      // Generate iframe URL for demo mode
        const iframeUrl = `/online-enrollment/converge-demo-iframe.html?amount=${calculateProratedAmount().toFixed(2)}&merchant=${processorInfo?.merchant_id || 'demo'}`;
        
        // Create iframe for demo
        const iframe = document.createElement('iframe');
        iframe.src = iframeUrl;
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.zIndex = '10000';
        iframe.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        
        document.body.appendChild(iframe);
      
      // Set up postMessage listener for simulation
      window.removeEventListener('message', handleLightboxResponse);
      window.addEventListener('message', handleLightboxResponse, false);
    } else {
        console.log('Using real Converge Lightbox integration (Virtual Merchant API)');
        
        // Create a form that POSTs to Converge Virtual Merchant API
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = processorInfo.converge_url_process;
        form.target = '_blank'; // Open in new tab
        form.style.display = 'none';
        
        // Add required parameters for hosted payment page
        paymentFields.ssl_result_format = "HTML";
        paymentFields.ssl_show_form = "true";
        paymentFields.ssl_show_receipt = "true";
        paymentFields.ssl_receipt_link_method = "REDG";
        paymentFields.ssl_receipt_link_url = window.location.origin + '/online-enrollment/payment-success';
        paymentFields.ssl_receipt_link_text = "Return to Enrollment";
        
        // Add all payment fields to the form
        Object.keys(paymentFields).forEach(key => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = paymentFields[key];
          form.appendChild(input);
        });
        
        // Add form to page and submit
        document.body.appendChild(form);
        form.submit();
        
        // Clean up the form
        document.body.removeChild(form);
        
        // Show instructions to user
        setTimeout(() => {
          alert('Payment form opened in new tab. Please complete your payment in the new tab, then return here to continue with enrollment.');
          
          // Set up polling to check for payment completion
          const checkPaymentStatus = () => {
            // For now, we'll simulate a successful payment response
            // In a real implementation, you would check with Converge API
            const mockPaymentResponse = {
              ssl_txn_auth_token: 'conv_' + Date.now(),
              ssl_card_number: '4111111111111111',
              ssl_card_type: 'VISA',
              ssl_card_exp: '12/25',
              ssl_txn_id: 'TXN' + Date.now(),
              ssl_approval_code: 'APP' + Date.now(),
              ssl_amount: calculateProratedAmount().toFixed(2),
              success: true
            };
            
            handlePaymentSuccess(mockPaymentResponse);
          };
          
          // Check payment status after 5 seconds (simulating user completing payment)
          setTimeout(checkPaymentStatus, 5000);
        }, 100);
    }
    
  } catch (error) {
    console.error('Error launching Converge Lightbox:', error);
    setErrorMessage('Unable to launch payment form. Please try again later.');
    setIsSubmitting(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!processorInfo) {
      setErrorMessage('Payment processor information not loaded. Please try again.');
      return;
    }
    
    setIsSubmitting(true);
    setErrorMessage('');
    
    // Launch the Converge Lightbox
    launchLightbox();
  };

  // Handle back button
  const handleBack = () => {
    navigate('/contract', { state: { formData } });
  };
  
  if (!formData) {
    return (
      <div className="payment-page">
        <div className="loading">Loading payment information...</div>
      </div>
    );
  }
  
  return (
    <div className="payment-page">
      <style>
        {`
          .due-today {
            background-color: #f8f9fa;
            border: 2px solid #007bff;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
          }
          
          .due-today-amount {
            font-size: 2rem !important;
            font-weight: bold !important;
            color: #007bff !important;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
          }
          
          .due-today .price-label {
            font-size: 1.1rem !important;
            font-weight: 600 !important;
            color: #495057 !important;
          }
        `}
      </style>
    <div className="payment-container">
        <div className="payment-header">
          <h1>Converge Lightbox Payment</h1>
          <p>When you click the "Pay Now" button below, a secure payment form will appear where you can safely enter your credit card information. Your payment will be processed securely by Converge, our payment processor.</p>
            </div>

        <div className="payment-authorization">
          <p><strong>I hereby request and authorize {selectedClub?.name || 'New Mexico Sports and Wellness'} to charge my account via Electronic Funds Transfer on a monthly basis beginning {formData?.membershipStartDate ? formatDateWithoutTimezoneShift(formData.membershipStartDate) : 'the start date'}. The debit will consist of monthly dues plus any other club charges (if applicable) made by myself or other persons included in my membership in accordance with the resignation policy detailed in the Terms and Conditions within this Agreement. The authorization is extended by me to {selectedClub?.name || 'New Mexico Sports and Wellness'} and/or its authorized agents or firms engaged in the business of processing check and charge card debits.</strong></p>
        </div>

        <div className="customer-info">
          <h3>Customer Information</h3>
          <div className="info-row">
            <span className="info-label">Name:</span>
            <span className="info-value">{customerInfo.firstName} {customerInfo.lastName}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Email:</span>
            <span className="info-value">{customerInfo.email}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Phone:</span>
            <span className="info-value">{customerInfo.phone}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Address:</span>
            <span className="info-value">
              {customerInfo.address}, {customerInfo.city}, {customerInfo.state} {customerInfo.zipCode}
            </span>
          </div>
          
          {/* Legal Guardian Information for Junior Memberships */}
          {formData.specialtyMembership === "J" && (formData.guardianFirstName || formData.guardianLastName) && (
            <>
              <div className="info-row guardian-separator">
                <span className="info-label">Legal Guardian:</span>
                <span className="info-value">
                  {formData.guardianFirstName} {formData.guardianLastName}
                  {formData.guardianRelationship && ` (${formData.guardianRelationship})`}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Guardian Email:</span>
                <span className="info-value">{formData.guardianEmail || "Not provided"}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Guardian Phone:</span>
                <span className="info-value">{formData.guardianPhone || "Not provided"}</span>
              </div>
            </>
          )}
        </div>

        <div className="payment-summary">
          <h2>Payment Summary</h2>
          <div className="price-details">
            <div className="price-row due-today">
              <span className="price-label">Due today (prorated):</span>
              <span className="price-value due-today-amount">${calculateProratedAmount().toFixed(2)}</span>
            </div>
            <div className="price-row recurring">
              <span className="price-label">Monthly fee going forward:</span>
              <span className="price-value">${calculateMonthlyAmount().toFixed(2)}/month</span>
            </div>
          </div>
        </div>

        <div className="payment-details">
          <h2>Payment Method</h2>
          <div className="payment-method">
            <div className="payment-method-header">
              <h3>Credit Card</h3>
            </div>
            
            <div className="payment-summary">
              <div className="payment-row">
                <span>Credit Card Number</span>
                <span>Expiration</span>
              </div>
              <div className="payment-row">
                <span>Name on Account</span>
                <span>{customerInfo.firstName} {customerInfo.lastName}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="payment-actions">
              <button 
                type="button" 
            onClick={handleBack}
            className="btn btn-secondary"
                disabled={isSubmitting}
              >
                Back
              </button>
          
              <button 
            type="submit"
                onClick={handleSubmit}
            className="btn btn-primary"
            disabled={isSubmitting || !processorInfo}
              >
            {isSubmitting ? 'Processing...' : 'Pay with Converge'}
              </button>
            </div>
            
        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}

        {paymentSuccess && (
          <div className="success-message">
            <h3>Payment Successful!</h3>
            <p>Your payment has been processed successfully. You will be redirected to the confirmation page shortly.</p>
            </div>
          )}

        <div className="payment-security">
          <p>Your payment information is secure and encrypted</p>
        </div>
      </div>
    </div>
  );
};

export default ConvergeLightboxPayment;
