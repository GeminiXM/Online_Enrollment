import React from "react";

function LegalGuardianTab({ formData, handleChange, errors }) {
  return (
    <div className="tab-panel">
      <h3>Legal Guardian Information</h3>
      <p className="guardian-notice">
        As this is a Junior membership (under 18), please provide information about the legal guardian.
      </p>
      
      <div className="form-row name-row">
        <div className="form-group">
          <label htmlFor="guardianFirstName">
            First Name <span className="required">*</span>
          </label>
          <input
            type="text"
            id="guardianFirstName"
            name="guardianFirstName"
            value={formData.guardianFirstName || ""}
            onChange={handleChange}
            placeholder="Enter guardian's first name"
            aria-required="true"
            aria-invalid={!!errors.guardianFirstName}
            aria-describedby={errors.guardianFirstName ? "guardianFirstName-error" : undefined}
          />
          {errors.guardianFirstName && (
            <div id="guardianFirstName-error" className="error-message">
              {errors.guardianFirstName}
            </div>
          )}
        </div>
        
        <div className="form-group middle-initial">
          <label htmlFor="guardianMiddleInitial">
            Initial
          </label>
          <input
            type="text"
            id="guardianMiddleInitial"
            name="guardianMiddleInitial"
            value={formData.guardianMiddleInitial || ""}
            onChange={handleChange}
            placeholder="M.I."
            maxLength="1"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="guardianLastName">
            Last Name <span className="required">*</span>
          </label>
          <input
            type="text"
            id="guardianLastName"
            name="guardianLastName"
            value={formData.guardianLastName || ""}
            onChange={handleChange}
            placeholder="Enter guardian's last name"
            aria-required="true"
            aria-invalid={!!errors.guardianLastName}
            aria-describedby={errors.guardianLastName ? "guardianLastName-error" : undefined}
          />
          {errors.guardianLastName && (
            <div id="guardianLastName-error" className="error-message">
              {errors.guardianLastName}
            </div>
          )}
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="guardianRelationship">
            Relationship to Junior Member <span className="required">*</span>
          </label>
          <select
            id="guardianRelationship"
            name="guardianRelationship"
            value={formData.guardianRelationship || ""}
            onChange={handleChange}
            aria-required="true"
            aria-invalid={!!errors.guardianRelationship}
            aria-describedby={errors.guardianRelationship ? "guardianRelationship-error" : undefined}
          >
            <option value="">Select relationship</option>
            <option value="parent">Parent</option>
            <option value="grandparent">Grandparent</option>
            <option value="legal_guardian">Legal Guardian</option>
            <option value="other">Other</option>
          </select>
          {errors.guardianRelationship && (
            <div id="guardianRelationship-error" className="error-message">
              {errors.guardianRelationship}
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="guardianPhone">
            Phone Number <span className="required">*</span>
          </label>
          <input
            type="tel"
            id="guardianPhone"
            name="guardianPhone"
            value={formData.guardianPhone || ""}
            onChange={handleChange}
            placeholder="Enter 10-digit phone number"
            aria-required="true"
            aria-invalid={!!errors.guardianPhone}
            aria-describedby={errors.guardianPhone ? "guardianPhone-error" : undefined}
          />
          {errors.guardianPhone && (
            <div id="guardianPhone-error" className="error-message">
              {errors.guardianPhone}
            </div>
          )}
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="guardianEmail">
            Email <span className="required">*</span>
          </label>
          <input
            type="email"
            id="guardianEmail"
            name="guardianEmail"
            value={formData.guardianEmail || ""}
            onChange={handleChange}
            placeholder="Enter guardian's email"
            aria-required="true"
            aria-invalid={!!errors.guardianEmail}
            aria-describedby={errors.guardianEmail ? "guardianEmail-error" : undefined}
          />
          {errors.guardianEmail && (
            <div id="guardianEmail-error" className="error-message">
              {errors.guardianEmail}
            </div>
          )}
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group consent-checkbox">
          <input
            type="checkbox"
            id="guardianConsent"
            name="guardianConsent"
            checked={formData.guardianConsent || false}
            onChange={(e) => handleChange({
              target: {
                name: e.target.name,
                value: e.target.checked
              }
            })}
            aria-required="true"
            aria-invalid={!!errors.guardianConsent}
            aria-describedby={errors.guardianConsent ? "guardianConsent-error" : undefined}
          />
          <label htmlFor="guardianConsent" className="checkbox-label">
            I confirm that I am the legal guardian of the junior member and I accept all legal responsibilities associated with this membership. I have read and agree to the terms and conditions.
          </label>
          {errors.guardianConsent && (
            <div id="guardianConsent-error" className="error-message">
              {errors.guardianConsent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LegalGuardianTab; 