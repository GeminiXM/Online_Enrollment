// frontend/src/components/EnrollmentForm.jsx
// This component displays a form to collect user information for a gym membership enrollment.
// It includes form validation, secure data handling, and follows accessibility best practices.

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api.js";
import "./EnrollmentForm.css";

function EnrollmentForm() {
  const navigate = useNavigate();
  
  // Get today's date in YYYY-MM-DD format for the min attribute of date inputs
  const today = new Date().toISOString().split('T')[0];
  
  // State for form data with initial empty values
  // We use a single state object to manage all form fields
  const [formData, setFormData] = useState({
    // Primary member information
    requestedStartDate: "",
    firstName: "",
    middleInitial: "",
    lastName: "",
    address: "",
    address2: "",
    city: "",
    state: "",
    zipCode: "",
    email: "",
    cellPhone: "",
    homePhone: "",
    workPhone: "",
    dateOfBirth: "",
    gender: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });

  // State for form validation errors
  const [errors, setErrors] = useState({});
  
  // State for form submission status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // An array of states in the US for the dropdown
  const states = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", 
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
  ];

  // Gender options for the dropdown
  const genderOptions = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "prefer_not_to_say", label: "Prefer not to say" }
  ];

  // Handler for form field changes
  // This updates the state whenever a form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Update form data
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  // Validate form data
  // Returns true if form is valid, false otherwise
  const validateForm = () => {
    const newErrors = {};
    
    // Validate required fields
    if (!formData.requestedStartDate) newErrors.requestedStartDate = "Requested start date is required";
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.state) newErrors.state = "State is required";
    if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    
    // Validate zip code format (5 digits or 5+4 format)
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(formData.zipCode)) {
      newErrors.zipCode = "Please enter a valid ZIP code (e.g., 12345 or 12345-6789)";
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    // Validate phone number format (optional fields, but validate if provided)
    const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
    
    // Check if at least one phone number is provided
    if (!formData.cellPhone && !formData.homePhone && !formData.workPhone) {
      newErrors.cellPhone = "At least one phone number is required";
    } else {
      // Validate individual phone numbers if provided
      if (formData.cellPhone && !phoneRegex.test(formData.cellPhone)) {
        newErrors.cellPhone = "Please enter a valid phone number";
      }
      
      if (formData.homePhone && !phoneRegex.test(formData.homePhone)) {
        newErrors.homePhone = "Please enter a valid phone number";
      }
      
      if (formData.workPhone && !phoneRegex.test(formData.workPhone)) {
        newErrors.workPhone = "Please enter a valid phone number";
      }
    }
    
    // Validate requested start date
    if (formData.requestedStartDate) {
      const startDate = new Date(formData.requestedStartDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to beginning of day for fair comparison
      
      if (startDate < today) {
        newErrors.requestedStartDate = "Requested start date cannot be in the past";
      }
    }
    
    // Validate date of birth
    if (formData.dateOfBirth) {
      const dobDate = new Date(formData.dateOfBirth);
      const today = new Date();
      
      // Check if date is in the future
      if (dobDate > today) {
        newErrors.dateOfBirth = "Date of birth cannot be in the future";
      }
      
      // Check if user is at least 18 years old
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
      
      if (dobDate > eighteenYearsAgo) {
        newErrors.dateOfBirth = "You must be at least 18 years old to enroll";
      }
    }
    
    // Validate middle initial (if provided)
    if (formData.middleInitial && formData.middleInitial.length > 1) {
      newErrors.middleInitial = "Middle initial should be a single character";
    }
    
    // Validate emergency contact info (if one field is filled, the other should be too)
    if (formData.emergencyContactName && !formData.emergencyContactPhone) {
      newErrors.emergencyContactPhone = "Emergency contact phone is required if name is provided";
    }
    
    if (formData.emergencyContactPhone && !formData.emergencyContactName) {
      newErrors.emergencyContactName = "Emergency contact name is required if phone is provided";
    }
    
    if (formData.emergencyContactPhone && !phoneRegex.test(formData.emergencyContactPhone)) {
      newErrors.emergencyContactPhone = "Please enter a valid phone number";
    }
    
    // Update error state
    setErrors(newErrors);
    
    // Return true if no errors, false otherwise
    return Object.keys(newErrors).length === 0;
  };

  // Handler for form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      // Scroll to the first error
      const firstErrorField = Object.keys(errors)[0];
      document.getElementById(firstErrorField)?.focus();
      return;
    }
    
    // Set submitting state to show loading indicator
    setIsSubmitting(true);
    setSubmitError("");
    
    try {
      // Format data for API submission
      // This helps ensure data is in the correct format before sending to the server
      const formattedData = {
        ...formData,
        // Format phone numbers to remove any non-digit characters
        cellPhone: formData.cellPhone.replace(/\D/g, ""),
        homePhone: formData.homePhone.replace(/\D/g, ""),
        workPhone: formData.workPhone.replace(/\D/g, ""),
        emergencyContactPhone: formData.emergencyContactPhone.replace(/\D/g, ""),
      };
      
      // Send data to the server
      // In a real application, this would be an API call to your backend
      const response = await api.post("/api/enrollment", formattedData);
      
      // Handle successful submission
      console.log("Form submitted successfully:", response.data);
      setSubmitSuccess(true);
      
      // Redirect to confirmation page after successful submission
      // setTimeout(() => {
      //   navigate("/enrollment-confirmation", { state: { enrollmentData: response.data } });
      // }, 2000);
      
    } catch (error) {
      // Handle submission error
      console.error("Error submitting form:", error);
      setSubmitError(
        error.response?.data?.message || 
        "There was an error submitting your enrollment. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // If form was submitted successfully, show success message
  if (submitSuccess) {
    return (
      <div className="enrollment-success">
        <h2>Enrollment Submitted Successfully!</h2>
        <p>Thank you for enrolling with our fitness facility.</p>
        <p>We will contact you shortly with further information.</p>
      </div>
    );
  }

  return (
    <div className="enrollment-container">
      <h1>Membership Enrollment Form</h1>
      <p className="form-instructions">
        Please fill out the form below to enroll in our fitness facility. 
        Fields marked with an asterisk (*) are required.
      </p>
      
      {/* Display submission error if any */}
      {submitError && (
        <div className="error-message form-error">
          {submitError}
        </div>
      )}
      
      <div className="enrollment-layout">
        <form className="enrollment-form" onSubmit={handleSubmit} noValidate>
          <h2>Primary Member Information</h2>
          
          <div className="address-section">
            <div className="form-row start-date-row">
              <div className="form-group date-field">
                <label htmlFor="requestedStartDate">
                  Requested Start Date <span className="required">*</span>
                </label>
                <input
                  type="date"
                  id="requestedStartDate"
                  name="requestedStartDate"
                  value={formData.requestedStartDate}
                  onChange={handleChange}
                  min={today}
                  aria-required="true"
                  aria-invalid={!!errors.requestedStartDate}
                  aria-describedby={errors.requestedStartDate ? "requestedStartDate-error" : undefined}
                />
                {errors.requestedStartDate && (
                  <div id="requestedStartDate-error" className="error-message">
                    {errors.requestedStartDate}
                  </div>
                )}
              </div>
            </div>
            
            <div className="form-row name-row">
              <div className="form-group">
                <label htmlFor="firstName">
                  First Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  aria-required="true"
                  aria-invalid={!!errors.firstName}
                  aria-describedby={errors.firstName ? "firstName-error" : undefined}
                />
                {errors.firstName && (
                  <div id="firstName-error" className="error-message">
                    {errors.firstName}
                  </div>
                )}
              </div>
              
              <div className="form-group middle-initial">
                <label htmlFor="middleInitial">
                  Initial
                </label>
                <input
                  type="text"
                  id="middleInitial"
                  name="middleInitial"
                  value={formData.middleInitial}
                  onChange={handleChange}
                  maxLength="1"
                  aria-invalid={!!errors.middleInitial}
                  aria-describedby={errors.middleInitial ? "middleInitial-error" : undefined}
                />
                {errors.middleInitial && (
                  <div id="middleInitial-error" className="error-message">
                    {errors.middleInitial}
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="lastName">
                  Last Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  aria-required="true"
                  aria-invalid={!!errors.lastName}
                  aria-describedby={errors.lastName ? "lastName-error" : undefined}
                />
                {errors.lastName && (
                  <div id="lastName-error" className="error-message">
                    {errors.lastName}
                  </div>
                )}
              </div>
            </div>
            
            <div className="form-row address-row">
              <div className="form-group address-field">
                <label htmlFor="address">
                  Address <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  aria-required="true"
                  aria-invalid={!!errors.address}
                  aria-describedby={errors.address ? "address-error" : undefined}
                />
                {errors.address && (
                  <div id="address-error" className="error-message">
                    {errors.address}
                  </div>
                )}
              </div>
              
              <div className="form-group address2-field">
                <label htmlFor="address2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  id="address2"
                  name="address2"
                  value={formData.address2}
                  onChange={handleChange}
                  placeholder="Apartment, suite, unit, building, floor, etc."
                />
              </div>
            </div>
            
            <div className="form-row city-state-zip">
              <div className="form-group">
                <label htmlFor="city">
                  City <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  aria-required="true"
                  aria-invalid={!!errors.city}
                  aria-describedby={errors.city ? "city-error" : undefined}
                />
                {errors.city && (
                  <div id="city-error" className="error-message">
                    {errors.city}
                  </div>
                )}
              </div>
              
              <div className="form-group state-select">
                <label htmlFor="state">
                  State <span className="required">*</span>
                </label>
                <select
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  aria-required="true"
                  aria-invalid={!!errors.state}
                  aria-describedby={errors.state ? "state-error" : undefined}
                >
                  <option value="">Select</option>
                  {states.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                {errors.state && (
                  <div id="state-error" className="error-message">
                    {errors.state}
                  </div>
                )}
              </div>
              
              <div className="form-group zip-field">
                <label htmlFor="zipCode">
                  ZIP Code <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="zipCode"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  placeholder="12345 or 12345-6789"
                  aria-required="true"
                  aria-invalid={!!errors.zipCode}
                  aria-describedby={errors.zipCode ? "zipCode-error" : undefined}
                />
                {errors.zipCode && (
                  <div id="zipCode-error" className="error-message">
                    {errors.zipCode}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="form-row dob-gender-row">
            <div className="form-group dob-field">
              <label htmlFor="dateOfBirth">
                Date of Birth <span className="required">*</span>
              </label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                aria-required="true"
                aria-invalid={!!errors.dateOfBirth}
                aria-describedby={errors.dateOfBirth ? "dateOfBirth-error" : undefined}
              />
              {errors.dateOfBirth && (
                <div id="dateOfBirth-error" className="error-message">
                  {errors.dateOfBirth}
                </div>
              )}
            </div>
            
            <div className="form-group gender-field">
              <label htmlFor="gender">
                Gender <span className="required">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                aria-required="true"
                aria-invalid={!!errors.gender}
                aria-describedby={errors.gender ? "gender-error" : undefined}
              >
                <option value="">Select gender</option>
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.gender && (
                <div id="gender-error" className="error-message">
                  {errors.gender}
                </div>
              )}
            </div>
            
            <div className="form-group email-field">
              <label htmlFor="email">
                Email <span className="required">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                aria-required="true"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <div id="email-error" className="error-message">
                  {errors.email}
                </div>
              )}
            </div>
          </div>
          
          <div className="form-row phone-row">
            <div className="form-group">
              <label htmlFor="cellPhone">
                Cell Phone <span className="required">*</span>
              </label>
              <input
                type="tel"
                id="cellPhone"
                name="cellPhone"
                value={formData.cellPhone}
                onChange={handleChange}
                placeholder="(123) 456-7890"
                aria-invalid={!!errors.cellPhone}
                aria-describedby={errors.cellPhone ? "cellPhone-error" : undefined}
              />
              {errors.cellPhone && (
                <div id="cellPhone-error" className="error-message">
                  {errors.cellPhone}
                </div>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="homePhone">Home Phone</label>
              <input
                type="tel"
                id="homePhone"
                name="homePhone"
                value={formData.homePhone}
                onChange={handleChange}
                placeholder="(123) 456-7890"
                aria-invalid={!!errors.homePhone}
                aria-describedby={errors.homePhone ? "homePhone-error" : undefined}
              />
              {errors.homePhone && (
                <div id="homePhone-error" className="error-message">
                  {errors.homePhone}
                </div>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="workPhone">Work Phone</label>
              <input
                type="tel"
                id="workPhone"
                name="workPhone"
                value={formData.workPhone}
                onChange={handleChange}
                placeholder="(123) 456-7890"
                aria-invalid={!!errors.workPhone}
                aria-describedby={errors.workPhone ? "workPhone-error" : undefined}
              />
              {errors.workPhone && (
                <div id="workPhone-error" className="error-message">
                  {errors.workPhone}
                </div>
              )}
            </div>
          </div>
          
          <h2>Emergency Contact Information</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="emergencyContactName">Emergency Contact Name</label>
              <input
                type="text"
                id="emergencyContactName"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
                aria-invalid={!!errors.emergencyContactName}
                aria-describedby={errors.emergencyContactName ? "emergencyContactName-error" : undefined}
              />
              {errors.emergencyContactName && (
                <div id="emergencyContactName-error" className="error-message">
                  {errors.emergencyContactName}
                </div>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="emergencyContactPhone">Emergency Contact Phone</label>
              <input
                type="tel"
                id="emergencyContactPhone"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
                placeholder="(123) 456-7890"
                aria-invalid={!!errors.emergencyContactPhone}
                aria-describedby={errors.emergencyContactPhone ? "emergencyContactPhone-error" : undefined}
              />
              {errors.emergencyContactPhone && (
                <div id="emergencyContactPhone-error" className="error-message">
                  {errors.emergencyContactPhone}
                </div>
              )}
            </div>
          </div>
          
          <div className="form-actions">
            <button 
              type="submit" 
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Enrollment"}
            </button>
          </div>
          
          <div className="privacy-notice">
            <p>
              <strong>Privacy Notice:</strong> The information collected on this form is used solely for the purpose of 
              processing your gym membership enrollment. We adhere to all applicable data protection laws and will not 
              share your personal information with third parties without your consent, except as required by law.
            </p>
          </div>
        </form>
        
        <div className="shopping-cart">
          <h2>Your Membership</h2>
          <div className="cart-items">
            <div className="cart-item">
              <div className="item-details">
                <h3>Standard Membership</h3>
                <p>Monthly access to all gym facilities</p>
                <ul>
                  <li>Unlimited gym access</li>
                  <li>Locker room access</li>
                  <li>Free fitness assessment</li>
                </ul>
              </div>
              <div className="item-price">$49.99/mo</div>
            </div>
            
            <div className="cart-item">
              <div className="item-details">
                <h3>Enrollment Fee</h3>
                <p>One-time registration fee</p>
              </div>
              <div className="item-price">$25.00</div>
            </div>
          </div>
          
          <div className="cart-summary">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>$74.99</span>
            </div>
            <div className="summary-row">
              <span>Tax:</span>
              <span>$6.00</span>
            </div>
            <div className="summary-row total">
              <span>Total Due Today:</span>
              <span>$80.99</span>
            </div>
          </div>
          
          <div className="cart-note">
            <p>Your first monthly payment will be charged on your selected start date.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnrollmentForm; 