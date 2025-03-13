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
  
  // State for active tab
  const [activeTab, setActiveTab] = useState('members');
  
  // State for form data with initial empty values
  // We use a single state object to manage all form fields
  const [formData, setFormData] = useState({
    // Primary Member Information
    requestedStartDate: "",
    firstName: "",
    middleInitial: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    email: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zipCode: "",
    cellPhone: "",
    homePhone: "",
    workPhone: "",
    
    // Family Members
    familyMembers: [],
    
    // Additional Services
    services: {
      personalTraining: false,
      groupClasses: false,
      childcare: false,
      locker: false
    },
    
    // Emergency Contact Information
    emergencyContactName: "",
    emergencyContactPhone: ""
  });

  // State for form validation errors
  const [errors, setErrors] = useState({});
  
  // State for form submission status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // State for temporary family member data
  const [tempMember, setTempMember] = useState({
    type: "",
    firstName: "",
    middleInitial: "",
    lastName: "",
    dateOfBirth: "",
    gender: ""
  });

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
    { value: "", label: "Prefer not to say" }
  ];

  // Handle input changes for the main form
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle checkbox inputs differently
    if (type === 'checkbox' && name.startsWith('services.')) {
      const serviceName = name.split('.')[1];
      setFormData({
        ...formData,
        services: {
          ...formData.services,
          [serviceName]: checked
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    
    // Clear the error for this field when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };
  
  // Handle input changes for temporary member data
  const handleTempMemberChange = (e) => {
    const { name, value } = e.target;
    setTempMember({
      ...tempMember,
      [name]: value
    });
  };
  
  // Add a new family member
  const addFamilyMember = (type) => {
    // Validate required fields
    const newErrors = {};
    
    if (!tempMember.firstName) {
      newErrors.tempFirstName = "First name is required";
    }
    
    if (!tempMember.lastName) {
      newErrors.tempLastName = "Last name is required";
    }
    
    if (!tempMember.dateOfBirth) {
      newErrors.tempDateOfBirth = "Date of birth is required";
    }
    
    if (!tempMember.gender) {
      newErrors.tempGender = "Gender is required";
    }
    
    // If there are validation errors, display them and don't add the member
    if (Object.keys(newErrors).length > 0) {
      setErrors({
        ...errors,
        ...newErrors
      });
      return;
    }
    
    // Add the new member to the family members array
    const newMember = {
      ...tempMember,
      type,
      id: Date.now() // Use timestamp as a simple unique ID
    };
    
    setFormData({
      ...formData,
      familyMembers: [...formData.familyMembers, newMember]
    });
    
    // Reset the temporary member data
    setTempMember({
      type: "",
      firstName: "",
      middleInitial: "",
      lastName: "",
      dateOfBirth: "",
      gender: ""
    });
    
    // Switch back to the members tab to show the updated list
    setActiveTab('members');
  };
  
  // Remove a family member
  const removeFamilyMember = (id) => {
    setFormData({
      ...formData,
      familyMembers: formData.familyMembers.filter(member => member.id !== id)
    });
  };
  
  // Handle service selection
  const handleServiceChange = (e) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      services: {
        ...formData.services,
        [name]: checked
      }
    });
  };

  // Validate the form before submission
  const validateForm = () => {
    const newErrors = {};
    
    // Validate primary member information
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    
    if (!formData.address1.trim()) {
      newErrors.address1 = "Address is required";
    }
    
    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }
    
    if (!formData.state) {
      newErrors.state = "State is required";
    }
    
    if (!formData.zipCode.trim()) {
      newErrors.zipCode = "ZIP code is required";
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode.trim())) {
      newErrors.zipCode = "ZIP code must be in format 12345 or 12345-6789";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Email is not valid";
    }
    
    // Validate that at least one phone number is provided
    if (!formData.cellPhone.trim() && !formData.homePhone.trim() && !formData.workPhone.trim()) {
      newErrors.cellPhone = "At least one phone number is required";
    }
    
    // Validate phone number formats if provided - only check for 10 digits
    if (formData.cellPhone.trim() && !/^\d{10}$/.test(formData.cellPhone.replace(/\D/g, ''))) {
      newErrors.cellPhone = "Phone number must contain 10 digits";
    }
    
    if (formData.homePhone.trim() && !/^\d{10}$/.test(formData.homePhone.replace(/\D/g, ''))) {
      newErrors.homePhone = "Phone number must contain 10 digits";
    }
    
    if (formData.workPhone.trim() && !/^\d{10}$/.test(formData.workPhone.replace(/\D/g, ''))) {
      newErrors.workPhone = "Phone number must contain 10 digits";
    }
    
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required";
    } else {
      // Check if the person is at least 18 years old
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      
      if (age < 18 || (age === 18 && monthDiff < 0) || (age === 18 && monthDiff === 0 && today.getDate() < dob.getDate())) {
        newErrors.dateOfBirth = "You must be at least 18 years old to enroll";
      }
    }
    
    if (!formData.gender) {
      newErrors.gender = "Gender is required";
    }
    
    // Validate emergency contact information
    if (!formData.emergencyContactName.trim()) {
      newErrors.emergencyContactName = "Emergency contact name is required";
    }
    
    if (!formData.emergencyContactPhone.trim()) {
      newErrors.emergencyContactPhone = "Emergency contact phone is required";
    } else if (!/^\d{10}$/.test(formData.emergencyContactPhone.replace(/\D/g, ''))) {
      newErrors.emergencyContactPhone = "Phone number must contain 10 digits";
    }
    
    // Validate family members if any
    if (formData.familyMembers.length > 0) {
      formData.familyMembers.forEach((member, index) => {
        // Age validation for different member types
        if (member.dateOfBirth) {
          const dob = new Date(member.dateOfBirth);
          const today = new Date();
          const ageInYears = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate()) 
            ? ageInYears - 1 
            : ageInYears;
          
          // Check age ranges based on member type
          if (member.type === 'adult' && adjustedAge < 18) {
            newErrors[`familyMember${index}Age`] = "Adult members must be at least 18 years old";
          } else if (member.type === 'child' && (adjustedAge < 0 || adjustedAge > 11)) {
            newErrors[`familyMember${index}Age`] = "Child members must be between 3 weeks and 11 years old";
          } else if (member.type === 'youth' && (adjustedAge < 12 || adjustedAge > 20)) {
            newErrors[`familyMember${index}Age`] = "Youth members must be between 12 and 20 years old";
          }
        }
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset submission states
    setSubmitError("");
    setSubmitSuccess(false);
    
    // Validate the form
    if (!validateForm()) {
      // Scroll to the first error
      const firstErrorField = Object.keys(errors)[0];
      const errorElement = document.getElementById(firstErrorField);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement.focus();
      }
      return;
    }
    
    // Set submitting state
    setIsSubmitting(true);
    
    try {
      // Format the data for submission
      const submissionData = {
        primaryMember: {
          firstName: formData.firstName,
          middleInitial: formData.middleInitial,
          lastName: formData.lastName,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          email: formData.email,
          address: {
            line1: formData.address1,
            line2: formData.address2,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode
          },
          phoneNumbers: {
            cell: formData.cellPhone,
            home: formData.homePhone,
            work: formData.workPhone
          }
        },
        emergencyContact: {
          name: formData.emergencyContactName,
          phone: formData.emergencyContactPhone
        },
        familyMembers: formData.familyMembers,
        services: formData.services
      };
      
      // Submit the form data to the server
      const response = await api.post('/enrollment', submissionData);
      
      // Handle successful submission
      setSubmitSuccess(true);
      
      // Redirect to confirmation page
      navigate('/enrollment-confirmation', { 
        state: { 
          enrollmentData: response.data,
          memberName: `${formData.firstName} ${formData.lastName}`
        } 
      });
      
    } catch (error) {
      // Handle submission error
      console.error('Enrollment submission error:', error);
      
      if (error.response && error.response.data && error.response.data.message) {
        setSubmitError(error.response.data.message);
      } else {
        setSubmitError("An error occurred while submitting your enrollment. Please try again later.");
      }
      
      // Scroll to the error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } finally {
      // Reset submitting state
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
          
          <div className="personal-info-section">
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
                  placeholder="Enter first name"
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
                  placeholder="M.I."
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
                  placeholder="Enter last name"
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
                  placeholder="MM/DD/YYYY"
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
                  placeholder="example@email.com"
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
          </div>
          
          <div className="section-separator"></div>
          
          <div className="address-section">
            <div className="form-row address-row">
              <div className="form-group address-field">
                <label htmlFor="address1">
                  Address <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="address1"
                  name="address1"
                  value={formData.address1}
                  onChange={handleChange}
                  placeholder="Enter street address"
                  aria-required="true"
                  aria-invalid={!!errors.address1}
                  aria-describedby={errors.address1 ? "address1-error" : undefined}
                />
                {errors.address1 && (
                  <div id="address1-error" className="error-message">
                    {errors.address1}
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
                  placeholder="Enter city"
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
          
          <div className="section-separator"></div>
          
          <div className="contact-info-section">
            <div className="form-row phone-row">
              <div className="form-group">
                <label htmlFor="cellPhone">
                  Cell Phone 
                </label>
                <input
                  type="tel"
                  id="cellPhone"
                  name="cellPhone"
                  value={formData.cellPhone}
                  onChange={handleChange}
                  placeholder="Enter 10-digit phone number"
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
                  placeholder="Enter 10-digit phone number"
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
                  placeholder="Enter 10-digit phone number"
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
          </div>
         

          <h2>Family Members & Additional Services</h2>
          
          <div className="tabs-container">
            <div className="tab-list" role="tablist">
              <button
                className={`tab ${activeTab === 'members' ? 'active' : ''}`}
                onClick={(e) => {e.preventDefault(); setActiveTab('members');}}
                role="tab"
                aria-selected={activeTab === 'members'}
              >
                Members
              </button>
              <button
                className={`tab ${activeTab === 'new_adult' ? 'active' : ''}`}
                onClick={(e) => {e.preventDefault(); setActiveTab('new_adult');}}
                role="tab"
                aria-selected={activeTab === 'new_adult'}
              >
                Add Adult
              </button>
              <button
                className={`tab ${activeTab === 'child' ? 'active' : ''}`}
                onClick={(e) => {e.preventDefault(); setActiveTab('child');}}
                role="tab"
                aria-selected={activeTab === 'child'}
              >
                Add Child
              </button>
              <button
                className={`tab ${activeTab === 'youth' ? 'active' : ''}`}
                onClick={(e) => {e.preventDefault(); setActiveTab('youth');}}
                role="tab"
                aria-selected={activeTab === 'youth'}
              >
                Add Youth
              </button>
              <button
                className={`tab ${activeTab === 'services' ? 'active' : ''}`}
                onClick={(e) => {e.preventDefault(); setActiveTab('services');}}
                role="tab"
                aria-selected={activeTab === 'services'}
              >
                Additional Services
              </button>
            </div>
            
            <div className="tab-content">
              {activeTab === 'members' && (
                <div className="tab-panel">
                  <h3>Current Members</h3>
                  <p>You are the primary member. Add family members using the tabs above.</p>
                  <div className="member-card">
                    <div className="member-info">
                      <h4>Primary Member</h4>
                      <p>Your membership includes access to all basic facilities.</p>
                    </div>
                  </div>
                  
                  {formData.familyMembers.length > 0 ? (
                    formData.familyMembers.map(member => (
                      <div className="member-card" key={member.id}>
                        <div className="member-info">
                          <h4>{member.firstName} {member.middleInitial ? member.middleInitial + '. ' : ''}{member.lastName}</h4>
                          <p>{member.type === 'adult' ? 'Adult' : member.type === 'child' ? 'Child' : 'Youth'} Member</p>
                        </div>
                        <button 
                          type="button" 
                          className="remove-member-button"
                          onClick={() => removeFamilyMember(member.id)}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="no-members-message">No additional family members added yet.</p>
                  )}
                </div>
              )}
              
              {activeTab === 'new_adult' && (
                <div className="tab-panel">
                  <h3>Add New Adult Member (18+ years)</h3>
                  <div className="form-row name-row">
                    <div className="form-group">
                      <label htmlFor="adultFirstName">First Name <span className="required">*</span></label>
                      <input 
                        type="text" 
                        id="adultFirstName" 
                        name="firstName" 
                        value={tempMember.firstName}
                        onChange={handleTempMemberChange}
                        aria-invalid={!!errors.tempFirstName}
                        aria-describedby={errors.tempFirstName ? "tempFirstName-error" : undefined}
                      />
                      {errors.tempFirstName && (
                        <div id="tempFirstName-error" className="error-message">
                          {errors.tempFirstName}
                        </div>
                      )}
                    </div>
                    <div className="form-group middle-initial">
                      <label htmlFor="adultMiddleInitial">M.I.</label>
                      <input 
                        type="text" 
                        id="adultMiddleInitial" 
                        name="middleInitial" 
                        maxLength="1" 
                        value={tempMember.middleInitial}
                        onChange={handleTempMemberChange}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="adultLastName">Last Name <span className="required">*</span></label>
                      <input 
                        type="text" 
                        id="adultLastName" 
                        name="lastName" 
                        value={tempMember.lastName}
                        onChange={handleTempMemberChange}
                        aria-invalid={!!errors.tempLastName}
                        aria-describedby={errors.tempLastName ? "tempLastName-error" : undefined}
                      />
                      {errors.tempLastName && (
                        <div id="tempLastName-error" className="error-message">
                          {errors.tempLastName}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="form-row dob-gender-row">
                    <div className="form-group dob-field">
                      <label htmlFor="adultDob">Date of Birth <span className="required">*</span></label>
                      <input 
                        type="date" 
                        id="adultDob" 
                        name="dateOfBirth" 
                        max={today}
                        value={tempMember.dateOfBirth}
                        onChange={handleTempMemberChange}
                        aria-invalid={!!errors.tempDateOfBirth}
                        aria-describedby={errors.tempDateOfBirth ? "tempDateOfBirth-error" : undefined}
                      />
                      {errors.tempDateOfBirth && (
                        <div id="tempDateOfBirth-error" className="error-message">
                          {errors.tempDateOfBirth}
                        </div>
                      )}
                    </div>
                    <div className="form-group gender-field">
                      <label htmlFor="adultGender">Gender <span className="required">*</span></label>
                      <select 
                        id="adultGender" 
                        name="gender"
                        value={tempMember.gender}
                        onChange={handleTempMemberChange}
                        aria-invalid={!!errors.tempGender}
                        aria-describedby={errors.tempGender ? "tempGender-error" : undefined}
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.tempGender && (
                        <div id="tempGender-error" className="error-message">
                          {errors.tempGender}
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="add-member-button"
                    onClick={() => addFamilyMember('adult')}
                  >
                    Add Adult Member
                  </button>
                </div>
              )}
              
              {activeTab === 'child' && (
                <div className="tab-panel">
                  <h3>Add Child (3 weeks - 11 years)</h3>
                  <div className="form-row name-row">
                    <div className="form-group">
                      <label htmlFor="childFirstName">First Name <span className="required">*</span></label>
                      <input 
                        type="text" 
                        id="childFirstName" 
                        name="firstName" 
                        value={tempMember.firstName}
                        onChange={handleTempMemberChange}
                        aria-invalid={!!errors.tempFirstName}
                        aria-describedby={errors.tempFirstName ? "tempFirstName-error" : undefined}
                      />
                      {errors.tempFirstName && (
                        <div id="tempFirstName-error" className="error-message">
                          {errors.tempFirstName}
                        </div>
                      )}
                    </div>
                    <div className="form-group middle-initial">
                      <label htmlFor="childMiddleInitial">M.I.</label>
                      <input 
                        type="text" 
                        id="childMiddleInitial" 
                        name="middleInitial" 
                        maxLength="1" 
                        value={tempMember.middleInitial}
                        onChange={handleTempMemberChange}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="childLastName">Last Name <span className="required">*</span></label>
                      <input 
                        type="text" 
                        id="childLastName" 
                        name="lastName" 
                        value={tempMember.lastName}
                        onChange={handleTempMemberChange}
                        aria-invalid={!!errors.tempLastName}
                        aria-describedby={errors.tempLastName ? "tempLastName-error" : undefined}
                      />
                      {errors.tempLastName && (
                        <div id="tempLastName-error" className="error-message">
                          {errors.tempLastName}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="form-row dob-gender-row">
                    <div className="form-group dob-field">
                      <label htmlFor="childDob">Date of Birth <span className="required">*</span></label>
                      <input 
                        type="date" 
                        id="childDob" 
                        name="dateOfBirth" 
                        max={today}
                        value={tempMember.dateOfBirth}
                        onChange={handleTempMemberChange}
                        aria-invalid={!!errors.tempDateOfBirth}
                        aria-describedby={errors.tempDateOfBirth ? "tempDateOfBirth-error" : undefined}
                      />
                      {errors.tempDateOfBirth && (
                        <div id="tempDateOfBirth-error" className="error-message">
                          {errors.tempDateOfBirth}
                        </div>
                      )}
                    </div>
                    <div className="form-group gender-field">
                      <label htmlFor="childGender">Gender <span className="required">*</span></label>
                      <select 
                        id="childGender" 
                        name="gender"
                        value={tempMember.gender}
                        onChange={handleTempMemberChange}
                        aria-invalid={!!errors.tempGender}
                        aria-describedby={errors.tempGender ? "tempGender-error" : undefined}
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.tempGender && (
                        <div id="tempGender-error" className="error-message">
                          {errors.tempGender}
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="add-member-button"
                    onClick={() => addFamilyMember('child')}
                  >
                    Add Child
                  </button>
                </div>
              )}
              
              {activeTab === 'youth' && (
                <div className="tab-panel">
                  <h3>Add Youth (12 - 20 years)</h3>
                  <div className="form-row name-row">
                    <div className="form-group">
                      <label htmlFor="youthFirstName">First Name <span className="required">*</span></label>
                      <input 
                        type="text" 
                        id="youthFirstName" 
                        name="firstName" 
                        value={tempMember.firstName}
                        onChange={handleTempMemberChange}
                        aria-invalid={!!errors.tempFirstName}
                        aria-describedby={errors.tempFirstName ? "tempFirstName-error" : undefined}
                      />
                      {errors.tempFirstName && (
                        <div id="tempFirstName-error" className="error-message">
                          {errors.tempFirstName}
                        </div>
                      )}
                    </div>
                    <div className="form-group middle-initial">
                      <label htmlFor="youthMiddleInitial">M.I.</label>
                      <input 
                        type="text" 
                        id="youthMiddleInitial" 
                        name="middleInitial" 
                        maxLength="1" 
                        value={tempMember.middleInitial}
                        onChange={handleTempMemberChange}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="youthLastName">Last Name <span className="required">*</span></label>
                      <input 
                        type="text" 
                        id="youthLastName" 
                        name="lastName" 
                        value={tempMember.lastName}
                        onChange={handleTempMemberChange}
                        aria-invalid={!!errors.tempLastName}
                        aria-describedby={errors.tempLastName ? "tempLastName-error" : undefined}
                      />
                      {errors.tempLastName && (
                        <div id="tempLastName-error" className="error-message">
                          {errors.tempLastName}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="form-row dob-gender-row">
                    <div className="form-group dob-field">
                      <label htmlFor="youthDob">Date of Birth <span className="required">*</span></label>
                      <input 
                        type="date" 
                        id="youthDob" 
                        name="dateOfBirth" 
                        max={today}
                        value={tempMember.dateOfBirth}
                        onChange={handleTempMemberChange}
                        aria-invalid={!!errors.tempDateOfBirth}
                        aria-describedby={errors.tempDateOfBirth ? "tempDateOfBirth-error" : undefined}
                      />
                      {errors.tempDateOfBirth && (
                        <div id="tempDateOfBirth-error" className="error-message">
                          {errors.tempDateOfBirth}
                        </div>
                      )}
                    </div>
                    <div className="form-group gender-field">
                      <label htmlFor="youthGender">Gender <span className="required">*</span></label>
                      <select 
                        id="youthGender" 
                        name="gender"
                        value={tempMember.gender}
                        onChange={handleTempMemberChange}
                        aria-invalid={!!errors.tempGender}
                        aria-describedby={errors.tempGender ? "tempGender-error" : undefined}
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.tempGender && (
                        <div id="tempGender-error" className="error-message">
                          {errors.tempGender}
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="add-member-button"
                    onClick={() => addFamilyMember('youth')}
                  >
                    Add Youth
                  </button>
                </div>
              )}
              
              {activeTab === 'services' && (
                <div className="tab-panel">
                  <h3>Additional Services</h3>
                  <div className="service-options">
                    <div className="service-option">
                      <input 
                        type="checkbox" 
                        id="personalTraining" 
                        name="personalTraining" 
                        checked={formData.services.personalTraining}
                        onChange={handleServiceChange}
                      />
                      <label htmlFor="personalTraining">Personal Training ($50/session)</label>
                    </div>
                    <div className="service-option">
                      <input 
                        type="checkbox" 
                        id="groupClasses" 
                        name="groupClasses" 
                        checked={formData.services.groupClasses}
                        onChange={handleServiceChange}
                      />
                      <label htmlFor="groupClasses">Group Fitness Classes ($25/month)</label>
                    </div>
                    <div className="service-option">
                      <input 
                        type="checkbox" 
                        id="childcare" 
                        name="childcare" 
                        checked={formData.services.childcare}
                        onChange={handleServiceChange}
                      />
                      <label htmlFor="childcare">Childcare Services ($15/month)</label>
                    </div>
                    <div className="service-option">
                      <input 
                        type="checkbox" 
                        id="locker" 
                        name="locker" 
                        checked={formData.services.locker}
                        onChange={handleServiceChange}
                      />
                      <label htmlFor="locker">Locker Rental ($10/month)</label>
                    </div>
                  </div>
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
            
            {formData.familyMembers.length > 0 && (
              <div className="cart-item">
                <div className="item-details">
                  <h3>Family Members ({formData.familyMembers.length})</h3>
                  <p>Additional members on your account</p>
                  <ul>
                    {formData.familyMembers.map((member, index) => (
                      <li key={member.id}>
                        {member.firstName} {member.lastName} ({member.type === 'adult' ? 'Adult' : member.type === 'child' ? 'Child' : 'Youth'})
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="item-price">
                  ${(formData.familyMembers.reduce((total, member) => {
                    if (member.type === 'adult') return total + 29.99;
                    if (member.type === 'youth') return total + 19.99;
                    return total + 14.99; // child
                  }, 0)).toFixed(2)}/mo
                </div>
              </div>
            )}
            
            {formData.services.personalTraining && (
              <div className="cart-item">
                <div className="item-details">
                  <h3>Personal Training</h3>
                  <p>One-on-one training sessions</p>
                </div>
                <div className="item-price">$50.00/session</div>
              </div>
            )}
            
            {formData.services.groupClasses && (
              <div className="cart-item">
                <div className="item-details">
                  <h3>Group Fitness Classes</h3>
                  <p>Access to all group fitness classes</p>
                </div>
                <div className="item-price">$25.00/mo</div>
              </div>
            )}
            
            {formData.services.childcare && (
              <div className="cart-item">
                <div className="item-details">
                  <h3>Childcare Services</h3>
                  <p>On-site childcare while you work out</p>
                </div>
                <div className="item-price">$15.00/mo</div>
              </div>
            )}
            
            {formData.services.locker && (
              <div className="cart-item">
                <div className="item-details">
                  <h3>Locker Rental</h3>
                  <p>Personal locker for your belongings</p>
                </div>
                <div className="item-price">$10.00/mo</div>
              </div>
            )}
            
            <div className="cart-item">
              <div className="item-details">
                <h3>Enrollment Fee</h3>
                <p>One-time registration fee</p>
              </div>
              <div className="item-price">$25.00</div>
            </div>
          </div>
          
          <div className="cart-summary">
            {/* Calculate the monthly recurring cost */}
            {(() => {
              let monthlyTotal = 49.99; // Base membership
              
              // Add family member costs
              monthlyTotal += formData.familyMembers.reduce((total, member) => {
                if (member.type === 'adult') return total + 29.99;
                if (member.type === 'youth') return total + 19.99;
                return total + 14.99; // child
              }, 0);
              
              // Add service costs
              if (formData.services.groupClasses) monthlyTotal += 25.00;
              if (formData.services.childcare) monthlyTotal += 15.00;
              if (formData.services.locker) monthlyTotal += 10.00;
              
              // Calculate one-time costs
              const oneTimeCost = 25.00; // Enrollment fee
              
              // Calculate tax (8% for example)
              const tax = (monthlyTotal + oneTimeCost) * 0.08;
              
              // Calculate total due today
              const totalDueToday = monthlyTotal + oneTimeCost + tax;
              
              return (
                <>
                  <div className="summary-row">
                    <span>Monthly Recurring:</span>
                    <span>${monthlyTotal.toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>One-time Fees:</span>
                    <span>${oneTimeCost.toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Tax:</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="summary-row total">
                    <span>Total Due Today:</span>
                    <span>${totalDueToday.toFixed(2)}</span>
                  </div>
                </>
              );
            })()}
          </div>
          
          <div className="cart-note">
            <p>Your first monthly payment will be charged on your selected start date.</p>
            {formData.services.personalTraining && (
              <p>Personal training sessions can be scheduled after enrollment.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnrollmentForm; 