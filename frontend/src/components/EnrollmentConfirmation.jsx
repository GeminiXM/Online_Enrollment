import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useClub } from '../context/ClubContext';
import CanvasContractPDF from './CanvasContractPDF';
import './EnrollmentConfirmation.css';

function EnrollmentConfirmation() {
  const location = useLocation();
  const { enrollmentData, memberName, successMessage, paymentResponse, formData, signatureData, initialedSections } = location.state || {};
  const { selectedClub } = useClub();
  
// Debug logging
console.log('EnrollmentConfirmation - location.state:', location.state);
console.log('EnrollmentConfirmation - initialedSections:', initialedSections);
console.log('EnrollmentConfirmation - signatureData:', signatureData);

  // Format the payment timestamp
  const formatTimestamp = () => {
    const now = new Date();
    return now.toLocaleString();
  };

  // Get last 4 digits of the card
  const getLastFour = () => {
    if (!paymentResponse) return 'XXXX';
    
    if (paymentResponse.processor === 'FLUIDPAY') {
      return paymentResponse.card_info?.last_four || 'XXXX';
    } else {
      // Handle CONVERGE
      const cardNumber = paymentResponse.ssl_card_number || '';
      return cardNumber.slice(-4) || 'XXXX';
    }
  };
  
  // Get the card type
  const getCardType = () => {
    if (!paymentResponse) return 'Credit Card';
    
    if (paymentResponse.processor === 'FLUIDPAY') {
      return paymentResponse.card_info?.card_type || 'Credit Card';
    } else {
      // Handle CONVERGE
      return paymentResponse.ssl_card_type || 'Credit Card';
    }
  };
  
  // Get transaction ID
  const getTransactionId = () => {
    if (!paymentResponse) return '';
    
    if (paymentResponse.processor === 'FLUIDPAY') {
      return paymentResponse.transaction_id || '';
    } else {
      // Handle CONVERGE
      return paymentResponse.ssl_txn_id || '';
    }
  };
  
  // Get authorization code
  const getAuthCode = () => {
    if (!paymentResponse) return '';
    
    if (paymentResponse.processor === 'FLUIDPAY') {
      return paymentResponse.authorization_code || '';
    } else {
      // Handle CONVERGE
      return paymentResponse.ssl_approval_code || '';
    }
  };

  return (
    <div className="enrollment-confirmation">
      <div className="confirmation-container">
        <div className="confirmation-header">
          <h1>Membership Enrollment Confirmation</h1>
          <div className="success-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </div>
        </div>

        <div className="confirmation-message">
          <h2>{successMessage || `Thank you for enrolling, ${memberName || 'new member'}!`}</h2>
          {/* <p>Your enrollment has been successfully submitted to {selectedClub.name}.</p> */}
        </div>

        <div className="confirmation-details">
          {selectedClub && (
            <div className="club-info">
              <h3>Club Location</h3>
              <p>
                <strong>{selectedClub.name}</strong><br />
                {selectedClub.address}
              </p>
            </div>
          )}
          {paymentResponse && (
            <div className="payment-confirmation">
              <h3>Payment Information</h3>
              <div className="payment-receipt">
                {/* <div className="receipt-row">
                  <span className="receipt-label">Payment Processor:</span>
                  <span className="receipt-value">{paymentResponse.processor || 'Credit Card Processor'}</span>
                </div> */}
                <div className="receipt-row">
                  <span className="receipt-label">Card:</span>
                  <span className="receipt-value">{getCardType()} ending in {getLastFour()}</span>
                </div>
                {/* <div className="receipt-row">
                  <span className="receipt-label">Transaction ID:</span>
                  <span className="receipt-value">{getTransactionId()}</span>
                </div>
                <div className="receipt-row">
                  <span className="receipt-label">Authorization Code:</span>
                  <span className="receipt-value">{getAuthCode()}</span>
                </div> */}
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
            <li>You will receive a confirmation email with your enrollment details.</li>
            <li>Visit your selected club location to complete the enrollment process.</li>
            <li>Bring a valid photo ID and any required documentation.</li>
          </ul>
        </div>

        {/* Contract Download Section */}
        {formData && signatureData && (
          <div className="contract-download-section">
            <h3>Your Membership Contract</h3>
            <p>Download your completed membership agreement for your records.</p>
            <div className="contract-download-actions">
              <CanvasContractPDF 
                formData={formData}
                signatureData={signatureData}
                signatureDate={formatTimestamp()}
                initialedSections={initialedSections}
                selectedClub={selectedClub}
                membershipPrice={formData.membershipDetails?.price || formData.monthlyDues}
              />
            </div>
          </div>
        )}

        <div className="confirmation-actions">
          <Link to="/" className="btn btn-primary">
            Return to Home
          </Link>
          <Link to="/clubs" className="btn btn-secondary">
            Find a Club
          </Link>
        </div>
      </div>
    </div>
  );
}

export default EnrollmentConfirmation;
