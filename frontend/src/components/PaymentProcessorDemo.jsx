import React, { useState, useEffect } from 'react';
import './PaymentProcessorDemo.css';

// Fake test cards for both processors
const TEST_CARDS = {
  fluidpay: [
    { type: "Visa", number: "4111111111111111", cvv: "123", expiry: "12/25", description: "Approved" },
    { type: "Mastercard", number: "5555555555554444", cvv: "321", expiry: "10/26", description: "Approved" },
    { type: "Amex", number: "371449635398431", cvv: "1234", expiry: "05/25", description: "Approved" },
    { type: "Visa", number: "4000000000000002", cvv: "123", expiry: "12/25", description: "Declined" }
  ],
  converge: [
    { type: "Visa", number: "4761739001010010", cvv: "123", expiry: "12/25", description: "Approved" },
    { type: "Mastercard", number: "5424180279791732", cvv: "321", expiry: "10/26", description: "Approved" },
    { type: "Amex", number: "371449635398431", cvv: "1234", expiry: "05/25", description: "Approved" },
    { type: "Visa", number: "4000120000001154", cvv: "123", expiry: "12/25", description: "Declined" }
  ]
};

// Simulated token responses for testing
const TOKEN_RESPONSES = {
  fluidpay: {
    success: {
      token: "fptoken_01ABCDEF1234567890",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      last_four: "1111",
      card_type: "visa"
    },
    error: {
      error: true,
      message: "Invalid card number",
      code: "INVALID_CARD_NUMBER"
    }
  },
  converge: {
    success: {
      ssl_token: "4421912014039990",
      ssl_card_type: "VISA",
      ssl_card_number: "41XXXXXXXXXX1111",
      ssl_exp_date: "1225",
      ssl_token_format: "multi-use",
      ssl_token_response: "SUCCESS",
      ssl_result: "0"
    },
    error: {
      ssl_token_response: "Error",
      ssl_result: "1",
      ssl_result_message: "Invalid card number"
    }
  }
};

// Credit card logos as SVG components
const CardLogos = {
  Visa: () => (
    <svg viewBox="0 0 50 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.264 15.126H15.098L17.635 0.876H21.801L19.264 15.126Z" fill="#00579F"/>
      <path d="M33.602 1.277C32.752 0.904 31.326 0.5 29.564 0.5C25.773 0.5 23.042 2.575 23.023 5.511C22.986 7.711 25.024 8.952 26.573 9.699C28.16 10.464 28.723 10.965 28.714 11.669C28.695 12.743 27.357 13.216 26.121 13.216C24.351 13.216 23.407 12.948 21.932 12.261L21.374 11.982L20.77 15.465C21.76 15.964 23.604 16.404 25.528 16.423C29.564 16.423 32.249 14.385 32.287 11.236C32.305 9.473 31.13 8.101 28.761 6.988C27.347 6.28 26.498 5.798 26.507 5.058C26.507 4.398 27.282 3.719 28.911 3.719C30.261 3.681 31.242 3.996 31.968 4.33L32.361 4.512L32.956 1.143L33.602 1.277Z" fill="#00579F"/>
      <path d="M38.25 10.178C38.57 9.32 39.762 6.105 39.762 6.105C39.743 6.143 40.101 5.194 40.3 4.617L40.582 5.966C40.582 5.966 41.274 9.415 41.425 10.178C40.788 10.178 39.082 10.178 38.25 10.178ZM42.998 0.876H39.78C38.883 0.876 38.176 1.144 37.773 2.099L32.116 15.126H36.171C36.171 15.126 36.822 13.327 36.964 12.948C37.39 12.948 41.028 12.948 41.576 12.948C41.689 13.441 42.045 15.126 42.045 15.126H45.598L42.998 0.876Z" fill="#00579F"/>
      <path d="M12.924 0.876L9.114 10.654L8.678 8.536C7.923 6.086 5.917 3.464 3.684 2.099L7.213 15.107H11.305L17.24 0.876H12.924Z" fill="#00579F"/>
      <path d="M5.955 0.876H0.043L0 1.144C4.634 2.28 7.703 5.094 8.978 8.536L7.703 2.118C7.496 1.163 6.826 0.895 5.955 0.876Z" fill="#FAA61A"/>
    </svg>
  ),
  Mastercard: () => (
    <svg viewBox="0 0 50 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M29.544 26.373H20.457V3.618H29.544V26.373Z" fill="#FF5F00"/>
      <path d="M21.453 15C21.453 10.279 23.61 6.082 27.002 3.618C24.195 1.364 20.647 0 16.776 0C7.514 0 0 6.716 0 15C0 23.284 7.514 30 16.776 30C20.647 30 24.195 28.636 27.002 26.382C23.61 23.914 21.453 19.721 21.453 15Z" fill="#EB001B"/>
      <path d="M50 15C50 23.284 42.486 30 33.224 30C29.353 30 25.805 28.636 23 26.382C26.391 23.917 28.547 19.721 28.547 15C28.547 10.279 26.391 6.082 23 3.618C25.805 1.364 29.353 0 33.224 0C42.486 0 50 6.716 50 15Z" fill="#F79E1B"/>
    </svg>
  ),
  Amex: () => (
    <svg viewBox="0 0 50 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height="30" rx="4" fill="#1F72CD"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M5 16.011L5.416 14.979H7.308L7.724 16.011H9.027L7.199 11.042H5.585L3.772 16.011H5ZM5.756 13.9L6.37 12.11L6.984 13.9H5.756ZM9.518 16.011H10.759V13.06L12.578 16.011H13.835V11.042H12.593V13.866L10.836 11.042H9.518V16.011ZM14.59 16.011H17.649V14.979H15.847V13.978H17.589V12.99H15.847V12.089H17.649V11.042H14.59V16.011ZM19.093 12.089H20.365V16.011H21.623V12.089H22.894V11.042H19.093V12.089ZM22.952 13.527C22.952 14.965 24.019 16.096 25.753 16.096C26.396 16.096 26.877 15.984 27.263 15.786V14.427C26.908 14.709 26.471 14.861 25.95 14.861C24.957 14.861 24.254 14.15 24.254 13.527C24.254 12.886 24.972 12.192 25.935 12.192C26.425 12.192 26.847 12.33 27.263 12.628V11.25C26.892 11.08 26.44 10.983 25.753 10.983C24.034 10.983 22.952 12.114 22.952 13.527ZM34.184 11.042L33.282 14.442L32.349 11.042H31.167L30.235 14.427L29.317 11.042H27.939L29.619 16.011H31L31.773 13.077L32.545 16.011H33.927L35.592 11.042H34.184ZM35.65 16.011H38.709V14.979H36.907V13.978H38.65V12.99H36.907V12.089H38.709V11.042H35.65V16.011ZM41.221 16.011H42.465V12.089H43.736V11.042H39.935V12.089H41.221V16.011ZM46.005 11.973C45.414 11.973 44.985 12.207 44.691 12.474V11.042H43.434V16.011H44.691V13.866C44.691 13.183 45.061 12.961 45.547 12.961C46.064 12.961 46.361 13.243 46.361 13.866V16.011H47.616V13.517C47.616 12.503 47.004 11.973 46.005 11.973Z" fill="white"/>
      <path d="M15.289 18.927H18.242L18.664 17.88H20L18.156 23.027H16.52L14.676 17.88H16.027L15.289 18.927ZM16.633 21.322L17.266 19.464L17.899 21.322H16.633Z" fill="white"/>
      <path d="M23.152 23.027H20.152V17.88H23.152V18.942H21.41V19.964H23.093V20.984H21.41V21.979H23.152V23.027Z" fill="white"/>
      <path d="M26.152 23.027H25.668L23.61 17.88H24.985L26.262 21.516L27.539 17.88H28.773L26.715 23.027H26.152Z" fill="white"/>
    </svg>
  ),
  Discover: () => (
    <svg viewBox="0 0 50 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="50" height="30" rx="4" fill="white"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M48 15C48 22.732 41.732 29 34 29H4C2.895 29 2 28.105 2 27V3C2 1.895 2.895 1 4 1H34C41.732 1 48 7.268 48 15Z" fill="white"/>
      <path d="M32.656 15C32.656 18.184 30.074 20.766 26.891 20.766C23.707 20.766 21.125 18.184 21.125 15C21.125 11.816 23.707 9.234 26.891 9.234C30.074 9.234 32.656 11.816 32.656 15Z" fill="#F27712"/>
      <path d="M3.938 21.609H6.945V8.391H3.938V21.609Z" fill="#F27712"/>
      <path d="M16.305 9.52C15.059 8.789 13.926 8.431 12.594 8.431C10.285 8.431 8.207 9.914 8.207 12.312C8.207 14.332 9.637 15.5 12.082 16.116C13.516 16.489 14.023 16.836 14.023 17.469C14.023 18.142 13.291 18.553 12.062 18.553C10.73 18.553 9.703 18.047 8.891 17.504L8.227 20.173C9.309 20.841 10.566 21.169 11.836 21.181C14.41 21.181 16.508 19.711 16.508 17.016C16.508 14.859 15.004 13.728 12.598 13.125C11.234 12.766 10.691 12.449 10.691 11.806C10.691 11.215 11.293 10.816 12.324 10.816C13.293 10.816 14.27 11.169 15.004 11.57L16.305 9.52V9.52Z" fill="black"/>
      <path d="M17.52 15.043C17.52 18.706 20.305 21.655 24.379 21.655C25.836 21.655 26.934 21.348 28.145 20.638V17.227C27.109 18.223 26.094 18.743 24.766 18.743C22.414 18.743 20.602 17.141 20.602 15.043C20.602 13.052 22.316 11.344 24.731 11.344C26.09 11.344 27.062 11.864 28.145 12.883V9.472C26.969 8.797 25.895 8.435 24.426 8.435C20.41 8.435 17.52 11.332 17.52 15.043Z" fill="black"/>
      <path d="M44.641 16.875L47.324 8.391H44.137L42.582 13.559L40.988 8.391H37.688L40.762 16.789L38.777 21.609H41.883L44.641 16.875Z" fill="black"/>
      <path d="M29.941 21.609H36.66V18.938H32.957V16.313H36.418V13.641H32.957V11.062H36.66V8.391H29.941V21.609Z" fill="black"/>
    </svg>
  )
};

const PaymentProcessorDemo = () => {
  // State for payment form
  const [processor, setProcessor] = useState('fluidpay');
  const [paymentFormData, setPaymentFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: 'John Doe',
    billingZipCode: '12345'
  });
  const [testCardIndex, setTestCardIndex] = useState(0);
  const [tokenResponse, setTokenResponse] = useState(null);
  const [showResponse, setShowResponse] = useState(false);
  const [responseStatus, setResponseStatus] = useState('success');
  const [errors, setErrors] = useState({});
  
  // Update form when test card or processor changes
  useEffect(() => {
    const selectedCard = TEST_CARDS[processor][testCardIndex];
    setPaymentFormData(prev => ({
      ...prev,
      cardNumber: formatCardNumber(selectedCard.number),
      expiryDate: selectedCard.expiry,
      cvv: selectedCard.cvv
    }));
  }, [testCardIndex, processor]);
  
  // Handle processor change
  const handleProcessorChange = (e) => {
    setProcessor(e.target.value);
    setTestCardIndex(0);
    setShowResponse(false);
    setTokenResponse(null);
  };
  
  // Handle test card change
  const handleTestCardChange = (e) => {
    setTestCardIndex(parseInt(e.target.value));
    setShowResponse(false);
    setTokenResponse(null);
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Format card number with spaces
    if (name === 'cardNumber') {
      const formatted = formatCardNumber(value.replace(/\s/g, ''));
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
  
  // Format card number with spaces
  const formatCardNumber = (number) => {
    return number.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
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
  
  // Simulate token request
  const simulateTokenRequest = () => {
    // Check if the current test card is a "decline" card
    const isDecline = TEST_CARDS[processor][testCardIndex].description.toLowerCase().includes('declined');
    
    // Set response status based on card type
    const status = isDecline ? 'error' : 'success';
    setResponseStatus(status);
    
    // Get the appropriate token response
    const response = TOKEN_RESPONSES[processor][status];
    
    // If it's a success response, modify last 4 digits to match test card
    if (status === 'success') {
      const lastFour = paymentFormData.cardNumber.replace(/\D/g, '').slice(-4);
      
      if (processor === 'fluidpay') {
        response.last_four = lastFour;
      } else {
        response.ssl_card_number = `XXXXXXXXXXXX${lastFour}`;
      }
    }
    
    return response;
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate the payment form
    if (!validatePaymentForm()) {
      return;
    }
    
    // Simulate token response
    const response = simulateTokenRequest();
    setTokenResponse(response);
    setShowResponse(true);
  };
  
  // Get formatted title based on processor selection
  const getProcessorTitle = () => {
    if (processor === 'fluidpay') {
      return 'Fluidpay';
    } else {
      return 'Converge (Elavon)';
    }
  };

  // Determine card type based on card number
  const getCardType = () => {
    const number = paymentFormData.cardNumber.replace(/\s/g, '');
    
    // Simple card detection
    if (number.startsWith('4')) {
      return 'visa';
    } else if (number.startsWith('5')) {
      return 'mastercard';
    } else if (number.startsWith('3')) {
      return 'amex';
    } else if (number.startsWith('6')) {
      return 'discover';
    }
    return '';
  };

  // Format card number for display with masking except last 4 digits
  const formatCardNumberDisplay = () => {
    const cardNumber = paymentFormData.cardNumber.replace(/\s/g, '');
    
    if (!cardNumber) return '•••• •••• •••• ••••';
    
    // Mask all but the last four digits
    const lastFour = cardNumber.slice(-4);
    const masked = '•••• '.repeat(3) + lastFour;
    
    return masked;
  };
  
  // Get card logo component
  const getCardLogo = () => {
    const type = getCardType();
    if (type === 'visa') return <CardLogos.Visa />;
    if (type === 'mastercard') return <CardLogos.Mastercard />;
    if (type === 'amex') return <CardLogos.Amex />;
    if (type === 'discover') return <CardLogos.Discover />;
    return null;
  };
  
  return (
      <div className="payment-container" style={{ maxWidth: "350px", padding: "0.5rem" }}>
      <h1 style={{ marginBottom: "0.5rem", fontSize: "1.25rem" }}>Payment Processor Demo</h1>
      
      <div className="processor-selection" style={{ marginBottom: "0.25rem", padding: "0.25rem 0.5rem" }}>
        <label htmlFor="processor">Select Payment Processor:</label>
        <select 
          id="processor" 
          value={processor} 
          onChange={handleProcessorChange}
          className="processor-select"
        >
          <option value="fluidpay">Fluidpay</option>
          <option value="converge">Converge (Elavon)</option>
        </select>
      </div>
      
      <div className="test-card-selection" style={{ marginBottom: "0.25rem", padding: "0.25rem 0.5rem" }}>
        <label htmlFor="testCard">Select Test Card:</label>
        <select 
          id="testCard" 
          value={testCardIndex} 
          onChange={handleTestCardChange}
          className="test-card-select"
        >
          {TEST_CARDS[processor].map((card, index) => (
            <option key={index} value={index}>
              {card.type}: {card.number.slice(-4)} - {card.description}
            </option>
          ))}
        </select>
      </div>
      
      <div className="payment-layout" style={{ gap: "0.5rem" }}>
        <div className="payment-form-container" style={{ padding: "0.5rem" }}>
          <h2 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem", padding: "0 0 0.25rem 0" }}>{getProcessorTitle()} Payment Form</h2>
          
          {/* Credit Card Logos */}
          <div className="credit-card-logos" style={{ marginBottom: "0.25rem", padding: "0.25rem" }}>
            <div className={getCardType() === 'visa' ? 'active' : ''}>
              <CardLogos.Visa />
            </div>
            <div className={getCardType() === 'mastercard' ? 'active' : ''}>
              <CardLogos.Mastercard />
            </div>
            <div className={getCardType() === 'amex' ? 'active' : ''}>
              <CardLogos.Amex />
            </div>
            <div className={getCardType() === 'discover' ? 'active' : ''}>
              <CardLogos.Discover />
            </div>
          </div>
          
          {/* Card Preview */}
          <div className={`card-preview ${getCardType()}`} style={{ height: "110px", marginBottom: "0.25rem" }}>
            <div className="card-chip"></div>
            <div className="card-number-display">
              <span>{formatCardNumberDisplay()}</span>
            </div>
            <div className="card-details-row">
              <div className="card-holder">
                {paymentFormData.nameOnCard || 'CARDHOLDER NAME'}
              </div>
              <div className="card-expiry">
                {paymentFormData.expiryDate || 'MM/YY'}
              </div>
            </div>
            <div className="card-logo">
              {getCardLogo()}
            </div>
          </div>
          
          <form className="payment-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="cardNumber" style={{ fontSize: "0.8rem", marginBottom: "0.1rem" }}>
                Card Number <span className="required">*</span>
              </label>
              <div className="input-icon-container">
                <input
                  type="text"
                  id="cardNumber"
                  name="cardNumber"
                  value={paymentFormData.cardNumber}
                  onChange={handleInputChange}
                  placeholder="**** **** **** ****"
                  maxLength="19"
                  style={{ padding: "0.25rem 0.5rem", height: "28px" }}
                />
                {getCardType() && (
                  <div className="card-type-icon">
                    {getCardLogo()}
                  </div>
                )}
              </div>
              {errors.cardNumber && (
                <div className="error-message" style={{ fontSize: "0.7rem", marginTop: "0.1rem" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  {errors.cardNumber}
                </div>
              )}
            </div>
            
            <div style={{ display: "flex", gap: "5px", margin: 0 }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
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
              
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
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
            </div>
            
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="nameOnCard" style={{ fontSize: "0.8rem", marginBottom: "0.1rem" }}>
                Name on Card <span className="required">*</span>
              </label>
              <input
                type="text"
                id="nameOnCard"
                name="nameOnCard"
                value={paymentFormData.nameOnCard}
                onChange={handleInputChange}
                placeholder="Enter name as it appears on card"
                style={{ padding: "0.25rem 0.5rem", height: "28px" }}
              />
              {errors.nameOnCard && (
                <div className="error-message" style={{ fontSize: "0.7rem", marginTop: "0.1rem" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  {errors.nameOnCard}
                </div>
              )}
            </div>
            
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="billingZipCode" style={{ fontSize: "0.8rem", marginBottom: "0.1rem" }}>
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
            
            <div className="form-actions" style={{ marginTop: "0.5rem" }}>
              <button 
                type="submit" 
                className="primary-button"
                style={{ padding: "0.4rem 1rem", minWidth: "auto" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path>
                </svg>
                Process Payment
              </button>
            </div>
            
            <div className="payment-security-notice" style={{ marginTop: "0.25rem", padding: "0.25rem", fontSize: "0.75rem" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <p style={{ margin: 0 }}>Demo Mode - No actual payments will be processed</p>
            </div>
          </form>
        </div>
        
        {showResponse && (
          <div className="token-response-container">
            <h3>Token Response {responseStatus === 'success' ? '✅' : '❌'}</h3>
            <div className={`token-response ${responseStatus}`}>
              <pre>{JSON.stringify(tokenResponse, null, 2)}</pre>
            </div>
            <div className="token-explanation">
              <p>
                {responseStatus === 'success' 
                  ? "✅ Token generated successfully. This token would be sent to your backend for processing."
                  : "❌ Token generation failed. The user would need to check their card details and try again."}
              </p>
              <p>
                <strong>Note:</strong> In a real implementation:
                {processor === 'fluidpay' 
                  ? " FluidpayJS would securely collect and tokenize the card data."
                  : " Converge Embedded Payments would handle the secure collection of card data."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentProcessorDemo;
