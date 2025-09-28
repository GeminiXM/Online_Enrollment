import React, { useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useClub } from '../context/ClubContext';
import CanvasContractPDF from './CanvasContractPDF';
import CanvasContractDenverPDF from './CanvasContractDenverPDF';
import { generatePDFBuffer as generatePDFBufferNM } from './CanvasContractPDF';
import { generatePDFBuffer as generatePDFBufferDenver } from './CanvasContractDenverPDF';
import './EnrollmentConfirmation.css';


function EnrollmentConfirmation() {
  const location = useLocation();
  const { enrollmentData, memberName, successMessage, paymentResponse, formData, signatureData, initialedSections, email, amountBilled, membershipNumber, transactionId } = location.state || {};
  const { selectedClub } = useClub();
  
// Debug logging
console.log('EnrollmentConfirmation - location.state:', location.state);
console.log('EnrollmentConfirmation - initialedSections:', initialedSections);
console.log('EnrollmentConfirmation - signatureData:', signatureData);
console.log('EnrollmentConfirmation - amountBilled:', amountBilled);
console.log('EnrollmentConfirmation - amountBilled type:', typeof amountBilled);

  // Format the payment timestamp
  const formatTimestamp = () => {
    // Use the payment timestamp if available, otherwise use current time
    if (paymentResponse?.timestamp) {
      return new Date(paymentResponse.timestamp).toLocaleString();
    }
    // Fallback to current time if no payment timestamp
    const now = new Date();
    return now.toLocaleString();
  };

  // Get last 4 digits of the card
  const getLastFour = () => {
    if (!paymentResponse) return 'XXXX';
    
    // For both CONVERGE and FLUIDPAY, use the last4 field
    // For CONVERGE: last4 contains just the last 4 digits (e.g., "2156")
    // For FLUIDPAY: last4 contains just the last 4 digits (e.g., "2156")
    if (paymentResponse.last4 && paymentResponse.last4.length === 4) {
      return paymentResponse.last4;
    }
    
    // Fallback: try to extract from masked card number if available
    if (paymentResponse.maskedCardNumber && paymentResponse.maskedCardNumber.length >= 4) {
      return paymentResponse.maskedCardNumber.slice(-4);
    }
    
    return 'XXXX';
  };
  
  // Get the card type
  const getCardType = () => {
    if (!paymentResponse) return 'Credit Card';
    
    // For both CONVERGE and FLUIDPAY, use the cardType field
    if (paymentResponse.cardType) {
      return paymentResponse.cardType;
    }
    
    // Fallback for CONVERGE legacy field names
    if (paymentResponse.ssl_card_type) {
      return paymentResponse.ssl_card_type;
    }
    
    return 'Credit Card';
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
      console.log('EnrollmentConfirmation - saveContractAndSendEmail called with:', {
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
            console.log('Generating contract PDF for payment processor:', paymentResponse?.processor);
            const generatePDFBuffer = selectedClub?.state === 'NM' ? generatePDFBufferNM : generatePDFBufferDenver;
            
            const pdfFormData = {
              ...formData,
              membershipId: membershipNumber // Add membership ID to formData
            };
            
            console.log('PDF generation - formData with membershipId:', {
              membershipId: pdfFormData.membershipId,
              membershipNumber,
              hasMembershipId: !!pdfFormData.membershipId
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
            console.log('Contract PDF generated for payment:', {
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
                  'X-Member-Id': `${formData.firstName}_${formData.lastName}`
                },
                body: contractPDFArray,
              });
              
              if (saveResponse.ok) {
                console.log('Contract PDF saved to server successfully');
              } else {
                console.error('Failed to save contract PDF to server');
              }
            } catch (saveError) {
              console.error('Error saving contract PDF to server:', saveError);
            }
          } catch (pdfError) {
            console.error('Error generating contract PDF for payment:', pdfError);
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
        
        console.log('Sending welcome email for:', { firstName, lastName, membershipNumber });
        
        // Generate contract PDF for email
        let emailContractPDFArray = null;
        if (signatureData && initialedSections) {
          try {
            const generatePDFBuffer = selectedClub?.state === 'NM' ? generatePDFBufferNM : generatePDFBufferDenver;
            
            const pdfFormData = {
              ...formData,
              membershipId: membershipNumber
            };
            
            const pdfBuffer = await generatePDFBuffer(
              pdfFormData,
              signatureData,
              formatTimestamp(),
              initialedSections,
              selectedClub,
              formData.membershipDetails?.price || formData.monthlyDues
            );
            
            emailContractPDFArray = Array.from(new Uint8Array(pdfBuffer));
            console.log('Contract PDF generated for email, length:', emailContractPDFArray.length);
          } catch (pdfError) {
            console.error('Error generating contract PDF for email:', pdfError);
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
            console.log('Welcome email sent successfully');
          } else {
            console.error('Failed to send welcome email');
          }
        } catch (emailError) {
          console.error('Error sending welcome email:', emailError);
        }
      } catch (error) {
        console.error('Error in saveContractAndSendEmail:', error);
      }
    };

    saveContractAndSendEmail();
  }, [formData, signatureData, initialedSections, selectedClub, membershipNumber, transactionId, paymentResponse]);

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
                {amountBilled !== undefined && (
                  <div className="receipt-row">
                    <span className="receipt-label">Amount Billed:</span>
                    <span className="receipt-value">${Number(amountBilled).toFixed(2)}</span>
                  </div>
                )}
                <div className="receipt-row">
                  <span className="receipt-label">Card:</span>
                  <span className="receipt-value">{getCardType()} ending in {getLastFour()}</span>
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
                    membershipId: membershipNumber // Add membership ID to formData
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
                    membershipId: membershipNumber // Add membership ID to formData
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
