import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClub } from '../context/ClubContext';
import api from '../services/api.js';
import { generateContractPDFBuffer } from '../utils/contractPDFGenerator.js';
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

  // Get enrollment data and fetch payment processor info
  useEffect(() => {
    console.log('ConvergePaymentPage - location.state:', location.state);
    console.log('ConvergePaymentPage - location.state keys:', location.state ? Object.keys(location.state) : 'null');
    
    if (location.state) {
      const { formData, signatureData, initialedSections } = location.state;
      
      console.log('ConvergePaymentPage - destructured formData:', formData);
      console.log('ConvergePaymentPage - destructured signatureData:', signatureData);
      console.log('ConvergePaymentPage - destructured initialedSections:', initialedSections);
      
      if (formData) {
        console.log('Setting formData in state:', formData);
        setFormData(formData);
        
        // Fetch the credit card processor for the club
        const fetchProcessor = async () => {
          try {
            const clubId = formData.club || selectedClub?.id || "001";
            console.log('Fetching CC processor for club:', clubId);
            
            // Set a default processor in case API calls fail
            setProcessorName('CONVERGE'); // Default processor
            
            // First, get the processor name
            const result = await api.getCCProcessorName(clubId);
            console.log('CC processor API result:', result);
            
            if (result && result.success && result.processorName) {
              // Trim any whitespace from the processor name
              const processorToUse = result.processorName.trim();
              console.log('Cleaned processor name:', processorToUse);
              
              // Update state with the cleaned processor name
              setProcessorName(processorToUse);
              
              // Then fetch the appropriate processor info
              if (processorToUse === 'FLUIDPAY') {
                try {
                  console.log('Fetching FluidPay info for club:', clubId);
                  const fluidPayResult = await api.getFluidPayInfo(clubId);
                  console.log('FluidPay API result:', fluidPayResult);
                  
                  if (fluidPayResult && fluidPayResult.success && fluidPayResult.fluidPayInfo) {
                    console.log('Setting FluidPay processor info:', fluidPayResult.fluidPayInfo);
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
                  console.error('Error fetching FluidPay info:', error);
                  setProcessorInfo({
                    merchant_id: 'Demo FluidPay Merchant (Fallback)',
                    fluidpay_base_url: 'https://api.fluidpay.com',
                    fluidpay_api_key: 'pub_31FUYRENhNiAvspejegbLoPD2he'
                  });
                }
              } else {
                // Use CONVERGE as default if not FluidPay
                try {
                  console.log('Fetching Converge info for club:', clubId);
                  const convergeResult = await api.getConvergeInfo(clubId);
                  console.log('Converge API result:', convergeResult);
                  
                  if (convergeResult && convergeResult.success && convergeResult.convergeInfo) {
                    console.log('Setting Converge processor info:', convergeResult.convergeInfo);
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
                  console.error('Error fetching Converge info:', error);
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
              console.log('No processor name returned, using default CONVERGE');
              
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
            console.error('Error in fetchProcessor:', error);
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
        }
        if (initialedSections) {
          setInitialedSections(initialedSections);
        }
    } else {
      // If no data, show a message or redirect to enrollment
      console.log('No enrollment data found. This page requires data from the enrollment flow.');
      // For now, we'll allow the page to load with empty data for testing
      // navigate('/enrollment');
    }
  }, [location.state, navigate, selectedClub]);

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
      console.error('Error creating session token:', err);
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
      console.log('Converge hosted payment script loaded');
    };
    script.onerror = () => {
      console.error('Failed to load Converge hosted payment script');
      setConvergeError('Failed to load payment system. Please refresh and try again.');
    };
    document.head.appendChild(script);

    // Add message listener for Converge postMessage events
    const handleMessage = (event) => {
      console.log("Window message received:", event.data, event.origin);
      
      if (event.origin && event.origin.includes('convergepay.com')) {
        console.log("Message from Converge iframe:", event.data);
        
        if (event.data && event.data.converge === true) {
          const { approved, cancelled, errored, error, response } = event.data;
          
          if (cancelled) {
            console.log("Payment cancelled by user");
            setSubmitError('Payment was cancelled');
            setIsSubmitting(false);
          } else if (errored) {
            console.error("Payment error:", error);
            setSubmitError(`Payment error: ${error || 'Unknown error'}`);
            setIsSubmitting(false);
          } else if (response) {
            console.log("Payment response received:", response);
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
      console.log("handlePaymentResponse called - formData state:", formData);
      console.log("handlePaymentResponse called - signatureData state:", signatureData);
      console.log("handlePaymentResponse called - location.state:", location.state);
      
      // If formData is lost, try to restore it from location.state
      let currentFormData = formData;
      let currentSignatureData = signatureData;
      
      if (!currentFormData && location.state) {
        console.log("FormData lost, restoring from location.state");
        const { formData: restoredFormData, signatureData: restoredSignatureData } = location.state;
        currentFormData = restoredFormData;
        currentSignatureData = restoredSignatureData;
        setFormData(restoredFormData);
        setSignatureData(restoredSignatureData);
      }
      
      const result = response?.data || response || {};
      const approved = !!(result.ssl_approval_code || (result.ssl_result_message && /approved/i.test(result.ssl_result_message)));
      const declined = !!(result.ssl_result_message && /declin/i.test(result.ssl_result_message));
      
      if (approved) {
        console.log("Payment approved:", result);
        // Create payment response for enrollment completion
        // Extract the real vault token - if we don't get one, don't proceed
        const vaultToken = result.ssl_token;
        if (!vaultToken) {
          console.error("No vault token received from Converge - cannot proceed");
          setSubmitError('Payment was approved but no vault token was received. Please contact support.');
          setIsSubmitting(false);
          return;
        }

        // Extract last 4 digits from ssl_card_number (format: "43**********2156")
        let last4 = '****';
        let maskedCardNumber = '************';
        if (result.ssl_card_number && result.ssl_card_number.length >= 4) {
          last4 = result.ssl_card_number.slice(-4);
          maskedCardNumber = '************' + last4; // 12 asterisks + last 4 digits
        }

        // Format expiration date from "1227" to "2027-12-31" (YYYY-MM-DD format, last day of month)
        let formattedExpDate = '';
        if (result.ssl_exp_date && result.ssl_exp_date.length === 4) {
          const month = result.ssl_exp_date.substring(0, 2);
          const year = result.ssl_exp_date.substring(2, 4);
          const fullYear = '20' + year; // Convert YY to YYYY
          
          // Get last day of the month (same logic as database)
          const monthNum = parseInt(month, 10);
          const yearNum = parseInt(fullYear, 10);
          const lastDay = new Date(yearNum, monthNum, 0).getDate();
          
          formattedExpDate = `${fullYear}-${month.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
        }

        const paymentResponse = {
          processor: 'CONVERGE',
          success: true,
          transaction_id: result.ssl_txn_id || 'CONVERGE_' + Date.now(),
          authorization_code: result.ssl_approval_code,
          last4: last4,
          maskedCardNumber: maskedCardNumber, // Full masked card number (************2156)
          cardType: result.ssl_card_short_description || 'Credit Card', // Use ssl_card_short_description (VISA)
          expirationDate: formattedExpDate, // Formatted as MM/01/YYYY
          amount: currentFormData ? (parseFloat(currentFormData.totalCollected || 0) || 0).toFixed(2) : "0.00",
          timestamp: new Date().toISOString(),
          vault_token: vaultToken
        };
        
        console.log("Payment response created:", paymentResponse);
        console.log("Vault token extracted:", paymentResponse.vault_token);
        console.log("Card last4:", paymentResponse.last4);
        console.log("Card type:", paymentResponse.cardType);
        console.log("Expiration date:", paymentResponse.expirationDate);
        
        setPaymentResponse(paymentResponse);
        await finishEnrollment(paymentResponse, currentFormData, currentSignatureData);
      } else if (declined) {
        console.error("Payment declined:", result);
        setSubmitError(`Payment declined: ${result.ssl_result_message || 'Unknown reason'}`);
        setIsSubmitting(false);
      } else {
        console.log("Payment processed with token:", result);
        setSubmitError('Payment processed but status unclear. Please contact support.');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error handling payment response:', error);
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
      console.log("Opening Converge modal with token:", token);
      
      window.PayWithConverge.open(
        { ssl_txn_auth_token: token },
        (result) => {
          console.log("Payment success callback:", result);
          handlePaymentResponse(result);
        },
        (error) => {
          console.error("Payment error/cancel callback:", error);
          setSubmitError('Payment was cancelled or failed');
          setIsSubmitting(false);
        }
      );
    } catch (error) {
      console.error('Error opening Converge modal:', error);
      setSubmitError('Failed to open payment modal');
      setIsSubmitting(false);
    }
  };

  // Complete enrollment after Converge payment
  const finishEnrollment = async (paymentResult, overrideFormData = null, overrideSignatureData = null) => {
    try {
      // Use override data if provided, otherwise use state
      const currentFormData = overrideFormData || formData;
      const currentSignatureData = overrideSignatureData || signatureData;
      
      console.log('finishEnrollment - formData:', currentFormData);
      console.log('finishEnrollment - signatureData:', currentSignatureData);
      console.log('finishEnrollment - selectedClub:', selectedClub);
      
      if (!currentFormData) {
        console.error('finishEnrollment - formData is null, cannot proceed');
        setSubmitError('Missing enrollment data. Please go back and try again.');
        setIsSubmitting(false);
        return;
      }
      
      // Generate membership number
      const membershipNumber = 'M' + Date.now().toString().slice(-8);
      
      // Generate contract PDF buffer
      let contractPDFBuffer = null;
      try {
        const signatureDate = new Date().toLocaleDateString();
        const membershipPrice = currentFormData?.membershipDetails?.price || currentFormData?.monthlyDues || 0;
        
        contractPDFBuffer = await generateContractPDFBuffer(
          currentFormData,
          currentSignatureData,
          signatureDate,
          initialedSections,
          selectedClub,
          membershipPrice
        );
        
        console.log('Contract PDF generated successfully');
      } catch (pdfError) {
        console.error('Error generating contract PDF:', pdfError);
        // Continue without PDF if generation fails
      }

      // Convert ArrayBuffer to array for JSON serialization
      let contractPDFArray = null;
      if (contractPDFBuffer) {
        const uint8Array = new Uint8Array(contractPDFBuffer);
        contractPDFArray = Array.from(uint8Array);
      }

      // Combine all data for submission to database
      console.log('About to create submissionData - formData:', currentFormData);
      console.log('formData keys:', currentFormData ? Object.keys(currentFormData) : 'formData is null');
      
      const submissionData = {
        ...currentFormData,
        // Add signature data
        signatureData: currentSignatureData,
        // Add selected club data
        selectedClub: selectedClub,
        // Add contract PDF as array
        contractPDF: contractPDFArray,
        // Add the correct total amount
        totalCollected: currentFormData ? (parseFloat(currentFormData.totalCollected || 0) || 0).toFixed(2) : "0.00",
        // Add payment data
        paymentInfo: {
          processorName: 'CONVERGE',
          transactionId: paymentResult.transaction_id,
          authorizationCode: paymentResult.authorization_code,
          last4: paymentResult.maskedCardNumber, // Use full masked card number (************2156)
          cardType: paymentResult.cardType,
          expirationDate: paymentResult.expirationDate,
          vaultToken: paymentResult.vault_token
        }
      };

      
      console.log('Submitting enrollment data to database:', submissionData);
      console.log('submissionData.formData keys:', submissionData ? Object.keys(submissionData) : 'submissionData is null');
      console.log('submissionData.firstName:', submissionData?.firstName);
      console.log('submissionData.club:', submissionData?.club);
      
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

  // Process Converge payment
  const processConvergePayment = async () => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // TEST MODE: Skip actual payment and use mock data
      const isTestMode = false; // Set to false for production
      
      if (isTestMode) {
        console.log('TEST MODE: Using mock payment response');
        
        // Create mock payment response for testing
        const mockPaymentResponse = {
          processor: 'CONVERGE',
          success: true,
          transaction_id: 'TEST_CONVERGE_' + Date.now(),
          authorization_code: 'TEST123',
          card_info: {
            last_four: '2156',
            card_type: 'Visa'
          },
          amount: calculateProratedAmount().toFixed(2),
          timestamp: new Date().toISOString(),
          vault_token: 'TEST_VAULT_' + Date.now()
        };
        
        setPaymentResponse(mockPaymentResponse);
        await finishEnrollment(mockPaymentResponse);
        return;
      }
      
      // Production mode: Open the Converge modal
      await openConvergeModal();
      
      // Note: The actual payment processing will happen in the Converge modal
      // and the user will be redirected back to our success/error pages
      
    } catch (error) {
      console.error('Payment processing error:', error);
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
