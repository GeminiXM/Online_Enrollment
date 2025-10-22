import React, { useEffect, useRef, useCallback } from 'react';
import devLogger from "../utils/devLogger";
import { useLocation } from 'react-router-dom';
import { useClub } from '../context/ClubContext';
import CanvasContractPDF from './CanvasContractPDF';
import CanvasContractDenverPDF from './CanvasContractDenverPDF';
import { generatePDFBuffer as generatePDFBufferNM } from './CanvasContractPDF';
import { generatePDFBuffer as generatePDFBufferDenver } from './CanvasContractDenverPDF';
import './EnrollmentConfirmation.css';


function EnrollmentConfirmation() {
  const location = useLocation();
  const { enrollmentData, memberName, paymentResponse, formData, signatureData, initialedSections, email, amountBilled, membershipNumber, transactionId } = location.state || {};
  const { selectedClub } = useClub();
  
// Debug logging
devLogger.log('EnrollmentConfirmation - location.state:', location.state);
devLogger.log('EnrollmentConfirmation - initialedSections:', initialedSections);
devLogger.log('EnrollmentConfirmation - signatureData:', signatureData);
devLogger.log('EnrollmentConfirmation - amountBilled:', amountBilled);
devLogger.log('EnrollmentConfirmation - amountBilled type:', typeof amountBilled);

  // Format the payment timestamp
  const formatTimestamp = useCallback(() => {
    // Use the payment timestamp if available, otherwise use current time
    if (paymentResponse?.timestamp) {
      return new Date(paymentResponse.timestamp).toLocaleString();
    }
    // Fallback to current time if no payment timestamp
    const now = new Date();
    return now.toLocaleString();
  }, [paymentResponse?.timestamp]);

  // Get last 4 digits of the card (normalized across processors)
  const getLastFour = () => {
    if (!paymentResponse) return 'XXXX';
    if (paymentResponse.card_info?.last_four) return paymentResponse.card_info.last_four;
    if (paymentResponse.last4) return paymentResponse.last4;
    if (paymentResponse.cardNumber) {
      // Handle masked values like ****1111 or 438857******2156
      const onlyDigits = String(paymentResponse.cardNumber).replace(/\D/g, '');
      if (onlyDigits && onlyDigits.length >= 4) return onlyDigits.slice(-4);
      return String(paymentResponse.cardNumber).slice(-4);
    }
    if (paymentResponse.maskedCardNumber) return paymentResponse.maskedCardNumber.slice(-4);
    const cn = paymentResponse.ssl_card_number || paymentResponse.ssl_last4 || '';
    return cn && cn.length >= 4 ? cn.slice(-4) : 'XXXX';
  };
  
  // Get the card type (normalized)
  // const getCardType = () => {
  //   if (!paymentResponse) return 'Credit Card';
  //   if (paymentResponse.cardType) return paymentResponse.cardType;
  //   if (paymentResponse.card_info?.card_type) return paymentResponse.card_info.card_type;
  //   if (paymentResponse.ssl_card_type) return paymentResponse.ssl_card_type;
  //   return 'Credit Card';
  // };

  // Get billed amount with fallbacks (prefer processor amount)
  const getAmountBilled = () => {
    const fromPayment = paymentResponse?.amount;
    if (fromPayment && !isNaN(parseFloat(fromPayment))) return Number(fromPayment).toFixed(2);
    if (amountBilled && !isNaN(parseFloat(amountBilled))) return Number(amountBilled).toFixed(2);
    const fromEnrollment = enrollmentData?.amountBilled;
    if (fromEnrollment && !isNaN(parseFloat(fromEnrollment))) return Number(fromEnrollment).toFixed(2);
    return undefined;
  };

  // Derive Payment Authorization fields for contract PDFs (download buttons)
  const getPaymentBrandUpper = () => {
    const brand = (paymentResponse?.cardType || paymentResponse?.ssl_card_short_description || paymentResponse?.ssl_card_type || paymentResponse?.card?.card_type || '').toString();
    return brand ? brand.toUpperCase() : '';
  };
  const getMaskedCardForPdf = () => {
    const rawNumber = (paymentResponse?.maskedCardNumber || paymentResponse?.cardNumber || paymentResponse?.ssl_card_number || paymentResponse?.card?.masked_card || '').toString();
    const last4 = rawNumber.replace(/\D/g, '').slice(-4);
    return last4 ? `************${last4}` : '';
  };
  const getExpirationForPdf = () => {
    return (paymentResponse?.expirationDate || paymentResponse?.ssl_exp_date || paymentResponse?.card?.expiration_date || formData?.expirationDate || '').toString();
  };
  const getNameOnAccountForPdf = () => {
    const name = (
      paymentResponse?.card?.cardholder_name ||
      paymentResponse?.cardholder ||
      (paymentResponse?.ssl_first_name && paymentResponse?.ssl_last_name
        ? `${paymentResponse.ssl_first_name} ${paymentResponse.ssl_last_name}`
        : '') ||
      paymentResponse?.ssl_cardholder ||
      `${formData?.firstName || ''} ${formData?.lastName || ''}`
    );
    return (name || '').trim();
  };
  
  // // Get transaction ID
  // const getTransactionId = () => {
  //   if (!paymentResponse) return '';
    
  //   if (paymentResponse.processor === 'FLUIDPAY') {
  //     return paymentResponse.transaction_id || '';
  //   } else {
  //     // Handle CONVERGE
  //     return paymentResponse.ssl_txn_id || '';
  //   }
  // };
  
  // // Get authorization code
  // const getAuthCode = () => {
  //   if (!paymentResponse) return '';
    
  //   if (paymentResponse.processor === 'FLUIDPAY') {
  //     return paymentResponse.authorization_code || '';
  //   } else {
  //     // Handle CONVERGE
  //     return paymentResponse.ssl_approval_code || '';
  //   }
  // };

  const hasSavedRef = useRef(false);
  
  useEffect(() => {
    const saveContractAndSendEmail = async () => {
      devLogger.log('EnrollmentConfirmation - saveContractAndSendEmail called with:', {
        hasFormData: !!formData,
        membershipNumber,
        hasSaved: hasSavedRef.current
      });
      
      if (!formData || !membershipNumber || hasSavedRef.current) return;
      hasSavedRef.current = true;

      try {
        // Generate contract PDF for all payments (both Converge and FluidPay)
        let contractPDFArray = null;
        if (signatureData && initialedSections) {
          try {
            devLogger.log('Generating contract PDF for payment processor:', paymentResponse?.processor);
            const generatePDFBuffer = selectedClub?.state === 'NM' ? generatePDFBufferNM : generatePDFBufferDenver;
            
            // Derive payment display details for PDF
            const brand = (paymentResponse?.cardType || paymentResponse?.ssl_card_short_description || paymentResponse?.ssl_card_type || paymentResponse?.card?.card_type || '').toString();
            const rawNumber = (paymentResponse?.maskedCardNumber || paymentResponse?.cardNumber || paymentResponse?.ssl_card_number || paymentResponse?.card?.masked_card || '').toString();
            const last4 = rawNumber.replace(/\D/g, '').slice(-4);
            const maskedNumber = last4 ? `************${last4}` : (rawNumber || '');
            const exp = (paymentResponse?.expirationDate || paymentResponse?.ssl_exp_date || paymentResponse?.card?.expiration_date || formData?.expirationDate || '').toString();

            // Derive name on account from processor response
            // Note: Payment processors don't return cardholder name, so use form data
            const nameOnAccount = (
              paymentResponse?.cardholder_name ||
              paymentResponse?.card?.cardholder_name ||
              paymentResponse?.cardholder ||
              paymentResponse?.ssl_cardholder ||
              `${formData.firstName || ''} ${formData.lastName || ''}`
            ).trim();

            const pdfFormData = {
              ...formData,
              membershipId: membershipNumber,
              paymentMethod: brand ? `Credit Card - ${brand.toUpperCase()}` : 'Credit Card',
              creditCardNumber: maskedNumber,
              expirationDate: exp,
              nameOnAccount,
            };
            
            devLogger.log('PDF generation - formData with membershipId:', {
              membershipId: pdfFormData.membershipId,
              membershipNumber,
              hasMembershipId: !!pdfFormData.membershipId,
              creditCardNumber: pdfFormData.creditCardNumber,
              expirationDate: pdfFormData.expirationDate,
              nameOnAccount: pdfFormData.nameOnAccount,
              paymentMethod: pdfFormData.paymentMethod,
              paymentResponseKeys: Object.keys(paymentResponse || {}),
              paymentResponseExpiration: paymentResponse?.expirationDate,
              paymentResponseSslExp: paymentResponse?.ssl_exp_date
            });
            
            const pdfBuffer = await generatePDFBuffer(
              pdfFormData,
              signatureData,
              formatTimestamp(),
              initialedSections,
              selectedClub,
              formData.membershipDetails?.price || formData.monthlyDues
            );
            
            contractPDFArray = new Uint8Array(pdfBuffer);
            devLogger.log('Contract PDF generated for payment:', {
              size: contractPDFArray.length,
              clubState: selectedClub?.state,
              processor: paymentResponse?.processor
            });
            
            // Save the contract PDF to the server
            try {
              const saveResponse = await fetch('/api/save-contract-pdf', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/pdf',
                  'X-Contract-Id': membershipNumber,
                  'X-Member-Id': `${formData.firstName}_${formData.lastName}`,
                  'X-Club-Id': selectedClub?.id || ''
                },
                body: contractPDFArray,
              });
              
              if (saveResponse.ok) {
                devLogger.log('Contract PDF saved to server successfully');
              } else {
                devLogger.error('Failed to save contract PDF to server');
              }
            } catch (saveError) {
              devLogger.error('Error saving contract PDF to server:', saveError);
            }
          } catch (pdfError) {
            devLogger.error('Error generating contract PDF for payment:', pdfError);
          }
        }

        // Try different ways to access the member data
        const firstName = formData.primaryMember?.firstName || 
                         formData.member?.firstName || 
                         formData.firstName || 
                         '';
        const lastName = formData.primaryMember?.lastName || 
                        formData.member?.lastName || 
                        formData.lastName || 
                        '';
        
        devLogger.log('Sending welcome email for:', { firstName, lastName, membershipNumber });
        
        // Generate contract PDF for email
        let emailContractPDFArray = null;
        if (signatureData && initialedSections) {
          try {
            const generatePDFBuffer = selectedClub?.state === 'NM' ? generatePDFBufferNM : generatePDFBufferDenver;
            
            const brand2 = (paymentResponse?.cardType || paymentResponse?.ssl_card_short_description || paymentResponse?.ssl_card_type || paymentResponse?.card?.card_type || '').toString();
            const rawNumber2 = (paymentResponse?.maskedCardNumber || paymentResponse?.cardNumber || paymentResponse?.ssl_card_number || paymentResponse?.card?.masked_card || '').toString();
            const last42 = rawNumber2.replace(/\D/g, '').slice(-4);
            const maskedNumber2 = last42 ? `************${last42}` : (rawNumber2 || '');
            const exp2 = (paymentResponse?.expirationDate || paymentResponse?.ssl_exp_date || paymentResponse?.card?.expiration_date || formData?.expirationDate || '').toString();

            const nameOnAccount2 = (
              paymentResponse?.cardholder_name ||
              paymentResponse?.card?.cardholder_name ||
              paymentResponse?.cardholder ||
              paymentResponse?.ssl_cardholder ||
              `${formData.firstName || ''} ${formData.lastName || ''}`
            ).trim();

            const pdfFormData = {
              ...formData,
              membershipId: membershipNumber,
              paymentMethod: brand2 ? `Credit Card - ${brand2.toUpperCase()}` : 'Credit Card',
              creditCardNumber: maskedNumber2,
              expirationDate: exp2,
              nameOnAccount: nameOnAccount2,
            };
            
            devLogger.log('Email PDF generation - formData with credit card data:', {
              creditCardNumber: pdfFormData.creditCardNumber,
              expirationDate: pdfFormData.expirationDate,
              nameOnAccount: pdfFormData.nameOnAccount,
              paymentMethod: pdfFormData.paymentMethod,
              paymentResponseKeys: Object.keys(paymentResponse || {}),
              paymentResponseExpiration: paymentResponse?.expirationDate,
              paymentResponseSslExp: paymentResponse?.ssl_exp_date
            });
            
            const pdfBuffer = await generatePDFBuffer(
              pdfFormData,
              signatureData,
              formatTimestamp(),
              initialedSections,
              selectedClub,
              formData.membershipDetails?.price || formData.monthlyDues
            );
            
            emailContractPDFArray = Array.from(new Uint8Array(pdfBuffer));
            devLogger.log('Contract PDF generated for email, length:', emailContractPDFArray.length);
          } catch (pdfError) {
            devLogger.error('Error generating contract PDF for email:', pdfError);
          }
        }

        // Send welcome email with contract attachment
        try {
          const emailResponse = await fetch('/api/enrollment/send-welcome-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              membershipNumber,
              firstName,
              lastName,
              email: formData.email,
              selectedClub,
              transactionId,
              amountBilled,
              formData,
              contractPDF: emailContractPDFArray
            }),
          });
          
          if (emailResponse.ok) {
            devLogger.log('Welcome email sent successfully');
          } else {
            devLogger.error('Failed to send welcome email');
          }
        } catch (emailError) {
          devLogger.error('Error sending welcome email:', emailError);
        }
      } catch (error) {
        devLogger.error('Error in saveContractAndSendEmail:', error);
      }
    };

    saveContractAndSendEmail();
  }, [formData, signatureData, initialedSections, selectedClub, membershipNumber, transactionId, paymentResponse, amountBilled, formatTimestamp]);

  return (
    <div className="enrollment-confirmation">
      <div className="confirmation-container">
                       
                <h1 className="club-name">{selectedClub.name}</h1>
                
             <div className="confirmation-header">
          <h1>Membership Enrollment Confirmation</h1>
          <div className="success-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
            </div>
            
        </div>

        <div className="confirmation-message">
          <h2>Welcome {memberName || 'new member'} to {selectedClub?.name || 'the club'}! You will use Membership #{membershipNumber} to take the next steps in your membership journey.</h2>
        </div>

        <div className="confirmation-details">
          {selectedClub && (
            <div className="club-info">
              {/* <h3>Club Location</h3>
              <p>
                <strong>{selectedClub.name}</strong><br />
                {selectedClub.address}
              </p> */}
            </div>
          )}
          
          {paymentResponse && (
            <div className="payment-confirmation">
              <h3 style={{ textDecoration: 'underline' }}>Payment Receipt</h3>
              <div className="payment-receipt">
                {getAmountBilled() !== undefined && (
                  <div className="receipt-row">
                    <span className="receipt-label">Amount Billed:</span>
                    <span className="receipt-value">${getAmountBilled()}</span>
                  </div>
                )}
                <div className="receipt-row">
                  <span className="receipt-label">Card:</span>
                  <span className="receipt-value">ending in {getLastFour()}</span>
                </div>
                {transactionId && (
                  <div className="receipt-row">
                    <span className="receipt-label">Transaction ID:</span>
                    <span className="receipt-value">{transactionId}</span>
                  </div>
                )}
                <div className="receipt-row">
                  <span className="receipt-label">Date:</span>
                  <span className="receipt-value">{formatTimestamp()}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Status:</span>
                  <span className="receipt-value success">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Approved
                  </span>
                </div>
              </div>
            </div>
          )}

          
          <h3>What's Next?</h3>
          <ul>
            <li>You will receive a confirmation email{email ? ` at ${email}` : ''} with your enrollment details.</li>
            <li>Visit your selected club location, {selectedClub.address} to complete the enrollment process.</li>
            <li>Bring a valid photo ID and any required documentation.</li>
          </ul>
        </div>

        {/* Contract Download Section */}
        {formData && signatureData && (
          <div className="contract-download-section">
            <h3>Your Membership Contract</h3>
            <p>Download your completed membership agreement for your records.</p>
            <div className="contract-download-actions">
              {selectedClub?.state === 'NM' ? (
                <CanvasContractPDF 
                  formData={{
                    ...formData,
                    membershipId: membershipNumber,
                    paymentMethod: getPaymentBrandUpper() ? `Credit Card - ${getPaymentBrandUpper()}` : 'Credit Card',
                    creditCardNumber: getMaskedCardForPdf(),
                    expirationDate: getExpirationForPdf(),
                    nameOnAccount: getNameOnAccountForPdf()
                  }}
                  signatureData={signatureData}
                  signatureDate={formatTimestamp()}
                  initialedSections={initialedSections}
                  selectedClub={selectedClub}
                  membershipPrice={formData.membershipDetails?.price || formData.monthlyDues}
                />
              ) : (
                <CanvasContractDenverPDF 
                  formData={{
                    ...formData,
                    membershipId: membershipNumber,
                    paymentMethod: getPaymentBrandUpper() ? `Credit Card - ${getPaymentBrandUpper()}` : 'Credit Card',
                    creditCardNumber: getMaskedCardForPdf(),
                    expirationDate: getExpirationForPdf(),
                    nameOnAccount: getNameOnAccountForPdf()
                  }}
                  signatureData={signatureData}
                  signatureDate={formatTimestamp()}
                  initialedSections={initialedSections}
                  selectedClub={selectedClub}
                  membershipPrice={formData.membershipDetails?.price || formData.monthlyDues}
                />
              )}
            </div>
          </div>
        )}


      </div>
    </div>
  );
}

export default EnrollmentConfirmation;
