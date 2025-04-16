import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClub } from '../context/ClubContext';
import SignatureSelector from './SignatureSelector';
import './ContractPage.css';

const ContractPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedClub } = useClub();
  const [formData, setFormData] = useState(null);
  const [signatureData, setSignatureData] = useState({ signature: '', initials: '' });
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [errors, setErrors] = useState({});

  // Get enrollment data passed from previous page
  useEffect(() => {
    if (location.state && location.state.formData) {
      setFormData(location.state.formData);
    } else {
      // If no data, go back to enrollment form
      navigate('/enrollment');
    }
  }, [location, navigate]);

  const handleSignatureChange = (type, value) => {
    setSignatureData(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!signatureData.signature) {
      newErrors.signature = "Please provide your signature";
    }
    
    if (!signatureData.initials) {
      newErrors.initials = "Please provide your initials";
    }
    
    if (!agreeToTerms) {
      newErrors.terms = "You must agree to the terms and conditions";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Continue to payment page with all data
      navigate('/payment', {
        state: {
          formData: formData,
          signatureData: signatureData
        }
      });
    }
  };

  // Determine contract text based on club
  const getContractText = () => {
    // Check if club is in New Mexico (club IDs with NM prefix or codes specified by business)
    const isNewMexicoClub = selectedClub?.id?.toString().includes('NM') || 
                           selectedClub?.state === 'NM';
    
    if (isNewMexicoClub) {
      return newMexicoContractText;
    } else {
      return denverContractText;
    }
  };

  if (!formData) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="contract-container">
      <h1>Membership Agreement</h1>
      
      <div className="member-info-summary">
        <h2>Membership Information</h2>
        <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
        <p><strong>Email:</strong> {formData.email}</p>
        <p><strong>Club:</strong> {selectedClub?.name || 'Unknown'}</p>
        <p><strong>Start Date:</strong> {formData.requestedStartDate}</p>
      </div>
      
      <div className="contract-text">
        <h2>Terms and Conditions</h2>
        <div className="scrollable-text">
          {getContractText()}
        </div>
      </div>
      
      <div className="signature-section">
        <h2>Signature</h2>
        <div className="signature-fields">
          <div className="signature-field">
            <label>Signature: <span className="required">*</span></label>
            <SignatureSelector 
              onChange={(value) => handleSignatureChange('signature', value)}
              name={`${formData.firstName} ${formData.lastName}`}
              type="signature"
            />
            {errors.signature && <div className="error-message">{errors.signature}</div>}
          </div>
          
          <div className="signature-field">
            <label>Initials: <span className="required">*</span></label>
            <SignatureSelector 
              onChange={(value) => handleSignatureChange('initials', value)}
              name={`${formData.firstName.charAt(0)}${formData.lastName.charAt(0)}`}
              type="initials"
            />
            {errors.initials && <div className="error-message">{errors.initials}</div>}
          </div>
        </div>
        
        <div className="terms-agreement">
          <input
            type="checkbox"
            id="agreeToTerms"
            checked={agreeToTerms}
            onChange={(e) => setAgreeToTerms(e.target.checked)}
          />
          <label htmlFor="agreeToTerms">
            I have read and agree to the terms and conditions of this membership agreement. I understand that by checking this box and signing above, I am entering into a legally binding contract.
          </label>
          {errors.terms && <div className="error-message">{errors.terms}</div>}
        </div>
      </div>
      
      <div className="contract-actions">
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
          onClick={handleContinue}
        >
          Continue to Payment
        </button>
      </div>
    </div>
  );
};

// Contract texts
const denverContractText = `
MEMBERSHIP AGREEMENT - WELLBRIDGE DENVER

1. PARTIES: This Agreement is between Wellbridge Club ("Club") and the undersigned member ("Member").

2. MEMBERSHIP: Member agrees to pay all dues and fees associated with the selected membership type. Membership is non-transferable and non-refundable.

3. TERM: This Agreement begins on the start date specified and continues on a month-to-month basis until properly terminated.

4. MONTHLY DUES: Member authorizes Club to charge the payment method on file for monthly dues. Dues are subject to change with 30 days notice.

5. TERMINATION: Member may terminate this Agreement by providing written notice at least 30 days prior to the next billing cycle.

6. RULES & REGULATIONS: Member agrees to abide by all Club rules and regulations, which may be modified at Club's discretion.

7. ASSUMPTION OF RISK: Member acknowledges that use of Club facilities involves inherent risks. Member assumes all risks of injury, illness, or death.

8. WAIVER & RELEASE: Member waives and releases all claims against Club, its owners, employees, and agents for any injury, illness, or death arising from use of Club facilities.

9. HEALTH & MEDICAL CONDITIONS: Member represents that they are in good health and have no medical conditions that would prevent safe exercise.

10. GOVERNING LAW: This Agreement shall be governed by the laws of the State of Colorado.

11. ENTIRE AGREEMENT: This Agreement constitutes the entire understanding between the parties and supersedes all prior agreements.
`;

const newMexicoContractText = `
MEMBERSHIP AGREEMENT - WELLBRIDGE NEW MEXICO

1. PARTIES: This Agreement is between Wellbridge Club ("Club") and the undersigned member ("Member").

2. MEMBERSHIP: Member agrees to pay all dues and fees associated with the selected membership type. Membership is non-transferable and non-refundable.

3. TERM: This Agreement begins on the start date specified and continues on a month-to-month basis until properly terminated.

4. MONTHLY DUES: Member authorizes Club to charge the payment method on file for monthly dues. Dues are subject to change with 30 days notice.

5. TERMINATION: Member may terminate this Agreement by providing written notice at least 30 days prior to the next billing cycle.

6. RULES & REGULATIONS: Member agrees to abide by all Club rules and regulations, which may be modified at Club's discretion.

7. ASSUMPTION OF RISK: Member acknowledges that use of Club facilities involves inherent risks. Member assumes all risks of injury, illness, or death.

8. WAIVER & RELEASE: Member waives and releases all claims against Club, its owners, employees, and agents for any injury, illness, or death arising from use of Club facilities.

9. HEALTH & MEDICAL CONDITIONS: Member represents that they are in good health and have no medical conditions that would prevent safe exercise.

10. CONSUMER RIGHTS: New Mexico residents have certain rights under the New Mexico Health Spa Act. Member may cancel this Agreement within 3 business days of signing for a full refund.

11. GOVERNING LAW: This Agreement shall be governed by the laws of the State of New Mexico.

12. ENTIRE AGREEMENT: This Agreement constitutes the entire understanding between the parties and supersedes all prior agreements.
`;

export default ContractPage;
