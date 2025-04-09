// frontend/src/components/EnrollmentForm.jsx
// This component displays a form to collect user information for a gym membership enrollment.
// It includes form validation, secure data handling, and follows accessibility best practices.

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api.js";
import "./EnrollmentForm.css";
import { useClub } from "../context/ClubContext.js";
import { useMembership } from "../context/MembershipContext.js";
import MembershipTypeModal from "./MembershipTypeModal.jsx";
import RestrictedMembershipMessage from "./RestrictedMembershipMessage.jsx";
import AddonButtons from "./AddonButtons.jsx";
import ServiceAddonButtons from './ServiceAddonButtons.jsx';

// Add this near the top of the file with other constants
const SPECIALTY_MEMBERSHIP_MAP = {
  junior: 'J',
  standard: '',
  senior: 'S',
  student: 'Y'  // For student/young professional
};

// Add these helper functions after the constants and before the EnrollmentForm function
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const validateAgeForMembershipType = (dateOfBirth, membershipType) => {
  const age = calculateAge(dateOfBirth);
  if (age === null) return "Date of birth is required";

  // Get the membership type value from the SPECIALTY_MEMBERSHIP_MAP
  const membershipTypeValue = membershipType ? SPECIALTY_MEMBERSHIP_MAP[membershipType.id] : "";

  switch (membershipTypeValue) {
    case "": // Standard
      if (age < 30) return `You are ${age} years old. Standard membership requires you to be between 30-64 years old.`;
      if (age > 64) return `You are ${age} years old. Standard membership requires you to be between 30-64 years old.`;
      break;
    case "Y": // Student/Young Professional
      if (age < 18) return `You are ${age} years old. Student/Young Professional membership requires you to be between 18-29 years old.`;
      if (age > 29) return `You are ${age} years old. Student/Young Professional membership requires you to be between 18-29 years old.`;
      break;
    case "J": // Junior
      if (age >= 18) return `You are ${age} years old. Junior membership is only for those under 18 years old.`;
      break;
    case "S": // Senior
      if (age < 65) return `You are ${age} years old. Senior membership requires you to be 65 years or older.`;
      break;
    default:
      return "Please select a membership type";
  }
  return null;
};

const validateAdultAge = (dateOfBirth) => {
  const age = calculateAge(dateOfBirth);
  if (age === null) return "Date of birth is required";
  if (age < 18) return `You are ${age} years old. Adult members must be 18 or older.`;
  return null;
};

const validateChildAge = (dateOfBirth) => {
  const age = calculateAge(dateOfBirth);
  if (age === null) return "Date of birth is required";
  if (age < 0) return "Invalid date of birth";
  if (age > 11) return `You are ${age} years old. Child members must be 11 or younger.`;
  return null;
};

const validateYouthAge = (dateOfBirth) => {
  if (!dateOfBirth) return false;
  
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  
  // Calculate age
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  // Adjust age if birthday hasn't occurred this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  // Youth must be between 12 and 20 years old
  return age >= 12 && age <= 20;
};

function EnrollmentForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedClub } = useClub();
  const { membershipType, selectMembershipType } = useMembership();
  
  // State for membership type modal
  const [showMembershipTypeModal, setShowMembershipTypeModal] = useState(!membershipType);
  
  // State for addons
  const [addons, setAddons] = useState([]);
  const [selectedChildAddons, setSelectedChildAddons] = useState([]);
  const [childForms, setChildForms] = useState([]);
  const [selectedServiceAddons, setSelectedServiceAddons] = useState([]);

  // Check if membership type is passed in location state
  useEffect(() => {
    if (location.state && location.state.membershipType) {
      selectMembershipType(location.state.membershipType);
      setShowMembershipTypeModal(false);
    }
  }, [location, selectMembershipType]);
  

 // Fetch addons from the API
  useEffect(() => {
    const fetchAddons = async () => {
      try {
        // Use the selected club ID or default to "001"
        const clubId = selectedClub?.id || "001";
        const response = await fetch(`/api/enrollment/addons?clubId=${clubId}`);
        const data = await response.json();
        
        if (data.success) {
          setAddons(data.addons);
        } else {
          console.error("Failed to fetch addons:", data.message);
        }
      } catch (error) {
        console.error("Error fetching addons:", error);
      }
    };

    fetchAddons();
  }, [selectedClub]);

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
    gender: "default", // Changed from empty string to "default"
    email: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zipCode: "",
    mobilePhone: "",
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
    
    // Legal Guardian Information (for Junior membership)
    guardianFirstName: "",
    guardianMiddleInitial: "",
    guardianLastName: "",
    guardianDateOfBirth: "",
    guardianGender: "",
    guardianEmail: "",
    guardianRelationship: "",
    guardianConsent: false
  });

  // State for form validation errors
  const [errors, setErrors] = useState({});
  
  // State for form submission status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Create separate state variables for each member type
  const [adultMember, setAdultMember] = useState({
    firstName: "",
    middleInitial: "",
    lastName: "",
    dateOfBirth: "",
    gender: "default", // Set default value here
    email: "",
    cellPhone: "",
    homePhone: "",
    workPhone: "",
    relationship: "",
    isGuardian: false,
    guardianFirstName: "",
    guardianLastName: "",
    guardianEmail: "",
    guardianPhone: "",
    guardianRelationship: ""
  });

  const [childMember, setChildMember] = useState({
    firstName: "",
    middleInitial: "",
    lastName: "",
    dateOfBirth: "",
    gender: "default", // Set default value here
    email: "",
    cellPhone: "",
    homePhone: "",
    workPhone: "",
    relationship: "",
    isGuardian: false,
    guardianFirstName: "",
    guardianLastName: "",
    guardianEmail: "",
    guardianPhone: "",
    guardianRelationship: ""
  });

  const [youthMember, setYouthMember] = useState({
    firstName: "",
    middleInitial: "",
    lastName: "",
    dateOfBirth: "",
    gender: "default", // Set default value here
    email: "",
    cellPhone: "",
    homePhone: "",
    workPhone: "",
    relationship: "",
    isGuardian: false,
    guardianFirstName: "",
    guardianLastName: "",
    guardianEmail: "",
    guardianPhone: "",
    guardianRelationship: ""
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
    { value: "default", label: "Select gender" },
    { value: "M", label: "Male" },
    { value: "F", label: "Female" },
    { value: "", label: "Prefer not to say" }
  ];

  // Check if membership type is Junior
  const isJuniorMembership = membershipType && membershipType.id === "junior";
  
  // Check if membership type is Student/Young Professional
  const isYoungProfessionalMembership = membershipType && membershipType.id === "young-professional";
  
  // Check if membership type allows family members
  const allowsFamilyMembers = !isJuniorMembership && !isYoungProfessionalMembership;

  // Helper function to validate email format
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Helper function to validate ZIP code format
  const isValidZipCode = (zipCode) => {
    return /^\d{5}(-\d{4})?$/.test(zipCode);
  };

  // Transform form data for submission
  const transformFormDataForSubmission = () => {
    // Format the data to match backend expectations
    const submissionData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      middleInitial: formData.middleInitial || '',
      dateOfBirth: formData.dateOfBirth,
      // Convert "default" to empty string for gender
      gender: formData.gender === "default" ? "" : formData.gender,
      email: formData.email,
      // IMPORTANT: Backend expects 'address', not 'address1'
      address: formData.address1,
      address2: formData.address2 || '',
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      // IMPORTANT: Backend expects 'cellPhone', not 'mobilePhone'
    // Phone number priority: cellPhone > homePhone > workPhone
    cellPhone: formData.mobilePhone ? formData.mobilePhone.replace(/\D/g, '') : '',
    homePhone: formData.homePhone ? formData.homePhone.replace(/\D/g, '') : '',
    workPhone: formData.workPhone ? formData.workPhone.replace(/\D/g, '') : '',
      // Get the correct membership code
      membershipType: membershipType ? SPECIALTY_MEMBERSHIP_MAP[membershipType.id] : '',
      requestedStartDate: formData.requestedStartDate,
      // Ensure club ID is a 3-digit string
      club: selectedClub?.id ? String(selectedClub.id).padStart(3, '0') : '',
      familyMembers: []
    };
   
      // ADD THIS SECTION to create a prioritized phone field
  // Determine which phone to use for the main phone field
  let phone = '';
  if (formData.mobilePhone) {
    phone = formData.mobilePhone.replace(/\D/g, '');
  } else if (formData.homePhone) {
    phone = formData.homePhone.replace(/\D/g, '');
  } else if (formData.workPhone) {
    phone = formData.workPhone.replace(/\D/g, '');
  }

    // Add the prioritized phone field to the submission data
  submissionData.phone = phone;  
    
    // Transform family members
    if (!isJuniorMembership && formData.familyMembers.length > 0) {
      submissionData.familyMembers = formData.familyMembers.map(member => {
        // Determine role based on member type
        const role = member.memberType === 'adult' ? 'S' : 'D';
      
        // Use "N" for empty strings to pass the validation
    // You can adjust this to any value that makes sense in your system
    const genderValue = member.gender === "" ? "N" : member.gender;

        return {
          firstName: member.firstName,
          lastName: member.lastName,
          middleInitial: member.middleInitial || '',
          dateOfBirth: member.dateOfBirth,
          gender: genderValue, // Use adjusted gender value
          email: member.email || '',
          cellPhone: member.cellPhone ? member.cellPhone.replace(/\D/g, '') : '',
          homePhone: member.homePhone ? member.homePhone.replace(/\D/g, '') : '',
          workPhone: member.workPhone ? member.workPhone.replace(/\D/g, '') : '',
          role: role,
          memberType: member.memberType
        };
      });
    }
    
    // Add guardian information for Junior memberships
    if (isJuniorMembership) {
      submissionData.guardian = {
        firstName: formData.guardianFirstName,
        lastName: formData.guardianLastName,
        middleInitial: formData.guardianMiddleInitial || '',
        dateOfBirth: formData.guardianDateOfBirth,
        gender: formData.guardianGender === "default" ? "" : formData.guardianGender,
        email: formData.guardianEmail,
        relationship: formData.guardianRelationship,
        cellPhone: formData.mobilePhone ? formData.mobilePhone.replace(/\D/g, '') : '',
        homePhone: formData.homePhone ? formData.homePhone.replace(/\D/g, '') : '',
        workPhone: formData.workPhone ? formData.workPhone.replace(/\D/g, '') : ''
      };
    }
    
    return submissionData;
  };

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
      
      // Validate age only when date of birth is complete
      if (name === 'dateOfBirth' && value) {
        // Only validate if we have a complete date (YYYY-MM-DD)
        const dateParts = value.split('-');
        
        // Check if we have all parts and they're the right length
        const hasAllParts = dateParts.length === 3 && 
                           dateParts[0].length === 4 && 
                           dateParts[1].length === 2 && 
                           dateParts[2].length === 2;
        
        if (hasAllParts) {
          // Convert to numbers and validate ranges
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]);
          const day = parseInt(dateParts[2]);
          
          // Only validate if we have a valid date (real year, valid month and day)
          const isValidDate = year > 1920 && year <= new Date().getFullYear() &&
                             month >= 1 && month <= 12 &&
                             day >= 1 && day <= 31;
          
          if (isValidDate) {
            // Use the membershipType from context, not from formData
            const ageError = validateAgeForMembershipType(value, membershipType);
            if (ageError) {
              setErrors(prevErrors => ({
                ...prevErrors,
                dateOfBirth: ageError
              }));
              
              // Only show membership type modal if we have a complete date and membership type
              if (membershipType) {
                setShowMembershipTypeModal(true);
              }
            } else {
              // Clear the error if validation passes
              setErrors(prevErrors => ({
                ...prevErrors,
                dateOfBirth: null
              }));
            }
          }
        } else {
          // Clear any existing errors while the user is still typing
          setErrors(prevErrors => ({
            ...prevErrors,
            dateOfBirth: null
          }));
        }
      }
    }
    
    // Clear errors for fields other than dateOfBirth
    if (errors[name] && name !== 'dateOfBirth') {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };
  
  // Handle input changes for temporary member data based on the active tab
  const handleTempMemberChange = (e) => {
    const { name, value } = e.target;
    
    // Determine which state to update based on the active tab
    let currentMember, setCurrentMember;
    
    switch (activeTab) {
      case 'new_adult':
        currentMember = adultMember;
        setCurrentMember = setAdultMember;
        break;
      case 'child':
        currentMember = childMember;
        setCurrentMember = setChildMember;
        break;
      case 'youth':
        currentMember = youthMember;
        setCurrentMember = setYouthMember;
        break;
      default:
        return;
    }
    
    // Convert gender to uppercase
    if (name === "gender") {
      setCurrentMember({
        ...currentMember,
        [name]: value === "" ? value : value.toUpperCase()
      });
    } else {
      setCurrentMember({
        ...currentMember,
        [name]: value
      });
    }
    
    // For date of birth, validate when we have a complete date
    if (name === "dateOfBirth") {
      // Only validate if we have a complete date (YYYY-MM-DD)
      const dateParts = value.split('-');
      
      // Check if we have all parts and they're the right length
      const hasAllParts = dateParts.length === 3 && 
                          dateParts[0].length === 4 && 
                          dateParts[1].length === 2 && 
                          dateParts[2].length === 2;
                         
      if (hasAllParts) {
        // Convert to numbers and validate ranges
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]);
        const day = parseInt(dateParts[2]);
        
        // Only validate if we have a valid date (real year, valid month and day)
        const isValidDate = year > 1900 && year <= new Date().getFullYear() &&
                           month >= 1 && month <= 12 &&
                           day >= 1 && day <= 31;

        if (value && isValidDate) {
          let ageError = null;
          
          // Determine which validation function to use based on the active tab
          switch (activeTab) {
            case 'new_adult':
              ageError = validateAdultAge(value);
              break;
            case 'child':
              ageError = validateChildAge(value);
              break;
            case 'youth':
              // For youth, we need to handle the boolean return value differently
              if (!validateYouthAge(value)) {
                const age = calculateAge(value);
                ageError = `You are ${age} years old. Youth members must be between 12 and 20 years old.`;
              }
              break;
            default:
              break;
          }
          
          if (ageError) {
            setErrors(prevErrors => ({
              ...prevErrors,
              tempDateOfBirth: ageError
            }));
          } else {
            // Only clear the date of birth error if validation passes
            setErrors(prevErrors => ({
              ...prevErrors,
              tempDateOfBirth: null
            }));
          }
        }
      }
    } else if (name !== 'dateOfBirth') {
      // For non-date fields, clear their specific errors when changed
      setErrors(prevErrors => ({
        ...prevErrors,
        [`temp${name.charAt(0).toUpperCase() + name.slice(1)}`]: null
      }));
    }
  };
  
  // Add a new family member
  const addFamilyMember = (memberType) => {
    const memberData = memberType === 'adult' ? adultMember : 
                       memberType === 'child' ? childMember : 
                       youthMember;
    
    const newErrors = {};
    
    // Validate required fields
    if (!memberData.firstName) {
      newErrors.tempFirstName = "First name is required";
    }
    
    if (!memberData.lastName) {
      newErrors.tempLastName = "Last name is required";
    }
    
    if (!memberData.dateOfBirth) {
      newErrors.tempDateOfBirth = "Date of birth is required";
    } else {
      // Validate age based on member type
      if (memberType === 'adult') {
        const age = calculateAge(memberData.dateOfBirth);
        if (age < 18) {
          newErrors.tempDateOfBirth = `You are ${age} years old. Adult members must be 18 or older.`;
        }
      } else if (memberType === 'child') {
        const age = calculateAge(memberData.dateOfBirth);
        if (age >= 12) {
          newErrors.tempDateOfBirth = `You are ${age} years old. Child members must be under 12 years old.`;
        }
      } else if (memberType === 'youth') {
        if (!validateYouthAge(memberData.dateOfBirth)) {
          const age = calculateAge(memberData.dateOfBirth);
          newErrors.tempDateOfBirth = `You are ${age} years old. Youth members must be between 12 and 20 years old.`;
        }
      }
    }
    
    // Update gender validation to handle both empty strings and "default"
    if (memberData.gender === "default") {
      newErrors.tempGender = "Please select a gender or choose 'Prefer not to say'";
    }
    
    // Validate email if provided
    if (memberData.email && !isValidEmail(memberData.email.trim())) {
      newErrors.tempEmail = "Please enter a valid email address";
    }
    
    // Validate phone numbers if provided
    if (memberData.cellPhone && !/^\d{10}$/.test(memberData.cellPhone.replace(/\D/g, ''))) {
      newErrors.tempCellPhone = "Please enter a valid cell phone number";
    }
    
    if (memberData.homePhone && !/^\d{10}$/.test(memberData.homePhone.replace(/\D/g, ''))) {
      newErrors.tempHomePhone = "Please enter a valid home phone number";
    }
    
    if (memberData.workPhone && !/^\d{10}$/.test(memberData.workPhone.replace(/\D/g, ''))) {
      newErrors.tempWorkPhone = "Please enter a valid work phone number";
    }
    
    // If there are errors, update the errors state and return
    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }
    
    // Determine the role based on member type
    let role = 'D'; // Default to dependent
    if (memberType === 'adult') {
      role = 'S'; // Secondary for adult family members
    }
    
    // Add the member to the family members array
    const newMember = {
      ...memberData,
      memberType,
      role,
      id: Date.now(), // Generate a unique ID
      gender: memberData.gender === "default" ? "" : memberData.gender // Convert "default" to empty string
    };
    
    setFormData(prevData => ({
      ...prevData,
      familyMembers: [...prevData.familyMembers, newMember]
    }));
    
    // Reset the appropriate member state
    if (memberType === 'adult') {
      setAdultMember({
        firstName: '',
        middleInitial: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'default',
        email: '',
        cellPhone: '',
        homePhone: '',
        workPhone: ''
      });
    } else if (memberType === 'child') {
      setChildMember({
        firstName: '',
        middleInitial: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'default',
        email: '',
        cellPhone: '',
        homePhone: '',
        workPhone: ''
      });
    } else {
      setYouthMember({
        firstName: '',
        middleInitial: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'default',
        email: '',
        cellPhone: '',
        homePhone: '',
        workPhone: ''
      });
    }
    
    // Clear any errors for the member being added
    const errorKeys = Object.keys(newErrors).filter(key => key.startsWith('temp'));
    setErrors(prev => {
      const newErrors = { ...prev };
      errorKeys.forEach(key => delete newErrors[key]);
      return newErrors;
    });
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
    
    // Validate primary member fields
    if (!formData.firstName) {
      newErrors.firstName = "First name is required";
    }
    
    if (!formData.lastName) {
      newErrors.lastName = "Last name is required";
    }
    
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required";
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.dateOfBirth)) {
      newErrors.dateOfBirth = "Date must be in YYYY-MM-DD format";
    }
    
    // Update gender validation to handle both empty strings and "default"
    if (formData.gender === "default") {
      newErrors.gender = "Please select a gender or choose 'Prefer not to say'";
    }
    
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!formData.address1) {
      newErrors.address1 = "Address is required";
    }
    
    if (!formData.city) {
      newErrors.city = "City is required";
    }
    
    if (!formData.state) {
      newErrors.state = "State is required";
    }
    
    if (!formData.zipCode) {
      newErrors.zipCode = "ZIP code is required";
    } else if (!isValidZipCode(formData.zipCode)) {
      newErrors.zipCode = "Please enter a valid ZIP code";
    }
    
// Check that at least one phone number is provided
if (!formData.mobilePhone && !formData.homePhone && !formData.workPhone) {
  newErrors.phoneNumbers = "At least one phone number is required";
} else {
  // If mobile phone is provided, validate its format
  if (formData.mobilePhone && !/^\d{10}$/.test(formData.mobilePhone.replace(/\D/g, ''))) {
    newErrors.mobilePhone = "Please enter a valid 10-digit phone number";
  }
  
  // If home phone is provided, validate its format
  if (formData.homePhone && !/^\d{10}$/.test(formData.homePhone.replace(/\D/g, ''))) {
    newErrors.homePhone = "Please enter a valid 10-digit phone number";
  }
  
  // If work phone is provided, validate its format
  if (formData.workPhone && !/^\d{10}$/.test(formData.workPhone.replace(/\D/g, ''))) {
    newErrors.workPhone = "Please enter a valid 10-digit phone number";
  }
}
    
    if (!formData.requestedStartDate) {
      newErrors.requestedStartDate = "Start date is required";
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.requestedStartDate)) {
      newErrors.requestedStartDate = "Date must be in YYYY-MM-DD format";
    }
    
    // Validate club selection
    if (!selectedClub || !selectedClub.id) {
      newErrors.club = "Please select a club";
    } else if (!/^\d{3}$/.test(String(selectedClub.id).padStart(3, '0'))) {
      newErrors.club = "Club ID must be a 3-digit number";
    }
    
    // Validate family members
    formData.familyMembers.forEach((member, index) => {
      if (!member.firstName) {
        newErrors[`familyMember${index}FirstName`] = "First name is required";
      }
      
      if (!member.lastName) {
        newErrors[`familyMember${index}LastName`] = "Last name is required";
      }
      
      if (!member.dateOfBirth) {
        newErrors[`familyMember${index}DateOfBirth`] = "Date of birth is required";
      }
      
      // Update gender validation to handle both empty strings and "default"
      if (member.gender === "default") {
        newErrors[`familyMember${index}Gender`] = "Please select a gender or choose 'Prefer not to say'";
      }
      
      // Validate age based on member type
      if (member.dateOfBirth) {
        const age = calculateAge(member.dateOfBirth);
        
        if (member.memberType === 'adult' && age < 18) {
          newErrors[`familyMember${index}DateOfBirth`] = `You are ${age} years old. Adult members must be 18 or older.`;
        } else if (member.memberType === 'child' && age >= 12) {
          newErrors[`familyMember${index}DateOfBirth`] = `You are ${age} years old. Child members must be under 12 years old.`;
        } else if (member.memberType === 'youth' && !validateYouthAge(member.dateOfBirth)) {
          newErrors[`familyMember${index}DateOfBirth`] = `You are ${age} years old. Youth members must be between 12 and 20 years old.`;
        }
      }
    });
    
    // If there are any validation errors, update the errors state and return false
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }
    
    return true;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset submission states
    setSubmitError("");
    setSubmitSuccess(false);
    
    // Validate the form
    if (!validateForm()) {
      // Format validation errors in a more readable way
      const errorMessages = Object.entries(errors)
        .filter(([_, message]) => message) // Only include non-empty error messages
        .map(([field, message]) => {
          // Convert field names to more readable format
          const readableField = field
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
            .replace(/temp/i, '') // Remove 'temp' prefix
            .replace(/familyMember(\d+)([A-Za-z]+)/, 'Family Member $1 $2') // Format family member fields
            .trim();
          
          return `${readableField}: ${message}`;
        });
      
      // Only show validation errors if there are any
      if (errorMessages.length > 0) {
        setSubmitError(`Please correct the following errors:\n${errorMessages.join('\n')}`);
      }
      
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
      // Transform form data to match backend expectations
      const submissionData = transformFormDataForSubmission();
 
// DETAILED DEBUG LOGGING
    console.log('Full submission data:', submissionData);
    
    if (submissionData.familyMembers && submissionData.familyMembers.length > 0) {
      console.log('Family members detail:');
      submissionData.familyMembers.forEach((member, index) => {
        console.log(`Family member ${index + 1}:`, {
          name: `${member.firstName} ${member.lastName}`,
          gender: member.gender,
          genderType: typeof member.gender,
          genderLength: member.gender?.length,
          genderIsEmpty: member.gender === '',
          genderIsEmptyString: member.gender === ""
        });
      });
    }

        console.log('Submitting enrollment data:', submissionData);
      
      // Submit the form data to the server
      const response = await api.post('/enrollment', submissionData);
      
      // Handle successful submission
      setSubmitSuccess(true);
      
      // Show success message
      const successMessage = `Welcome to Wellbridge, ${formData.firstName}! Your enrollment has been successfully submitted.`;
      
      // Redirect to confirmation page
      navigate('/enrollment-confirmation', { 
        state: { 
          enrollmentData: response.data,
          memberName: `${formData.firstName} ${formData.lastName}`,
          successMessage: successMessage
        } 
      });
      
    } catch (error) {
      // Enhanced error handling
      console.error('Enrollment submission error:', error);
      
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response data:', error.response.data);
       
              // Handle specific validation error for gender
      if (error.response.data?.errors) {
        const genderErrors = error.response.data.errors.filter(err => 
          err.path && err.path.includes('gender')
        );
        
        if (genderErrors.length > 0) {
          console.error('Gender-specific errors:', genderErrors);
        }
      }

        // Format user-friendly error message based on server response
        if (error.response.data?.missingFields) {
          setSubmitError(`Missing required fields: ${error.response.data.missingFields.join(', ')}`);
        } else if (error.response.data?.error) {
          setSubmitError(error.response.data.error);
        } else {
          setSubmitError(error.response.data?.message || 'An error occurred while submitting your enrollment. Please try again.');
        }
      } else {
        setSubmitError('Network error. Please check your internet connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle membership type selection
  const handleMembershipTypeSelect = (type) => {
    setShowMembershipTypeModal(false);
  };


  //ADDONS
   // Update the handleChildAddonClick function
  const handleChildAddonClick = (addon) => {
    setSelectedChildAddons(prev => {
      // If the clicked addon is already selected, clear the selection
      if (prev.some(item => item.invtr_desc === addon.invtr_desc)) {
        setChildForms([]); // Clear child forms when deselecting
        return [];
      }
      // Otherwise, select only this addon
      const childCount = extractChildCount(addon.invtr_desc);
      
      // Initialize child forms based on the count
      const newChildForms = Array(childCount).fill().map(() => ({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "",
        mobile: "",
        home: "",
        email: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
      }));
      
      setChildForms(newChildForms);
      return [addon];
    });
  };
  
  // Function to handle changes to a specific child form
  const handleChildFormChange = (index, field, value) => {
    setChildForms(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };
  
  // Update the handleAddChildMember function to handle multiple children
  const handleAddChildMember = () => {
    // Validate all child forms
    const newErrors = {};
    
    childForms.forEach((child, index) => {
      // Validate required fields
      if (!child.firstName) newErrors[`child${index}FirstName`] = "First name is required";
      if (!child.lastName) newErrors[`child${index}LastName`] = "Last name is required";
      if (!child.dateOfBirth) newErrors[`child${index}DateOfBirth`] = "Date of birth is required";
      if (!child.gender) newErrors[`child${index}Gender`] = "Gender is required";
      if (!child.mobile) newErrors[`child${index}Mobile`] = "Mobile phone is required";
      
      // Validate phone numbers if provided
      const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
      if (child.mobile && !phoneRegex.test(child.mobile)) {
        newErrors[`child${index}Mobile`] = "Invalid mobile phone format";
      }
      if (child.home && !phoneRegex.test(child.home)) {
        newErrors[`child${index}Home`] = "Invalid home phone format";
      }
      
      // Validate age
      if (child.dateOfBirth) {
        const ageError = validateChildAge(child.dateOfBirth);
        if (ageError) {
          newErrors[`child${index}DateOfBirth`] = ageError;
        }
      }
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Add all children to family members
    const newFamilyMembers = childForms.map(child => ({
      memberType: "child",
      firstName: child.firstName,
      lastName: child.lastName,
      dateOfBirth: child.dateOfBirth,
      gender: child.gender,
      mobile: child.mobile,
      home: child.home,
      email: child.email,
      childAddons: selectedChildAddons,
    }));
    
    setFormData(prev => ({
      ...prev,
      familyMembers: [...prev.familyMembers, ...newFamilyMembers]
    }));
    
    // Switch back to members tab
    setActiveTab("members");
  };

  // Update handleAddYouthMember to remove work phone
  const handleAddYouthMember = () => {
    const newErrors = {};
    
    // Validate required fields
    if (!youthMember.firstName) newErrors.tempFirstName = "First name is required";
    if (!youthMember.lastName) newErrors.tempLastName = "Last name is required";
    if (!youthMember.dateOfBirth) newErrors.tempDateOfBirth = "Date of birth is required";
    if (!youthMember.gender) newErrors.tempGender = "Gender is required";
    if (!youthMember.cellPhone) newErrors.tempCellPhone = "Cell phone is required";

    // Validate phone numbers if provided
    if (youthMember.cellPhone && !/^\d{10}$/.test(youthMember.cellPhone.replace(/\D/g, ''))) {
      newErrors.tempCellPhone = "Please enter a valid cell phone number";
    }
    if (youthMember.homePhone && !/^\d{10}$/.test(youthMember.homePhone.replace(/\D/g, ''))) {
      newErrors.tempHomePhone = "Please enter a valid home phone number";
    }

    // Validate age
    if (youthMember.dateOfBirth) {
      if (!validateYouthAge(youthMember.dateOfBirth)) {
        const age = calculateAge(youthMember.dateOfBirth);
        newErrors.tempDateOfBirth = `You are ${age} years old. Youth members must be between 12 and 20 years old.`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }

    // Create new youth member
    const newYouthMember = {
      memberType: "youth",
      firstName: youthMember.firstName,
      lastName: youthMember.lastName,
      dateOfBirth: youthMember.dateOfBirth,
      gender: youthMember.gender,
      cellPhone: youthMember.cellPhone,
      homePhone: youthMember.homePhone,
      email: youthMember.email
    };

    // Add to family members
    setFormData(prev => ({
      ...prev,
      familyMembers: [...prev.familyMembers, newYouthMember]
    }));

    // Reset youth member form
    setYouthMember({
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
      cellPhone: "",
      homePhone: "",
      email: ""
    });

    // Switch back to members tab
    setActiveTab("members");
  };

  const handleServiceAddonClick = (addon) => {
    setSelectedServiceAddons((prev) => {
      const isSelected = prev.some(
        (item) => item.invtr_desc === addon.invtr_desc
      );
      if (isSelected) {
        return prev.filter((item) => item.invtr_desc !== addon.invtr_desc);
      } else {
        return [...prev, addon];
      }
    });
  };

  // Function to extract number of children from addon description
  const extractChildCount = (description) => {
    if (!description) return 0;
    
    // Check for Denver format (CAC prefix)
    const denverRegex = /CAC\s+(\d+)\s+(?:child|children)/i;
    const denverMatch = description.match(denverRegex);
    
    if (denverMatch && denverMatch[1]) {
      return parseInt(denverMatch[1], 10);
    }
    
    // Check for NMSW format (2020 prefix)
    const nmswRegex = /2020\s+(\d+)\s+(?:child|children)/i;
    const nmswMatch = description.match(nmswRegex);
    
    if (nmswMatch && nmswMatch[1]) {
      return parseInt(nmswMatch[1], 10);
    }
    
    // Default to 1 if no number is found
    return 1;
  };



  // Render the tabs based on membership type
  const renderTabs = () => {
    // Define the tabs that are always shown
    const commonTabs = [
      <button
        key="members"
        className={`tab ${activeTab === 'members' ? 'active' : ''}`}
        onClick={(e) => {e.preventDefault(); setActiveTab('members');}}
        role="tab"
        aria-selected={activeTab === 'members'}
      >
        Members
      </button>,
      <button
        key="services"
        className={`tab ${activeTab === 'services' ? 'active' : ''}`}
        onClick={(e) => {e.preventDefault(); setActiveTab('services');}}
        role="tab"
        aria-selected={activeTab === 'services'}
      >
        Additional Services
      </button>
    ];
