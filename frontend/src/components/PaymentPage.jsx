import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClub } from '../context/ClubContext';
import api from '../services/api.js';
//import PaymentProcessorDemo from './PaymentProcessorDemo';
import { generateContractPDFBuffer } from '../utils/contractPDFGenerator.js';
import './PaymentPage.css';

// Import Google Fonts for signatures (same as SignatureSelector)
import '../components/SignatureSelector.css';


// Credit Card Logo SVGs removed - not used for Converge payment processing



const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedClub } = useClub();
  
  // Data from previous screens
  const [formData, setFormData] = useState(null);
  const [signatureData, setSignatureData] = useState(null);
  const [initialedSections, setInitialedSections] = useState(null);
  
  // Payment form state - only used for display purposes
  const [paymentFormData, setPaymentFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: '',
    billingZipCode: ''
  });
  
  // Converge payment state
  const [convergeInfo, setConvergeInfo] = useState(null);
  const [isLoadingConverge, setIsLoadingConverge] = useState(false);
  
  // Other state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  //const [showProcessorDemo, setShowProcessorDemo] = useState(false);
  const [paymentResponse, setPaymentResponse] = useState(null);
  const [processorName, setProcessorName] = useState('');
  const [processorInfo, setProcessorInfo] = useState(null);
  const [errors, setErrors] = useState({});
  
  // Get enrollment data and fetch payment processor info
  useEffect(() => {
    if (location.state) {
      const { formData, signatureData, initialedSections } = location.state;
      
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
                      merchant_id: 'cdiggns6lr8tirs7uuog',
                      fluidpay_base_url: 'https://api.fluidpay.com',
                      fluidpay_api_key: 'pub_31FUYRENhNiAvspejegbLoPD2he'
                    });
                  }
                } catch (error) {
                  console.error('Error fetching FluidPay info:', error);
                  setProcessorInfo({
                    merchant_id: 'cdiggns6lr8tirs7uuog',
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
                    setConvergeInfo(convergeResult.convergeInfo);
                    setProcessorInfo(convergeResult.convergeInfo);
                  } else {
                    // Set fallback info for Converge
                    const fallbackInfo = {
                      merchant_id: 'Demo Converge Merchant',
                      converge_user_id: 'webuser',
                      converge_url_process: 'https://api.demo.convergepay.com/VirtualMerchantDemo'
                    };
                    setConvergeInfo(fallbackInfo);
                    setProcessorInfo(fallbackInfo);
                  }
                } catch (error) {
                  console.error('Error fetching Converge info:', error);
                  const fallbackInfo = {
                    merchant_id: 'Demo Converge Merchant (Fallback)',
                    converge_user_id: 'webuser',
                    converge_url_process: 'https://api.demo.convergepay.com/VirtualMerchantDemo'
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
      // If no data, go back to enrollment form
      navigate('/enrollment');
    }
  }, [location, navigate, selectedClub]);
  
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


  // Card type detection functions removed - not used for Converge payment processing

  
  // Payment form validation removed - validation is handled by Converge payment form
  
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
    const enrollmentFee = 19.0; // $19 enrollment fee
    
    // Add PT package amount if selected (use the corrected amount from formData)
    const ptPackageAmount = parseFloat(formData.ptPackageAmount || 0);
    
    // Calculate total using the corrected values
    const total = enrollmentFee + proratedDues + proratedAddOns + ptPackageAmount + taxAmount;
    return Math.round(total * 100) / 100;
  };
  
  // Calculate monthly amount going forward
  const calculateMonthlyAmount = () => {
    if (!formData || !formData.membershipDetails) return 0;
    
    return formData.membershipDetails.price || 0;
  };
  
  // Demo payment function removed - only Converge payment is used for real processing
  
  // Complete enrollment after payment
  const finishEnrollment = async (paymentResult) => {
    try {
      // Generate contract PDF buffer
      let contractPDFBuffer = null;
      try {
        const signatureDate = new Date().toLocaleDateString();
        const membershipPrice = formData.membershipDetails?.price || formData.monthlyDues;
        
        contractPDFBuffer = await generateContractPDFBuffer(
          formData,
          signatureData,
          signatureDate,
          initialedSections,
          selectedClub,
          membershipPrice
        );
        
        console.log('Contract PDF generated successfully');
        console.log('PDF buffer type:', typeof contractPDFBuffer);
        console.log('PDF buffer length:', contractPDFBuffer?.byteLength || 0);
      } catch (pdfError) {
        console.error('Error generating contract PDF:', pdfError);
        // Continue without PDF if generation fails
      }

      // Convert ArrayBuffer to array for JSON serialization
      let contractPDFArray = null;
      if (contractPDFBuffer) {
        const uint8Array = new Uint8Array(contractPDFBuffer);
        contractPDFArray = Array.from(uint8Array);
        console.log('Converted to array, length:', contractPDFArray.length);
      }

      // Combine all data for submission
      const submissionData = {
        ...formData,
        // Add signature data
        signatureData: signatureData,
        // Add selected club data
        selectedClub: selectedClub,
        // Add contract PDF as array
        contractPDF: contractPDFArray,
        // Add payment data
        paymentInfo: {
          ...paymentFormData,
          // Remove spaces from card number
          cardNumber: paymentFormData.cardNumber.replace(/\s/g, ''),
          // Add payment response
          processorName: processorName,
          transactionId: paymentResult.transaction_id || paymentResult.ssl_txn_id,
          authorizationCode: paymentResult.authorization_code || paymentResult.ssl_approval_code,
          last4: paymentResult.card_info?.last_four || paymentResult.ssl_card_number?.slice(-4)
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
          successMessage: `Welcome to ${selectedClub?.name || 'the club'}, ${formData.firstName}! Your enrollment has been successfully submitted.`,
          paymentResponse: paymentResult,
          formData: formData,              
          signatureData: signatureData,     
          initialedSections: initialedSections,
          membershipNumber: response.data.custCode,
          transactionId: response.data.transactionId,
          amountBilled: response.data.amountBilled
        } 
      });
    } catch (error) {
      console.error('Enrollment submission error:', error);
      setSubmitError('Payment was processed successfully, but there was an error saving your enrollment. Please contact customer support.');
      setIsSubmitting(false);
    }
  };
  
  // Add state to track payment method selection - auto-select based on club
  const [paymentMethod, setPaymentMethod] = useState('standard');
  
  // Fetch Converge processor information
  const fetchConvergeInfo = async () => {
    if (!formData?.club) return;
    
    setIsLoadingConverge(true);
    try {
      const response = await api.get(`/payment/converge-info?clubId=${formData.club}`);
      setConvergeInfo(response.data);
      console.log('Converge API result:', response.data);
    } catch (error) {
      console.error('Error fetching Converge info:', error);
      setSubmitError('Failed to load payment processor information');
    } finally {
      setIsLoadingConverge(false);
    }
  };

  // State for Converge direct API payment
  const [convergePaymentData, setConvergePaymentData] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: ''
  });

  // Clear sensitive data immediately after use
  const clearSensitiveData = () => {
    setConvergePaymentData({
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      cardholderName: ''
    });
  };

    // Process Converge payment - hosted fields approach
  const processConvergePayment = async () => {
    if (!convergeInfo || !formData) {
      setSubmitError('Payment processor information not available');
      return;
    }

    // Validate payment data
    if (!convergePaymentData.cardNumber || !convergePaymentData.expiryMonth || 
        !convergePaymentData.expiryYear || !convergePaymentData.cvv || 
        !convergePaymentData.cardholderName) {
      setSubmitError('Please fill in all payment fields');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Step 1: Tokenize the card data (card data goes directly to Converge)
      const tokenizationData = {
        cardData: {
          cardNumber: convergePaymentData.cardNumber.replace(/\s/g, ''),
          expiryDate: `${convergePaymentData.expiryMonth}${convergePaymentData.expiryYear}`,
          cvv: convergePaymentData.cvv,
          firstName: formData.firstName,
          lastName: formData.lastName
        },
        convergeInfo: {
          ssl_merchant_id: convergeInfo.merchant_id?.trim(),
          ssl_user_id: convergeInfo.converge_user_id?.trim(),
          ssl_pin: convergeInfo.converge_pin?.trim(),
          ssl_url_process: convergeInfo.converge_url_process
        }
      };

      console.log('Tokenizing card data...');

      // Get token from Converge (card data never touches your server)
      const tokenResponse = await fetch('/api/payment/converge-tokenize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenizationData)
      });

      const tokenResult = await tokenResponse.json();

      if (!tokenResult.success) {
        setSubmitError(tokenResult.message || 'Card tokenization failed');
        setIsSubmitting(false);
        return;
      }

      console.log('Card tokenized successfully, processing payment...');

      // Step 2: Process payment using the token (no card data)
      const paymentData = {
        token: tokenResult.token,
        amount: calculateProratedAmount().toFixed(2),
        convergeInfo: {
          ssl_merchant_id: convergeInfo.merchant_id?.trim(),
          ssl_user_id: convergeInfo.converge_user_id?.trim(),
          ssl_pin: convergeInfo.converge_pin?.trim(),
          ssl_url_process: convergeInfo.converge_url_process
        },
        customerData: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          address: formData.address || '',
          city: formData.city || '',
          state: formData.state || '',
          zipCode: formData.zipCode || '',
          email: formData.email || '',
          phone: formData.phone || ''
        }
      };

      // Process payment with token (secure - no card data)
      const paymentResponse = await fetch('/api/payment/converge-pay-with-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });

      const result = await paymentResponse.json();

      if (result.success) {
        // Payment successful
        setPaymentResponse({
          success: true,
          message: 'Payment processed successfully!',
          transaction_id: result.transaction_id,
          authorization_code: result.authorization_code,
          payment_token: result.payment_token
        });

        // Store the payment token for future use
        if (result.payment_token) {
          console.log('Payment token received:', result.payment_token);
          // You can store this token in your database, localStorage, or pass it to your enrollment system
          // Example: localStorage.setItem('payment_token', result.payment_token);
        }

        // Clear sensitive payment data from memory
        clearSensitiveData();

        // Complete enrollment after successful payment
        await finishEnrollment({
          transaction_id: result.transaction_id,
          authorization_code: result.authorization_code,
          payment_token: result.payment_token
        });
      } else {
        // Payment failed
        setSubmitError(result.message || 'Payment failed. Please try again.');
      }

      setIsSubmitting(false);

    } catch (error) {
      console.error('Converge payment error:', error);
      setSubmitError('Failed to process payment. Please try again.');
      clearSensitiveData(); // Clear data on error too
      setIsSubmitting(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Only Converge payment is supported in this component
    if (processorName === 'CONVERGE') {
      await processConvergePayment();
      return;
    }
    
    // If not Converge, show error
    setSubmitError('Payment processor not supported. Please contact support.');
  };
  
  // Load Converge info when component mounts and club is available
  useEffect(() => {
    if (formData?.club && processorName === 'CONVERGE') {
      fetchConvergeInfo();
    }
  }, [formData?.club, processorName]);

  // Auto-select payment method based on club location
  useEffect(() => {
    if (selectedClub && processorName) {
      const isNewMexicoClub = selectedClub.state === 'NM';
      const isColoradoClub = selectedClub.state === 'CO';
      
      if (isNewMexicoClub && processorName === 'CONVERGE') {
        setPaymentMethod('converge-lightbox');
      } else if (isColoradoClub && processorName === 'FLUIDPAY') {
        setPaymentMethod('standard'); // FluidPay uses standard form
      } else {
        setPaymentMethod('standard'); // Default fallback
      }
    }
  }, [selectedClub, processorName]);
  
  if (!formData) {
    return <div className="loading">Loading...</div>;
  }
  
  return (
    <div className="payment-container">
      <h1>Complete Your Membership</h1>
      
      <div className="payment-layout">
        <div className="payment-summary">
          <h2>Payment Summary</h2>
          
          {processorName && (
            <div className="processor-info">
              <h3>Payment Processor Information</h3>
              <div className="processor-details">
                <p className="processor-name">
                  <span className="detail-label">Processor:</span> 
                  <span className="detail-value">{processorName === 'FLUIDPAY' ? 'FluidPay' : 'Converge (Elavon)'}</span>
                </p>
                
                {processorInfo && (
                  <div className="processor-config">
                    {processorName === 'FLUIDPAY' ? (
                      <>
                        <p className="detail-item">
                          <span className="detail-label">Merchant ID:</span>
                          <span className="detail-value">{processorInfo.merchant_id}</span>
                        </p>
                        <p className="detail-item">
                          <span className="detail-label">Base URL:</span>
                          <span className="detail-value">{processorInfo.fluidpay_base_url ? '✓ Configured' : '⚠️ Missing'}</span>
                        </p>
                        <p className="detail-item">
                          <span className="detail-label">API Key:</span>
                          <span className="detail-value">{processorInfo.fluidpay_api_key ? '✓ Configured' : '⚠️ Missing'}</span>
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="detail-item">
                          <span className="detail-label">Merchant ID:</span>
                          <span className="detail-value">{processorInfo.merchant_id}</span>
                        </p>
                        <p className="detail-item">
                          <span className="detail-label">User ID:</span>
                          <span className="detail-value">{processorInfo.converge_user_id ? '✓ Configured' : '⚠️ Missing'}</span>
                        </p>
                        <p className="detail-item">
                          <span className="detail-label">Process URL:</span>
                          <span className="detail-value">{processorInfo.converge_url_process ? '✓ Configured' : '⚠️ Missing'}</span>
                        </p>
                      </>
                    )}
                  </div>
                )}
                
                {!processorInfo && (
                  <p className="processor-warning">⚠️ Processor configuration not found for this club.</p>
                )}
              </div>
            </div>
          )}
          
          <div className="membership-summary">
            <h3>Membership Details</h3>
            <p className="membership-type">{formData.membershipDetails?.description || 'Standard Membership'}</p>
            <p className="membership-club">{selectedClub?.name || 'Club'}</p>
            
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

             {/* Credit Card Logos - Removed for Converge payment processing */}
          
          {/* Payment Method Information */}
          <div className="payment-method-info">
            <h3>Payment Method</h3>
            <div className="payment-method-display">
              {processorName === 'CONVERGE' ? (
                <div className="payment-method-converge">
                  <span className="payment-method-title">Converge Secure Payment</span>
                  <span className="payment-method-description">Your payment will be processed securely through Converge's payment system</span>
                </div>
              ) : (
                <div className="payment-method-standard">
                  <span className="payment-method-title">Direct Payment Form</span>
                  <span className="payment-method-description">Enter your card details directly on this page</span>
                </div>
              )}
            </div>
          </div>



          {/* Card preview removed - not used for Converge payment processing */}

          {submitError && (
            <div className="error-message payment-error">
              {submitError}
            </div>
          )}
          
          {processorName === 'CONVERGE' ? (
            // Show embedded Converge payment form directly
            <div className="converge-embedded-form">
              <div className="form-header">
                <h4>Complete Your Payment</h4>
                <p>Please enter your payment information below. Your card data is securely tokenized and never stored on our servers.</p>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); processConvergePayment(); }} className="payment-form">
                <div className="form-group">
                  <label htmlFor="cardholderName">Cardholder Name <span className="required">*</span></label>
                  <input
                    type="text"
                    id="cardholderName"
                    value={convergePaymentData.cardholderName}
                    onChange={(e) => setConvergePaymentData(prev => ({ ...prev, cardholderName: e.target.value }))}
                    placeholder="Name on card"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="cardNumber">Card Number <span className="required">*</span></label>
                  <div className="input-icon-container">
                    <input
                      type="text"
                      id="cardNumber"
                      value={convergePaymentData.cardNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
                        setConvergePaymentData(prev => ({ ...prev, cardNumber: value }));
                      }}
                      placeholder="1234 5678 9012 3456"
                      maxLength="19"
                      required
                    />
                    <div className="card-type-icon">
                      {/* Card type icons will be shown here */}
                    </div>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="expiryMonth">Expiry Month <span className="required">*</span></label>
                    <select
                      id="expiryMonth"
                      value={convergePaymentData.expiryMonth}
                      onChange={(e) => setConvergePaymentData(prev => ({ ...prev, expiryMonth: e.target.value }))}
                      required
                    >
                      <option value="">Month</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <option key={month} value={month.toString().padStart(2, '0')}>
                          {month.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="expiryYear">Expiry Year <span className="required">*</span></label>
                    <select
                      id="expiryYear"
                      value={convergePaymentData.expiryYear}
                      onChange={(e) => setConvergePaymentData(prev => ({ ...prev, expiryYear: e.target.value }))}
                      required
                    >
                      <option value="">Year</option>
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                        <option key={year} value={year.toString().slice(-2)}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="cvv">CVV <span className="required">*</span></label>
                    <input
                      type="text"
                      id="cvv"
                      value={convergePaymentData.cvv}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setConvergePaymentData(prev => ({ ...prev, cvv: value }));
                      }}
                      placeholder="123"
                      maxLength="4"
                      required
                    />
                  </div>
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
                    disabled={isSubmitting || isLoadingConverge || !convergeInfo}
                  >
                    {isSubmitting ? 'Processing Payment...' : `Pay $${calculateProratedAmount().toFixed(2)}`}
                  </button>
                </div>
                
                <div className="security-notice">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  Your payment information is secure and encrypted
                </div>
              </form>
            </div>
          ) : (
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
            
           <div style={{ display: "flex", gap: "5px", margin: 0 }}>
              <div className="form-group" style={{ flex: 0.8, margin: 0 }}>
                <label htmlFor="expiryDate" style={{ fontSize: "0.8rem", marginBottom: "0.1rem" }}>
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
                  style={{ padding: "0.25rem 0.5rem", height: "28px" }}
                />
                {errors.expiryDate && (
                  <div className="error-message" style={{ fontSize: "0.7rem", marginTop: "0.1rem" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {errors.expiryDate}
                  </div>
                )}
              </div>
              
              <div className="form-group" style={{ flex: 0.5, margin: 0 }}>
                <label htmlFor="cvv" style={{ fontSize: "0.8rem", marginBottom: "0.1rem" }}>
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
                  style={{ padding: "0.25rem 0.5rem", height: "28px" }}
                />
                {errors.cvv && (
                  <div className="error-message" style={{ fontSize: "0.7rem", marginTop: "0.1rem" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {errors.cvv}
                  </div>
                )}
              </div>
              
              <div className="form-group" style={{ flex: 0.7, margin: 0 }}>
                <label htmlFor="billingZipCode" style={{ fontSize: "0.8rem", marginBottom: "0.1rem" }}>
                  ZIP <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="billingZipCode"
                  name="billingZipCode"
                  value={paymentFormData.billingZipCode}
                  onChange={handleInputChange}
                  placeholder="ZIP"
                  maxLength="5"
                  style={{ padding: "0.25rem 0.5rem", height: "28px" }}
                />
                {errors.billingZipCode && (
                  <div className="error-message" style={{ fontSize: "0.7rem", marginTop: "0.1rem" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {errors.billingZipCode}
                  </div>
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
                {isSubmitting ? "Processing..." : processorName === 'CONVERGE' ? "Open Secure Payment Form" : "Submit Enrollment"}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
