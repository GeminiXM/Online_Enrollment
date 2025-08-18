// frontend/src/components/EnrollmentForm.jsx
// This component displays a form to collect user information for a gym membership enrollment.
// It includes form validation, secure data handling, and follows accessibility best practices.

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api.js";
import "./EnrollmentForm.css";
import { useClub } from "../context/ClubContext";
import { useMembership } from "../context/MembershipContext";
import RestrictedMembershipMessage from "./RestrictedMembershipMessage";
import AddonButtons from "./AddonButtons";
import ServiceAddonButtons from './ServiceAddonButtons';
import PersonalTrainingModal from './PersonalTrainingModal';
import { 
  autoSaveFormData, 
  restoreFormData, 
  saveDraftToBackend, 
  restoreDraftFromBackend, 
  clearSavedData, 
  hasSavedData, 
  getSessionInfo 
} from "../services/dataPersistence.js";

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

// Utility function to format dates without timezone shifts
const formatDateWithoutTimezoneShift = (dateString) => {
  if (!dateString) return '';
  
  // Parse the date string - avoid timezone shifts by handling parts manually
  const parts = dateString.split(/[-T]/);
  if (parts.length >= 3) {
    const year = parseInt(parts[0], 10);
    // JavaScript months are 0-based, so subtract 1 from the month
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    // Create date with specific year, month, day in local timezone
    const date = new Date(year, month, day);
    
    // Format to mm/dd/yyyy
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  }
  
  // Fallback for unexpected format
  return dateString;
};

// Add this function near the other utility functions at the top of the file
const determineMembershipTypeByAge = (dateOfBirth) => {
  const age = calculateAge(dateOfBirth);
  if (age === null) return null;

  // Define membership types based on age ranges
  if (age < 18) {
    return {
      id: 'junior',
      title: 'Junior',
      description: 'For members under 18 years old',
      price: 0
    };
  } else if (age >= 18 && age <= 29) {
    return {
      id: 'young-professional',
      title: 'Student/Young Professional',
      description: 'For members between 18-29 years old',
      price: 0
    };
  } else if (age >= 65) {
    return {
      id: 'senior',
      title: 'Senior',
      description: 'For members 65 years and older',
      price: 0
    };
  } else {
    return {
      id: 'standard',
      title: 'Standard',
      description: 'For members between 30-64 years old',
      price: 0
    };
  }
};

// Session management (if needed in the future)
// const [sessionId] = useState(() => {
//   return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
// });

function EnrollmentForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedClub } = useClub();
  const { membershipType, selectMembershipType } = useMembership();
  
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
  // Store the determined membership type (I/D/F)
  const [determinedMembershipType, setDeterminedMembershipType] = useState("I");
  // Tax rate state - default value in case API call fails
  const [taxRate, setTaxRate] = useState(0.07625);
  const [taxAmount, setTaxAmount] = useState(0);
  const [proratedTaxAmount, setProratedTaxAmount] = useState(0);

  const [showPTModal, setShowPTModal] = useState(false);
  const [hasPTAddon, setHasPTAddon] = useState(false);
  const [ptPackage, setPtPackage] = useState(null);
  const [formSubmissionData, setFormSubmissionData] = useState(null);

  const [showStartDateInfo, setShowStartDateInfo] = useState(false);

  // Auto-save functionality
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);

  // Check if data is passed in location state
  useEffect(() => {
    // Check for membership type
    if (location.state && location.state.membershipType) {
      selectMembershipType(location.state.membershipType);
    }
    
    // Check for form data when returning from contract page
    if (location.state && location.state.formData) {
      const contractData = location.state.formData;
      console.log("Form data returned from contract page:", contractData);
      
      // Reconstruct form data from contract data
      const reconstructedFormData = {
        // Primary member info
        firstName: contractData.firstName || "",
        lastName: contractData.lastName || "",
        middleInitial: contractData.middleInitial || "",
        dateOfBirth: contractData.dateOfBirth || "",
        gender: contractData.gender === "N" ? "" : (contractData.gender || "default"),
        email: contractData.email || "",
        address1: contractData.address || "",
        address2: contractData.address2 || "",
        city: contractData.city || "",
        state: contractData.state || "",
        zipCode: contractData.zipCode || "",
        mobilePhone: contractData.cellPhone || contractData.mobilePhone || "",
        // homePhone: contractData.homePhone || "",
        // workPhone: contractData.workPhone || "",
        requestedStartDate: contractData.requestedStartDate || "",
        
        // Ensure family members are properly reconstructed with all necessary fields
        familyMembers: (contractData.familyMembers || []).map(member => ({
          id: member.id || Date.now() + Math.random(), // Ensure unique ID
          firstName: member.firstName || "",
          lastName: member.lastName || "",
          middleInitial: member.middleInitial || "",
          dateOfBirth: member.dateOfBirth || "",
          gender: member.gender === "N" ? "" : (member.gender || "default"),
          email: member.email || "",
          cellPhone: member.cellPhone || "",
            // homePhone: member.homePhone || "",
            // workPhone: member.workPhone || "",
          memberType: member.memberType || "adult", // Default to adult if not specified
          role: member.role || "S" // Default to secondary if not specified
        })),
        
        // Preserve other fields
        services: formData.services
      };
      
      // Update form data with reconstructed data
      setFormData(reconstructedFormData);
      
      // Set the service addons if available
      if (contractData.serviceAddons && contractData.serviceAddons.length > 0) {
        // Ensure we have all necessary addon properties
        const reconstructedAddons = contractData.serviceAddons.map(addon => ({
          invtr_id: addon.id || "",
          invtr_desc: addon.description || "",
          invtr_price: addon.price || 0,
          invtr_upccode: addon.upcCode || ""
        }));
        setSelectedServiceAddons(reconstructedAddons);
      }
      
      // Set membership price data if available
      if (contractData.membershipDetails) {
        const details = contractData.membershipDetails;
        setMembershipPrice(details.price || 0);
        setMembershipDescription(details.description || "");
        setBridgeCode(details.bridgeCode || "");
        setMembershipUpcCode(details.upcCode || "");
        setMembershipTaxCode(details.taxCode || "");
        setProratedPrice(details.proratedPrice || 0);
        
        if (details.proratedDuesInfo) {
          setProratedDuesInfo({
            upcCode: details.proratedDuesInfo.upcCode || "",
            taxable: details.proratedDuesInfo.taxable || ""
          });
        }
      }
      
      // Set specialty membership from the contract data
      if (contractData.specialtyMembership) {
        // Find the corresponding key in SPECIALTY_MEMBERSHIP_MAP for this value
        const specialtyKey = Object.keys(SPECIALTY_MEMBERSHIP_MAP).find(
          key => SPECIALTY_MEMBERSHIP_MAP[key] === contractData.specialtyMembership
        );
        
        if (specialtyKey && membershipType?.id !== specialtyKey) {
          // Find the membership type object that matches this key
          const availableMembershipTypes = [
            { id: 'standard', title: 'Standard Adult', description: 'For adults between 30-64 years old' },
            { id: 'senior', title: 'Senior', description: 'For adults 65 and older' },
            { id: 'young-professional', title: 'Student/Young Professional', description: 'For adults between 18-29 years old' },
            { id: 'junior', title: 'Junior', description: 'For children under 18 years old' }
          ];
          
          const matchingType = availableMembershipTypes.find(type => type.id === specialtyKey);
          if (matchingType) {
            selectMembershipType(matchingType);
          }
        }
      }
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
  
  // Calculate date 7 days from today for max attribute of date inputs
  const sevenDaysFromToday = new Date();
  sevenDaysFromToday.setDate(sevenDaysFromToday.getDate() + 7);
  const maxDate = sevenDaysFromToday.toISOString().split('T')[0];
  
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
    // homePhone: "",
    // workPhone: "",
    
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
  
  // Determine membership type (I/D/F) based on member composition
  const determineMembershipType = useCallback(() => {
    // Count adults (primary and family members who are adults)
    const adultsCount = 1 + formData.familyMembers.filter(member => 
      member.memberType === 'adult').length;
    
    // Count children under 12
    const childrenUnder12Count = formData.familyMembers.filter(member => 
      member.memberType === 'child').length;
    
    // Count youth (12+ years old)
    const youthCount = formData.familyMembers.filter(member => 
      member.memberType === 'youth').length;
    
    // Check if club is in New Mexico based on state
    const isNewMexicoClub = selectedClub?.state === 'NM';
    
    // Apply membership type rules
    if (adultsCount === 1 && childrenUnder12Count > 0 && youthCount === 0) {
      // One adult with children under 12 = Individual (I)
      return "I";
    } else if (adultsCount === 1 && youthCount > 0) {
      // One adult with youth 12+ = Dual (D)
      return "D";
    } else if (adultsCount === 2 && !isNewMexicoClub) {
      // Two adults (with or without children) in Denver = Dual (D)
      return "D";
    } else if (adultsCount >= 2 && childrenUnder12Count > 0 && isNewMexicoClub) {
      // Two adults WITH CHILDREN in New Mexico = Family (F)
      // Modified to check that there are actually children added
      return "F";
    } else if (adultsCount === 2) {
      // Two adults (without children) = Dual (D)
      // This will now work for NM clubs too when no children are actually added
      return "D";
    } else if (adultsCount === 1) {
      // One adult = Individual (I)
      return "I";
    } else {
      // Default fallback
      return "I";
    }
  }, [formData.familyMembers, selectedClub]);

  // Update membership type when family composition changes
  useEffect(() => {
    const newMembershipTypeValue = determineMembershipType();
    console.log(`Determined membership type: ${newMembershipTypeValue} based on family composition`);
    
    // Check for New Mexico clubs
    const isNewMexicoClub = selectedClub?.state === 'NM';
    
    // If membership type is changing in New Mexico clubs
    if (isNewMexicoClub && newMembershipTypeValue !== determinedMembershipType) {
      // If changing to Family, remove Child Addon from shopping cart
      if (newMembershipTypeValue === 'F') {
        setSelectedChildAddons([]);
        console.log('Removed Child Addon from cart for Family membership in New Mexico');
      }
      
      // Always reset child forms when membership type changes for New Mexico clubs
      setChildForms([]);
      console.log(`Membership type changed from ${determinedMembershipType} to ${newMembershipTypeValue} - reset child forms`);
    }
    
    // Store the determined membership type in state
    setDeterminedMembershipType(newMembershipTypeValue);
  }, [formData.familyMembers, determineMembershipType, selectedClub, determinedMembershipType]);

  // Trigger price refresh when membership type changes due to family composition changes
  useEffect(() => {
    // Skip on initial render
    if (membershipType && selectedClub && bridgeCode) {
      console.log(`Refreshing price based on new membership type: ${determinedMembershipType}`);
      
      // Force an explicit price refresh by calling the API directly
      const fetchUpdatedPrice = async () => {
        try {
          const specialtyMembership = SPECIALTY_MEMBERSHIP_MAP[membershipType.id] || "";
          
          console.log("Fetching updated price for:", {
            clubId: selectedClub.id,
            membershipType: determinedMembershipType, // Use determined type (I/D/F)
            agreementType: "M",
            specialtyMembership,
            bridgeCode
          });
          
          const response = await api.getMembershipPrice(
            selectedClub.id,
            determinedMembershipType, // Use determined type (I/D/F)
            "M",
            specialtyMembership,
            bridgeCode
          );
          
          if (response.success) {
            console.log("Updated price fetched:", response.price);
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
            
            // Update prorated price based on start date
            if (formData.requestedStartDate) {
              const prorated = calculateProratedPrice(formData.requestedStartDate, response.price);
              setProratedPrice(prorated);
            }
          }
        } catch (error) {
          console.error("Error fetching updated price:", error);
        }
      };
      
      // Only fetch updated price if family composition has changed from individual
      if (determinedMembershipType !== "I") {
        fetchUpdatedPrice();
      }
    }
  }, [determinedMembershipType, membershipType, selectedClub, bridgeCode, formData.requestedStartDate]);

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
        
        // Determine the membership type (I/D/F) based on family composition
        let membershipTypeParam = determineMembershipType();
        
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
  }, [bridgeCode, membershipType, selectedClub, formData?.requestedStartDate, determinedMembershipType]);
  
  // Update prorated price when start date or full price changes
  useEffect(() => {
    if (formData.requestedStartDate && membershipPrice) {
      const prorated = calculateProratedPrice(formData.requestedStartDate, membershipPrice);
      setProratedPrice(prorated);
      
      // Only apply tax for New Mexico clubs (state is NM)
      const isNewMexicoClub = selectedClub?.state === 'NM';
      const effectiveTaxRate = isNewMexicoClub ? taxRate : 0;
      
      // Calculate tax amount for total taxable amount (enrollment fee + prorated price)
      const enrollmentFee = 19.0; // $19 enrollment fee
      const totalTaxableAmount = enrollmentFee + prorated;
      const proratedTax = Number((totalTaxableAmount * effectiveTaxRate).toFixed(2));
      setProratedTaxAmount(proratedTax);
      
      // Calculate tax for full membership price
      const fullTax = Number((membershipPrice * effectiveTaxRate).toFixed(2));
      setTaxAmount(fullTax);
      
      console.log(`Tax calculation: isNewMexicoClub=${isNewMexicoClub}, effectiveTaxRate=${effectiveTaxRate}, fullTax=${fullTax}`);
    }
  }, [formData.requestedStartDate, membershipPrice, taxRate, selectedClub]);
  
  // Fetch tax rate when club changes
  useEffect(() => {
    const fetchTaxRate = async () => {
      if (!selectedClub) return;
      
      try {
        const response = await api.getTaxRate(selectedClub.id);
        
        if (response.success) {
          console.log("Tax rate fetched:", response.taxRate);
          setTaxRate(response.taxRate);
        } else {
          console.error("Failed to fetch tax rate:", response.message);
        }
      } catch (error) {
        console.error("Error fetching tax rate:", error);
      }
    };
    
    fetchTaxRate();
  }, [selectedClub]);

  // State for form submission status
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
    // homePhone: "",
    // workPhone: "",
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
    // homePhone: "",
    // workPhone: "",
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
      // homePhone: formData.homePhone ? formData.homePhone.replace(/\D/g, '') : '',
      // workPhone: formData.workPhone ? formData.workPhone.replace(/\D/g, '') : '',
      // Get the correct membership type code based on family composition
      membershipType: determineMembershipType(),  // This will return "I", "D", or "F" based on family members
      // Keep specialty membership separate
      specialtyMembership: membershipType ? SPECIALTY_MEMBERSHIP_MAP[membershipType.id] : '',
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
        proratedPrice: proratedPrice,
        taxRate: taxRate,
        taxAmount: taxAmount,
        proratedTaxAmount: proratedTaxAmount
      },
      // Additional information for tracking
      agreementType: 'M', // Always monthly as per requirements
      serviceAddons: selectedServiceAddons.map(addon => ({
        id: addon.invtr_id || '',
        description: addon.invtr_desc || '',
        price: addon.invtr_price ? parseFloat(addon.invtr_price) : 0,
        upcCode: addon.invtr_upccode || ''
      })),
      childAddons: selectedChildAddons.map(addon => ({
        id: addon.invtr_id || '',
        description: addon.invtr_desc || '',
        price: addon.invtr_price ? parseFloat(addon.invtr_price) : 0,
        upcCode: addon.invtr_upccode || ''
      })),
      // Add prorated addon values for backend calculation
      proratedAddOns: formData.proratedAddOns || 0,
      proratedAddOnsTax: formData.proratedAddOnsTax || 0,
      // Add prorated dues values for backend calculation
      proratedDues: formData.proratedDues || 0,
      proratedDuesTax: formData.proratedDuesTax || 0,
      // Add enrollment fee
      initiationFee: '19.00',
      // Add PT selection
      hasPTAddon: hasPTAddon || false,
      // Add PT package data if available
      ptPackage: ptPackage || null
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
      console.log('Original family members in formData:', formData.familyMembers);
      submissionData.familyMembers = formData.familyMembers.map(member => {
        // Determine role based on member type
        const role = member.memberType === 'adult' ? 'S' : 'D';
      
        // Use "N" for empty strings to pass the validation
    // You can adjust this to any value that makes sense in your system
    const genderValue = member.gender === "" ? "N" : member.gender;

        const transformedMember = {
          firstName: member.firstName,
          lastName: member.lastName,
          middleInitial: member.middleInitial || '',
          dateOfBirth: member.dateOfBirth,
          gender: genderValue, // Use adjusted gender value
          email: member.email || '',
          cellPhone: member.cellPhone ? member.cellPhone.replace(/\D/g, '') : '',
          // homePhone: member.homePhone ? member.homePhone.replace(/\D/g, '') : '',
          // workPhone: member.workPhone ? member.workPhone.replace(/\D/g, '') : '',
          role: role,
          memberType: member.memberType
        };
        console.log('Transformed member:', transformedMember);
        return transformedMember;
      });
      console.log('Final family members in submissionData:', submissionData.familyMembers);
    }
    
    // Add guardian information for Junior memberships
    if (isJuniorMembership) {
      // Store guardian info in a nested object for backend processing
      submissionData.guardian = {
        firstName: formData.guardianFirstName,
        lastName: formData.guardianLastName,
        middleInitial: formData.guardianMiddleInitial || '',
        dateOfBirth: formData.guardianDateOfBirth,
        gender: formData.guardianGender === "default" ? "" : formData.guardianGender,
        email: formData.guardianEmail,
        relationship: formData.guardianRelationship,
        cellPhone: formData.mobilePhone ? formData.mobilePhone.replace(/\D/g, '') : ''
        // homePhone: formData.homePhone ? formData.homePhone.replace(/\D/g, '') : '',
        // workPhone: formData.workPhone ? formData.workPhone.replace(/\D/g, '') : ''
      };
      
      // Also add guardian fields directly to the main object for ContractPage display
      submissionData.guardianFirstName = formData.guardianFirstName;
      submissionData.guardianLastName = formData.guardianLastName;
      submissionData.guardianMiddleInitial = formData.guardianMiddleInitial || '';
      submissionData.guardianDateOfBirth = formData.guardianDateOfBirth;
      submissionData.guardianGender = formData.guardianGender === "default" ? "" : formData.guardianGender;
      submissionData.guardianEmail = formData.guardianEmail;
      submissionData.guardianRelationship = formData.guardianRelationship;
      submissionData.guardianPhone = formData.mobilePhone; // Use mobile as primary guardian phone
    }
    
    return submissionData;
  };

  // Handle input changes for the main form
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // If this is a date of birth change, determine membership type
    if (name === 'dateOfBirth') {
      const newMembershipType = determineMembershipTypeByAge(value);
      if (newMembershipType) {
        selectMembershipType(newMembershipType);
        
        // Validate the age for the new membership type
        const ageError = validateAgeForMembershipType(value, newMembershipType);
        if (ageError) {
          setErrors(prevErrors => ({
            ...prevErrors,
            dateOfBirth: ageError
          }));
        } else {
          setErrors(prevErrors => ({
            ...prevErrors,
            dateOfBirth: null
          }));
        }
      }
    }
    
    // If this is a start date change, validate it's not in the past
    if (name === 'requestedStartDate') {
      if (value) {
        const selectedDate = new Date(value);
        const today = new Date();
        // Reset time to start of day for accurate comparison
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          setErrors(prevErrors => ({
            ...prevErrors,
            requestedStartDate: "Start date cannot be in the past. Please select today or a future date."
          }));
        } else {
          setErrors(prevErrors => ({
            ...prevErrors,
            requestedStartDate: null
          }));
        }
      }
    }

    // Clear errors when field is changed
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
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
        const isValidDate = year > 1920 && year <= new Date().getFullYear() &&
                           month >= 1 && month <= 12 &&
                           day >= 1 && day <= 31;
        
        if (isValidDate) {
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
            // Clear the error if validation passes
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
        const age = calculateAge(memberData.dateOfBirth);
        if (age < 12 || age > 20) {
          newErrors.tempDateOfBirth = `You are ${age} years old. Youth members must be between 12 and 20 years old.`;
        }
      }
    }
    
    // Update gender validation to handle both empty strings and "default"
    if (memberData.gender === "default") {
      newErrors.tempGender = "Please select a gender or choose 'Prefer not to say'";
    }
    
    // For adult members, require either email or phone
    if (memberType === 'adult') {
      const hasEmail = memberData.email && memberData.email.trim();
      const hasPhone = memberData.cellPhone && memberData.cellPhone.trim();
      
      if (!hasEmail && !hasPhone) {
        newErrors.tempEmail = "Email or phone number is required for adult members";
        newErrors.tempCellPhone = "Email or phone number is required for adult members";
      }
    }
    
    // Validate email if provided
    if (memberData.email && !isValidEmail(memberData.email.trim())) {
      newErrors.tempEmail = "Please enter a valid email address";
    }
    
    // Validate phone numbers if provided
    if (memberData.cellPhone && !/^\d{10}$/.test(memberData.cellPhone.replace(/\D/g, ''))) {
      newErrors.tempCellPhone = "Please enter a valid phone number";
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
        cellPhone: ''
      });
    } else if (memberType === 'child') {
      setChildMember({
        firstName: '',
        middleInitial: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'default',
        email: '',
        cellPhone: ''
      });
    } else {
      setYouthMember({
        firstName: '',
        middleInitial: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'default',
        email: '',
        cellPhone: ''
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

  
  // Handle form submission - COMPLETELY REDESIGNED to work in all cases
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submission started - USING DIRECT NAVIGATION");

    // Clear any previous error
    setSubmitError("");
    
    try {
      // Do minimal validation for primary fields only
      const newErrors = {};
      
      // Validate all required fields
      if (!formData.firstName) {
        newErrors.firstName = "First name is required";
      }
      
      if (!formData.lastName) {
        newErrors.lastName = "Last name is required";
      }
      
      if (!formData.dateOfBirth) {
        newErrors.dateOfBirth = "Date of birth is required";
      }
      
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
        newErrors.mobilePhone = "At least one phone number is required";
      }
      
      // Validate start date - must not be in the past
      if (!formData.requestedStartDate) {
        newErrors.requestedStartDate = "Requested start date is required";
      } else {
        const selectedDate = new Date(formData.requestedStartDate);
        const today = new Date();
        // Reset time to start of day for accurate comparison
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          newErrors.requestedStartDate = "Start date cannot be in the past. Please select today or a future date.";
        }
      }
      
      // Add validation for Junior memberships - check guardian fields
      if (isJuniorMembership) {
        if (!formData.guardianFirstName) {
          newErrors.guardianFirstName = "Guardian first name is required";
        }
        
        if (!formData.guardianLastName) {
          newErrors.guardianLastName = "Guardian last name is required";
        }
        
        if (!formData.guardianDateOfBirth) {
          newErrors.guardianDateOfBirth = "Guardian date of birth is required";
        }

        if (!formData.guardianDateOfBirth) {
          newErrors.guardianGender = "Guardian gender is required";
        }
        
        if (!formData.guardianEmail) {
          newErrors.guardianEmail = "Guardian email is required";
        } else if (!isValidEmail(formData.guardianEmail)) {
          newErrors.guardianEmail = "Please enter a valid guardian email address";
        }
        
        if (!formData.guardianRelationship) {
          newErrors.guardianRelationship = "Guardian relationship is required";
        }
        
        if (!formData.guardianConsent) {
          newErrors.guardianConsent = "You must confirm that you are the legal guardian";
        }
      }
      
      // Show errors if any required fields are missing
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        
        // Set appropriate error message based on the types of errors
        let errorMessage = "";
        
        // If there are guardian errors for Junior membership, show a specific message
        if (isJuniorMembership && (
          newErrors.guardianFirstName || 
          newErrors.guardianLastName || 
          newErrors.guardianDateOfBirth || 
          newErrors.guardianGender || 
          newErrors.guardianEmail || 
          newErrors.guardianRelationship || 
          newErrors.guardianConsent
        )) {
          errorMessage = "Please complete all required guardian information fields before continuing.";
        } else {
          // Create a dynamic error message based on the actual missing fields
          const missingFields = [];
          
          if (newErrors.firstName) missingFields.push("first name");
          if (newErrors.lastName) missingFields.push("last name");
          if (newErrors.dateOfBirth) missingFields.push("date of birth");
          if (newErrors.gender) missingFields.push("gender");
          if (newErrors.email) missingFields.push("email");
          if (newErrors.address1) missingFields.push("address");
          if (newErrors.city) missingFields.push("city");
          if (newErrors.state) missingFields.push("state");
          if (newErrors.zipCode) missingFields.push("ZIP code");
          if (newErrors.mobilePhone) missingFields.push("phone number");
          if (newErrors.requestedStartDate) missingFields.push("start date");
          
          if (missingFields.length > 0) {
            if (missingFields.length === 1) {
              errorMessage = `Please provide your ${missingFields[0]} to continue.`;
            } else if (missingFields.length === 2) {
              errorMessage = `Please provide your ${missingFields[0]} and ${missingFields[1]} to continue.`;
            } else {
              const lastField = missingFields.pop();
              errorMessage = `Please provide your ${missingFields.join(', ')}, and ${lastField} to continue.`;
            }
          } else {
            errorMessage = "Please complete all required fields before continuing.";
          }
        }
        
        setSubmitError(errorMessage);
        
        // Focus on the first missing field
        const firstField = Object.keys(newErrors)[0];
        document.getElementById(firstField)?.focus();
        return;
      }
      
      // Transform form data for submission
      const submissionData = transformFormDataForSubmission();
      console.log("Preparing to show PT modal with data", submissionData);
      
      // Store the submission data and show PT modal
      setFormSubmissionData(submissionData);
      setShowPTModal(true);
      
      // Clear saved data since we're proceeding with submission
      await clearSavedData();
    } catch (error) {
      console.error("Error during form submission:", error);
      setSubmitError("An unexpected error occurred. Please try again.");
    }
  };

  const handlePTAccept = async () => {
    console.log('PT Accept clicked!');
    setShowPTModal(false);
    
    let ptPackageData;
    
    try {
      // Fetch PT package from API
      console.log('Fetching PT package for club:', selectedClub.id);
      const response = await fetch(`/api/enrollment/pt-package?clubId=${selectedClub.id}`);
      const data = await response.json();
      
      console.log('PT package API response:', data);
      
      if (data.success && data.ptPackage) {
        ptPackageData = data.ptPackage[0]; // Get the first item from the array
        console.log('PT package data:', ptPackageData);
        setPtPackage(data.ptPackage);
        setHasPTAddon(true);
      } else {
        // Fallback to default if API fails
        ptPackageData = { price: 149, description: "4 Sessions with a Trainer/Instructor" };
        console.log('Using fallback PT package data:', ptPackageData);
        setPtPackage([ptPackageData]);
        setHasPTAddon(true);
      }
    } catch (error) {
      console.error('Error fetching PT package:', error);
      // Fallback to default if API fails
      ptPackageData = { price: 149, description: "4 Sessions with a Trainer/Instructor" };
      console.log('Using fallback PT package data due to error:', ptPackageData);
      setPtPackage([ptPackageData]);
      setHasPTAddon(true);
    }
    
    console.log('Navigating to contract with PT data:', {
      hasPTAddon: true,
      ptPackage: ptPackageData
    });
    
    // Navigate to contract page with the stored submission data
    if (formSubmissionData) {
      navigate('/contract', { 
        state: { 
          formData: {
            ...formSubmissionData,
            hasPTAddon: true,
            ptPackage: ptPackageData
          }
        } 
      });
    }
  };

  const handlePTDecline = () => {
    setShowPTModal(false);
    setHasPTAddon(false); // Ensure PT is marked as declined
    // Navigate to contract page with the stored submission data
    if (formSubmissionData) {
      navigate('/contract', { 
        state: { 
          formData: {
            ...formSubmissionData,
            hasPTAddon: false
          }
        } 
      });
    }
  };

  // Handle membership type selection
  const handleMembershipTypeSelect = (type) => {
    // Store the previous membership type for comparison
    const previousType = membershipType;
    
    // Update the membership type
    selectMembershipType(type);
    
    // Re-validate date of birth with the newly selected membership type
    if (formData.dateOfBirth) {
      const ageError = validateAgeForMembershipType(formData.dateOfBirth, type);
      if (ageError) {
        setErrors(prevErrors => ({
          ...prevErrors,
          dateOfBirth: ageError
        }));
      } else {
        // Clear the error if validation passes
        setErrors(prevErrors => ({
          ...prevErrors,
          dateOfBirth: null
        }));
      }
    }

    // Handle existing family members based on the new membership type
    if (formData.familyMembers.length > 0) {
      // If changing to Junior or SYP membership
      if (type.id === 'junior' || type.id === 'young-professional') {
        // Clear all family members as Junior and SYP memberships can't have additional members
        setFormData(prev => ({
          ...prev,
          familyMembers: []
        }));
        // Clear any child forms
        setChildForms([]);
        // Clear selected addons
        setSelectedChildAddons([]);
        setSelectedServiceAddons([]);
        
        // Show alert for SYP membership change
        if (type.id === 'young-professional') {
          alert("Student/Young Professional memberships cannot have family members. All family members have been removed.");
        }
      }
      // If changing from Junior or SYP to any other type
      else if (previousType?.id === 'junior' || previousType?.id === 'young-professional') {
        // Keep the form data but allow adding new members
        // No need to clear anything as these memberships don't have family members
      }
      // For all other membership type changes
      else {
        // Keep existing family members but validate their ages against the new membership type
        const updatedFamilyMembers = formData.familyMembers.map(member => {
          if (member.dateOfBirth) {
            const ageError = validateAgeForMembershipType(member.dateOfBirth, type);
            if (ageError) {
              // If the member's age is invalid for the new membership type, remove them
              return null;
            }
          }
          return member;
        }).filter(Boolean); // Remove any null entries

        setFormData(prev => ({
          ...prev,
          familyMembers: updatedFamilyMembers
        }));

        // If any members were removed due to age validation, show a message
        if (updatedFamilyMembers.length < formData.familyMembers.length) {
          alert("Some additional members were removed because they don't meet the age requirements for the selected membership type.");
        }
      }
    }
  };


  //ADDONS
  // Update the handleChildAddonClick function
  const handleChildAddonClick = (addon) => {
    const isAlreadySelected = selectedChildAddons.some(
      selected => selected.invtr_desc === addon.invtr_desc
    );

    const isNewMexicoClub = selectedClub?.state === 'NM';
    const isUnlimitedChild = addon.invtr_desc?.toLowerCase().includes('unlimited');

    if (isAlreadySelected) {
      setSelectedChildAddons(prev => 
        prev.filter(a => a.invtr_desc !== addon.invtr_desc)
      );
      setChildForms([]);
    } else {
      if (isNewMexicoClub && isUnlimitedChild) {
        setChildForms([{
          id: Date.now() + Math.random(),
          firstName: "",
          lastName: "",
          dateOfBirth: "",
          gender: "",
          mobile: "",
          // home: "",
          email: ""
        }]);
      } else {
        const childCount = extractChildCount(addon.invtr_desc);
        if (childCount > 0) {
          const newChildForms = Array(childCount).fill().map(() => ({
            id: Date.now() + Math.random(),
            firstName: "",
            lastName: "",
            dateOfBirth: "",
            gender: "",
            mobile: "",
            // home: "",
            email: ""
          }));
          setChildForms(newChildForms);
        }
      }
      setSelectedChildAddons(prev => {
        const filteredAddons = prev.filter(a => !a.invtr_desc.toLowerCase().includes('child'));
        return [...filteredAddons, addon];
      });
    }
  };

  // ... existing code ...

  // Keep only this version of extractChildCount
  const extractChildCount = (description) => {
    // Handle different formats of child count in description
    const lowerDesc = description.toLowerCase();
    
    // Match patterns like "2 children", "2 child", "two children", etc.
    const numberMatch = description.match(/(\d+)\s*(?:child|children)/i);
    if (numberMatch) {
      return parseInt(numberMatch[1], 10);
    }
    
    // Match word numbers like "two", "three", etc.
    const wordNumbers = {
      'one': 1,
      'two': 2,
      'three': 3,
      'four': 4,
      'five': 5
    };
    
    for (const [word, number] of Object.entries(wordNumbers)) {
      if (lowerDesc.includes(word)) {
        return number;
      }
    }
    
    // Default to 1 if no count is found
    return 1;
  };

  // ... existing code ...

  // Remove the duplicate extractChildCount function that was here

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
  
  // Function to add another child form for New Mexico clubs
  const addAnotherChildForm = () => {
    setChildForms(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "",
        mobile: "",
        // home: "",
        email: ""
      }
    ]);
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
      // if (child.home && !/^\d{10}$/.test(child.home.replace(/\D/g, ''))) {
      //   newErrors[`child${index}Home`] = "Please enter 10 digits for phone number";
      // }
      
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
      // home: child.home,
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
      newErrors.tempCellPhone = "Please enter a valid phone number";
    }
    // if (youthMember.homePhone && !/^\d{10}$/.test(youthMember.homePhone.replace(/\D/g, ''))) {
    //   newErrors.tempHomePhone = "Please enter a valid home phone number";
    // }

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
      // homePhone: youthMember.homePhone,
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
      // homePhone: "",
      email: ""
    });

    // Switch back to members tab
    setActiveTab("members");
  };

  const handleServiceAddonClick = (addon) => {
    setSelectedServiceAddons((prev) => {
      // Check if the clicked addon is an "Unlimited" addon
      const isUnlimitedAddon = addon.invtr_desc && addon.invtr_desc.includes("Unlimited");
      
      // Check if the addon is already selected
      const isSelected = prev.some(
        (item) => item.invtr_desc === addon.invtr_desc
      );
      
      if (isSelected) {
        // If it's already selected, just remove it
        return prev.filter((item) => item.invtr_desc !== addon.invtr_desc);
      } else if (isUnlimitedAddon) {
        // If it's an Unlimited addon, remove any other Unlimited addons first
        const filteredAddons = prev.filter(
          (item) => !item.invtr_desc || !item.invtr_desc.includes("Unlimited")
        );
        // Then add the newly selected Unlimited addon
        return [...filteredAddons, addon];
      } else {
        // For normal addons, just add it to the selection
        return [...prev, addon];
      }
    });
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
        
        // Only clear child forms and addons when leaving the child tab
        // Don't clear when switching TO the child tab
        if (tab !== 'child') {
          // Check if leaving child tab without adding any children
          // If there are childForms but none have been added to familyMembers,
          // clear the selectedChildAddons to prevent incorrect Family dues
          if (childForms.length > 0) {
            // Check if any children from the current forms have been added
            const childrenAdded = childForms.some(childForm => 
              formData.familyMembers.some(member => 
                member.memberType === 'child' && 
                member.firstName === childForm.firstName && 
                member.lastName === childForm.lastName
              )
            );
            
            // If no children from current forms were added, clear the child addons
            if (!childrenAdded) {
              setSelectedChildAddons([]);
              setChildForms([]);
            }
          }
        }
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
        // homePhone: "",
        // workPhone: "",
        relationship: "",
        isGuardian: false,
        guardianFirstName: "",
        guardianLastName: "",
        guardianEmail: "",
        guardianGender: "",
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
        // home: "",
        email: ""
      });
    } else if (tab === 'youth') {
      setYouthMember({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "",
        cellPhone: "",
        // homePhone: "",
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
    {/* Child care calculation temporarily removed until later phase
    if (formData.services.childcare) {
      total += 15; // Assuming $15 per month
    }
    */}
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
          onChangeMembershipType={() => {}} 
        />
      );
    }
    
    // For all membership types
    switch (activeTab) {
      case 'members':
        return (
          <div className="tab-panel">
            <h3>Current Members</h3>
            <p>You are the primary member. {allowsFamilyMembers ? 'Add additional members using the tabs above.' : ''}</p>
            <div className="member-card">
              <div className="member-info">
                <h4>Primary Member</h4>
                <p>Your membership includes access to all basic facilities.</p>
                {/* <p><strong>Gender:</strong> {formData.gender === "" ? "Prefer not to say" : formData.gender}</p> */}
              </div>
            </div>
            
            {formData.familyMembers.length > 0 ? (
              formData.familyMembers.map((member, index) => (
                <div className="member-card" key={member.id || member.email || index}>
                  <div className="member-info">
                    <h4>{member.firstName} {member.middleInitial ? member.middleInitial + '. ' : ''}{member.lastName}</h4>
                    <p>{member.memberType === 'adult' ? 'Adult' : member.memberType === 'child' ? 'Child' : 'Youth'} Member</p>
                  {/* <p><strong>Gender:</strong> {member.gender === "" ? "Prefer not to say" : member.gender}</p> */}
                  {member.dateOfBirth && (
                    <p><strong>Birthday:</strong> {formatDateWithoutTimezoneShift(member.dateOfBirth)}</p>
                  )}
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
              <p className="no-members-message">No additional members added yet.</p>
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
        // Check if there's already an additional adult
        const hasAdditionalAdult = formData.familyMembers.some(member => member.memberType === 'adult');
        
        if (hasAdditionalAdult) {
          return (
            <div className="tab-panel">
              <h3>Add Additional Adult  Member</h3>
              <p className="no-more-adults-message">One Adult successfully Added to this Membership.<br /><br />
                Any additional adults must purchase their own membership. No further adults can be added to this membership.</p>
            </div>
          );
        }
        
        return (
          <div className="tab-panel">
            <h3>Add Additional Adult Member</h3>
            <p>Add an adult member to your membership.</p>
            
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
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="tempDateOfBirth">
                  Date of Birth <span className="required">*</span>
                </label>
                <input
                  type="date"
                  id="tempDateOfBirth"
                  name="dateOfBirth"
                  value={adultMember.dateOfBirth}
                  onChange={handleTempMemberChange}
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
                  Email <span className="required">*</span>
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
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="tempCellPhone">
                  Phone Number <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  id="tempCellPhone"
                  name="cellPhone"
                  value={adultMember.cellPhone}
                  onChange={handleTempMemberChange}
                  placeholder="Enter phone number"
                  aria-invalid={!!errors.tempCellPhone}
                  aria-describedby={errors.tempCellPhone ? "tempCellPhone-error" : undefined}
                />
                {errors.tempCellPhone && (
                  <div id="tempCellPhone-error" className="error-message">
                    {errors.tempCellPhone}
                  </div>
                )}
              </div>
              
              <div className="form-note" style={{fontSize: '0.8rem', color: '#666', marginTop: '0.5rem', fontStyle: 'italic'}}>
                * Either email or phone number is required for adult members
              </div>
              
{/*               <div className="form-group">
                <label htmlFor="tempHomePhone">
                  Home Phone
                </label>
                <input
                  type="tel"
                  id="tempHomePhone"
                  name="homePhone"
                  value={adultMember.homePhone}
                  onChange={handleTempMemberChange}
                  placeholder="Enter home phone number"
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
                  placeholder="Enter work phone number"
                  aria-invalid={!!errors.tempWorkPhone}
                  aria-describedby={errors.tempWorkPhone ? "tempWorkPhone-error" : undefined}
                />
                {errors.tempWorkPhone && (
                  <div id="tempWorkPhone-error" className="error-message">
                    {errors.tempWorkPhone}
                  </div>
                )}
              </div> */}
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
            <h3>Add Child Member</h3>
            
            {/* Add message for Dual membership in New Mexico */}
            {selectedClub?.state === 'NM' && determinedMembershipType === 'D' && (
              <div className="info-message" style={{
                backgroundColor: '#e6f7ff',
                border: '1px solid #91d5ff',
                borderRadius: '4px',
                padding: '12px',
                marginBottom: '20px'
              }}>
                <p><strong>Note:</strong> Adding children or a youth to a Dual membership in New Mexico will convert it to a Family membership.</p>
              </div>
            )}
            
            <p>Add a child member (0-11 years) to your membership.</p>
            
            {/* For New Mexico Family memberships, show direct child entry without requiring addon */}
            {selectedClub?.state === 'NM' && determinedMembershipType === 'F' ? (
              <div className="family-child-entry">
                <p className="membership-message" style={{ 
                  backgroundColor: '#e6f7ff', 
                  padding: '12px', 
                  borderRadius: '6px',
                  marginBottom: '20px'
                }}>
                  Child memberships are included with your Family membership at no additional cost.
                </p>
                
                {/* Always show the Add Child button for Family and Dual memberships */}
                <button 
                  type="button" 
                  className="add-child-button"
                  onClick={() => {
                    // Add a single empty child form
                    setChildForms([{
                      id: Date.now() + Math.random(),
                      firstName: "",
                      lastName: "",
                      dateOfBirth: "",
                      gender: "",
                      mobile: "",
                      // home: "",
                      email: ""
                    }]);
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginBottom: '20px',
                    display: childForms.length === 0 ? 'block' : 'none'
                  }}
                >
                  Add Child
                </button>
                
                {childForms.length > 0 && (
                  <div className="child-forms-container">
                    <h4>Child Information</h4>
                    <p>Please provide information for {childForms.length} {childForms.length === 1 ? 'child' : 'children'}.</p>
                    
                    {/* Add Another Child button for New Mexico unlimited child addon */}
                    {selectedClub?.state === 'NM' && selectedChildAddons.some(addon => addon.invtr_desc === 'Child Addon') && (
                      <button 
                        type="button" 
                        className="add-child-button"
                        onClick={addAnotherChildForm}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          marginBottom: '20px'
                        }}
                      >
                        Add Another Child
                      </button>
                    )}
                    
                    {childForms.filter(child => child && child.id).map((child, index) => (
                      <div key={child.id} className="child-form" style={{ 
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
                                  setErrors(prev => {
                                    const newErrors = {...prev};
                                    if (ageError) {
                                      newErrors[`child${index}DateOfBirth`] = ageError;
                                    } else {
                                      // Clear the error if validation passes
                                      delete newErrors[`child${index}DateOfBirth`];
                                    }
                                    return newErrors;
                                  });
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

                                                  <div className="form-row">
                          <div className="form-group">
                            <label htmlFor={`child${index}Mobile`}>
                              Phone Number
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


{/*                           <div className="form-group">
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
                          </div> */}
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
            ) : (
              <div className="child-addon-section">
                <AddonButtons
                  addons={addons}
                  selectedAddons={selectedChildAddons}
                  onAddonClick={handleChildAddonClick}
                />
                
                {childForms.length > 0 && (
                  <div className="child-forms-container">
                    <h4>Child Information</h4>
                    <p>Please provide information for {childForms.length} {childForms.length === 1 ? 'child' : 'children'}.</p>
                    
                    {childForms.filter(child => child && child.id).map((child, index) => (
                      <div key={child.id} className="child-form" style={{ 
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
                                  setErrors(prev => {
                                    const newErrors = {...prev};
                                    if (ageError) {
                                      newErrors[`child${index}DateOfBirth`] = ageError;
                                    } else {
                                      // Clear the error if validation passes
                                      delete newErrors[`child${index}DateOfBirth`];
                                    }
                                    return newErrors;
                                  });
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
                        </div>

                        <div className="form-row contact-info">
                          <div className="form-group">
                            <label htmlFor={`child${index}Mobile`}>
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              id={`child${index}Mobile`}
                              value={child.mobile}
                              onChange={(e) => handleChildFormChange(index, 'mobile', e.target.value)}
                              placeholder="(555) 555-5555"
                            />
                            {errors[`child${index}Mobile`] && (
                              <span className="error-message">{errors[`child${index}Mobile`]}</span>
                            )}
                          </div>
                          
{/*                           <div className="form-group">
                            <label htmlFor={`child${index}Home`}>
                              Home Phone
                            </label>
                            <input
                              type="tel"
                              id={`child${index}Home`}
                              value={child.home}
                              onChange={(e) => handleChildFormChange(index, 'home', e.target.value)}
                              placeholder="(555) 555-5555"
                            />
                            {errors[`child${index}Home`] && (
                              <span className="error-message">{errors[`child${index}Home`]}</span>
                            )}
                          </div> */}
                          
                          <div className="form-group">
                            <label htmlFor={`child${index}Email`}>
                              Email
                            </label>
                            <input
                              type="email"
                              id={`child${index}Email`}
                              value={child.email}
                              onChange={(e) => handleChildFormChange(index, 'email', e.target.value)}
                              placeholder="email@example.com"
                            />
                            {errors[`child${index}Email`] && (
                              <span className="error-message">{errors[`child${index}Email`]}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      className="add-child-member-button"
                      onClick={handleAddChildMember}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        marginTop: '20px'
                      }}
                    >
                      Add Child Member
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      
 case 'youth':
  return (
    <div className="youth-tab">
      <h3>Add Youth Member</h3>
      <p>Add a youth member (12–20 years) to your membership.</p>

      {/* New Mexico club specific messages */}
      {selectedClub?.state === 'NM' && determinedMembershipType === 'I' && (
        <div
          className="info-message"
          style={{
            backgroundColor: '#e6f7ff',
            border: '1px solid #91d5ff',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '20px',
          }}
        >
          <p>
            <strong>Important:</strong> Adding a Youth member to an
            Individual membership will convert it to a Dual membership.
          </p>
        </div>
      )}

      {selectedClub?.state === 'NM' && determinedMembershipType === 'D' && (
        <div
          className="info-message"
          style={{
            backgroundColor: '#e6f7ff',
            border: '1px solid #91d5ff',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '20px',
          }}
        >
          <p>
            <strong>Note:</strong> Adding a youth to a Dual membership in New
            Mexico will convert it to a Family membership.
          </p>
        </div>
      )}

      {selectedClub?.state === 'NM' && determinedMembershipType === 'F' && (
        <div
          className="info-message"
          style={{
            backgroundColor: '#e6f7ff',
            border: '1px solid #91d5ff',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '20px',
          }}
        >
          <p>
            Youth memberships are included with your Family membership at no
            additional cost.
          </p>
        </div>
      )}

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
            aria-invalid={!!errors.tempFirstName}
            aria-describedby={errors.tempFirstName ? 'firstName-error' : undefined}
          />
          {errors.tempFirstName && (
            <div id="firstName-error" className="error-message">
              {errors.tempFirstName}
            </div>
          )}
        </div>

        <div className="form-group middle-initial">
          <label htmlFor="middleInitial">Initial</label>
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
            aria-invalid={!!errors.tempLastName}
            aria-describedby={errors.tempLastName ? 'lastName-error' : undefined}
          />
          {errors.tempLastName && (
            <div id="lastName-error" className="error-message">
              {errors.tempLastName}
            </div>
          )}
        </div>
      </div>

      {/* DOB & Gender Row */}
      <div className="form-row dob-gender-row">
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
            aria-required="true"
            aria-invalid={!!errors.tempDateOfBirth}
            aria-describedby={errors.tempDateOfBirth ? 'dateOfBirth-error' : undefined}
          />
          {errors.tempDateOfBirth && (
            <div id="dateOfBirth-error" className="error-message">
              {errors.tempDateOfBirth}
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
            aria-invalid={!!errors.tempGender}
            aria-describedby={errors.tempGender ? "gender-error" : undefined}
          >
            <option value="">Select gender</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="N">Prefer not to say</option>
          </select>
          {errors.tempGender && (
            <div id="gender-error" className="error-message">
              {errors.tempGender}
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
            aria-invalid={!!errors.tempEmail}
            aria-describedby={errors.tempEmail ? "email-error" : undefined}
          />
          {errors.tempEmail && (
            <div id="email-error" className="error-message">
              {errors.tempEmail}
            </div>
          )}
        </div>
      </div>

      <div className="form-row phone-numbers">
        <div className="form-group">
          <label htmlFor="cellPhone">
            Phone Number
          </label>
          <input
            type="tel"
            id="cellPhone"
            name="cellPhone"
            value={youthMember.cellPhone}
            onChange={handleTempMemberChange}
            placeholder="Enter mobile phone"
            aria-required="true"
            aria-invalid={!!errors.tempCellPhone}
            aria-describedby={errors.tempCellPhone ? "cellPhone-error" : undefined}
          />
          {errors.tempCellPhone && (
            <div id="cellPhone-error" className="error-message">
              {errors.tempCellPhone}
            </div>
          )}
        </div>
        
        {/* <div className="form-group">
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
        </div> */}
      </div>
      
      {/* Add Youth Member Button */}
      <div className="form-row">
        <div className="form-group">
          <button
            type="button"
            className="add-member-button"
            onClick={() => addFamilyMember('youth')}
            aria-label="Add youth family member"
          >
            Add Youth Member
          </button>
        </div>
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
      total += (membershipPrice !== undefined ? membershipPrice : 0) || (membershipType?.price || 0);
    }
    
    // Do NOT add extra costs for family members that are already included in the membership price
    // The membership price (I/D/F) already accounts for the correct number of people
    
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
    
    // Start with enrollment fee
    let total = 19.0; // $19 enrollment fee
    
    // Add prorated membership price - this already includes family members in the I/D/F type
    total += proratedPrice !== undefined ? proratedPrice : 0;
    
    // Do NOT add extra family member costs - the membership price already includes this based on type
    
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
    
    // Add PT package as one-time cost (not prorated)
    if (hasPTAddon && ptPackage) {
      total += parseFloat(ptPackage.price || 149);
    }
    
    // Round to 2 decimal places
    return Math.round(total * 100) / 100;
  };

  // Add this effect to set initial membership type
  useEffect(() => {
    // Always run this effect, but only act if needed
    if (formData.dateOfBirth && !membershipType) {
      const initialMembershipType = determineMembershipTypeByAge(formData.dateOfBirth);
      if (initialMembershipType) {
        selectMembershipType(initialMembershipType);
      }
    }
  }, [formData.dateOfBirth, membershipType, selectMembershipType]);

  // Auto-save form data when it changes
  useEffect(() => {
    if (autoSaveEnabled && formData && Object.keys(formData).length > 0) {
      // Only auto-save if we have meaningful data (not just empty form)
      const hasMainFormData = Object.values(formData).some(value => 
        value && (typeof value === 'string' ? value.trim() !== '' : true)
      );
      
      // Check for meaningful data in tab forms
      const hasTabData = childForms.some(form => 
        Object.values(form).some(value => 
          value && (typeof value === 'string' ? value.trim() !== '' : true)
        )
      ) || 
      Object.values(adultMember).some(value => 
        value && (typeof value === 'string' ? value.trim() !== '' : true)
      ) ||
      Object.values(childMember).some(value => 
        value && (typeof value === 'string' ? value.trim() !== '' : true)
      ) ||
      Object.values(youthMember).some(value => 
        value && (typeof value === 'string' ? value.trim() !== '' : true)
      );
      
      const hasData = hasMainFormData || hasTabData;
      
      console.log("Checking if form has meaningful data:", hasData);
      console.log("Main form data:", hasMainFormData);
      console.log("Tab data:", hasTabData);
      console.log("Form data values:", Object.values(formData));
      console.log("Child forms:", childForms);
      console.log("Adult member:", adultMember);
      console.log("Child member:", childMember);
      console.log("Youth member:", youthMember);
      
      if (hasData) {
        const timeoutId = setTimeout(() => {
                  const additionalData = {
          selectedChildAddons,
          selectedServiceAddons,
          membershipType: membershipType?.id,
          club: selectedClub?.id,
          // Include tab data
          childForms,
          adultMember,
          childMember,
          youthMember,
          activeTab
        };
        
        console.log("Tab data being saved:", {
          childForms: childForms.length,
          adultMember,
          childMember,
          youthMember,
          activeTab
        });
          
                  console.log("Auto-saving form data...");
        console.log("Form data to save:", formData);
        console.log("Additional data to save:", additionalData);
        
        const saved = autoSaveFormData(formData, additionalData);
        if (saved) {
          setLastSaved(new Date());
          // Also save to backend as backup (don't await to avoid blocking)
          saveDraftToBackend(formData, additionalData).catch(error => {
            console.warn("Backend save failed, but localStorage save succeeded:", error);
          });
        }
        }, 3000); // Auto-save after 3 seconds of inactivity

        return () => clearTimeout(timeoutId);
      }
    }
  }, [formData, selectedChildAddons, selectedServiceAddons, membershipType, selectedClub, autoSaveEnabled, childForms, adultMember, childMember, youthMember, activeTab]);

  // Restore data on component mount
  useEffect(() => {
    const restoreData = async () => {
      // First try to restore from localStorage
      let restoredData = restoreFormData();
      
      if (!restoredData) {
        // If no localStorage data, try backend
        restoredData = await restoreDraftFromBackend();
      }
      
      if (restoredData && !location.state?.formData) {
        setShowRestorePrompt(true);
      }
    };
    
    restoreData();
  }, [location.state?.formData]);

  // Handle restore prompt
  const handleRestoreData = async () => {
    console.log("Attempting to restore data...");
    
    // Try localStorage first
    let restoredData = restoreFormData();
    console.log("localStorage restore result:", restoredData);
    
    // If no localStorage data, try backend
    if (!restoredData) {
      restoredData = await restoreDraftFromBackend();
      console.log("Backend restore result:", restoredData);
    }
    
          if (restoredData && restoredData.formData) {
        console.log("Restoring form data:", restoredData.formData);
        setFormData(restoredData.formData);
        
        if (restoredData.additionalData) {
          const { 
            selectedChildAddons, 
            selectedServiceAddons, 
            membershipType, 
            club,
            childForms,
            adultMember,
            childMember,
            youthMember,
            activeTab
          } = restoredData.additionalData;
          console.log("Restoring additional data:", restoredData.additionalData);
          
          if (selectedChildAddons) setSelectedChildAddons(selectedChildAddons);
          if (selectedServiceAddons) setSelectedServiceAddons(selectedServiceAddons);
          if (membershipType) {
            // Find and set membership type
            const membershipTypes = [
              { id: 'standard', title: 'Standard Adult', description: 'For adults between 30-64 years old' },
              { id: 'senior', title: 'Senior', description: 'For adults 65 and older' },
              { id: 'young-professional', title: 'Student/Young Professional', description: 'For adults between 18-29 years old' },
              { id: 'junior', title: 'Junior', description: 'For children under 18 years old' }
            ];
            const type = membershipTypes.find(t => t.id === membershipType);
            if (type) selectMembershipType(type);
          }
          
          // Restore tab data
          console.log("Restoring tab data:", {
            childForms: childForms?.length || 0,
            adultMember,
            childMember,
            youthMember,
            activeTab
          });
          
          if (childForms) setChildForms(childForms);
          if (adultMember) setAdultMember(adultMember);
          if (childMember) setChildMember(childMember);
          if (youthMember) setYouthMember(youthMember);
          if (activeTab) setActiveTab(activeTab);
        }
        setShowRestorePrompt(false);
      } else {
        console.log("No data to restore");
        setShowRestorePrompt(false);
      }
  };

  const handleDiscardData = () => {
    clearSavedData();
    setShowRestorePrompt(false);
  };

  // Update prorated price and tax when start date, full price, tax rate, or addons change
  useEffect(() => {
    if (formData.requestedStartDate && membershipPrice) {
      // Calculate prorated factor
      const proratedFactor = calculateProratedFactor(formData.requestedStartDate);

      // Calculate base prorated dues
      let prorated = proratedPrice !== undefined ? proratedPrice : 0;

      // Add prorated service addons
      if (selectedServiceAddons.length > 0) {
        selectedServiceAddons.forEach(addon => {
          if (addon.invtr_price) {
            prorated += parseFloat(addon.invtr_price) * proratedFactor;
          }
        });
      }
      // Add prorated child addons
      if (selectedChildAddons.length > 0) {
        selectedChildAddons.forEach(addon => {
          if (addon.invtr_price) {
            prorated += parseFloat(addon.invtr_price) * proratedFactor;
          }
        });
      }

      // Only apply tax for New Mexico clubs (state is NM)
      const isNewMexicoClub = selectedClub?.state === 'NM';
      const effectiveTaxRate = isNewMexicoClub ? taxRate : 0;

      // Calculate tax amount for total taxable amount (enrollment fee + prorated price)
      const enrollmentFee = 19.0; // $19 enrollment fee
      const totalTaxableAmount = enrollmentFee + prorated;
      const proratedTax = Number((totalTaxableAmount * effectiveTaxRate).toFixed(2));
      setProratedTaxAmount(proratedTax);

      // Calculate monthly total (going forward)
      let monthlyTotal = membershipPrice !== undefined ? membershipPrice : 0;
      if (selectedServiceAddons.length > 0) {
        selectedServiceAddons.forEach(addon => {
          if (addon.invtr_price) {
            monthlyTotal += parseFloat(addon.invtr_price);
          }
        });
      }
      if (selectedChildAddons.length > 0) {
        selectedChildAddons.forEach(addon => {
          if (addon.invtr_price) {
            monthlyTotal += parseFloat(addon.invtr_price);
          }
        });
      }
      const fullTax = Number((monthlyTotal * effectiveTaxRate).toFixed(2));
      setTaxAmount(fullTax);

      console.log(`Tax calculation: isNewMexicoClub=${isNewMexicoClub}, effectiveTaxRate=${effectiveTaxRate}, proratedTax=${proratedTax}, fullTax=${fullTax}`);
    }
  }, [formData.requestedStartDate, membershipPrice, taxRate, selectedClub, selectedServiceAddons, selectedChildAddons, proratedPrice]);

  // Calculate and store prorated addon values
  useEffect(() => {
    if (formData.requestedStartDate) {
      const proratedFactor = calculateProratedFactor(formData.requestedStartDate);
      
      // Calculate prorated addon total
      let proratedAddOnsTotal = 0;
      if (selectedServiceAddons.length > 0) {
        selectedServiceAddons.forEach(addon => {
          if (addon.invtr_price) {
            proratedAddOnsTotal += parseFloat(addon.invtr_price) * proratedFactor;
          }
        });
      }
      if (selectedChildAddons.length > 0) {
        selectedChildAddons.forEach(addon => {
          if (addon.invtr_price) {
            proratedAddOnsTotal += parseFloat(addon.invtr_price) * proratedFactor;
          }
        });
      }
      
      // Calculate prorated addon tax
      const isNewMexicoClub = selectedClub?.state === 'NM';
      const effectiveTaxRate = isNewMexicoClub ? taxRate : 0;
      const proratedAddOnsTax = Number((proratedAddOnsTotal * effectiveTaxRate).toFixed(2));
      
      // Store in form data
      setFormData(prev => ({
        ...prev,
        proratedAddOns: Math.round(proratedAddOnsTotal * 100) / 100,
        proratedAddOnsTax: proratedAddOnsTax,
        proratedDues: proratedPrice || 0,
        proratedDuesTax: proratedTaxAmount || 0
      }));
    }
  }, [formData.requestedStartDate, selectedServiceAddons, selectedChildAddons, selectedClub, taxRate]);

  return (
    <div className="enrollment-container">
      {/* Restore Data Prompt */}
      {showRestorePrompt && (
        <div className="restore-prompt-overlay">
          <div className="restore-prompt-modal">
            <h3>📋 Restore Previous Session</h3>
            <p>We found saved data from a previous session. Would you like to restore it?</p>
            <div className="restore-prompt-actions">
              <button 
                type="button" 
                className="btn-primary"
                onClick={handleRestoreData}
              >
                Restore Data
              </button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={handleDiscardData}
              >
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      <h1>{selectedClub.name} Membership Enrollment Form</h1>

      <p className="form-instructions">
        Please fill out the form below to become a member at the club. 
        Fields marked with an asterisk (*) are required.
      </p>

      {/* Privacy Notice 
      <div className="privacy-notice">
        <p>
          <strong>Privacy Notice:</strong> Your form data is automatically saved to your browser to prevent data loss. 
          This information is stored locally and is not shared with third parties. 
          Data expires after 24 hours and is cleared upon successful submission.
        </p>
        <div className="auto-save-toggle">
          <label>
            <input
              type="checkbox"
              checked={autoSaveEnabled}
              onChange={(e) => setAutoSaveEnabled(e.target.checked)}
            />
            Enable auto-save to prevent data loss
          </label>
        </div>
      </div>
*/}
      
      {/* Auto-save status indicator 
      {autoSaveEnabled && lastSaved && (
        <div className="auto-save-status">
          <span className="auto-save-indicator">
            💾 Auto-saved at {lastSaved.toLocaleTimeString()}
          </span>
        </div>
      )}
*/}

      
      {/* Add this after the form instructions paragraph */}
 {/*      {membershipType && (
        <div className="selected-membership-type">
          <span className="membership-type-badge">
            {membershipType.title} Membership
          </span>
          <p className="membership-type-description">
            {membershipType.description}
          </p>
        </div>
      )} */}

     
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
              <label htmlFor="requestedStartDate" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                Requested Start Date <span className="required">*</span>
               
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="date"
                  id="requestedStartDate"
                  name="requestedStartDate"
                  value={formData.requestedStartDate}
                  onChange={handleChange}
                  min={today}
                  max={maxDate}
                  aria-required="true"
                  aria-invalid={!!errors.requestedStartDate}
                  aria-describedby={errors.requestedStartDate ? "requestedStartDate-error" : undefined}
                />
                <button
                  type="button"
                  tabIndex={0}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#e0e7ef',
                    color: '#2a3b5e',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    border: '1px solid #bfc8d6',
                    marginLeft: 4,
                    position: 'relative',
                    padding: 0,
                  }}
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowStartDateInfo(prev => !prev);
                  }}
                  onBlur={() => setTimeout(() => setShowStartDateInfo(false), 150)}
                  aria-label="Requested Start Date Info"
                >
                  i
                  {showStartDateInfo && (
                    <div style={{
                      position: 'absolute',
                      top: 28,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#fff',
                      color: '#2a3b5e',
                      border: '1px solid #bfc8d6',
                      borderRadius: 6,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                      padding: '10px 14px',
                      zIndex: 10,
                      minWidth: 260,
                      fontSize: 13,
                      fontWeight: 400,
                      whiteSpace: 'normal',
                    }}>
                      This online joining tool is only intended for those wishing to start their membership within the next 7 days. See the Club for other requests.
                    </div>
                  )}
                </button>
              </div>
              {errors.requestedStartDate && (
                <div id="requestedStartDate-error" className="error-message">
                  {errors.requestedStartDate}
                </div>
              )}
            </div>
          </div>
          
          {isJuniorMembership ? (
            <>
              <h2>Junior (12-17) Information</h2>
              <p className="guardian-notice">
                As this is a Junior membership (under 18), please provide information about the Junior member.
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

                                <div className="form-group">
                    <label htmlFor="mobilePhone">
                      Phone Number<span className="required">*</span>
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
                  Billing Address <span className="required">*</span>
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
                
              

                  
{/*                   <div className="form-group">
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
                  </div> */}
               
                
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
              <h2>Additional Members & Services</h2>
              <div className="tabs-container">
                <div className="tab-list" role="tablist">
                  <button
                    className={`tab ${activeTab === 'members' ? 'active' : ''}`}
                    onClick={(e) => {e.preventDefault(); handleTabChange('members');}}
                    role="tab"
                    aria-selected={activeTab === 'members'}
                    type="button"
                  >
                    Current Members
                  </button>
                  <button
                    className={`tab ${activeTab === 'new_adult' ? 'active' : ''}`}
                    onClick={(e) => {e.preventDefault(); handleTabChange('new_adult');}}
                    role="tab"
                    aria-selected={activeTab === 'new_adult'}
                    type="button"
                  >
                    Add Adult (18+)
                  </button>
                  <button
                    className={`tab ${activeTab === 'child' ? 'active' : ''}`}
                    onClick={(e) => {e.preventDefault(); handleTabChange('child');}}
                    role="tab"
                    aria-selected={activeTab === 'child'}
                    type="button"
                  >
                    Add Child (0-11)
                  </button>
                  <button
                    className={`tab ${activeTab === 'youth' ? 'active' : ''}`}
                    onClick={(e) => {e.preventDefault(); handleTabChange('youth');}}
                    role="tab"
                    aria-selected={activeTab === 'youth'}
                    type="button"
                  >
                    Add Youth (12-20)
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
            >
              Continue to Agreement
            </button>
          </div>
          
          <div className="privacy-notice">
            <p>
                 <strong>Privacy Notice:</strong> The information collected on this form is used solely for the purpose of 
              processing your Club membership enrollment. We adhere to all applicable data protection laws and will not 
              share your personal information with third parties without your consent, except as required by law.
            </p>
          </div>
        </form>

        {/* Shopping cart section */}
        <div className="shopping-cart">
          <h2>Your Membership</h2>
          <div className="cart-details">
            <div className="cart-item">
              {/* <h3>{membershipType ? membershipType.title : 'Standard'} Membership</h3> */}
              
              {/* Due Now (Prorated) */}
              <div className="price-section prorated-price">
                <h4>Due Now (Prorated Dues):</h4>
                <p className="price">
                  {isLoadingPrice ? (
                    <span>Loading price...</span>
                  ) : (
                    `$${proratedPrice !== undefined ? proratedPrice.toFixed(2) : '0.00'}`
                  )}
                </p>
                <p className="price-detail">
                  Prorated for {formData.requestedStartDate ? formData.requestedStartDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2/$3/$1') : 'selected start date'} to end of month
                </p>
              </div>
              
              {/* Monthly Price Going Forward */}
              <div className="price-section monthly-price">
                <h4>Monthly Dues Going Forward:</h4>
                <p className="price">
                  {isLoadingPrice ? (
                    <span>Loading price...</span>
                  ) : (
                    `$${membershipPrice !== undefined ? membershipPrice.toFixed(2) : (membershipType && membershipType.price ? membershipType.price.toFixed(2) : '49.99')}/month`
                  )}
                </p>
              </div>
              
{/*               This will show the dues description and bridge code if uncommented
<p className="description">
                {membershipDescription || (membershipType ? membershipType.description : 'Standard membership includes access to all basic facilities.')}
              </p>
              {bridgeCode && (
                // <p className="membership-detail">Membership Code: {bridgeCode}</p>
              )} */}
            </div>
            
            {formData.familyMembers.length > 0 && (
              <div className="family-members-summary">
                <h3>Additional Members ({formData.familyMembers.length})</h3>
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
                  {selectedServiceAddons
                    .filter(addon => addon.invtr_desc && addon.invtr_desc.trim() !== '')
                    .map((addon, index) => {
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
            
            {hasPTAddon && ptPackage && (
              <div className="pt-package">
                <h3>New Intro Personal Training Package</h3>
                <ul>
                  <li>
                    <div>{ptPackage.description || "4 Sessions with a Trainer/Instructor"}</div>
                    <div style={{fontSize: "0.8rem", marginTop: "0.1rem"}}>
                      <span style={{color: "#28a745"}}>One-time cost: ${ptPackage.price || 149}</span>
                    </div>
                  </li>
                </ul>
              </div>
            )}
            
            <div className="cart-total">
              <div className="due-now-total">
                <h3>Total Due Now</h3>
                <div className="price-breakdown">
                  <div className="price-row">
                    <span>Enrollment Fee</span>
                    <span>$19.00</span>
                  </div>
                  <div className="price-row">
                    <span>Prorated Dues & Add-ons</span>
                    <span>${formData.requestedStartDate ? (calculateTotalProratedCost() - 19.0 - (hasPTAddon && ptPackage ? parseFloat(ptPackage.price || 149) : 0)).toFixed(2) : '0.00'}</span>
                  </div>
                  {hasPTAddon && ptPackage && (
                    <div className="price-row">
                      <span>New Intro Personal Training Package</span>
                      <span>${ptPackage.price || 149}</span>
                    </div>
                  )}
                  <div className="price-row">
                    <span>Subtotal</span>
                    <span>${formData.requestedStartDate ? calculateTotalProratedCost().toFixed(2) : '19.00'}</span>
                  </div>
                  <div className="price-row">
                    {selectedClub?.state === 'NM' ? (
                      <span>Tax ({(taxRate * 100).toFixed(2)}%)</span>
                    ) : (
                      <span>Tax</span>
                    )}
                    <span>${proratedTaxAmount.toFixed(2)}</span>
                  </div>
                  <div className="price-row total">
                    <span><strong>Total with Tax</strong></span>
                    <span><strong>${(calculateTotalProratedCost() + proratedTaxAmount).toFixed(2)}</strong></span>
                  </div>
                </div>
                <p className="price-detail">
                  Prorated from {formData.requestedStartDate ? formData.requestedStartDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2/$3/$1') : 'selected date'} to end of month
                </p>
              </div>
              <div className="monthly-total">
                <h3>Monthly Cost Going Forward</h3>
                <div className="price-breakdown">
                  <div className="price-row">
                    <span>Subtotal</span>
                    <span>${calculateTotalCost().toFixed(2)}/month</span>
                  </div>
                  <div className="price-row">
                    {selectedClub?.state === 'NM' ? (
                      <span>Tax ({(taxRate * 100).toFixed(2)}%)</span>
                    ) : (
                      <span>Tax</span>
                    )}
                    <span>${taxAmount.toFixed(2)}/month</span>
                  </div>
                  <div className="price-row total">
                    <span><strong>Total with Tax</strong></span>
                    <span><strong>${(calculateTotalCost() + taxAmount).toFixed(2)}/month</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <PersonalTrainingModal 
        isOpen={showPTModal}
        onClose={handlePTDecline}
        onAccept={handlePTAccept}
        selectedClub={selectedClub}
      />
    </div>
  );
}

export default EnrollmentForm;
