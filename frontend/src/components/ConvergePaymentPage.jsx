import React, { useState, useEffect } from 'react';
import devLogger from "../utils/devLogger";
import { useNavigate, useLocation } from 'react-router-dom';
import { useClub } from '../context/ClubContext';
import api from '../services/api.js';
import './ConvergePaymentPage.css';

const ConvergePaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedClub } = useClub();
  
  // Data from previous screens
  const [formData, setFormData] = useState(null);
  const [signatureData, setSignatureData] = useState(null);
  const [initialedSections, setInitialedSections] = useState(null);
  
  // Converge payment state
  const [convergeInfo, setConvergeInfo] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [isLoadingConverge, setIsLoadingConverge] = useState(false);
  const [convergeError, setConvergeError] = useState('');
  
  // Other state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [paymentResponse, setPaymentResponse] = useState(null);
  const [processorName, setProcessorName] = useState('');
  const [processorInfo, setProcessorInfo] = useState(null);
  const [errors, setErrors] = useState({});

  // Non-invasive Test Mode flag (off by default). Enable via Vite env or localStorage.
  const isTestMode =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_TEST_MODE === 'true') ||
    (typeof window !== 'undefined' && window.localStorage && localStorage.getItem('TEST_MODE') === 'true');

  // Get enrollment data and fetch payment processor info
  useEffect(() => {
    devLogger.log('ConvergePaymentPage - location.state:', location.state);
    devLogger.log('ConvergePaymentPage - location.state keys:', location.state ? Object.keys(location.state) : 'null');
    
    if (location.state) {
      const { formData, signatureData, initialedSections } = location.state;
      
      devLogger.log('ConvergePaymentPage - destructured formData:', formData);
      devLogger.log('ConvergePaymentPage - destructured signatureData:', signatureData);
      devLogger.log('ConvergePaymentPage - destructured initialedSections:', initialedSections);
      
      if (formData) {
        devLogger.log('Setting formData in state:', formData);
        setFormData(formData);
        try {
          sessionStorage.setItem('enrollment_formData', JSON.stringify(formData));
        } catch (e) {
          devLogger.warn('Failed to persist formData to sessionStorage');
        }
        
        // Fetch the credit card processor for the club
        const fetchProcessor = async () => {
          try {
            const clubId = formData.club || selectedClub?.id || "001";
            devLogger.log('Fetching CC processor for club:', clubId);
            
            // Set a default processor in case API calls fail
            setProcessorName('CONVERGE'); // Default processor
            
            // First, get the processor name
            const result = await api.getCCProcessorName(clubId);
            devLogger.log('CC processor API result:', result);
            
            if (result && result.success && result.processorName) {
              // Trim any whitespace from the processor name
              const processorToUse = result.processorName.trim();
              devLogger.log('Cleaned processor name:', processorToUse);
              
              // Update state with the cleaned processor name
              setProcessorName(processorToUse);
              
              // Then fetch the appropriate processor info
              if (processorToUse === 'FLUIDPAY') {
                try {
                  devLogger.log('Fetching FluidPay info for club:', clubId);
                  const fluidPayResult = await api.getFluidPayInfo(clubId);
                  devLogger.log('FluidPay API result:', fluidPayResult);
                  
                  if (fluidPayResult && fluidPayResult.success && fluidPayResult.fluidPayInfo) {
                    devLogger.log('Setting FluidPay processor info:', fluidPayResult.fluidPayInfo);
                    setProcessorInfo(fluidPayResult.fluidPayInfo);
                  } else {
                    // Set fallback info for FluidPay
                    setProcessorInfo({
                      merchant_id: 'Demo FluidPay Merchant',
                      fluidpay_base_url: 'https://api.fluidpay.com',
                      fluidpay_api_key: 'pub_31FUYRENhNiAvspejegbLoPD2he'
                    });
                  }
                } catch (error) {
                  devLogger.error('Error fetching FluidPay info:', error);
                  setProcessorInfo({
                    merchant_id: 'Demo FluidPay Merchant (Fallback)',
                    fluidpay_base_url: 'https://api.fluidpay.com',
                    fluidpay_api_key: 'pub_31FUYRENhNiAvspejegbLoPD2he'
                  });
                }
              } else {
                // Use CONVERGE as default if not FluidPay
                try {
                  devLogger.log('Fetching Converge info for club:', clubId);
                  const convergeResult = await api.getConvergeInfo(clubId);
                  devLogger.log('Converge API result:', convergeResult);
                  
                  if (convergeResult && convergeResult.success && convergeResult.convergeInfo) {
                    devLogger.log('Setting Converge processor info:', convergeResult.convergeInfo);
                    // Override the URL to use HPP instead of VirtualMerchant
                    const hppInfo = {
                      ...convergeResult.convergeInfo,
                      converge_url_process: 'https://api.convergepay.com/hosted-payments/transaction_token'
                    };
                    setConvergeInfo(hppInfo);
                    setProcessorInfo(hppInfo);
                  } else {
                    // Set fallback info for Converge with HPP URL
                    const fallbackInfo = {
                      merchant_id: '758595',
                      converge_user_id: 'BOSS',
                      converge_url_process: 'https://api.convergepay.com/hosted-payments/transaction_token'
                    };
                    setConvergeInfo(fallbackInfo);
                    setProcessorInfo(fallbackInfo);
                  }
                } catch (error) {
                  devLogger.error('Error fetching Converge info:', error);
                  const fallbackInfo = {
                    merchant_id: '758595',
                    converge_user_id: 'BOSS',
                    converge_url_process: 'https://api.convergepay.com/hosted-payments/transaction_token'
                  };
                  setConvergeInfo(fallbackInfo);
                  setProcessorInfo(fallbackInfo);
                }
              }
            } else {
              // No processor name from API, use default
              devLogger.log('No processor name returned, using default CONVERGE');
              
              try {
                const convergeResult = await api.getConvergeInfo(clubId);
                if (convergeResult && convergeResult.success && convergeResult.convergeInfo) {
                  setConvergeInfo(convergeResult.convergeInfo);
                  setProcessorInfo(convergeResult.convergeInfo);
                } else {
                  const fallbackInfo = {
                    merchant_id: 'Demo Converge Merchant (Default)',
                    converge_user_id: 'webuser',
                    converge_url_process: 'https://api.demo.convergepay.com/VirtualMerchantDemo'
                  };
                  setConvergeInfo(fallbackInfo);
                  setProcessorInfo(fallbackInfo);
                }
              } catch (error) {
                console.error('Error fetching default Converge info:', error);
                const fallbackInfo = {
                  merchant_id: 'Demo Converge Merchant (Fallback)',
                  converge_user_id: 'webuser',
                  converge_url_process: 'https://api.demo.convergepay.com/VirtualMerchantDemo'
                };
                setConvergeInfo(fallbackInfo);
                setProcessorInfo(fallbackInfo);
              }
            }
          } catch (error) {
            devLogger.error('Error in fetchProcessor:', error);
            // Ensure we at least have a processor name and info
            setProcessorName('CONVERGE');
            const fallbackInfo = {
              merchant_id: 'Demo Converge Merchant (Error Fallback)',
              converge_user_id: 'webuser',
              converge_url_process: 'https://api.demo.convergepay.com/VirtualMerchantDemo'
            };
            setConvergeInfo(fallbackInfo);
            setProcessorInfo(fallbackInfo);
          }
        };
        
        fetchProcessor();
      }
      
      if (signatureData) {
        setSignatureData(signatureData);
        try {
          sessionStorage.setItem('enrollment_signatureData', JSON.stringify(signatureData));
        } catch (e) {
          devLogger.warn('Failed to persist signatureData to sessionStorage');
        }
      }
      if (initialedSections) {
        setInitialedSections(initialedSections);
        try {
          sessionStorage.setItem('enrollment_initialedSections', JSON.stringify(initialedSections));
        } catch (e) {
          devLogger.warn('Failed to persist initialedSections to sessionStorage');
        }
      }
    } else {
      // If no data, show a message or redirect to enrollment
      devLogger.log('No enrollment data found. This page requires data from the enrollment flow.');
      // For now, we'll allow the page to load with empty data for testing
      // navigate('/enrollment');
      // Try to rehydrate from sessionStorage to handle HPP callback state loss
      try {
        const storedFormData = sessionStorage.getItem('enrollment_formData');
        const storedSignatureData = sessionStorage.getItem('enrollment_signatureData');
        const storedInitialed = sessionStorage.getItem('enrollment_initialedSections');
        if (storedFormData) setFormData(JSON.parse(storedFormData));
        if (storedSignatureData) setSignatureData(JSON.parse(storedSignatureData));
        if (storedInitialed) setInitialedSections(JSON.parse(storedInitialed));
      } catch (e) {
        devLogger.warn('Failed to rehydrate state from sessionStorage');
      }
    }
  }, [location, navigate, selectedClub]);

  // Calculate prorated amount due now
  const calculateProratedAmount = () => {
    if (!formData) return 0;
    
    // Use the corrected totalCollected value from ContractPage
    const totalCollected = parseFloat(formData.totalCollected || 0);
    
    // If totalCollected is available and correct, use it
    if (totalCollected > 0) {
      return totalCollected;
    }
    
    // Fallback calculation if totalCollected is not available
    const proratedDues = parseFloat(formData.proratedDues || 0);
    const proratedAddOns = parseFloat(formData.proratedAddOns || 0);
    const taxAmount = parseFloat(formData.taxAmount || 0);
    const initiationFee = parseFloat(formData.initiationFee || 19.0); // Use initiationFee from formData
    
    // Add PT package amount if selected (use the corrected amount from formData)
    const ptPackageAmount = parseFloat(formData.ptPackageAmount || 0);
    
    // Calculate total using the corrected values (matching ContractPage calculation)
    const total = initiationFee + proratedDues + proratedAddOns + ptPackageAmount + taxAmount;
    return Math.round(total * 100) / 100;
  };
  
  // Calculate monthly amount going forward (including addons but NOT taxes)
  const calculateMonthlyAmount = () => {
    if (!formData) return 0;
    
    const monthlyDues = parseFloat(formData.monthlyDues || 0);
    const serviceAddons = formData.serviceAddons || [];
    const addonsTotal = serviceAddons.reduce((sum, addon) => sum + parseFloat(addon.price || 0), 0);
    
    // Monthly total includes dues + addons (NO taxes for ongoing monthly fee)
    const monthlyTotal = monthlyDues + addonsTotal;
    
    return monthlyTotal;
  };

  // Create session token for Converge HPP
  const createSessionToken = async () => {
    if (!formData || !convergeInfo) {
      setConvergeError('Missing form data or Converge configuration');
      return null;
    }

    setIsLoadingConverge(true);
    setConvergeError('');

    try {
      const memberData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode
      };

      const response = await api.post(`/payment/converge-hpp/session-token`, {
        amount: calculateProratedAmount().toFixed(2),
        orderId: `ENROLL-${Date.now()}`,
        customerId: `${formData.firstName} ${formData.lastName}`,
        clubId: formData.club || selectedClub?.id || '254',
        addToken: true,
        memberData: memberData
      });

      if (response.data && response.data.ssl_txn_auth_token) {
        setSessionToken(response.data.ssl_txn_auth_token);
        return response.data.ssl_txn_auth_token;
      } else {
        throw new Error('No session token received from server');
      }
    } catch (err) {
      devLogger.error('Error creating session token:', err);
      setConvergeError(err.response?.data?.error || err.message || 'Failed to create payment session');
      return null;
    } finally {
      setIsLoadingConverge(false);
    }
  };

  // Load Converge hosted payment script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://api.convergepay.com/hosted-payments/PayWithConverge.js';
    script.async = true;
    script.onload = () => {
      devLogger.log('Converge hosted payment script loaded');
    };
    script.onerror = () => {
      devLogger.error('Failed to load Converge hosted payment script');
      setConvergeError('Failed to load payment system. Please refresh and try again.');
    };
    document.head.appendChild(script);

    // Add message listener for Converge postMessage events
    const handleMessage = (event) => {
      devLogger.log("Window message received:", event.data, event.origin);
      
      if (event.origin && event.origin.includes('convergepay.com')) {
        devLogger.log("Message from Converge iframe:", event.data);
        
        if (event.data && event.data.converge === true) {
          const { approved, cancelled, errored, error, response } = event.data;
          
          if (cancelled) {
            devLogger.log("Payment cancelled by user");
            setSubmitError('Payment was cancelled');
            setIsSubmitting(false);
          } else if (errored) {
            devLogger.error("Payment error:", error);
            setSubmitError(`Payment error: ${error || 'Unknown error'}`);
            setIsSubmitting(false);
          } else if (response) {
            devLogger.log("Payment response received:", response);
            handlePaymentResponse(response);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      document.head.removeChild(script);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Handle payment response from Converge
  const handlePaymentResponse = async (response) => {
    try {
      const result = response?.data || response || {};
      const approved = !!(result.ssl_approval_code || (result.ssl_result_message && /approved/i.test(result.ssl_result_message)));
      const declined = !!(result.ssl_result_message && /declin/i.test(result.ssl_result_message));
      
      if (approved) {
        devLogger.log("Payment approved:", result);
        // Create mock payment response for enrollment completion
        const mockPaymentResponse = {
          processor: 'CONVERGE',
          success: true,
          transaction_id: result.ssl_transaction_id || 'CONVERGE_' + Date.now(),
          authorization_code: result.ssl_approval_code,
          card_info: {
            last_four: result.ssl_last4 || '****',
            card_type: result.ssl_card_type || 'Credit Card'
          },
          amount: calculateProratedAmount().toFixed(2),
          timestamp: new Date().toISOString(),
          vault_token: result.ssl_token
        };
        
        setPaymentResponse(mockPaymentResponse);
        await finishEnrollment(mockPaymentResponse);
      } else if (declined) {
        devLogger.error("Payment declined:", result);
        setSubmitError(`Payment declined: ${result.ssl_result_message || 'Unknown reason'}`);
        setIsSubmitting(false);
      } else {
        devLogger.log("Payment processed with token:", result);
        setSubmitError('Payment processed but status unclear. Please contact support.');
        setIsSubmitting(false);
      }
    } catch (error) {
      devLogger.error('Error handling payment response:', error);
      setSubmitError('Error processing payment response');
      setIsSubmitting(false);
    }
  };

  // Open Converge HPP modal
  const openConvergeModal = async () => {
    const token = await createSessionToken();
    if (!token) {
      return;
    }

    if (!window.PayWithConverge) {
      setConvergeError('Payment system not loaded. Please refresh and try again.');
      setIsSubmitting(false);
      return;
    }

    try {
      devLogger.log("Opening Converge modal with token:", token);
      
      window.PayWithConverge.open(
        { ssl_txn_auth_token: token },
        (result) => {
          devLogger.log("Payment success callback:", result);
          handlePaymentResponse(result);
        },
        (error) => {
          devLogger.error("Payment error/cancel callback:", error);
          setSubmitError('Payment was cancelled or failed');
          setIsSubmitting(false);
        }
      );
    } catch (error) {
      devLogger.error('Error opening Converge modal:', error);
      setSubmitError('Failed to open payment modal');
      setIsSubmitting(false);
    }
  };

  // Bypass payment for testing without charging a card (only when test mode is enabled)
  const bypassPaymentForTest = async () => {
    try {
      setIsSubmitting(true);
      // Rehydrate if needed; finishEnrollment will also rehydrate
      const mockPaymentResponse = {
        processor: 'CONVERGE',
        success: true,
        transaction_id: 'TEST_' + Date.now(),
        authorization_code: 'TESTAUTH',
        card_info: {
          last_four: '1111',
          card_type: 'Visa',
        },
        amount: calculateProratedAmount().toFixed(2),
        timestamp: new Date().toISOString(),
        vault_token: 'TEST_TOKEN',
      };
      await finishEnrollment(mockPaymentResponse);
    } catch (e) {
      devLogger.error('Bypass payment (test mode) failed:', e);
      setSubmitError('Test mode bypass failed');
      setIsSubmitting(false);
    }
  };

  // Complete enrollment after Converge payment
  const finishEnrollment = async (paymentResult) => {
    try {
      // Rehydrate if state was lost during HPP flow
      let currentFormData = formData;
      let currentSignatureData = signatureData;
      let currentInitialedSections = initialedSections;
      if (!currentFormData || !currentSignatureData || !currentInitialedSections) {
        try {
          if (!currentFormData) {
            const stored = sessionStorage.getItem('enrollment_formData');
            if (stored) currentFormData = JSON.parse(stored);
          }
          if (!currentSignatureData) {
            const stored = sessionStorage.getItem('enrollment_signatureData');
            if (stored) currentSignatureData = JSON.parse(stored);
          }
          if (!currentInitialedSections) {
            const stored = sessionStorage.getItem('enrollment_initialedSections');
            if (stored) currentInitialedSections = JSON.parse(stored);
          }
        } catch (e) {
          devLogger.warn('finishEnrollment: failed to rehydrate from sessionStorage');
        }
      }

      devLogger.log('finishEnrollment - hasFormData:', !!currentFormData);
      devLogger.log('finishEnrollment - hasSignatureData:', !!currentSignatureData);
      devLogger.log('finishEnrollment - hasInitialedSections:', !!currentInitialedSections);
      devLogger.log('finishEnrollment - selectedClub:', selectedClub);
      
      if (!currentFormData) {
        devLogger.error('finishEnrollment - formData is null, cannot proceed');
        setSubmitError('Missing enrollment data. Please go back and try again.');
        setIsSubmitting(false);
        return;
      }
      
      // Generate membership number
      const membershipNumber = 'M' + Date.now().toString().slice(-8);
      
      // Combine all data for submission to database
      const submissionData = {
        ...currentFormData,
        // Add signature data
        signatureData: currentSignatureData,
        // Add selected club data
        selectedClub: selectedClub,
        // Add the correct total amount
        totalCollected: calculateProratedAmount().toFixed(2),
        // Add payment data
        paymentInfo: {
          processorName: 'CONVERGE',
          transactionId: paymentResult.transaction_id,
          authorizationCode: paymentResult.authorization_code,
          last4: paymentResult.card_info?.last_four,
          vaultToken: paymentResult.vault_token
        }
      };

      
      devLogger.log('Submitting enrollment data to database:', submissionData);
      
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
          initialedSections: currentInitialedSections,
          membershipNumber: response.data.custCode,
          transactionId: response.data.transactionId,
          amountBilled: calculateProratedAmount().toFixed(2)
        } 
      });
    } catch (error) {
      devLogger.error('Enrollment submission error:', error);
      setSubmitError('Payment was processed successfully, but there was an error completing your enrollment. Please contact customer support.');
      setIsSubmitting(false);
    }
  };

  // Process Converge payment
  const processConvergePayment = async () => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Open the Converge modal
      await openConvergeModal();
      
      // Note: The actual payment processing will happen in the Converge modal
      // and the user will be redirected back to our success/error pages
      
    } catch (error) {
      devLogger.error('Payment processing error:', error);
      setSubmitError(error.message || 'An error occurred while processing your payment. Please try again.');
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
        <h1>Converge Payment Page</h1>
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
        
        {/* Converge Payment Section */}
        <div className="converge-payment-section">
          <div className="form-header">
            <h4>Secure Payment Processing</h4>
            <p>Your payment will be processed securely through Converge's hosted payment page. Your card information is never stored on our servers.</p>
          </div>
          
          {convergeError && (
            <div className="error-message">
              <h3>Error</h3>
              <p>{convergeError}</p>
            </div>
          )}
          
          {/* Processor details removed from customer view */}
          
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
              onClick={processConvergePayment}
              disabled={isSubmitting || isLoadingConverge || !convergeInfo}
            >
              {isSubmitting || isLoadingConverge ? "Processing..." : "Process Payment"}
            </button>
          {isTestMode && (
            <button
              type="button"
              className="primary-button"
              onClick={bypassPaymentForTest}
              disabled={isSubmitting}
              title="Bypass card processing (Test Mode)"
            >
              Bypass Payment (Test Mode)
            </button>
          )}
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
  </div>
  );
};

export default ConvergePaymentPage;
