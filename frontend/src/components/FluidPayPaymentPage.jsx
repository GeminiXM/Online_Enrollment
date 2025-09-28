import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClub } from '../context/ClubContext';
import api from '../services/api.js';
import { generateContractPDFBuffer } from '../utils/contractPDFGenerator.js';
import FluidPayModal from './FluidPayModal.jsx';
import './ConvergePaymentPage.css'; // Reuse the same CSS

const FluidPayPaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedClub } = useClub();
  
  // Data from previous screens
  const [formData, setFormData] = useState(null);
  const [signatureData, setSignatureData] = useState(null);
  const [initialedSections, setInitialedSections] = useState(null);
  
  // FluidPay payment state
  const [fluidPayInfo, setFluidPayInfo] = useState(null);
  const [isLoadingFluidPay, setIsLoadingFluidPay] = useState(false);
  const [fluidPayError, setFluidPayError] = useState('');
  
  // Other state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [paymentResponse, setPaymentResponse] = useState(null);
  const [processorName, setProcessorName] = useState('FLUIDPAY');
  const [processorInfo, setProcessorInfo] = useState(null);
  const [errors, setErrors] = useState({});
  
  // FluidPay modal state
  const [isFluidPayModalOpen, setIsFluidPayModalOpen] = useState(false);

  // Get enrollment data and fetch payment processor info
  useEffect(() => {
    console.log('FluidPayPaymentPage - location.state:', location.state);
    console.log('FluidPayPaymentPage - location.state keys:', location.state ? Object.keys(location.state) : 'null');
    
    if (location.state) {
      const { formData, signatureData, initialedSections } = location.state;
      
      console.log('FluidPayPaymentPage - destructured formData:', formData);
      console.log('FluidPayPaymentPage - destructured signatureData:', signatureData);
      console.log('FluidPayPaymentPage - destructured initialedSections:', initialedSections);
      
      if (formData) {
        console.log('Setting formData in state:', formData);
        setFormData(formData);
        
        // Fetch FluidPay processor info
        const fetchFluidPayInfo = async () => {
          try {
            const clubId = formData.club || selectedClub?.id || "001";
            console.log('Fetching FluidPay info for club:', clubId);
            
            const fluidPayResult = await api.getFluidPayInfo(clubId);
            console.log('FluidPay API result:', fluidPayResult);
            
            if (fluidPayResult && fluidPayResult.success && fluidPayResult.fluidPayInfo) {
              console.log('Setting FluidPay processor info:', fluidPayResult.fluidPayInfo);
              setFluidPayInfo(fluidPayResult.fluidPayInfo);
              setProcessorInfo(fluidPayResult.fluidPayInfo);
            } else {
              throw new Error('FluidPay info not found');
            }
          } catch (error) {
            console.error('Error fetching FluidPay info:', error);
            setFluidPayError('Unable to load FluidPay payment processor. Please contact support.');
          }
        };

        fetchFluidPayInfo();
      }
      
      if (signatureData) {
        console.log('Setting signatureData in state:', signatureData);
        setSignatureData(signatureData);
      }
      
      if (initialedSections) {
        console.log('Setting initialedSections in state:', initialedSections);
        setInitialedSections(initialedSections);
      }
    } else {
      console.error('FluidPayPaymentPage - No location state received, redirecting to enrollment');
      navigate('/enrollment');
    }
  }, [location.state, navigate, selectedClub]);

  // Calculate prorated amount
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

  // Calculate monthly amount
  const calculateMonthlyAmount = () => {
    if (!formData) return 0;
    
    const monthlyDues = parseFloat(formData.monthlyDues || formData.membershipDetails?.monthlyDues || 0);
    const monthlyAddOns = parseFloat(formData.monthlyAddOns || 0);
    
    return monthlyDues + monthlyAddOns;
  };

  // Process FluidPay payment
  const processFluidPayPayment = useCallback(async () => {
    setSubmitError('');
    setFluidPayError('');

    // Open FluidPay modal for real payment processing
    console.log('Opening FluidPay modal for payment processing');
    setIsFluidPayModalOpen(true);
  }, []);

  // Handle FluidPay payment success
  const handleFluidPaySuccess = useCallback(async (paymentResult) => {
    console.log('FluidPay payment successful:', paymentResult);
    
    setIsSubmitting(true);
    setIsFluidPayModalOpen(false);

    try {
      // Check if formData is available, if not try to restore from location.state
      let currentFormData = formData;
      let currentSignatureData = signatureData;
      
      if (!currentFormData && location.state) {
        console.log('Form data missing, attempting to restore from location.state');
        const { formData: restoredFormData, signatureData: restoredSignatureData } = location.state;
        currentFormData = restoredFormData;
        currentSignatureData = restoredSignatureData;
        setFormData(restoredFormData);
        setSignatureData(restoredSignatureData);
        
        if (currentFormData) {
          console.log('Successfully restored form data from location.state');
        } else {
          console.log('No form data found in location.state either');
        }
      }
      
      // Extract last 4 digits from the masked card number (format: "****1111" or "************1111")
      let last4 = '****';
      let maskedCardNumber = '************';
      if (paymentResult.cardNumber) {
        // Extract last 4 digits from masked card number
        last4 = paymentResult.cardNumber.slice(-4);
        maskedCardNumber = '************' + last4; // Ensure 12 asterisks + last 4 digits
      } else if (paymentResult.cardInfo?.last4) {
        last4 = paymentResult.cardInfo.last4;
        maskedCardNumber = '************' + last4;
      }

      // Format the payment data to match database expectations
      const formattedPaymentResponse = {
        processor: 'FLUIDPAY',
        success: true,
        transaction_id: paymentResult.transactionId,
        authorization_code: paymentResult.authorizationCode,
        last4: last4,
        maskedCardNumber: maskedCardNumber, // 12 asterisks + last 4 digits
        cardType: paymentResult.cardType || paymentResult.cardInfo?.type || 'Credit Card',
        expirationDate: paymentResult.expirationDate || '', // Formatted expiration date from backend
        amount: currentFormData ? (parseFloat(currentFormData.totalCollected || 0) || 0).toFixed(2) : "0.00",
        timestamp: new Date().toISOString(),
        vault_token: paymentResult.vaultToken
      };
      
      console.log('Formatted payment response:', formattedPaymentResponse);
      setPaymentResponse(formattedPaymentResponse);
      
      // Complete the enrollment with formatted payment data
      await finishEnrollment(formattedPaymentResponse, currentFormData, currentSignatureData);
    } catch (error) {
      console.error('Error completing enrollment after payment:', error);
      setSubmitError('Payment was successful, but there was an error completing your enrollment. Please contact support.');
      setIsSubmitting(false);
    }
  }, [formData, signatureData, location.state]);

  // Handle FluidPay modal close
  const handleFluidPayModalClose = useCallback(() => {
    setIsFluidPayModalOpen(false);
  }, []);

  // Complete enrollment process
  const finishEnrollment = async (paymentResult, overrideFormData = null, overrideSignatureData = null) => {
    try {
      // Use override data if provided, otherwise use state
      const currentFormData = overrideFormData || formData;
      const currentSignatureData = overrideSignatureData || signatureData;
      
      if (!currentFormData) {
        throw new Error('Form data is missing');
      }

      console.log('Finishing enrollment with data:', {
        hasFormData: !!currentFormData,
        hasSignatureData: !!currentSignatureData,
        hasInitialedSections: !!initialedSections,
        paymentResult: paymentResult
      });

      // Generate contract PDF
      let contractPDF = null;
      try {
        console.log('Generating contract PDF...');
        contractPDF = await generateContractPDFBuffer(currentFormData, currentSignatureData, initialedSections);
        console.log('Contract PDF generated successfully');
      } catch (pdfError) {
        console.error('Error generating contract PDF:', pdfError);
        // Continue without PDF - it can be generated later
      }

      // Prepare enrollment submission data
      const submissionData = {
        ...currentFormData,
        signatureData: currentSignatureData,
        initialedSections: initialedSections,
        selectedClub: selectedClub,
        contractPDF: contractPDF,
        totalCollected: currentFormData.totalCollected || calculateProratedAmount().toString(),
        paymentInfo: {
          processorName: 'FLUIDPAY',
          transactionId: paymentResult.transaction_id,
          authorizationCode: paymentResult.authorization_code,
          last4: paymentResult.maskedCardNumber, // Use the full masked card number (************2156)
          cardType: paymentResult.cardType,
          expirationDate: paymentResult.expirationDate,
          vaultToken: paymentResult.vault_token
        }
      };

      console.log('Submitting enrollment data to database:', submissionData);
      
      // Submit the form data to the database
      const response = await api.post('/enrollment', submissionData);
      
      // Navigate to confirmation page
      navigate('/enrollment-confirmation', { 
        state: { 
          enrollmentData: response.data,
          memberName: `${currentFormData.firstName} ${currentFormData.lastName}`,
          successMessage: `Welcome to ${selectedClub?.name || 'the club'}, ${currentFormData.firstName}! Your enrollment has been successfully submitted.`,
          paymentResponse: paymentResult,
          formData: currentFormData,              
          signatureData: currentSignatureData,     
          initialedSections: initialedSections,
          membershipNumber: response.data.custCode,
          transactionId: response.data.transactionId,
          amountBilled: currentFormData ? (parseFloat(currentFormData.totalCollected || 0) || 0).toFixed(2) : "0.00"
        } 
      });
    } catch (error) {
      console.error('Enrollment submission error:', error);
      setSubmitError('Payment was processed successfully, but there was an error completing your enrollment. Please contact customer support.');
      setIsSubmitting(false);
    }
  };

  // Calculate the 1st of the next month for payment authorization
  const getFirstOfNextMonth = () => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };
  
  if (!formData) {
    return (
      <div className="payment-container">
        <h1>FluidPay Payment Page</h1>
        <div className="payment-layout">
          <div className="payment-summary">
            <h2>No Enrollment Data</h2>
            <p>This page requires enrollment data from the enrollment flow.</p>
            <p>To test this page properly:</p>
            <ol>
              <li>Go to <a href="/enrollment">Enrollment Form</a></li>
              <li>Fill out the form and proceed through the contract</li>
              <li>You'll be directed to this payment page with the proper data</li>
            </ol>
            <div className="form-actions">
              <button 
                type="button" 
                className="primary-button"
                onClick={() => navigate('/enrollment')}
              >
                Go to Enrollment Form
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
          <p className="membership-club">{selectedClub?.name || 'Club'}</p>
          
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
        
        {/* Customer Information Section */}
        <div className="customer-info">
          <h3>Customer Information</h3>
          <div className="info-row">
            <span className="info-label">Name:</span>
            <span className="info-value">{formData?.firstName || ''} {formData?.lastName || ''}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Email:</span>
            <span className="info-value">{formData?.email || ''}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Phone:</span>
            <span className="info-value">{formData?.phone || ''}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Address:</span>
            <span className="info-value">
              {formData?.address || ''}, {formData?.city || ''}, {formData?.state || ''} {formData?.zipCode || ''}
            </span>
          </div>
          
          {/* Legal Guardian Information for Junior Memberships */}
          {formData?.specialtyMembership === "J" && (formData?.guardianFirstName || formData?.guardianLastName) && (
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
        
        <div className="agreement-summary">
          <h3>Agreement</h3>
          <p>You have agreed to the membership terms and conditions with your electronic signature.</p>
          {signatureData?.signature && (
        <div className="signature-preview" style={{ 
              fontFamily: signatureData.selectedFont?.font || signatureData.signature?.font || 'inherit',
              fontSize: '2rem',
              lineHeight: '1.2'
            }}>
              {signatureData.signature?.text || ''}
            </div>
          )}
        </div>
      </div>
      
      <div className="payment-form-container">
        <h2>Payment Information</h2>
        
        {/* Payment Authorization Section */}
        <div className="info-section payment-auth-section">
          <div className="info-row">
            <div className="auth-text">
              I hereby request and authorize {selectedClub?.state === 'NM' ? 'New Mexico Sports and Wellness' : 'Colorado Athletic Club'} to charge my account via Electronic Funds Transfer on a monthly basis beginning {getFirstOfNextMonth()}.
              <br /><br />
              The debit will consist of monthly dues plus any other club charges (if applicable) made by myself or other persons included in my membership in accordance with the resignation policy detailed in the Terms and Conditions within this Agreement. The authorization is extended by me to {selectedClub?.state === 'NM' ? 'New Mexico Sports and Wellness' : 'Colorado Athletic Club'} and/or its authorized agents or firms engaged in the business of processing check and charge card debits.
            </div>
          </div>
        </div>
        
        {/* FluidPay Payment Section */}
        <div className="converge-payment-section">
          <div className="form-header">
            <h4>Secure Payment Processing</h4>
            <p>Your payment will be processed securely through FluidPay's hosted payment page. Your card information is never stored on our servers.</p>
          </div>
          
          {fluidPayError && (
            <div className="error-message">
              <h3>Error</h3>
              <p>{fluidPayError}</p>
            </div>
          )}
          
          {submitError && (
            <div className="error-message">
              <h3>Error</h3>
              <p>{submitError}</p>
            </div>
          )}
          
          <div className="form-actions">
            <button 
              type="button" 
              className="secondary-button"
              onClick={() => navigate(-1)}
            >
              Back
            </button>
            <button 
              type="button" 
              className="primary-button"
              onClick={processFluidPayPayment}
              disabled={isSubmitting || isLoadingFluidPay || !fluidPayInfo}
            >
              {isSubmitting ? "Processing..." : "Process Payment"}
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
        </div>
      </div>
    </div>

    {/* FluidPay Modal */}
    <FluidPayModal
      isOpen={isFluidPayModalOpen}
      onClose={handleFluidPayModalClose}
      onSuccess={handleFluidPaySuccess}
      clubId={formData?.club || selectedClub?.id || "254"}
      amount={parseFloat(calculateProratedAmount().toFixed(2))}
    />
  </div>
  );
};

export default FluidPayPaymentPage;