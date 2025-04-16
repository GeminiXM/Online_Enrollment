// frontend/src/components/EnrollmentForm.jsx
// This component displays a form to collect user information for a gym membership enrollment.
// It includes form validation, secure data handling, and follows accessibility best practices.

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api.js";
import "./EnrollmentForm.css";
import { useClub } from "../context/ClubContext";
import { useMembership } from "../context/MembershipContext";
import MembershipTypeModal from "./MembershipTypeModal";
import RestrictedMembershipMessage from "./RestrictedMembershipMessage";
import AddonButtons from "./AddonButtons";
import ServiceAddonButtons from './ServiceAddonButtons';

// Add this near the top of the file with other constants
const SPECIALTY_MEMBERSHIP_MAP = {
  junior: 'J',
  standard: '',
  senior: 'S',
  'young-professional': 'Y'  // For student/young professional
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
  
  // State for membership price
  const [bridgeCode, setBridgeCode] = useState("");
  const [membershipPrice, setMembershipPrice] = useState(0);
  const [membershipDescription, setMembershipDescription] = useState("");
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  // Additional price data
  const [membershipUpcCode, setMembershipUpcCode] = useState("");
  const [membershipTaxCode, setMembershipTaxCode] = useState("");
  const [proratedDuesInfo, setProratedDuesInfo] = useState({ upcCode: "", taxable: "" });
  // Prorated price state
  const [proratedPrice, setProratedPrice] = useState(0);

  // Check if membership type is passed in location state
  useEffect(() => {
    if (location.state && location.state.membershipType) {
      selectMembershipType(location.state.membershipType);
      setShowMembershipTypeModal(false);
    }
  }, [location, selectMembershipType]);
  
  // Fetch bridge code when membership type changes
  useEffect(() => {
    const fetchBridgeCode = async () => {
      if (!membershipType || !selectedClub) return;
      
      try {
        // Get the specialty membership code from the map
        const specialtyMembership = SPECIALTY_MEMBERSHIP_MAP[membershipType.id] || "";
        
        console.log("Fetching bridge code for:", {
          clubId: selectedClub.id,
          specialtyMembership
        });
        
        // Call the API to get the bridge code
        const response = await api.getSpecialtyMembershipBridgeCode(
          selectedClub.id, 
          specialtyMembership
        );
        
        if (response.success) {
          console.log("Bridge code fetched:", response.bridgeCode);
          setBridgeCode(response.bridgeCode);
        } else {
          console.error("Failed to fetch bridge code:", response.message);
        }
      } catch (error) {
        console.error("Error fetching bridge code:", error);
      }
    };
    
    fetchBridgeCode();
  }, [membershipType, selectedClub]);
  
  // Calculate prorated price based on start date and full price
  const calculateProratedPrice = (startDate, fullPrice) => {
    if (!startDate || !fullPrice) return 0;
    
    const start = new Date(startDate);
    const today = new Date();
    
    // Use requested start date if it's in the future, otherwise use today
    const effectiveDate = start > today ? start : today;
    
    // Get the last day of the month
    const lastDay = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Calculate days remaining in the month (including the start date)
    const daysRemaining = lastDay.getDate() - effectiveDate.getDate() + 1;
    
    // Calculate prorated price: (full price / days in month) * days remaining
    const prorated = (fullPrice / daysInMonth) * daysRemaining;
    
    // Round to 2 decimal places
    return Math.round(prorated * 100) / 100;
  };
  
  // Calculate prorated factor (percentage of month remaining)
  const calculateProratedFactor = (startDate) => {
    if (!startDate) return 1; // Default to full price if no start date
    
    const start = new Date(startDate);
    const today = new Date();
    
    // Use requested start date if it's in the future, otherwise use today
    const effectiveDate = start > today ? start : today;
    
    // Get the last day of the month
    const lastDay = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Calculate days remaining in the month (including the start date)
    const daysRemaining = lastDay.getDate() - effectiveDate.getDate() + 1;
    
    // Calculate prorated factor (percentage of month remaining)
    return daysRemaining / daysInMonth;
  };

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
  
  // Fetch price when bridge code or membership type changes
  useEffect(() => {
    const fetchPrice = async () => {
      if (!membershipType || !selectedClub) return;
      
      // Don't fetch price if we're still loading the bridge code
      if (membershipType && bridgeCode === "" && SPECIALTY_MEMBERSHIP_MAP[membershipType.id]) {
        return;
      }
      
      setIsLoadingPrice(true);
      
      try {
        // Get the specialty membership code from the map
        const specialtyMembership = SPECIALTY_MEMBERSHIP_MAP[membershipType.id] || "";
        
        // Determine the membership type (I/D/F) based on the selected membership
        let membershipTypeParam = "I"; // Default to Individual
        
        if (membershipType.id === "dual" || membershipType.id === "couple") {
          membershipTypeParam = "D"; // Dual
        } else if (membershipType.id === "family") {
          membershipTypeParam = "F"; // Family
        }
        
        console.log("Fetching price for:", {
          clubId: selectedClub.id,
          membershipType: membershipTypeParam,
          agreementType: "M", // Always Monthly as per requirements
          specialtyMembership,
          bridgeCode
        });
        
        // Call the API to get the price
        const response = await api.getMembershipPrice(
          selectedClub.id,
          membershipTypeParam,
          "M", // Always Monthly as per requirements
          specialtyMembership,
          bridgeCode
        );
        
        if (response.success) {
          console.log("Price fetched:", response.price);
          setMembershipPrice(response.price);
          setMembershipDescription(response.description || membershipType.title);
          
          // Store additional price data
          setMembershipUpcCode(response.upcCode || "");
          setMembershipTaxCode(response.taxCode || "");
          if (response.proratedDuesInfo) {
            setProratedDuesInfo({
              upcCode: response.proratedDuesInfo.upcCode || "",
              taxable: response.proratedDuesInfo.taxable || ""
            });
          }
          
          // Calculate prorated price based on start date
          if (formData.requestedStartDate) {
            const prorated = calculateProratedPrice(formData.requestedStartDate, response.price);
            setProratedPrice(prorated);
          }
          
          // Add price data to submission data for the cart
          const priceData = {
            price: response.price,
            description: response.description,
            upcCode: response.upcCode,
            taxCode: response.taxCode,
            proratedDuesInfo: response.proratedDuesInfo,
            bridgeCode: bridgeCode,
            specialtyMembership: SPECIALTY_MEMBERSHIP_MAP[membershipType.id] || "",
            proratedPrice: proratedPrice
          };
          
          console.log("Membership price data for cart:", priceData);
        } else {
          console.error("Failed to fetch price:", response.message);
        }
      } catch (error) {
        console.error("Error fetching price:", error);
      } finally {
        setIsLoadingPrice(false);
      }
    };
    
    fetchPrice();
  }, [bridgeCode, membershipType, selectedClub, formData?.requestedStartDate]);
  
  // Update prorated price when start date or full price changes
  useEffect(() => {
    if (formData.requestedStartDate && membershipPrice) {
      const prorated = calculateProratedPrice(formData.requestedStartDate, membershipPrice);
      setProratedPrice(prorated);
    }
  }, [formData.requestedStartDate, membershipPrice]);
  
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
      // Then convert empty string to "N" for validation (will be converted back to "" in backend)
      gender: formData.gender === "default" ? "N" : (formData.gender === "" ? "N" : formData.gender),
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
      familyMembers: [],
      // Add membership price and details
      membershipDetails: {
        price: membershipPrice,
        description: membershipDescription,
        bridgeCode: bridgeCode,
        upcCode: membershipUpcCode,
        taxCode: membershipTaxCode,
        proratedDuesInfo: proratedDuesInfo,
        proratedPrice: proratedPrice
      },
      // Additional information for tracking
      agreementType: 'M', // Always monthly as per requirements
      serviceAddons: selectedServiceAddons.map(addon => ({
        id: addon.invtr_id || '',
        description: addon.invtr_desc || '',
        price: addon.invtr_price ? parseFloat(addon.invtr_price) : 0,
        upcCode: addon.invtr_upccode || ''
      }))
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
      // Phone is optional for child members
      
      // Validate phone numbers if provided (only check for 10 digits)
      if (child.mobile && !/^\d{10}$/.test(child.mobile.replace(/\D/g, ''))) {
        newErrors[`child${index}Mobile`] = "Please enter 10 digits for phone number";
      }
      if (child.home && !/^\d{10}$/.test(child.home.replace(/\D/g, ''))) {
        newErrors[`child${index}Home`] = "Please enter 10 digits for phone number";
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
    // Phone is optional for youth members

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
    
    // For Junior membership, only show Members and Services tabs
    if (isJuniorMembership) {
      return commonTabs;
    }
    
    // For memberships that allow family members, show all tabs
    if (allowsFamilyMembers) {
      return [
        commonTabs[0], // Members tab
        <button
          key="new_adult"
          className={`tab ${activeTab === 'new_adult' ? 'active' : ''}`}
          onClick={(e) => {e.preventDefault(); setActiveTab('new_adult');}}
          role="tab"
          aria-selected={activeTab === 'new_adult'}
        >
          Add Adult
        </button>,
        <button
          key="child"
          className={`tab ${activeTab === 'child' ? 'active' : ''}`}
          onClick={(e) => {e.preventDefault(); setActiveTab('child');}}
          role="tab"
          aria-selected={activeTab === 'child'}
        >
          Add Child
        </button>,
        <button
          key="youth"
          className={`tab ${activeTab === 'youth' ? 'active' : ''}`}
          onClick={(e) => {e.preventDefault(); setActiveTab('youth');}}
          role="tab"
          aria-selected={activeTab === 'youth'}
        >
          Add Youth
        </button>,
        commonTabs[1] // Services tab
      ];
    }
    
    // For Student/Young Professional, show all tabs but with restricted functionality
    return [
      commonTabs[0], // Members tab
      <button
        key="new_adult"
        className={`tab ${activeTab === 'new_adult' ? 'active' : ''}`}
        onClick={(e) => {e.preventDefault(); setActiveTab('new_adult');}}
        role="tab"
        aria-selected={activeTab === 'new_adult'}
      >
        Add Adult
      </button>,
      <button
        key="child"
        className={`tab ${activeTab === 'child' ? 'active' : ''}`}
        onClick={(e) => {e.preventDefault(); setActiveTab('child');}}
        role="tab"
        aria-selected={activeTab === 'child'}
      >
        Add Child
      </button>,
      <button
        key="youth"
        className={`tab ${activeTab === 'youth' ? 'active' : ''}`}
        onClick={(e) => {e.preventDefault(); setActiveTab('youth');}}
        role="tab"
        aria-selected={activeTab === 'youth'}
      >
        Add Youth
      </button>,
      commonTabs[1] // Services tab
    ];
  };
  

  // Add a function to clear all temporary member errors when switching tabs
  const clearTempMemberErrors = () => {
    setErrors(prevErrors => {
      const clearedErrors = { ...prevErrors };
      Object.keys(clearedErrors).forEach(key => {
        if (key.startsWith('temp') || key.startsWith('familyMember')) {
          clearedErrors[key] = null;
        }
      });
      return clearedErrors;
    });
  };

 // Update the tab change handler to clear errors when switching tabs
  const handleTabChange = (tab) => {
    // Clear any submission errors
    setSubmitError("");
    
    // Only clear errors related to the tab being switched from
    // This preserves validation state when switching tabs
    setErrors(prevErrors => {
      const newErrors = { ...prevErrors };
      
      // Clear errors related to the previous tab
      if (activeTab === 'new_adult') {
        delete newErrors.tempFirstName;
        delete newErrors.tempLastName;
        delete newErrors.tempDateOfBirth;
        delete newErrors.tempGender;
        delete newErrors.tempEmail;
        delete newErrors.tempCellPhone;
        delete newErrors.tempHomePhone;
        delete newErrors.tempWorkPhone;
      } else if (activeTab === 'child') {
        delete newErrors.tempFirstName;
        delete newErrors.tempLastName;
        delete newErrors.tempDateOfBirth;
        delete newErrors.tempGender;
        delete newErrors.tempMobile;
        delete newErrors.tempHome;
        delete newErrors.tempEmail;
      } else if (activeTab === 'youth') {
        delete newErrors.tempFirstName;
        delete newErrors.tempLastName;
        delete newErrors.tempDateOfBirth;
        delete newErrors.tempGender;
        delete newErrors.tempCellPhone;
        delete newErrors.tempHomePhone;
        delete newErrors.tempEmail;
      }
      
      return newErrors;
    });
    
    // Reset temporary member states
    if (tab === 'new_adult') {
      setAdultMember({
        firstName: "",
        middleInitial: "",
        lastName: "",
        dateOfBirth: "",
        gender: "default",
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
    } else if (tab === 'child') {
      setChildMember({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "",
        mobile: "",
        home: "",
        email: ""
      });
    } else if (tab === 'youth') {
      setYouthMember({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "",
        cellPhone: "",
        homePhone: "",
        email: ""
      });
    }
    
    // Update active tab
    setActiveTab(tab);
  };


  // Calculate total cost of membership and services
  const calculateTotal = () => {
    let total = 0;
    if (membershipType) {
      total += membershipType.price;
    }
    if (formData.familyMembers.length > 0) {
      total += formData.familyMembers.length * 10; // Assuming $10 per family member
    }
    if (formData.services.personalTraining) {
      total += 50; // Assuming $50 per session
    }
    if (formData.services.groupClasses) {
      total += 25; // Assuming $25 per month
    }
    if (formData.services.childcare) {
      total += 15; // Assuming $15 per month
    }
    if (formData.services.locker) {
      total += 10; // Assuming $10 per month
    }
    return total;
  };

  // Render the tab content based on membership type and active tab
  const renderTabContent = () => {
    // For Student/Young Professional membership
    if (isYoungProfessionalMembership && ['new_adult', 'child', 'youth'].includes(activeTab)) {
      return (
        <RestrictedMembershipMessage 
          membershipType={membershipType} 
          onChangeMembershipType={() => setShowMembershipTypeModal(true)} 
        />
      );
    }
    
    // For all membership types
    switch (activeTab) {
      case 'members':
        return (
          <div className="tab-panel">
            <h3>Current Members</h3>
            <p>You are the primary member. {allowsFamilyMembers ? 'Add family members using the tabs above.' : ''}</p>
            <div className="member-card">
              <div className="member-info">
                <h4>Primary Member</h4>
                <p>Your membership includes access to all basic facilities.</p>
                <p><strong>Gender:</strong> {formData.gender === "" ? "Prefer not to say" : formData.gender}</p>
              </div>
            </div>
            
            {formData.familyMembers.length > 0 ? (
              formData.familyMembers.map(member => (
                <div className="member-card" key={member.id}>
                  <div className="member-info">
                    <h4>{member.firstName} {member.middleInitial ? member.middleInitial + '. ' : ''}{member.lastName}</h4>
                    <p>{member.memberType === 'adult' ? 'Adult' : member.memberType === 'child' ? 'Child' : 'Youth'} Member</p>
                    <p><strong>Gender:</strong> {member.gender === "" ? "Prefer not to say" : member.gender}</p>
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
        );
      
      case 'services':
        return (
          <div className="tab-panel">
            <h3>Additional Services</h3>
            <ServiceAddonButtons
              addons={addons}
              selectedAddons={selectedServiceAddons}
              onAddonClick={handleServiceAddonClick}
            />
          </div>
        );
      
      case 'new_adult':
        return (
          <div className="tab-panel">
            <h3>Add Adult Family Member</h3>
            <p>Add an adult family member to your membership.</p>
            
            <div className="form-row name-row">
              <div className="form-group">
                <label htmlFor="tempFirstName">
                  First Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="tempFirstName"
                  name="firstName"
                  value={adultMember.firstName}
                  onChange={handleTempMemberChange}
                  placeholder="Enter first name"
                  aria-required="true"
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
                <label htmlFor="tempMiddleInitial">
                  Initial
                </label>
                <input
                  type="text"
                  id="tempMiddleInitial"
                  name="middleInitial"
                  value={adultMember.middleInitial}
                  onChange={handleTempMemberChange}
                  placeholder="M.I."
                  maxLength="1"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="tempLastName">
                  Last Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="tempLastName"
                  name="lastName"
                  value={adultMember.lastName}
                  onChange={handleTempMemberChange}
                  placeholder="Enter last name"
                  aria-required="true"
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
            
            <div className="form-row birthdate-gender-email">
              <div className="form-group dob-field">
                <label htmlFor="tempDateOfBirth">
                  Date of Birth <span className="required">*</span>
                </label>
                <input
                  type="date"
                  id="tempDateOfBirth"
                  name="dateOfBirth"
                  value={adultMember.dateOfBirth}
                  onChange={handleTempMemberChange}
                  max={today}
                  aria-required="true"
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
                <label htmlFor="tempGender">
                  Gender <span className="required">*</span>
                </label>
                <select
                  id="tempGender"
                  name="gender"
                  value={adultMember.gender}
                  onChange={handleTempMemberChange}
                  aria-required="true"
                  aria-invalid={!!errors.tempGender}
                  aria-describedby={errors.tempGender ? "tempGender-error" : undefined}
                >
                  {genderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.tempGender && (
                  <div id="tempGender-error" className="error-message">
                    {errors.tempGender}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="tempEmail">
                  Email
                </label>
                <input
                  type="email"
                  id="tempEmail"
                  name="email"
                  value={adultMember.email}
                  onChange={handleTempMemberChange}
                  placeholder="Enter email address"
                  aria-invalid={!!errors.tempEmail}
                  aria-describedby={errors.tempEmail ? "tempEmail-error" : undefined}
                />
                {errors.tempEmail && (
                  <div id="tempEmail-error" className="error-message">
                    {errors.tempEmail}
                  </div>
                )}
              </div>
            </div>

            <div className="form-row phone-numbers">
              <div className="form-group">
                <label htmlFor="tempCellPhone">
                  Cell Phone
                </label>
                <input
                  type="tel"
                  id="tempCellPhone"
                  name="cellPhone"
                  value={adultMember.cellPhone}
                  onChange={handleTempMemberChange}
                  placeholder="Enter mobile phone"
                  aria-invalid={!!errors.tempCellPhone}
                  aria-describedby={errors.tempCellPhone ? "tempCellPhone-error" : undefined}
                />
                {errors.tempCellPhone && (
                  <div id="tempCellPhone-error" className="error-message">
                    {errors.tempCellPhone}
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="tempHomePhone">
                  Home Phone
                </label>
                <input
                  type="tel"
                  id="tempHomePhone"
                  name="homePhone"
                  value={adultMember.homePhone}
                  onChange={handleTempMemberChange}
                  placeholder="Enter home phone"
                  aria-invalid={!!errors.tempHomePhone}
                  aria-describedby={errors.tempHomePhone ? "tempHomePhone-error" : undefined}
                />
                {errors.tempHomePhone && (
                  <div id="tempHomePhone-error" className="error-message">
                    {errors.tempHomePhone}
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="tempWorkPhone">
                  Work Phone
                </label>
                <input
                  type="tel"
                  id="tempWorkPhone"
                  name="workPhone"
                  value={adultMember.workPhone}
                  onChange={handleTempMemberChange}
                  placeholder="Enter work phone"
                  aria-invalid={!!errors.tempWorkPhone}
                  aria-describedby={errors.tempWorkPhone ? "tempWorkPhone-error" : undefined}
                />
                {errors.tempWorkPhone && (
                  <div id="tempWorkPhone-error" className="error-message">
                    {errors.tempWorkPhone}
                  </div>
                )}
              </div>
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="add-member-button"
                onClick={() => addFamilyMember('adult')}
              >
                Add Adult Member
              </button>
            </div>
          </div>
        );
      
      case 'child':
        return (
          <div className="tab-panel">
            <h3>Add Child Family Member</h3>
            <p>Add a child family member (0-11 years) to your membership.</p>
              {/* Child program options */}
            <AddonButtons 
              addons={addons}
              selectedAddons={selectedChildAddons}
              onAddonClick={handleChildAddonClick}
            />
            
            {selectedChildAddons.length > 0 && childForms.length > 0 && (
              <div className="child-forms-container">
                <h4>Child Information</h4>
                <p>Please provide information for {childForms.length} {childForms.length === 1 ? 'child' : 'children'}.</p>
                
                {childForms.map((child, index) => (
                  <div key={index} className="child-form" style={{ 
                    backgroundColor: index % 2 === 0 ? '#f8f9fa' : '#ffffff',
                    padding: '20px',
                    marginBottom: '20px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <h5 style={{ 
                      color: '#2c3e50',
                      marginBottom: '15px',
                      paddingBottom: '10px',
                      borderBottom: '2px solid #e9ecef'
                    }}>Child {index + 1}</h5>
                    <div className="form-row name-row">
                      <div className="form-group">
                        <label htmlFor={`child${index}FirstName`}>
                          First Name <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          id={`child${index}FirstName`}
                          value={child.firstName}
                          onChange={(e) => handleChildFormChange(index, 'firstName', e.target.value)}
                          placeholder="Enter first name"
                          required
                        />
                        {errors[`child${index}FirstName`] && (
                          <span className="error-message">{errors[`child${index}FirstName`]}</span>
                        )}
                      </div>
                      
                      <div className="form-group middle-initial">
                        <label htmlFor={`child${index}MiddleInitial`}>
                          Initial
                        </label>
                        <input
                          type="text"
                          id={`child${index}MiddleInitial`}
                          value={child.middleInitial || ""}
                          onChange={(e) => handleChildFormChange(index, 'middleInitial', e.target.value)}
                          placeholder="M.I."
                          maxLength="1"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor={`child${index}LastName`}>
                          Last Name <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          id={`child${index}LastName`}
                          value={child.lastName}
                          onChange={(e) => handleChildFormChange(index, 'lastName', e.target.value)}
                          placeholder="Enter last name"
                          required
                        />
                        {errors[`child${index}LastName`] && (
                          <span className="error-message">{errors[`child${index}LastName`]}</span>
                        )}
                      </div>
                    </div>

                    <div className="form-row birthdate-gender-email">
                      <div className="form-group dob-field">
                        <label htmlFor={`child${index}DateOfBirth`}>
                          Date of Birth <span className="required">*</span>
                        </label>
                        <input
                          type="date"
                          id={`child${index}DateOfBirth`}
                          value={child.dateOfBirth}
                          onChange={(e) => handleChildFormChange(index, 'dateOfBirth', e.target.value)}
                          onBlur={(e) => {
                            if (e.target.value) {
                              const ageError = validateChildAge(e.target.value);
                              if (ageError) {
                                setErrors(prev => {
                                  const newErrors = {...prev};
                                  newErrors[`child${index}DateOfBirth`] = ageError;
                                  return newErrors;
                                });
                              }
                            }
                          }}
                          required
                        />
                        {errors[`child${index}DateOfBirth`] && (
                          <span className="error-message">{errors[`child${index}DateOfBirth`]}</span>
                        )}
                      </div>
                      <div className="form-group gender-field">
                        <label htmlFor={`child${index}Gender`}>
                          Gender <span className="required">*</span>
                        </label>
                        <select
                          id={`child${index}Gender`}
                          value={child.gender}
                          onChange={(e) => handleChildFormChange(index, 'gender', e.target.value)}
                          required
                        >
                          <option value="">Select gender</option>
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                          <option value="N">Prefer not to say</option>
                        </select>
                        {errors[`child${index}Gender`] && (
                          <span className="error-message">{errors[`child${index}Gender`]}</span>
                        )}
                      </div>
                                          
                      <div className="form-group email-field">
                        <label htmlFor={`child${index}Email`}>
                          Email
                        </label>
                        <input
                          type="email"
                          id={`child${index}Email`}
                          value={child.email}
                          onChange={(e) => handleChildFormChange(index, 'email', e.target.value)}
                          placeholder="Enter email address"
                        />
                      
                    </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor={`child${index}Mobile`}>
                          Cell Phone
                        </label>
                        <input
                          type="tel"
                          id={`child${index}Mobile`}
                          value={child.mobile}
                          onChange={(e) => handleChildFormChange(index, 'mobile', e.target.value)}
                          placeholder="Enter 10-digit phone number"
                          required
                        />
                        {errors[`child${index}Mobile`] && (
                          <span className="error-message">{errors[`child${index}Mobile`]}</span>
                        )}
                      </div>
                      <div className="form-group">
                        <label htmlFor={`child${index}Home`}>
                          Home Phone
                        </label>
                        <input
                          type="tel"
                          id={`child${index}Home`}
                          value={child.home}
                          onChange={(e) => handleChildFormChange(index, 'home', e.target.value)}
                          placeholder="Enter 10-digit phone number"
                        />
                        {errors[`child${index}Home`] && (
                          <span className="error-message">{errors[`child${index}Home`]}</span>
                        )}
                      </div>
                    </div>


                  </div>
                ))}
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="add-member-button"
                    onClick={handleAddChildMember}
                  >
                    Add {childForms.length} {childForms.length === 1 ? 'Child' : 'Children'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      
     case 'youth':
        return (
          <div className="tab-panel">
            <h3>Add Youth Family Member</h3>
            <p>Add a youth family member (12-20 years) to your membership.</p>
            
            <div className="form-row name-row">
              <div className="form-group">
                <label htmlFor="firstName">
                  First Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={youthMember.firstName}
                  onChange={handleTempMemberChange}
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
                  value={youthMember.middleInitial}
                  onChange={handleTempMemberChange}
                  placeholder="M.I."
                  maxLength="1"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="lastName">
                  Last Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={youthMember.lastName}
                  onChange={handleTempMemberChange}
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
            
            <div className="form-row birthdate-gender-email">
              <div className="form-group dob-field">
                <label htmlFor="dateOfBirth">
                  Date of Birth <span className="required">*</span>
                </label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={youthMember.dateOfBirth}
                  onChange={handleTempMemberChange}
                  onBlur={(e) => {
                    if (e.target.value) {
                      if (!validateYouthAge(e.target.value)) {
                        const age = calculateAge(e.target.value);
                        const ageError = `You are ${age} years old. Youth members must be between 12 and 20 years old.`;
                        setErrors(prev => ({
                          ...prev,
                          dateOfBirth: ageError
                        }));
                      }
                    }
                  }}
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
                  value={youthMember.gender}
                  onChange={handleTempMemberChange}
                  aria-required="true"
                  aria-invalid={!!errors.gender}
                  aria-describedby={errors.gender ? "gender-error" : undefined}
                >
                  <option value="">Select gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="N">Prefer not to say</option>
                </select>
                {errors.gender && (
                  <div id="gender-error" className="error-message">
                    {errors.gender}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={youthMember.email}
                  onChange={handleTempMemberChange}
                  placeholder="Enter email address"
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

            <div className="form-row phone-numbers">
              <div className="form-group">
                  <label htmlFor="cellPhone">
                    Cell Phone
                  </label>
                <input
                  type="tel"
                  id="cellPhone"
                  name="cellPhone"
                  value={youthMember.cellPhone}
                  onChange={handleTempMemberChange}
                  placeholder="Enter mobile phone"
                  aria-required="true"
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
                <label htmlFor="homePhone">
                  Home Phone
                </label>
                <input
                  type="tel"
                  id="homePhone"
                  name="homePhone"
                  value={youthMember.homePhone}
                  onChange={handleTempMemberChange}
                  placeholder="Enter home phone"
                  aria-invalid={!!errors.homePhone}
                  aria-describedby={errors.homePhone ? "homePhone-error" : undefined}
                />
                {errors.homePhone && (
                  <div id="homePhone-error" className="error-message">
                    {errors.homePhone}
                  </div>
                )}
              </div>
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="add-member-button"
                onClick={() => addFamilyMember('youth')}
              >
                Add Youth Member
              </button>
            </div>
          </div>
        );

      
      default:
        return null;
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



  

  // Calculate total monthly cost (ongoing)
  const calculateTotalCost = () => {
    let total = 0;
    
    // Add membership cost from the API
    if (isLoadingPrice) {
      total += membershipType?.price || 0; // Use default price while loading
    } else {
      total += membershipPrice || (membershipType?.price || 0);
    }
    
    // Add cost for family members
    if (formData.familyMembers.length > 0) {
      total += formData.familyMembers.length * 10; // Assuming $10 per family member
    }
    
    // Add cost for selected service addons
    if (selectedServiceAddons.length > 0) {
      selectedServiceAddons.forEach(addon => {
        if (addon.invtr_price) {
          total += parseFloat(addon.invtr_price);
        }
      });
    }
    
    // Add cost for selected child addons
    if (selectedChildAddons.length > 0) {
      selectedChildAddons.forEach(addon => {
        if (addon.invtr_price) {
          total += parseFloat(addon.invtr_price);
        }
      });
    }
    
    return total;
  };
  
  // Calculate total prorated cost (due now)
  const calculateTotalProratedCost = () => {
    if (!formData.requestedStartDate) return 0;
    
    // Get prorated factor (percentage of month remaining)
    const proratedFactor = calculateProratedFactor(formData.requestedStartDate);
    
    // Start with prorated membership price
    let total = proratedPrice;
    
    // Add prorated cost for family members
    if (formData.familyMembers.length > 0) {
      total += (formData.familyMembers.length * 10 * proratedFactor); // Prorate family member fees
    }
    
    // Add prorated cost for selected service addons
    if (selectedServiceAddons.length > 0) {
      selectedServiceAddons.forEach(addon => {
        if (addon.invtr_price) {
          total += parseFloat(addon.invtr_price) * proratedFactor; // Prorate addon fees
        }
      });
    }
    
    // Add prorated cost for selected child addons
    if (selectedChildAddons.length > 0) {
      selectedChildAddons.forEach(addon => {
        if (addon.invtr_price) {
          total += parseFloat(addon.invtr_price) * proratedFactor; // Prorate child addon fees
        }
      });
    }
    
    // Round to 2 decimal places
    return Math.round(total * 100) / 100;
  };

  return (
    <div className="enrollment-container">
      {/* Membership Type Modal */}
      <MembershipTypeModal 
        isOpen={showMembershipTypeModal} 
        onClose={() => setShowMembershipTypeModal(false)}
        onSelectMembershipType={handleMembershipTypeSelect}
      />

      <h1>{selectedClub.name} Membership Enrollment Form</h1>

      <p className="form-instructions">
        Please fill out the form below to enroll in our fitness facility. 
        Fields marked with an asterisk (*) are required.
      </p>

      {/* Display selected membership type if available */}
      {membershipType && (
        <div className="selected-membership-type">
          <span className="membership-type-badge">
            {membershipType.title} Membership
          </span>
          <p className="membership-type-description">
            You've selected the {membershipType.title} membership type. {membershipType.description}
            <button 
              onClick={() => setShowMembershipTypeModal(true)} 
              className="change-type-button"
            >
              Change Type
            </button>
          </p>
        </div>
      )}

      {/* Display submission error if any */}
      {submitError && (
        <div className="error-message form-error">
          {submitError}
        </div>
      )}

      <div className="enrollment-layout">
        {/* Main enrollment form */}
        <form className="enrollment-form" onSubmit={handleSubmit} noValidate>
          {/* Primary member form fields */}
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
          
          {isJuniorMembership ? (
            <>
              <h2>Youth Information</h2>
              <p className="guardian-notice">
                As this is a Junior membership (under 18), please provide information about the youth member.
              </p>
            </>
          ) : (
            <h2>Primary Member Information</h2>
          )}
          
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
                  placeholder="12345"
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
          
          {isJuniorMembership && (
            <>
              <div className="section-separator"></div>
              
              <h2>Legal Guardian Information</h2>
              <p className="guardian-notice">
                As this is a Junior membership (under 18), please provide information about the legal guardian.
              </p>
              
              <div className="guardian-info-section">
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
                  <div className="form-group dob-field">
                    <label htmlFor="guardianDateOfBirth">
                      Date of Birth <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      id="guardianDateOfBirth"
                      name="guardianDateOfBirth"
                      value={formData.guardianDateOfBirth || ""}
                      onChange={handleChange}
                      placeholder="MM/DD/YYYY"
                      aria-required="true"
                      aria-invalid={!!errors.guardianDateOfBirth}
                      aria-describedby={errors.guardianDateOfBirth ? "guardianDateOfBirth-error" : undefined}
                    />
                    {errors.guardianDateOfBirth && (
                      <div id="guardianDateOfBirth-error" className="error-message">
                        {errors.guardianDateOfBirth}
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group gender-field">
                    <label htmlFor="guardianGender">
                      Gender <span className="required">*</span>
                    </label>
                    <select
                      id="guardianGender"
                      name="guardianGender"
                      value={formData.guardianGender || ""}
                      onChange={handleChange}
                      aria-required="true"
                      aria-invalid={!!errors.guardianGender}
                      aria-describedby={errors.guardianGender ? "guardianGender-error" : undefined}
                    >
                      {genderOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.guardianGender && (
                      <div id="guardianGender-error" className="error-message">
                        {errors.guardianGender}
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group email-field">
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
                </div>
                
                <div className="form-row phone-row">
                  <div className="form-group">
                    <label htmlFor="mobilePhone">
                      Cell Phone 
                    </label>
                    <input
                      type="tel"
                      id="mobilePhone"
                      name="mobilePhone"
                      value={formData.mobilePhone}
                      onChange={handleChange}
                      placeholder="Enter 10-digit phone number"
                      aria-required="true"
                      aria-invalid={!!errors.mobilePhone}
                      aria-describedby={errors.mobilePhone ? "mobilePhone-error" : undefined}
                    />
                    
                    {errors.mobilePhone && (
                      <div id="mobilePhone-error" className="error-message">
                        {errors.mobilePhone}
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
            </>
          )}
          
          {!isJuniorMembership && (
            <>
              <div className="contact-info-section">
                <div className="form-row phone-row">
                  <div className="form-group">
                    <label htmlFor="mobilePhone">
                      Cell Phone 
                    </label>
                    <input
                      type="tel"
                      id="mobilePhone"
                      name="mobilePhone"
                      value={formData.mobilePhone}
                      onChange={handleChange}
                      placeholder="Enter 10-digit phone number"
                      aria-required="true"
                      aria-invalid={!!errors.mobilePhone}
                      aria-describedby={errors.mobilePhone ? "mobilePhone-error" : undefined}
                    />
                    <span className="message">*(one phone is required)</span>
                    {errors.mobilePhone && (
                      <div id="mobilePhone-error" className="error-message">
                        {errors.mobilePhone}
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
                    onClick={(e) => {e.preventDefault(); handleTabChange('members');}}
                    role="tab"
                    aria-selected={activeTab === 'members'}
                    type="button"
                  >
                    Members
                  </button>
                  <button
                    className={`tab ${activeTab === 'new_adult' ? 'active' : ''}`}
                    onClick={(e) => {e.preventDefault(); handleTabChange('new_adult');}}
                    role="tab"
                    aria-selected={activeTab === 'new_adult'}
                    type="button"
                  >
                    Add Adult
                  </button>
                  <button
                    className={`tab ${activeTab === 'child' ? 'active' : ''}`}
                    onClick={(e) => {e.preventDefault(); handleTabChange('child');}}
                    role="tab"
                    aria-selected={activeTab === 'child'}
                    type="button"
                  >
                    Add Child
                  </button>
                  <button
                    className={`tab ${activeTab === 'youth' ? 'active' : ''}`}
                    onClick={(e) => {e.preventDefault(); handleTabChange('youth');}}
                    role="tab"
                    aria-selected={activeTab === 'youth'}
                    type="button"
                  >
                    Add Youth
                  </button>
                  <button
                    className={`tab ${activeTab === 'services' ? 'active' : ''}`}
                    onClick={(e) => {e.preventDefault(); handleTabChange('services');}}
                    role="tab"
                    aria-selected={activeTab === 'services'}
                    type="button"
                  >
                    Additional Services
                  </button>
                </div>
                
                <div className="tab-content">
                  {renderTabContent()}
                </div>
              </div>
            </>
          )}
          
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

        {/* Shopping cart section */}
        <div className="shopping-cart">
          <h2>Your Membership</h2>
          <div className="cart-details">
            <div className="cart-item">
              <h3>{membershipType ? membershipType.title : 'Standard'} Membership</h3>
              
              {/* Due Now (Prorated) */}
              <div className="price-section prorated-price">
                <h4>Due Now (Prorated):</h4>
                <p className="price">
                  {isLoadingPrice ? (
                    <span>Loading price...</span>
                  ) : (
                    `$${proratedPrice.toFixed(2)}`
                  )}
                </p>
                <p className="price-detail">
                  Prorated for {formData.requestedStartDate ? formData.requestedStartDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2/$3/$1') : 'selected start date'} to end of month
                </p>
              </div>
              
              {/* Monthly Price Going Forward */}
              <div className="price-section monthly-price">
                <h4>Monthly Fee Going Forward:</h4>
                <p className="price">
                  {isLoadingPrice ? (
                    <span>Loading price...</span>
                  ) : (
                    `$${membershipPrice ? membershipPrice.toFixed(2) : (membershipType ? membershipType.price : '49.99')}/month`
                  )}
                </p>
              </div>
              
              <p className="description">
                {membershipDescription || (membershipType ? membershipType.description : 'Standard membership includes access to all basic facilities.')}
              </p>
              {bridgeCode && (
                <p className="membership-detail">Membership Code: {bridgeCode}</p>
              )}
            </div>
            
            {formData.familyMembers.length > 0 && (
              <div className="family-members-summary">
                <h3>Family Members ({formData.familyMembers.length})</h3>
                <ul>
                  {formData.familyMembers.map((member, index) => (
                    <li key={index}>
                      {member.firstName} {member.lastName} - {member.memberType === 'adult' ? 'Adult' : member.memberType === 'child' ? 'Child' : 'Youth'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {selectedChildAddons.length > 0 && (
              <div className="additional-services">
                <h3>Child Programs</h3>
                <ul>
                  {selectedChildAddons.map((addon, index) => {
                    // Calculate prorated price for this addon
                    const fullPrice = addon.invtr_price ? parseFloat(addon.invtr_price) : 0;
                    const proratedFactor = calculateProratedFactor(formData.requestedStartDate);
                    const proratedPrice = Math.round(fullPrice * proratedFactor * 100) / 100;
                    
                    return (
                      <li key={index}>
                        <div>{addon.invtr_desc}</div>
                        <div style={{fontSize: "0.8rem", marginTop: "0.1rem"}}>
                          <span style={{color: "#28a745"}}>Due now: ${proratedPrice.toFixed(2)}</span>
                          <span style={{color: "#666", marginLeft: "0.4rem"}}>Monthly: ${fullPrice.toFixed(2)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            
            {selectedServiceAddons.length > 0 && (
              <div className="additional-services">
                <h3>Additional Services</h3>
                <ul>
                  {selectedServiceAddons.map((addon, index) => {
                    // Calculate prorated price for this addon
                    const fullPrice = addon.invtr_price ? parseFloat(addon.invtr_price) : 0;
                    const proratedFactor = calculateProratedFactor(formData.requestedStartDate);
                    const proratedPrice = Math.round(fullPrice * proratedFactor * 100) / 100;
                    
                    return (
                      <li key={index}>
                        <div>{addon.invtr_desc}</div>
                        <div style={{fontSize: "0.8rem", marginTop: "0.1rem"}}>
                          <span style={{color: "#28a745"}}>Due now: ${proratedPrice.toFixed(2)}</span>
                          <span style={{color: "#666", marginLeft: "0.4rem"}}>Monthly: ${fullPrice.toFixed(2)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            
            <div className="cart-total">
              <div className="due-now-total">
                <h3>Total Due Now</h3>
                <p className="total-price">
                  ${calculateTotalProratedCost().toFixed(2)}
                </p>
                <p className="price-detail">
                  Prorated from {formData.requestedStartDate ? formData.requestedStartDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2/$3/$1') : 'selected date'} to end of month
                </p>
              </div>
              <div className="monthly-total">
                <h3>Monthly Cost Going Forward</h3>
                <p className="total-price">${calculateTotalCost().toFixed(2)}/month</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnrollmentForm;
