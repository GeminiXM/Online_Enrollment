/**
 * ContractPage.jsx
 * 
 * This component renders the contract/membership agreement page where users review
 * their membership details and sign/initial the legal agreement before proceeding to payment.
 * 
 * Key functionality:
 * - Displays membership information summary
 * - Allows users to select signature style
 * - Provides contract terms and conditions based on club location (Denver/New Mexico)
 * - Requires user signatures and initials on specific sections
 * - Validates all required fields before allowing progression to payment
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClub } from '../context/ClubContext';
import SignatureSelector from './SignatureSelector';
import CanvasContractPDF from './CanvasContractPDF';
import './ContractPage.css';

// Component for clickable initial boxes
const InitialBox = React.forwardRef(({ onClick, value, font, isInitialed }, ref) => {
  // Base style for the initial box
  const boxStyle = {
    display: 'inline-block',
    border: '1px solid #aaa',
    borderRadius: '2px',
    padding: '1px 5px',
    margin: '0 5px',
    minWidth: '20px',
    height: '15px',
    backgroundColor: isInitialed ? '#f0f8ff' : '#f8f9fa', // Light blue background if initialed
    cursor: 'pointer',
    textAlign: 'center',
    fontFamily: font?.font || 'inherit',
    fontSize: 'small', // Smaller font size
    lineHeight: 'normal',
    verticalAlign: 'middle',
    transition: 'all 0.2s ease-in-out', // Smooth transition for hover effects
    boxShadow: isInitialed ? '0 0 2px rgba(0,123,255,0.5)' : 'none', // Subtle highlight if initialed
    transform: 'scale(0.85)',
    transformOrigin: 'center'
  };

  // Add hover styles with React's onMouseEnter/onMouseLeave
  const [isHovered, setIsHovered] = useState(false);
  
  // Apply hover effect styles
  if (isHovered) {
    boxStyle.backgroundColor = isInitialed ? '#e6f0ff' : '#e9ecef';
    boxStyle.boxShadow = '0 0 5px rgba(0,0,0,0.2)';
    boxStyle.border = '1px solid #007bff';
  }

  return (
    <span 
      ref={ref}
      className="initial-box" 
      style={boxStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={isInitialed ? "Click to remove initials" : "Click to add your initials"}
    >
      {isInitialed ? value : ''}
    </span>
  );
});

const ContractPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedClub } = useClub();
  const [formData, setFormData] = useState(null);
  const [signatureData, setSignatureData] = useState({ signature: '', initials: '', selectedFont: null });
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [errors, setErrors] = useState({});
  
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
  // Track which initial boxes have been clicked
  const [initialedBoxes, setInitialedBoxes] = useState({
    'monthToMonth': false,
    'extendedPlan': false,
    'resignation': false,
    'corporate': false,
    'syp': false,
    'corporateProof': false
  });
  const [isSigned, setIsSigned] = useState(false);
  const [signatureDate, setSignatureDate] = useState('');
  const [isSignatureConfirmed, setIsSignatureConfirmed] = useState(false);

  // Toggle the initialed state of a specific box
  const toggleInitialBox = (boxId) => {
    if (!signatureData.initials) {
      // If user hasn't provided initials yet, don't allow clicking on boxes
      setErrors(prev => ({
        ...prev,
        initials: "Please provide your initials first"
      }));
      return;
    }

    setInitialedBoxes(prev => ({
      ...prev,
      [boxId]: !prev[boxId]
    }));
  };

  // Get the initials text value from signature data
  const getInitialsText = () => {
    // If initials are set, return them, otherwise return empty string
    return signatureData.initials?.text || '';
  };
  
  // Calculate date 14 days from requested start date
  const calculateCancellationDate = (startDateString) => {
    if (!startDateString) return '';
    
    // Parse the date string - avoid timezone shifts by handling parts manually
    const parts = startDateString.split(/[-T]/);
    if (parts.length >= 3) {
      const year = parseInt(parts[0], 10);
      // JavaScript months are 0-based, so subtract 1 from the month
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      
      // Create date with specific year, month, day in local timezone
      const date = new Date(year, month, day);
      
      // Add 14 days to the start date
      const cancellationDate = new Date(date);
      cancellationDate.setDate(date.getDate() + 14);
      
      // Format to mm/dd/yyyy
      return cancellationDate.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    }
    
    // Fallback for unexpected format
    return startDateString;
  };

  // Calculate prorated factor (percentage of month remaining) - copied from EnrollmentForm
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

  // Get enrollment data passed from previous page
  useEffect(() => {
    if (location.state && location.state.formData) {
      // Log formData to understand structure
      console.log("FormData received:", location.state.formData);
      
      // Process formData to extract and map data
      const data = location.state.formData;
      
      // Map membership type codes to full names
      const membershipTypeMap = {
        'I': 'Individual',
        'F': 'Family',
        'C': 'Couple',
        'D': 'Dual',
        'S': 'Student'
      };
      
      // Map agreement type codes to full names
      const agreementTypeMap = {
        'M': 'Month-to-month',
        '12': '12-Month',
        '24': '24-Month'
      };
      
      // Map specialty membership codes to full names
      const specialtyMembershipMap = {
        'CORP': 'Corporate',
        'SYP': 'Student/Young Professional',
        'SR': 'Senior',
        'S': 'Senior',
        'Y': 'Young Professional',
        'J': 'Junior'
      };
      
      // Process family members - preserve original structure for backend submission
      const familyMembers = data.familyMembers?.map(member => ({
        // Preserve original fields for backend
        firstName: member.firstName,
        lastName: member.lastName,
        middleInitial: member.middleInitial || '',
        dateOfBirth: member.dateOfBirth,
        gender: member.gender,
        email: member.email || '',
        cellPhone: member.cellPhone || '',
        homePhone: member.homePhone || '',
        workPhone: member.workPhone || '',
        memberType: member.memberType,
        role: member.role,
        // Add display fields for contract display
        name: `${member.firstName} ${member.lastName}`,
        type: member.memberType === 'adult' ? 'Adult' : member.memberType === 'child' ? 'Child' : 'Youth',
        // Keep any other properties
        ...member
      })) || [];
      
      // Extract add-ons from serviceAddons
      const serviceAddOns = data.serviceAddons?.map(addon => addon.description) || [];
      
      // Process child programs and add-ons
      let additionalServiceDetails = [];
      let childPrograms = '';
      let childProgramsMonthly = '';
      let childProgramsDueNow = '';
      
      // Get the proration factor based on the requested start date
      const proratedFactor = calculateProratedFactor(data.requestedStartDate);
      
      if (data.serviceAddons && data.serviceAddons.length > 0) {
        // Check if club is in New Mexico
        const isNewMexicoClub = data.club?.toString().includes('NM') || false;
        
        // Map only valid service addons to additionalServiceDetails
        // Filter out any service addons without a description or with empty description
        additionalServiceDetails = data.serviceAddons
          .filter(addon => addon.description && addon.description.trim() !== '')
          .map(addon => ({
            name: addon.description,
            dueNow: addon.price ? (addon.price * proratedFactor).toFixed(2) : '0.00', // Use correct proration factor
            monthly: addon.price ? addon.price.toFixed(2) : '0.00'
          }));
        
        // For Child Programs section, only include CAC child programs (Colorado only)
        // Exclude "Unlimited" options (2020) which should only appear in Additional Services
        if (!isNewMexicoClub) {
          // For Colorado, only look for CAC child programs
          const childProgramAddon = data.serviceAddons.find(addon => 
            addon.description && 
            addon.description.includes('CAC') && 
            addon.description.includes('child')
          );
          
          if (childProgramAddon) {
            childPrograms = childProgramAddon.description;
            childProgramsMonthly = childProgramAddon.price ? childProgramAddon.price.toFixed(2) : '0.00';
            childProgramsDueNow = childProgramAddon.price ? (childProgramAddon.price * proratedFactor).toFixed(2) : '0.00';
          }
        }
        // For New Mexico clubs, we don't show anything in the Child Programs section
        // All "Unlimited" options (2020) will only appear in Additional Services
      }
      
      // Compile list of add-ons from multiple sources
      let addOns = [...serviceAddOns];
      
      // If addOns property exists as an array
      if (Array.isArray(data.addOns)) {
        addOns = [...addOns, ...data.addOns];
      }
      
      // Check for specific add-on properties that might be boolean flags
      const possibleAddOns = [
        {key: 'unlimitedChild', label: 'Unlimited Child'},
        {key: 'nanny', label: 'Nanny'},
        {key: 'racquetball', label: 'Racquetball'},
        {key: 'squash', label: 'Squash'},
        {key: 'tennis', label: 'Tennis'},
        {key: 'childCare', label: 'Child Care'},
        {key: 'promoAllInclusive', label: 'Promo All Inclusive'}
      ];
      
      // Add each add-on that has a truthy value
      possibleAddOns.forEach(addon => {
        if (data[addon.key] === true || data[addon.key] === 'true' || data[addon.key] === 'yes') {
          addOns.push(addon.label);
        }
      });
      
      // Remove any duplicates from addOns array
      const uniqueAddOns = [...new Set(addOns)];
      
      // Get pricing information from membershipDetails
      const initiationFee = data.initiationFee || '0.00';
      const proratedDues = data.membershipDetails?.proratedPrice || '0.00';
      const monthlyDues = data.membershipDetails?.price || '0.00';
      // Use cust_code as Membership ID, not the specialty membership code (bridgeCode)
      const membershipId = data.cust_code || '';
      
      // Calculate add-ons total using the same proration factor
      const proratedAddOns = data.serviceAddons?.reduce((total, addon) => 
        total + (addon.price ? addon.price * proratedFactor : 0), 0).toFixed(2) || '0.00';
      
      // Check if club is in New Mexico by state property
      const isNewMexicoClub = selectedClub?.state === 'NM' || false;
      
      // Get tax rate from membershipDetails or use the actual tax rate from form data
      const taxRate = isNewMexicoClub ? (data.membershipDetails?.taxRate || data.taxRate || 0.07625) : 0; // Use actual tax rate from database
      
      // Use pre-calculated tax values from form data to ensure consistency
      const proratedDuesTax = parseFloat(data.proratedDuesTax || 0);
      const proratedAddonsTax = parseFloat(data.proratedAddOnsTax || 0);
      const totalTaxAmount = proratedDuesTax + proratedAddonsTax;
      
      // Calculate tax amount (will be 0 for non-NM clubs)
      const taxAmount = isNewMexicoClub ? totalTaxAmount.toFixed(2) : '0.00';
      
      const totalCollected = (
        parseFloat(initiationFee) + 
        parseFloat(proratedDues) + 
        parseFloat(proratedAddOns) + 
        parseFloat(taxAmount)
      ).toFixed(2);
      
      const totalMonthlyRate = (
        parseFloat(monthlyDues) + 
        data.serviceAddons?.reduce((total, addon) => total + (addon.price || 0), 0) || 0
      ).toFixed(2);
      
      // Update formData with processed data
      setFormData({
        ...data,
        displayMembershipType: membershipTypeMap[data.membershipType] || data.membershipType || 'Individual',
        displayAgreementType: agreementTypeMap[data.agreementType] || data.agreementType || 'Month-to-month',
        displaySpecialtyMembership: specialtyMembershipMap[data.specialtyMembership] || data.specialtyMembership || 'None',
        addOns: uniqueAddOns,
        familyMembers,
        additionalServiceDetails,
        childPrograms,
        childProgramsMonthly,
        childProgramsDueNow,
        initiationFee,
        proratedDues,
        proratedAddOns,
        monthlyDues,
        taxAmount,
        totalCollected,
        totalMonthlyRate,
        membershipId
      });
    } else {
      // If no data, go back to enrollment form
      navigate('/enrollment');
    }
  }, [location, navigate]);

  const handleSignatureChange = (type, value, fontInfo) => {
    // Update signature or initials based on the type
    
    if (type === 'signature') {
      // For signature, update the value and store the font info
      setSignatureData(prev => ({
        ...prev,
        [type]: value,
        // Only update the selectedFont if we have fontInfo (which means it's confirmed)
        ...(fontInfo ? { selectedFont: fontInfo } : {})
      }));
      
      // If we have fontInfo, the signature has been confirmed
      if (fontInfo) {
        setIsSignatureConfirmed(true);
      } else {
        setIsSignatureConfirmed(false);
      }
    } else if (type === 'initials') {
      // For initials, just update the value but keep using the font from signature
      setSignatureData(prev => ({
        ...prev,
        [type]: value
      }));
    }
  };

  // Reference to scroll to empty initial boxes
  const initialBoxRefs = {
    monthToMonth: React.useRef(null),
    extendedPlan: React.useRef(null),
    resignation: React.useRef(null),
    corporate: React.useRef(null),
    syp: React.useRef(null),
    corporateProof: React.useRef(null)
  };

  // Function to get today's date formatted as mm/dd/yyyy without timezone shifts
  const getTodayFormatted = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  // Effect to initialize the signature date when signature is confirmed
  useEffect(() => {
    if (signatureData.signature && !signatureDate) {
      // Set current date when signature is first confirmed
      setSignatureDate(getTodayFormatted());
    }
  }, [signatureData.signature, signatureDate]);

  const handleSignatureClick = () => {
    if (signatureData.signature) {
      setIsSigned(!isSigned);
      // If signing, set the date to today
      if (!isSigned) {
        setSignatureDate(getTodayFormatted());
      }
    } else {
      setErrors(prev => ({
        ...prev,
        signature: "Please provide your signature first"
      }));
    }
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
    
    if (!isSigned) {
      newErrors.contractSignature = "Please sign the contract at the bottom of the agreement";
    }
    
    // Validate guardian information for Junior memberships
    if (formData.specialtyMembership === 'J') {
      if (!formData.guardianFirstName) {
        newErrors.guardianFirstName = "Guardian first name is required";
      }
      
      if (!formData.guardianLastName) {
        newErrors.guardianLastName = "Guardian last name is required";
      }
      
      if (!formData.guardianDateOfBirth) {
        newErrors.guardianDateOfBirth = "Guardian date of birth is required";
      }

      if (!formData.guardianGender) {
        newErrors.guardianGender = "Guardian gender is required";
      }
      
      if (!formData.guardianEmail) {
        newErrors.guardianEmail = "Guardian email is required";
      }
      
      if (!formData.guardianRelationship) {
        newErrors.guardianRelationship = "Guardian relationship is required";
      }
      
      // If there are guardian errors, display an alert
      if (newErrors.guardianFirstName || newErrors.guardianLastName || 
          newErrors.guardianDateOfBirth || newErrors.guardianGender ||newErrors.guardianEmail || 
          newErrors.guardianRelationship) {
        newErrors.guardian = "Legal guardian information is incomplete. Please go back and complete all required guardian fields.";
      }
    }
    
    // Check if club is in New Mexico
    const isNewMexicoClub = selectedClub?.state === 'NM' || false;
    
    // Define which initial boxes are required based on contract type
    const requiredBoxes = isNewMexicoClub 
      ? ['monthToMonth', 'extendedPlan', 'resignation', 'corporate', 'syp'] // New Mexico required boxes
      : ['monthToMonth', 'extendedPlan', 'resignation', 'corporate', 'syp', 'corporateProof']; // Colorado required boxes
    
    // Verify that all REQUIRED initial boxes have been checked
    const emptyBoxes = requiredBoxes
      .filter(key => !initialedBoxes[key])
      .filter(key => initialBoxRefs[key]?.current); // Only include boxes that actually exist in DOM
    
    if (emptyBoxes.length > 0) {
      newErrors.initialBoxes = emptyBoxes;
      
      // Scroll to the first empty box
      if (emptyBoxes.length > 0 && initialBoxRefs[emptyBoxes[0]]?.current) {
        initialBoxRefs[emptyBoxes[0]].current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
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
          signatureData: signatureData,
          initialedSections: initialedBoxes
        }
      });
    } else if (errors.initialBoxes && errors.initialBoxes.length > 0) {
      // Show error message for missing initials
      alert("Please initial all required sections before continuing.");
    }
  };

  // Determine contract text based on club
  const getContractText = () => {
    // Check if club is in New Mexico by state property
    const isNewMexicoClub = selectedClub?.state === 'NM' || false;
    
    // Pass props needed for initial boxes and signature
    const contractProps = {
      toggleInitialBox,
      initialedBoxes,
      initialsText: getInitialsText(),
      selectedFont: signatureData.selectedFont,
      initialBoxRefs,  // Pass refs to the contract components
      signature: signatureData.signature,
      isSigned,
      signatureDate,
      handleSignatureClick,
      errors,  // Pass errors to handle error display
      signatureData,  // Pass the full signature data object
      formData,       // Pass the formData
      calculateCancellationDate // Pass the function to calculate cancellation date
    };
    
    if (isNewMexicoClub) {
      return <NewMexicoContract {...contractProps} />;
    } else {
      return <DenverContract {...contractProps} />;
    }
  };

  // Function to extract all dollar amounts from the shopping cart
  const extractAllDollarAmounts = () => {
    if (!formData) return null;
    
    const proratedFactor = calculateProratedFactor(formData.requestedStartDate);
    const monthlyDues = parseFloat(formData.monthlyDues || 0);
    const proratedDues = parseFloat(formData.proratedDues || 0);
    const initiationFee = parseFloat(formData.initiationFee || 0);
    
    // Calculate service addons totals
    const serviceAddons = formData.serviceAddons || [];
    const addonsTotal = serviceAddons.reduce((sum, addon) => sum + parseFloat(addon.price || 0), 0);
    const proratedAddonsTotal = addonsTotal * proratedFactor;
    
    // Calculate tax amounts using the correct tax rate
    const isNewMexicoClub = selectedClub?.state === 'NM';
    const taxRate = isNewMexicoClub ? (formData.taxRate || 0.07625) : 0; // Use actual tax rate from database
    
    // Use pre-calculated tax values from form data to ensure consistency
    const proratedDuesTax = parseFloat(formData.proratedDuesTax || 0);
    const proratedAddonsTax = parseFloat(formData.proratedAddOnsTax || 0);
    const proratedDuesAddonTax = proratedDuesTax + proratedAddonsTax;
    
    // Calculate monthly tax amounts
    const duesTax = isNewMexicoClub ? Number((monthlyDues * taxRate).toFixed(2)) : 0;
    const addonsTax = isNewMexicoClub ? Number((addonsTotal * taxRate).toFixed(2)) : 0;
    
    // Calculate totals
    const proratedDuesAddon = proratedDues + proratedAddonsTotal;
    const totalProrateBilled = proratedDuesAddon + proratedDuesAddonTax;
    const grossMonthlyTotal = monthlyDues + addonsTotal;
    
    const amounts = {
      // Database Parameters Mapping
      databaseParameters: {
        // Prorated Dues
        parProrateDues: {
          value: proratedDues,
          description: "Prorated membership dues",
          tableFields: ["asptitemd.titemd_orig_price", "asptitemd.titemd_mod_price", "asptitemd.titemd_sale_price", "asptitemd.titemd_ext_price"]
        },
        
        // Prorated Dues Tax
        parProrateDuesTax: {
          value: proratedDuesTax,
          description: "Tax on prorated dues",
          tableFields: ["asptitemd.titemd_tax_amt"]
        },
        
        // Prorated Addons Total
        parProrateAddonsTotal: {
          value: proratedAddonsTotal,
          description: "Prorated add-ons total",
          tableFields: ["asptitemd.titemd_orig_price", "asptitemd.titemd_mod_price", "asptitemd.titemd_sale_price", "asptitemd.titemd_ext_price"]
        },
        
        // Prorated Addons Tax
        parProrateAddonsTax: {
          value: proratedAddonsTax,
          description: "Tax on prorated add-ons",
          tableFields: ["asptitemd.titemd_tax_amt"]
        },
        
        // Prorated Dues + Addons
        parProrateDuesAddon: {
          value: proratedDuesAddon,
          description: "Prorated dues + add-ons",
          tableFields: ["asacontrpos.prorate_amt", "asptheade.theade_sub_total"]
        },
        
        // Prorated Dues + Addons Tax
        parProrateDuesAddonTax: {
          value: proratedDuesAddonTax,
          description: "Tax on prorated dues + add-ons",
          tableFields: ["asacontrpos.prorate_tax", "asptheade.theade_tax_total"]
        },
        
        // Initiation Fee
        parlfee: {
          value: initiationFee,
          description: "Initiation fee",
          tableFields: ["asacontrpos.ifee", "asptitemd.titemd_orig_price", "asptitemd.titemd_mod_price", "asptitemd.titemd_sale_price", "asptitemd.titemd_ext_price"]
        },
        
        // Initiation Fee Tax
        parIfeeTax: {
          value: 0, // Initiation fee tax is always 0 since initiation fee is 0
          description: "Initiation fee Tax",
          tableFields: ["asacontrpos.ifee_tax"]
        },
        
        // Total Prorated Billed
        parTotalProrateBilled: {
          value: totalProrateBilled,
          description: "Total prorated amount billed",
          tableFields: ["asptheade.theade_grand_total", "aspttendd.ttendd_amt"]
        },
        
        // Original Monthly Dues
        parOrigDues: {
          value: monthlyDues,
          description: "Original monthly dues",
          tableFields: ["asacontrpos.orig_dues", "asacontr.net_dues", "asprecdoc.amt"]
        },
        
        // Addons Tax
        parAddonsTax: {
          value: addonsTax,
          description: "Tax on add-ons",
          tableFields: ["asacontrpos.addons_tax"]
        },
        
        // Addons Total
        parAddonsTotal: {
          value: addonsTotal,
          description: "Total add-ons amount",
          tableFields: ["asacontrpos.addons_total", "asacontr.bill_amt", "asprecdoc.amt"]
        },
        
        // Dues Tax
        parDuesTax: {
          value: duesTax,
          description: "Tax on dues",
          tableFields: ["asacontrpos.dues_tax"]
        },
        
        // Gross Monthly Total
        parGrossMonthlyTotal: {
          value: grossMonthlyTotal,
          description: "Gross monthly total",
          tableFields: ["asacontr.gross_dues"]
        }
      },
      
      // Tax Rate Information
      taxInfo: {
        taxRate: taxRate,
        isNewMexicoClub: isNewMexicoClub,
        taxRatePercentage: (taxRate * 100).toFixed(2) + '%'
      },
      
      // Service Addons Breakdown
      serviceAddons: serviceAddons.map(addon => ({
        description: addon.description || addon.name,
        monthly: parseFloat(addon.price || 0),
        prorated: parseFloat(addon.price || 0) * proratedFactor,
        upcCode: addon.upcCode || '',
        taxCode: addon.taxCode || ''
      })),
      
      // Child Programs Breakdown
      childPrograms: formData.selectedChildAddons?.map(addon => ({
        description: addon.description || addon.name,
        monthly: parseFloat(addon.price || 0),
        prorated: parseFloat(addon.price || 0) * proratedFactor,
        upcCode: addon.upcCode || '',
        taxCode: addon.taxCode || ''
      })) || []
    };
    
    return amounts;
  };

  // Extract current amounts
  const currentAmounts = extractAllDollarAmounts();

  if (!formData) {
    console.log("ContractPage: formData is null, showing loading...");
    return <div className="loading">Loading...</div>;
  }

  console.log("ContractPage: Rendering with formData:", formData);
  console.log("ContractPage: currentAmounts:", currentAmounts);

  return (
    <div className="contract-container">

        
      <h1>Membership Agreement</h1>
      
      <div className="member-info-summary">
        <h2>Membership Information</h2>
        
        {/* Primary Member Information Section */}
        <div className="info-section primary-member-section">
          <div className="info-row">
            <div className="info-column">
              <div className="primary-member-label-container">
                <div className="primary-member-label">PRIMARY MEMBER</div>
              </div>
            </div>
            <div className="info-column">
              <div className="info-label">Last Name</div>
              <div className="info-value">{formData.lastName}</div>
            </div>
            <div className="info-column">
              <div className="info-label">First Name</div>
              <div className="info-value">{formData.firstName}</div>
            </div>
            <div className="info-column">
              <div className="info-label">DOB</div>
              <div className="info-value">
                {formData.dob ? formatDateWithoutTimezoneShift(formData.dob) : 
                 formData.dateOfBirth ? formatDateWithoutTimezoneShift(formData.dateOfBirth) : ''}
              </div>
            </div>

 
          </div>
        </div>
        
       
        {/* Contact Information Section (no extra space) */}
        <div className="info-section contact-section" style={{ marginTop: '-8px' }}>
          <div className="info-row">
            <div className="info-column">
              <div className="info-label">Phone Number</div>
              <div className="info-value">{formData.mobilePhone || formData.cellPhone || ''}</div>
            </div>
            <div className="info-column">
              <div className="info-label">E-mail</div>
              <div className="info-value">{formData.email}</div>
            </div>
          </div>
          <div className="info-row">
            <div className="info-column">
              <div className="info-label">Home Address</div>
              <div className="info-value">{formData.address}</div>
            </div>
            <div className="info-column">
              <div className="info-label">City</div>
              <div className="info-value">{formData.city}</div>
            </div>
            <div className="info-column">
              <div className="info-label">State</div>
              <div className="info-value">{formData.state}</div>
            </div>
            <div className="info-column">
              <div className="info-label">ZIP Code</div>
              <div className="info-value">{formData.zipCode}</div>
            </div>
          </div>
        </div>
        

        {/* Legal Guardian Information Section - Only show for Junior Memberships */}
        {formData.specialtyMembership === 'J' && (
          <div className="info-section legal-guardian-section">
            <div className="info-row">
              <div className="info-column">
                <div className="primary-member-label-container">
                  <div className="primary-member-label">LEGAL GUARDIAN</div>
                </div>
              </div>
              <div className="info-column">
                <div className="info-label">Last Name</div>
                <div className="info-value">{formData.guardianLastName || 'N/A'}</div>
              </div>
              <div className="info-column">
                <div className="info-label">First Name</div>
                <div className="info-value">{formData.guardianFirstName || 'N/A'}</div>
              </div>
              <div className="info-column">
              <div className="info-label">DOB</div>
              <div className="info-value">
                {formData.guardianDateOfBirth ? formatDateWithoutTimezoneShift(formData.guardianDateOfBirth) : 
                 formData.guardianDateOfBirth ? formatDateWithoutTimezoneShift(formData.guardianDateOfBirth) : ''}
              </div>
            </div>
              <div className="info-column">
                <div className="info-label">Gender</div>
                <div className="info-value">{formData.guardianGender || 'N/A'}</div>
              </div>
              <div className="info-column">
                <div className="info-label">Relationship</div>
                <div className="info-value">
                  {formData.guardianRelationship ? 
                    formData.guardianRelationship.charAt(0).toUpperCase() + formData.guardianRelationship.slice(1).replace('_', ' ') : 
                    'N/A'}
                </div>
              </div>
            </div>
            <div className="info-row">
              <div className="info-column">
                <div className="info-label">Phone</div>
                <div className="info-value">{formData.guardianPhone || 'N/A'}</div>
              </div>
              <div className="info-column">
                <div className="info-label">Email</div>
                <div className="info-value">{formData.guardianEmail || 'N/A'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Membership Details Section */}
        <div className="info-section membership-details-section">
          <div className="info-row membership-types-row">
            <div className="info-column membership-type-column">
              <div className="info-header">Membership Type</div>
              <div className="info-content">
                {formData.displayMembershipType || 'Individual'}
              </div>
            </div>
            
            <div className="info-column addon-options-column">
              <div className="info-header">Add-on Options</div>
              <div className="info-content">
                {formData.addOns && formData.addOns.length > 0 ? (
                  formData.addOns.join(', ')
                ) : (
                  'None'
                )}
              </div>
            </div>
            
            <div className="info-column specialty-membership-column">
              <div className="info-header">Specialty Membership</div>
              <div className="info-content">
                {formData.displaySpecialtyMembership || 'None'}
              </div>
            </div>
            
            <div className="info-column agreement-type-column">
              <div className="info-header">Agreement Type</div>
              <div className="info-content">
                {formData.displayAgreementType || 'Month-to-month'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Family Members Section */}
        {formData.familyMembers && formData.familyMembers.length > 0 && (
          <div className="info-section family-members-section">
            <div className="info-header">Family Members ({formData.familyMembers.length})</div>
            <div className="info-content">
         {formData.familyMembers.map((member, index) => (
           <div key={index} className="family-member-item">
             {member.name} - {member.gender ? `${member.gender} - ` : ''}{member.type}{member.dateOfBirth ? ` - ${formatDateWithoutTimezoneShift(member.dateOfBirth)}` : ''}
           </div>
         ))}
            </div>
          </div>
        )}
        
        {/* Child Programs Section */}
        {formData.childPrograms && (
          <div className="info-section child-programs-section">
            <div className="info-header">Child Programs</div>
            <div className="info-content">
              {formData.childPrograms}
              {formData.childProgramsMonthly && (
                <div>Monthly: ${formData.childProgramsMonthly}</div>
              )}
              {formData.childProgramsDueNow && (
                <div>Due now: ${formData.childProgramsDueNow}</div>
              )}
            </div>
          </div>
        )}
        
        {/* Additional Services Detail Section */}
        {formData.additionalServiceDetails && formData.additionalServiceDetails.length > 0 && (
          <div className="info-section additional-services-section">
            <div className="info-header">Additional Services</div>
            <div className="info-content">
              {formData.additionalServiceDetails.map((service, index) => (
                <div key={index} className="service-item">
                  <div>{service.name}</div>
                  {service.dueNow && <div>Due now: ${service.dueNow}</div>}
                  {service.monthly && <div>Monthly: ${service.monthly}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Membership ID Section */}
        {formData.membershipId && (
          <div className="info-section membership-code-section">
            <div className="info-row">
              <div className="info-column">
                <div className="info-label">Membership ID</div>
                <div className="info-value">{formData.membershipId}</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Financial Details Section */}
        <div className="info-section financial-details-section">
          <div className="info-header">Financial Details</div>
          <div className="info-row">
            <div className="info-column financial-item">
              <div className="info-label">Enrollment Fee</div>
              <div className="info-value">${formData.initiationFee || '0.00'}</div>
            </div>
          </div>
          <div className="info-row">
            <div className="info-column financial-item">
              <div className="info-label">Pro-rated Dues</div>
              <div className="info-value">${formData.proratedDues || '0.00'}</div>
            </div>
          </div>
          <div className="info-row">
            <div className="info-column financial-item">
              <div className="info-label">Pro-rated Add-Ons</div>
              <div className="info-value">${formData.proratedAddOns || '0.00'}</div>
            </div>
          </div>
          <div className="info-row">
            <div className="info-column financial-item">
              <div className="info-label">Service Add-Ons</div>
              <div className="info-value">${formData.packagesFee || '0.00'}</div>
            </div>
          </div>
          <div className="info-row">
            <div className="info-column financial-item">
              <div className="info-label">Taxes</div>
              <div className="info-value">${formData.taxAmount || '0.00'}</div>
            </div>
          </div>
          <div className="info-row">
            <div className="info-column financial-item total-collected">
              <div className="info-label">Total Collected (Tax included)</div>
              <div className="info-value">${formData.totalCollected || (
                parseFloat(formData.initiationFee || 0) + 
                parseFloat(formData.proratedDues || 0) + 
                parseFloat(formData.proratedAddOns || 0) + 
                parseFloat(formData.packagesFee || 0) + 
                parseFloat(formData.taxAmount || 0)
              ).toFixed(2) || '0.00'}</div>
            </div>
          </div>
        </div>
        
        {/* Payment Summary Section */}
        <div className="info-section payment-summary-section">
          <div className="info-header">Monthly Cost Going Forward</div>
          <div className="info-row">
            <div className="info-column">
              <div className="info-label">{formData.displayMembershipType || 'Individual'} Dues {formData.displayAgreementType || 'Month-to-month'}</div>
              <div className="info-value">${formData.monthlyDues || '0.00'}</div>
            </div>
          </div>
          <div className="info-row">
            <div className="info-column">
              <div className="info-label">Total Monthly Membership Dues Rate</div>
              <div className="info-value">${formData.totalMonthlyRate || formData.monthlyDues || '0.00'}</div>
            </div>
          </div>
          <div className="info-row">
            <div className="info-column">
              <div className="info-label">Membership Start Date</div>
              <div className="info-value" style={{ fontWeight: "bold" }}>
                {formData.requestedStartDate ? formatDateWithoutTimezoneShift(formData.requestedStartDate) : ''}
              </div>
            </div>
          </div>
        </div>
        
        {/* Payment Authorization Section */}
        <div className="info-section payment-auth-section">
          <div className="info-row">
            <div className="auth-text">
              I hereby request and authorize {selectedClub?.state === 'NM' ? 'New Mexico Sports and Wellness' : 'Colorado Athletic Club'} to charge my account via Electronic Funds Transfer on a monthly basis beginning {formData.requestedStartDate ? formatDateWithoutTimezoneShift(formData.requestedStartDate) : ''}.
              <br /><br />
              The debit will consist of monthly dues plus any other club charges (if applicable) made by myself or other persons included in my membership in accordance with the resignation policy detailed in the Terms and Conditions within this Agreement. The authorization is extended by me to {selectedClub?.state === 'NM' ? 'New Mexico Sports and Wellness' : 'Colorado Athletic Club'} and/or its authorized agents or firms engaged in the business of processing check and charge card debits.
            </div>
          </div>
          
          <div className="info-row">
            <div className="info-column">
              <div className="info-label">Payment Method</div>
              <div className="info-value">{formData.paymentMethod || 'Credit Card'}</div>
            </div>
          </div>
          
          <div className="info-row credit-card-info-row">
            <div className="info-column">
              <div className="info-label">Credit Card Number</div>
              <div className="info-value">
                {formData.creditCardNumber ? `${formData.creditCardNumber.replace(/\d(?=\d{4})/g, '*')}` : ''}
              </div>
            </div>
            <div className="info-column">
              <div className="info-label">Expiration</div>
              <div className="info-value">
                {formData.expirationDate ? formatDateWithoutTimezoneShift(formData.expirationDate) : ''}
              </div>
            </div>
            <div className="info-column">
              <div className="info-label">Name on Account</div>
              <div className="info-value">{formData.firstName} {formData.lastName}</div>
            </div>
          </div>
        </div>
        
        {/* DEBUG: All Dollar Amounts Section */}
        {currentAmounts && (
          <div className="info-section debug-amounts-section" style={{backgroundColor: '#f0f8ff', border: '2px dashed #007bff', marginTop: '2rem'}}>
            <div className="info-header" style={{color: '#007bff', fontSize: '1.2rem', fontWeight: 'bold'}}>🔍 DEBUG: Database Parameter Mapping</div>
            
            {/* Database Parameters Table */}
            <div className="info-row">
              <div className="info-column" style={{width: '100%'}}>
                <div className="info-label">Database Parameters & Table Fields</div>
                <div className="info-value">
                  <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem'}}>
                    <thead>
                      <tr style={{backgroundColor: '#e3f2fd'}}>
                        <th style={{border: '1px solid #ddd', padding: '8px', textAlign: 'left'}}>Parameter Name</th>
                        <th style={{border: '1px solid #ddd', padding: '8px', textAlign: 'left'}}>Value</th>
                        <th style={{border: '1px solid #ddd', padding: '8px', textAlign: 'left'}}>Description</th>
                        <th style={{border: '1px solid #ddd', padding: '8px', textAlign: 'left'}}>Table Fields</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(currentAmounts.databaseParameters).map(([paramName, paramData]) => (
                        <tr key={paramName} style={{backgroundColor: paramData.value === 0 ? '#fff3cd' : '#fff'}}>
                          <td style={{border: '1px solid #ddd', padding: '8px', fontWeight: 'bold', fontFamily: 'monospace'}}>{paramName}</td>
                          <td style={{border: '1px solid #ddd', padding: '8px', fontFamily: 'monospace', color: paramData.value === 0 ? '#856404' : '#000'}}>
                            ${paramData.value.toFixed(2)}
                          </td>
                          <td style={{border: '1px solid #ddd', padding: '8px'}}>{paramData.description}</td>
                          <td style={{border: '1px solid #ddd', padding: '8px', fontSize: '0.8rem', fontFamily: 'monospace'}}>
                            {paramData.tableFields.join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Summary Section */}
            <div className="info-row">
              <div className="info-column">
                <div className="info-label">Summary</div>
                <div className="info-value">
                  <div style={{marginBottom: '1rem'}}>
                    <strong>Key Totals:</strong><br/>
                    • Total Due Now: <span style={{color: '#28a745', fontWeight: 'bold'}}>${currentAmounts.databaseParameters.parTotalProrateBilled.value.toFixed(2)}</span><br/>
                    • Gross Monthly Total: <span style={{color: '#007bff', fontWeight: 'bold'}}>${currentAmounts.databaseParameters.parGrossMonthlyTotal.value.toFixed(2)}</span><br/>
                    • Tax Rate: {(currentAmounts.taxInfo.taxRatePercentage)}
                  </div>
                  
                  <div>
                    <strong>Zero Values (Highlighted in Yellow):</strong><br/>
                    {Object.entries(currentAmounts.databaseParameters)
                      .filter(([_, paramData]) => paramData.value === 0)
                      .map(([paramName, paramData]) => (
                        <span key={paramName} style={{display: 'inline-block', margin: '2px', padding: '2px 6px', backgroundColor: '#fff3cd', borderRadius: '3px', fontSize: '0.8rem'}}>
                          {paramName}: ${paramData.value.toFixed(2)}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Individual Components (for reference) */}
            <div className="info-row">
              <div className="info-column">
                <div className="info-label">Individual Components</div>
                <div className="info-value">
                  <div style={{marginBottom: '0.5rem'}}>
                    <strong>Membership:</strong> {formData.displayMembershipType || 'Individual'} Membership<br/>
                    Monthly: ${parseFloat(formData.monthlyDues || 0).toFixed(2)} | 
                    Prorated: ${parseFloat(formData.proratedDues || 0).toFixed(2)}
                  </div>
                  
                  <div style={{marginBottom: '0.5rem'}}>
                    <strong>Initiation Fee:</strong> ${parseFloat(formData.initiationFee || 0).toFixed(2)}
                  </div>
                  
                  {currentAmounts.serviceAddons.length > 0 && (
                    <div style={{marginBottom: '0.5rem'}}>
                      <strong>Service Add-ons ({currentAmounts.serviceAddons.length}):</strong><br/>
                      {currentAmounts.serviceAddons.map((addon, index) => (
                        <div key={index} style={{marginLeft: '1rem', fontSize: '0.9rem'}}>
                          • {addon.description}: ${addon.monthly.toFixed(2)}/month (${addon.prorated.toFixed(2)} prorated)
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {currentAmounts.childPrograms.length > 0 && (
                    <div style={{marginBottom: '0.5rem'}}>
                      <strong>Child Programs:</strong><br/>
                      {currentAmounts.childPrograms.map((program, index) => (
                        <div key={index} style={{marginLeft: '1rem', fontSize: '0.9rem'}}>
                          • {program.description}: ${program.monthly.toFixed(2)}/month (${program.prorated.toFixed(2)} prorated)
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div style={{marginBottom: '0.5rem'}}>
                    <strong>Tax Information:</strong><br/>
                    • Tax Rate: {currentAmounts.taxInfo.taxRatePercentage}<br/>
                    • New Mexico Club: {currentAmounts.taxInfo.isNewMexicoClub ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Raw Form Data */}
            <div className="info-row">
              <div className="info-column">
                <div className="info-label">Raw Form Data</div>
                <div className="info-value" style={{fontSize: '0.8rem', fontFamily: 'monospace', backgroundColor: '#f8f9fa', padding: '0.5rem', borderRadius: '4px'}}>
                  <pre>{JSON.stringify({
                    monthlyDues: formData.monthlyDues,
                    proratedDues: formData.proratedDues,
                    proratedAddOns: formData.proratedAddOns,
                    totalCollected: formData.totalCollected,
                    totalMonthlyRate: formData.totalMonthlyRate,
                    taxAmount: formData.taxAmount,
                    initiationFee: formData.initiationFee,
                    serviceAddons: formData.serviceAddons?.length || 0,
                    childPrograms: formData.childPrograms,
                    taxRate: formData.taxRate
                  }, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      

 {/* Signature Selector Section ----------------------------------------------*/}        

                 <div className="signature-section">
        <h2>Signature Selector</h2>
        <div className="signature-fields">
          <div className="signature-field">
            <label><i>Please select a signature style to be used throughout this document</i> <span className="required">*</span></label>
            {formData.specialtyMembership === 'J' ? (
              <>
                <p className="guardian-signature-note">
                  <i>As this is a Junior membership, the legal guardian will sign the agreement.</i>
                </p>
                <SignatureSelector 
                  onChange={(value, fontInfo) => handleSignatureChange('signature', value, fontInfo)}
                  name={`${formData.guardianFirstName} ${formData.guardianLastName}`}
                  type="signature"
                />
              </>
            ) : (
              <SignatureSelector 
                onChange={(value, fontInfo) => handleSignatureChange('signature', value, fontInfo)}
                name={`${formData.firstName} ${formData.lastName}`}
                type="signature"
              />
            )}
            {errors.signature && <div className="error-message">{errors.signature}</div>}
          </div>
          
          <div className="signature-field">
            <label>Initials: <span className="required">*</span></label>
            {formData.specialtyMembership === 'J' ? (
              <SignatureSelector 
                onChange={(value) => handleSignatureChange('initials', value)}
                name={`${formData.guardianFirstName} ${formData.guardianLastName}`}
                type="initials"
                forcedFont={signatureData.selectedFont}
                showFontControls={false}
              />
            ) : (
              <SignatureSelector 
                onChange={(value) => handleSignatureChange('initials', value)}
                name={`${formData.firstName} ${formData.lastName}`}
                type="initials"
                forcedFont={signatureData.selectedFont}
                showFontControls={false}
              />
            )}
            {errors.initials && <div className="error-message">{errors.initials}</div>}
          </div>
        </div> 




        {/* TERMS AND CONDITIONS Section ----------------------------------------------*/}     
 
      <div className="contract-text">
        <h2>Terms and Conditions</h2>
        <div className={`scrollable-text ${!isSignatureConfirmed ? 'disabled-scrolling' : ''}`}>
          {!isSignatureConfirmed && (
            <div className="scroll-overlay">
              <div className="overlay-message">
                <i className="overlay-icon">🔒</i>
                <p>Please confirm your signature to review the terms and conditions</p>
              </div>
            </div>
          )}
          {getContractText()}
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
          onClick={() => {
            // Store a flag in sessionStorage to indicate we're returning from the contract page
            sessionStorage.setItem('isReturningFromContract', 'true');
            
            // Create a complete copy of all data to pass back to enrollment form
            const completeFormData = {
              ...formData,
              // Add a specific flag to indicate we're returning from the contract page
              isReturningFromContract: true,
              // Original family members with all details - preserve original structure
              familyMembers: formData.familyMembers && formData.familyMembers.map(member => ({
                id: member.id || Date.now() + Math.random(),
                firstName: member.firstName,
                lastName: member.lastName,
                middleInitial: member.middleInitial || '',
                dateOfBirth: member.dateOfBirth,
                gender: member.gender,
                email: member.email || '',
                cellPhone: member.cellPhone || '',
                homePhone: member.homePhone || '',
                workPhone: member.workPhone || '',
                memberType: member.memberType,
                role: member.role,
                // Keep any other properties that might be there
                ...member
              })),
              // Make sure service addons are properly formatted
              serviceAddons: formData.serviceAddons?.map(addon => ({
                invtr_id: addon.id || '',
                invtr_desc: addon.description || addon.name || '',
                invtr_price: typeof addon.price === 'number' ? addon.price : 
                             (addon.monthly ? parseFloat(addon.monthly) : 0),
                invtr_upccode: addon.upcCode || '',
                // Preserve all original properties
                ...addon
              })) || [],
              // Preserve any additional service details
              additionalServiceDetails: formData.additionalServiceDetails || []
            };
            navigate('/enrollment', { state: { formData: completeFormData } });
          }}
        >
          Back
        </button>
        
        {/* PDF Download Buttons */} 
        <div className="pdf-download-container">
          <CanvasContractPDF
            formData={formData}
            signatureData={signatureData}
            signatureDate={signatureDate}
            initialedSections={initialedBoxes}
            selectedClub={selectedClub}
            membershipPrice={formData.monthlyDues || formData.membershipDetails?.price}
          />
          {/* Debug display for family members data */}
          {/* {JSON.stringify(formData.familyMembers)} */}
        </div>
        
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

// Denver Contract Component
const DenverContract = ({ 
  toggleInitialBox, 
  initialedBoxes, 
  initialsText, 
  selectedFont, 
  initialBoxRefs,
  signature,
  isSigned,
  signatureDate,
  handleSignatureClick,
  errors,
  signatureData,
  formData,
  calculateCancellationDate
}) => {
  return (
    <>
      <div className="contract-section">
        <div className="section-header">CANCELLATION RIGHT</div>
        <div className="section-content">
          <p className="cancellation-text">COLORADO ATHLETIC CLUB (CAC) MONEY BACK GUARANTEE:</p>
          <p>CAC EXTENDS A FOURTEEN (14) DAY TRIAL PERIOD WITH A FULL REFUND. THIS REFUND DOES NOT APPLY TO AMOUNTS OWED BY MEMBER TO CAC UNDER ANY OTHER MEMBERSHIP APPLICATION OR AGREEMENT. THE 14 DAYS INCLUDE THE DATE ON THIS AGREEMENT. YOU MAY RESCIND THIS AGREEMENT BY SENDING WRITTEN NOTICE TO COLORADO ATHLETIC CLUB THAT YOU ARE EXERCISING YOUR RIGHT TO RESCIND BY FACSIMILE TRANSMITTAL, MAIL, EMAIL, HAND DELIVERY OR COMPLETING A MEMBERSHIP CANCELATION FORM AT THE CLUB. A NOTICE IS DEEMED DELIVERED ON THE DATE POSTMARKED IF MAILED, ON THE DATE DELIVERED IF BY HAND DELIVERY, FACSIMILE OR EMAIL. IF YOU PROPERLY EXERCISE YOUR RIGHT TO RESCIND WITHIN 14 DAYS (NOT LATER THAN 5PM) OF {formData?.requestedStartDate ? calculateCancellationDate(formData.requestedStartDate) : ''}, YOU WILL BE ENTITLED TO A REFUND OF ALL PAYMENTS MADE PURSUANT TO THIS MEMBERSHIP APPLICATION.</p>
          <p className="acknowledgment">EACH OF THE UNDERSIGNED MEMBERS ACKNOWLEDGES RECEIPT OF THE FOREGOING NOTICE AND COPIES HEREOF:</p>
          <p>I have read and understand this agreement along with the terms and conditions contained on this document and will abide by the rules and regulations of Colorado Athletic Club. In addition, I understand that the primary member represents all members and accepts all responsibility on the account and that all memberships are non-transferable and non-assignable to another individual. By signing this document or sending this by facsimile, I do intend it to be my legally binding and valid signature on this agreement as if it were an original signature.</p>
        </div>
      </div>

      <div className="contract-section">
        <div className="section-header">MEMBERSHIP AGREEMENT</div>
        <div className="section-content">
          <p><strong>1. MEMBERSHIP FEE STRUCTURES</strong></p>
          <p><strong>A.</strong> The Member is required to immediately pay any applicable start up costs which are due and owing separate and apart from the monthly dues stated on this membership agreement.</p>
          <p><strong>B.</strong> The Member elects to purchase a membership and to pay to Colorado Athletic Club (CAC) the required total monthly dues as indicated on this agreement under one of the following scenarios:</p>
          <p><strong>MONTH-TO-MONTH</strong> - I understand that I am committing to a minimum three (3) month membership. The three (3) month period commences on the 1st of the month following the date the membership begins. After fulfilling my minimum three (3) month membership commitment, I understand that the membership may be cancelled at any time with written notice pursuant to the Resignation Policy (Item 4A) and the total dues owing for the membership as well as all discounts and initiation fees are not refundable. As such, any failure to use the membership indicated above and/or the facilities and programs associated therewith does not relieve applicant of any liability for payment of the total dues or other charges owing as indicated above, regardless of circumstances. Dues may increase at any time, with a one (1) month notice.</p>
          <p className="initial-line">
            <strong>INITIAL</strong> 
            <InitialBox
              ref={initialBoxRefs.monthToMonth}
              onClick={() => toggleInitialBox('monthToMonth')}
              value={initialsText}
              font={selectedFont}
              isInitialed={initialedBoxes.monthToMonth}
            />
          </p>
          
          <p><strong>EXTENDED PLAN</strong> - I elect to pay for the number of selected months on this agreement for consecutive months of member dues plus any club charges (if applicable) made by myself or any other persons included in my membership. I understand that I am committing to a minimum three (3) month membership. The three (3) month period commences on the 1st of the month following the date the membership begins. Member acknowledges that in order to be relieved of the agreement terms, the balance of the dues owed for the remaining months of the agreement must be paid in full. Special consideration can be made if cause for cancellation is based on a medical contingency and written authorization from a doctor is received; or if a member moves 50 miles or more away from the nearest Colorado Athletic Club with proof of new residency. Any Leave of Absence taken during the initial term of this agreement will extend the commitment by the number of months the member's account is on Leave of Absence. Rate for Student/Young Professional memberships will only be honored through the current maximum age for this type of membership regardless of whether the number of selected months on this agreement has expired or not. AT THE END OF THE AGREEMENT PERIOD CHOSEN THIS PLAN REMAINS IN EFFECT ON A MONTH-TO-MONTH BASIS and the Resignation Policy (Item 4A) applies. I authorize CAC to collect payment under the method of payment indicated on the agreement and the balance of the remaining dues owed should I not satisfy the terms of the agreement.</p>
          <p className="initial-line">
            <strong>INITIAL</strong>
            <InitialBox
              ref={initialBoxRefs.extendedPlan}
              onClick={() => toggleInitialBox('extendedPlan')}
              value={initialsText}
              font={selectedFont}
              isInitialed={initialedBoxes.extendedPlan}
            />
          </p>
          
          <p>Except as expressly provided in this Membership Agreement, no portion of the initial fee or monthly membership dues is refundable, regardless of whether member attends or uses, or is able to attend or use, the facilities or programs of the club.</p>
          
          <p><strong>C. PAID-IN-FULL</strong> - I elect to pay my total dues, as indicated on this agreement, in advance in consideration of a discount on yearly dues. At the completion of the prepaid period, my membership will automatically revert to month-to-month billing unless I prepay another year in advance or terminate with a written notice pursuant to the Resignation Policy (Item 4A.). If terminating prior to the completion of the prepaid agreement, a refund will be granted minus the discount percent indicated on this document. If a renewal of membership is requested by the applicant and approved at the conclusion of the term indicated, I understand that the renewal monthly dues to be charged will be those dues rates in effect at the time of renewal.</p>
          
          <p><strong>D. EFT</strong> - All dues and Member charges will be payable monthly (with the exception of annual dues prepayments) and collected by Electronic Funds Transfer (EFT) from either the Member's bank account or charged to an approved credit card. Please notify Colorado Athletic Club (CAC) at the time you change bank accounts or credit cards and provide the appropriate information to avoid having your old account charged for your monthly dues.</p>
          
          <p><strong>E. DELINQUENT ACCOUNTS</strong> - In the event a bank account or credit card is unable to be charged at the designated date, the membership is subject to a late fee. A charge will be issued for checks returned due to insufficient funds and credit cards that are declined when a balance is due. The Primary Member is responsible for all charges incurred.</p>
          
          <p><strong>F. REFERRALS</strong> - If a dues referral program is in effect, it will not extend or modify the terms of the membership agreement. Any Member in default of payment due may NOT cure the default by way of credit for "referral" members to Colorado Athletic Club.</p>
          
          <p><strong>G. EMAIL </strong>- By providing my email address, I am consenting to receive information via email from Colorado Athletic Club, The Wellbridge Company and their affiliated companies. Any further distribution of my email address is unauthorized.</p>
          
          <p><strong>2. UPGRADES/DOWNGRADES</strong> - Requests for upgrades/downgrades of membership must be made in writing. Upgrades will be effective immediately unless otherwise requested. Requests for downgrades must be submitted by the last day of the month for the downgrade to be effective for the following month. Primary Member's signature is required for all changes. Proof of eligibility/residency to upgrade/add members is required.</p>
          
          <p><strong>3. CLUB'S RIGHT OF CANCELLATION</strong> - Management of CAC may suspend or cancel the rights, privileges or membership of any Member whose actions are detrimental to the facility or do not comply with the rules and regulations of the facility or upon any failure of a Member to make payment to CAC of all amounts due from the Member within sixty (60) days after billed. CAC has the option of declaring any other indebtedness of the Member to CAC immediately due and payable, without notice or demand. The Member agrees to pay CAC a reasonable attorney's fee, court costs and all other expenses incurred by CAC in making the collection. All outstanding amounts not paid when due shall accumulate interest at the rate of 1.5% per month.</p>
          
          <p><strong>4. TERMINATION/RESIGNATION RIGHTS</strong> - In addition to the Cancellation Right set forth on this agreement, Member has the following rights to terminate:</p>
          
          <p><strong>A. RESIGNATION POLICY: </strong>A month-to-month membership may be cancelled by providing at least one (1) month's written notice. Cancellation shall be effective on the 1st of the month that is at least one (1) month after the date the notice is delivered. Notice can be provided by first class mail (Certified with Return Receipt Recommended), personal delivery of cancelation form at the club (Obtaining a copy from Club Personnel Recommended), and contact with the club to obtain the current, digital form of cancellation. Concurrently with the delivery of written notice, Member must pay the club any amounts due on the account as of the cancellation date and on or before the cancellation date member must return all membership cards. Those who have signed on an Extended Plan agreement are subject to the terms of their agreement and are responsible for the balance of remaining dues. All memberships are non-refundable, non-transferable, non-assignable and non-proprietary.</p>
          <p className="initial-line">
            <strong>INITIAL</strong>
            <InitialBox
              ref={initialBoxRefs.resignation}
              onClick={() => toggleInitialBox('resignation')}
              value={initialsText}
              font={selectedFont}
              isInitialed={initialedBoxes.resignation}
            />
          </p>
          
          <p><strong>B. DEATH OR DISABILITY: </strong>The contract may be cancelled in the event of member's death or total disability during the membership term. Total disability means a condition which has existed or will exist for more than six (6) months and which will prevent Member from using the club. In order to establish death, the member's estate must furnish to the club a death certificate. In order to establish disability, Member must furnish the club certification of the disability by a licensed physician whose diagnosis or treatment is within his scope of practice. Cancellation will be effective upon establishment of death or disability according to these provisions. In the event that Member has paid membership fees in advance, the club shall be entitled to retain an amount equal to the amount computed by dividing the total cost of the membership by the total number of months under the membership and multiplying the result by the number of months expired under the membership term. As to membership fees paid monthly, dues will be refunded for the month in which written notification is received of the death or disability and the proper documentation outlined above has been provided.</p>
          
          <p><strong>5. MEMBERSHIP ENTRY</strong> - I understand cards and/or Club App with proper check-in credentials are mandatory and must be presented prior to entering CAC. These forms of entry are not transferable to another person. There will be a replacement fee for each lost card. I acknowledge that I am responsible for all charges incurred on my membership card.</p>
          
          <p><strong>6. HOURS OF OPERATION</strong> - Operation schedules may vary and are subject to change. Schedule of hours of operation and any changes will be posted in CAC.</p>
          
          <p><strong>7. LEAVE OF ABSENCE POLICY</strong> - This Membership may be put on a Leave of Absence (LOA). LOA requests must be in writing and submitted by the last day of the month for the LOA to be effective the following month. LOA must state the leave and return date. There is a monthly charge for accounts in LOA (exceptions for medical LOAs may be approved for no charge with proper medical documentation). There will be no retroaction or partial month adjustments. A medical LOA must be accompanied by a doctor's note. If member chooses to cancel their membership while on a LOA, the membership is reinstated, full dues will be charged for the final month of membership and the cancellation policy takes effect. An LOA extends any memberships in an Extended Plan by the number of months the membership is in a LOA status.</p>
          
          <p><strong>8. PERSONAL TRAINING</strong> - Personal trainers not employed by CAC are not allowed to train or consult in any part of the clubs due to CAC's interest in ensuring the accuracy of information relayed, as well as to reduce the potential for injury.</p>
          
          <p><strong>9. EMERGENCY MEDICAL AID</strong> - CAC reserves the right to call emergency medical aid for an injured Member or guest and said Member or guest accepts responsibility for any financial obligations arising from such emergency medical aid or transportation to a medical facility.</p>
          
          <p><strong>10. AMENDING OF RULES</strong> - I understand CAC reserves the right to amend or add to these conditions and to adopt new conditions as it may deem necessary for the proper management of the clubs and the business.</p>
          
          <p><strong>11. UNAVAILABILITY OF FACILITY OR SERVICES</strong> - I agree to accept the fact that a particular facility or service in the premises may be unavailable at any particular time due to mechanical breakdown, fire, act of God, condemnation, loss of lease, catastrophe or any other reason. Further, I agree not to hold CAC responsible or liable for such occurrences.</p>
          
          <p><strong>12. HEALTH WARRANTY</strong> - I warrant and represent that I, any family member, ward or guest (each, a "Guest") who uses any CAC facility has no disability, impairment or illness preventing such person from engaging in active or passive exercise or that will be detrimental or inimical to such person's health, safety or physical condition. I acknowledge and agree that: (1) CAC will rely on the foregoing warranty in issuing my membership, (2) CAC may perform a fitness assessment or similar testing to establish my or my Guests' initial physical statistics, (3) if any fitness or similar testing is performed by CAC, it is solely for the purpose of providing comparative data with which I or my Guests may chart progress in a program and is not for any diagnostic purposes whatsoever, and (4) CAC shall not be subject to any claim or demand whatsoever on account of CAC's evaluation or interpretation of such fitness assessment or similar testing. I and my Guests are responsible for understanding our respective medical history and should consult with a physician prior to engaging in exercise or continuation of exercise if a medical condition appears to be developing.</p>
          
          <p><strong>13. DAMAGE TO FACILITIES</strong> - I agree to pay for any damage that I, my family or my Guests may cause this club's facilities through careless or negligent use thereof.</p>
          
          <p><strong>14. WAIVER AND RELEASE OF THEFT/PROPERTY DAMAGE</strong> - I hereby acknowledge and recognize that I am responsible to protect against theft or damage to any of my or my Guests' personal property while using the CAC's facilities and that CAC has advised me not to bring any valuables to CAC' facilities. I waive and release CAC from any and all claims, damages, or responsibility relating to the theft of or damage to my or my Guests' personal property at CAC' facilities, including without limitation, any belongings left by me in a locker, the locker room, or other CAC facilities, or theft or damage to any automobiles or personal property in the club's parking lot.</p>
          
          <p><strong>15. WAIVER AND RELEASE OF PERSONAL INJURY</strong> - I recognize, acknowledge, and agree that athletic activities and the use of the Club may result in personal injuries, including serious bodily injury or death. By accepting this agreement and in using the CAC's facilities, I assume all risks of injuries that I or my minor children may suffer and all responsibilities associated with the use of the Club's athletic facilities, including any athletic activities, showers, steam rooms, or other Club usage. I agree, waive, and release CAC, its owners, managers, and any of their subsidiaries, assigns, successors, attorneys, and insurers (the "CAC Parties") from any and all claims, damages, liabilities, expenses, and costs arising out of, or relating to (a) the negligence of CAC, its owners, managers or employees, (b) any another member's, guest's or invitee's conduct, (c) the condition of CAC's facilities, or (d) my or my Guests' use of CAC's facilities and activities, including without limitation, my or my Guests' use of CAC's parking lot, athletic facilities, athletic equipment, pool, sauna, steam room, showers, or any other facilities and activities associated with CAC. Further, I agree to indemnify and defend the CAC Parties against any and all claims, damages, costs, expenses, arising from my and my Guests or invitees use of CAC's facilities.</p>
          
          <p><strong>16. WAIVER AND RELEASE OF ELECTRONIC MEDIA</strong> - I recognize, acknowledge and grant permission for Starmark Holdings, LLC, its affiliates, subsidiaries, employees, successors and/or anyone acting with its authority, to take and use still photographs, motion picture, video, sound recordings and/or testimonials of me and/or any family member, ward or guest.</p>
          
          <p>I hereby waive any right to inspect or approve the photographs, electronic matter, and/or finished products that may be used in conjunction with them now or in the future. I hereby grant all right, title and interest I may now have in the photographs, electronic matter, and/or finished products to Starmark Holdings, LLC and/or anyone acting with its authority, and hereby waive any right to royalties or other compensation arising from or related to the use of the photographs, electronic matter, and/or finished matter.</p>
          
          <p>I hereby consent to receive future calls, text messages, and/or short message service ("SMS") calls (collectively, "Calls") that deliver prerecorded or prewritten messages by or on behalf of Wellbridge to me. Providing consent to receive such Calls is not a condition of purchasing any goods or services from Wellbridge. I understand that I may revoke this consent by following the 'opt-out' procedures presented upon receiving a Call.</p>
          
          <p><strong>17. CORPORATE MEMBERS REGULATIONS</strong></p>
          
          <p><strong>1.</strong> Corporate members must be a W-2 paid employee or associate of a firm or approved organization that has a corporate membership with CAC, unless otherwise agreed to in writing. CAC must be notified immediately of any change in employment status.</p>
          
          <p><strong>2.</strong> Discounts on monthly dues may change in accordance with the number or employees of the corporate firm who belong to CAC. I understand I will lose my corporate discount and will be readjusted to regular rates if my employer drops below the minimum required number of participating employees for them to be eligible in the corporate discount program.</p>
          
          <p><strong>3.</strong> It is the member's responsibility to notify CAC of any change in employment status. I understand that I will be assessed appropriate monthly fees should I leave the above corporation/organization, or the corporation/organization drops its corporate membership.</p>
          
          <p><strong>4.</strong> Proof of employment must be provided to obtain the corporate discount.</p>
          <p className="initial-line">
            <strong>INITIAL</strong>
            <InitialBox
              ref={initialBoxRefs.corporate}
              onClick={() => toggleInitialBox('corporate')}
              value={initialsText}
              font={selectedFont}
              isInitialed={initialedBoxes.corporate}
            />
          </p>
          
          <p><strong>18. STUDENT YOUNG PROFESSIONAL (SYP) MEMBERSHIPS</strong></p>
          
          <p>Student/Young Professional (SYP) discounted memberships are offered exclusively to members between the ages of 19-29. This special discounted rate will be honored through the age of 29. I understand that beginning the month after my 30th birthday my monthly dues rate will increase by $10. Each year thereafter my monthly rate will increase by an additional $10 until my rate reaches the then current rate. I also understand that my rate may also change for any other upgrades or downgrades of the membership that I may initiate.</p>
          
          <p>Proof of age must be received within 14 days; otherwise your membership will be converted to the equivalent of one individually priced membership and you will be responsible for the entire billed amount. If the documentation is not received by {formData?.requestedStartDate ? calculateCancellationDate(formData.requestedStartDate) : ''}, your rate will go to $150.00 per month until the proper documentation is provided. The club will not issue a dues credit for any portion of the additional charges once billed.</p>
          <p className="initial-line">
            <strong>INITIAL</strong>
            <InitialBox
              ref={initialBoxRefs.syp}
              onClick={() => toggleInitialBox('syp')}
              value={initialsText}
              font={selectedFont}
              isInitialed={initialedBoxes.syp}
            />
          </p>
          
          <p><strong>19. CORPORATE PROOF</strong></p>
          
          <p>Although you were unable to provide corporate proof when beginning your membership, we would like to offer you the opportunity to immediately take advantage of your membership.</p>
          
          <p>If this proof is not received within 14 days, your membership will be converted to the equivalent of one individually priced membership and you will be responsible for the entire billed amount. If the documentation is not received by {formData?.requestedStartDate ? calculateCancellationDate(formData.requestedStartDate) : ''}, your rate will go to $150.00 per month until the proper documentation is provided. The club will not issue a dues credit for any portion of the additional charges once billed.</p>
          <p className="initial-line">
            <strong>INITIAL</strong>
            <InitialBox
              ref={initialBoxRefs.corporateProof}
              onClick={() => toggleInitialBox('corporateProof')}
              value={initialsText}
              font={selectedFont}
              isInitialed={initialedBoxes.corporateProof}
            />
          </p>
          
          <p>The terms and conditions contained herein, along with the Rules and Regulations, constitute the full agreement between CAC and the Member, and no oral promises are made a part of it.</p>
          
            <div className="contract-signature-container">
              {formData.specialtyMembership === 'J' ? (
                /* Show only Guardian Signature for Junior Memberships */
                <>
                  <div className="guardian-signature-label">Legal Guardian Signature:</div>
                  <div 
                    className={`contract-signature-box ${isSigned ? 'signed' : ''}`}
                    onClick={handleSignatureClick}
                    style={{ 
                      fontFamily: selectedFont?.font || 'inherit',
                      cursor: 'pointer'
                    }}
                  >
                    {isSigned ? `${formData.guardianFirstName || ''} ${formData.guardianLastName || ''}` : 'Click to sign'}
                  </div>
                </>
              ) : (
                /* Show regular Signature for all other memberships */
                <div 
                  className={`contract-signature-box ${isSigned ? 'signed' : ''}`}
                  onClick={handleSignatureClick}
                  style={{ 
                    fontFamily: selectedFont?.font || 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  {isSigned ? signature?.text || 'Click to sign' : 'Click to sign'}
                </div>
              )}
              <div className="contract-date-box">
                {isSigned ? signatureDate : 'Date'}
              </div>
            </div>
          {errors?.contractSignature && <div className="error-message">{errors.contractSignature}</div>}
        </div>
      </div>
    </>
  );
};

// New Mexico Contract Component
const NewMexicoContract = ({ 
  toggleInitialBox, 
  initialedBoxes, 
  initialsText, 
  selectedFont, 
  initialBoxRefs,
  signature,
  isSigned,
  signatureDate,
  handleSignatureClick,
  errors,
  signatureData,
  formData,
  calculateCancellationDate
}) => {
  return (
    <>
      <div className="contract-section">
        <div className="section-header">CANCELLATION RIGHT</div>
        <div className="section-content">
          <p className="cancellation-text">NEW MEXICO SPORTS AND WELLNESS (NMSW) MONEY BACK GUARANTEE:</p>
          <p>NMSW EXTENDS A FOURTEEN (14) DAY TRIAL PERIOD WITH A FULL REFUND. THIS REFUND DOES NOT APPLY TO AMOUNTS OWED BY MEMBER TO NMSW UNDER ANY OTHER MEMBERSHIP APPLICATION OR AGREEMENT. THE 14 DAYS INCLUDE THE DATE ON THIS AGREEMENT. YOU MAY RESCIND THIS AGREEMENT BY SENDING WRITTEN NOTICE TO NEW MEXICO SPORTS AND WELLNESS THAT YOU ARE EXERCISING YOUR RIGHT TO RESCIND BY FACSIMILE TRANSMITTAL, MAIL, EMAIL, HAND DELIVERY OR COMPLETING A MEMBERSHIP CANCELATION FORM AT THE CLUB. A NOTICE IS DEEMED DELIVERED ON THE DATE POSTMARKED IF MAILED, ON THE DATE DELIVERED IF BY HAND DELIVERY, FACSIMILE OR EMAIL. IF YOU PROPERLY EXERCISE YOUR RIGHT TO RESCIND WITHIN 14 DAYS (NOT LATER THAN 5PM) OF {formData?.requestedStartDate ? calculateCancellationDate(formData.requestedStartDate) : ''}, YOU WILL BE ENTITLED TO A REFUND OF ALL PAYMENTS MADE PURSUANT TO THIS MEMBERSHIP APPLICATION.</p>
          <p className="acknowledgment">EACH OF THE UNDERSIGNED MEMBERS ACKNOWLEDGES RECEIPT OF THE FOREGOING NOTICE AND COPIES HEREOF:</p>
          <p>I have read and understand this agreement along with the terms and conditions contained on this document and will abide by the rules and regulations of New Mexico Sports & Wellness. In addition, I understand that the primary member represents all members and accepts all responsibility on the account and that all memberships are non-transferable and non-assignable to another individual. By signing this document or sending this by facsimile, I do intend it to be my legally binding and valid signature on this agreement as if it were an original signature.</p>
        </div>
      </div>

      <div className="contract-section">
        <div className="section-header">MEMBERSHIP AGREEMENT</div>
        <div className="section-content">
          <p><strong>1. MEMBERSHIP FEE STRUCTURES</strong></p>
          <p><strong>A.</strong> The Member is required to immediately pay any applicable start up costs which are due and owing separate and apart from the monthly dues stated on this membership agreement.</p>
          <p><strong>B. </strong>The Member elects to purchase a membership and to pay to New Mexico Sports and Wellness (NMSW) the required total monthly dues as indicated on this agreement under one of the following scenarios:</p>
          
          <p><strong>MONTH-TO-MONTH</strong> - I understand that I am committing to a minimum three (3) month membership. The three (3) month period commences on the 1st of the month following the date the membership begins. After fulfilling my minimum three (3) month membership commitment, I understand that the membership may be cancelled at any time with written notice pursuant to the Resignation Policy (Item 4A) and the total dues owing for the membership as well as all discounts and initiation fees are not refundable. As such, any failure to use the membership indicated above and/or the facilities and programs associated therewith does not relieve applicant of any liability for payment of the total dues or other charges owing as indicated above, regardless of circumstances. Dues may increase at any time, with a one (1) month notice.</p>
          <p className="initial-line">
            <strong>INITIAL</strong>
            <InitialBox
              ref={initialBoxRefs.monthToMonth}
              onClick={() => toggleInitialBox('monthToMonth')}
              value={initialsText}
              font={selectedFont}
              isInitialed={initialedBoxes.monthToMonth}
            />
          </p>
          
          <p><strong>EXTENDED PLAN</strong> - I elect to pay for the number of selected months on this agreement for consecutive months of member dues plus any club charges (if applicable) made by myself or any other persons included in my membership. I understand that I am committing to a minimum three (3) month membership. The three (3) month period commences on the 1st of the month following the date the membership begins. Member acknowledges that in order to be relieved of the agreement terms, the balance of the dues owed for the remaining months of the agreement must be paid in full. Special consideration can be made if cause for cancellation is based on a medical contingency and written authorization from a doctor is received; or if a member moves 50 miles or more away from the nearest New Mexico Sports and Wellness with proof of new residency. Any Leave of Absence taken during the initial term of this agreement will extend the commitment by the number of months the member's account is on Leave of Absence. Rate for Student/Young Professional memberships will only be honored through the current maximum age for this type of membership regardless of whether the number of selected months on this agreement has expired or not. AT THE END OF THE AGREEMENT PERIOD CHOSEN THIS PLAN REMAINS IN EFFECT ON A MONTH-TO-MONTH BASIS and the Resignation Policy (Item 4A) applies. I authorize NMSW to collect payment under the method of payment indicated on the agreement and the balance of the remaining dues owed should I not satisfy the terms of the agreement.</p>
          <p className="initial-line">
            <strong>INITIAL</strong>
            <InitialBox
              ref={initialBoxRefs.extendedPlan}
              onClick={() => toggleInitialBox('extendedPlan')}
              value={initialsText}
              font={selectedFont}
              isInitialed={initialedBoxes.extendedPlan}
            />
          </p>
          
          <p>Except as expressly provided in this Membership Agreement, no portion of the initial fee or monthly membership dues is refundable, regardless of whether member attends or uses, or is able to attend or use, the facilities or programs of the club.</p>
          
          <p><strong>C. PAID-IN-FULL </strong>- I elect to pay my total dues, as indicated on this agreement, in advance in consideration of a discount on yearly dues. At the completion of the prepaid period, my membership will automatically revert to month-to-month billing unless I prepay another year in advance or terminate with a written notice pursuant to the Resignation Policy (Item 4A.). If terminating prior to the completion of the prepaid agreement, a refund will be granted minus the discount percent indicated above. If a renewal of membership is requested by the applicant and approved at the conclusion of the term indicated, I understand that the renewal monthly dues to be charged will be those dues rates in effect at the time of renewal.</p>
          
          <p><strong>D. EFT </strong>- All dues and Member charges will be payable monthly (with the exception of annual dues prepayments) and collected by Electronic Funds Transfer (EFT) from either the Member's bank account or charged to an approved credit card. Please notify New Mexico Sports and Wellness (NMSW) at the time you change bank accounts or credit cards and provide the appropriate information to avoid having your old account charged for your monthly dues.</p>
          
          <p><strong>E. DELINQUENT ACCOUNTS </strong>- In the event a bank account or credit card is unable to be charged at the designated date, the membership is subject to a late fee. A charge will be issued for checks returned due to insufficient funds and credit cards that are declined when a balance is due. The Primary Member is responsible for all charges incurred.</p>
          
          <p><strong>F. REFERRALS </strong>- If a dues referral program is in effect, it will not extend or modify the terms of the membership agreement. Any Member in default of payment due may NOT cure the default by way of credit for "referral" members to New Mexico Sports and Wellness.</p>
          
          <p><strong>G. EMAIL </strong>- By providing my email address, I am consenting to receive information via email from New Mexico Sports and Wellness, The Wellbridge Company and their affiliated companies. Any further distribution of my email address is unauthorized.</p>
          
          <p><strong>2. UPGRADES/DOWNGRADES</strong> - Requests for upgrades/downgrades of membership must be made in writing. Upgrades will be effective immediately unless otherwise requested. Requests for downgrades must be submitted by the last day of the month for the downgrade to be effective for the following month. Primary Member's signature is required for all changes. Proof of eligibility/residency to upgrade/add members is required.</p>
          
          <p><strong>3. CLUB'S RIGHT OF CANCELLATION</strong> - Management of NMSW may suspend or cancel the rights, privileges or membership of any Member whose actions are detrimental to the facility or do not comply with the rules and regulations of the facility or upon any failure of a Member to make payment to NMSW of all amounts due from the Member within sixty (60) days after billed. NMSW has the option of declaring any other indebtedness of the Member to NMSW immediately due and payable, without notice or demand. The Member agrees to pay NMSW a reasonable attorney's fee, court costs and all other expenses incurred by NMSW in making the collection. All outstanding amounts not paid when due shall accumulate interest at the rate of 1.5% per month.</p>
          
          <p><strong>4. TERMINATION/RESIGNATION RIGHTS</strong> - In addition to the Cancellation Right set forth on this agreement, Member has the following rights to terminate:</p>
          
          <p><strong>A. RESIGNATION POLICY:</strong> A month-to-month membership may be cancelled by providing at least one (1) month's written notice. Cancellation shall be effective on the 1st of the month that is at least one (1) month after the date the notice is delivered. Notice can be provided by first class mail (Certified with Return Receipt Recommended), personal delivery of cancelation form at the club (Obtaining a copy from Club Personnel Recommended), and contact with the club to obtain the current, digital form of cancellation. Concurrently with the delivery of written notice, Member must pay the club any amounts due on the account as of the cancellation date and on or before the cancellation date member must return all membership cards. Those who have signed on an Extended Plan agreement are subject to the terms of their agreement and are responsible for the balance of remaining dues. All memberships are non-refundable, non-transferable, non-assignable and non-proprietary.</p>
          <p className="initial-line">
            <strong>INITIAL</strong>
            <InitialBox
              ref={initialBoxRefs.resignation}
              onClick={() => toggleInitialBox('resignation')}
              value={initialsText}
              font={selectedFont}
              isInitialed={initialedBoxes.resignation}
            />
          </p>
          
          <p><strong>B. DEATH OR DISABILITY: </strong>The contract may be cancelled in the event of member's death or total disability during the membership term. Total disability means a condition which has existed or will exist for more than six (6) months and which will prevent Member from using the club. In order to establish death, the member's estate must furnish to the club a death certificate. In order to establish disability, Member must furnish the club certification of the disability by a licensed physician whose diagnosis or treatment is within his scope of practice. Cancellation will be effective upon establishment of death or disability according to these provisions. In the event that Member has paid membership fees in advance, the club shall be entitled to retain an amount equal to the amount computed by dividing the total cost of the membership by the total number of months under the membership and multiplying the result by the number of months expired under the membership term. As to membership fees paid monthly, dues will be refunded for the month in which written notification is received of the death or disability and the proper documentation outlined above has been provided.</p>
          
          <p><strong>5. MEMBERSHIP POLICY</strong> - This membership contract is in force monthly upon payment of dues and other account charges. By submitting this application, the member acknowledges that NMSW reserves the right to refuse membership, or to terminate this agreement at any time without notice. Member agrees to abide by the Corporate Member Regulations and by NMSW Membership Policies as they exist or may be amended from time-to-time.</p>
          <p>Furthermore, member understands that should member's account balance become more than 60-days past due, NMSW may cancel the membership at its sole discretion. If the collection process is commenced by NMSW for unpaid amounts, member agrees to pay collection costs, including attorney fees should they be incurred. Member recognizes the inherent risks of participating in an exercise program and hereby hold NMSW harmless from any and all injuries member, and/or member's family might incur in connection with member's membership activities at NMSW. This is our entire agreement; no verbal statements may alter or change its provisions. Except as expressly provided in this Membership Agreement, no portion of the initial fee or monthly membership dues is refundable, regardless of whether member attends or uses, or is able to attend or use, the facilities or programs of the club.</p>
          
          <p><strong>6. MEMBERSHIP ENTRY</strong> - I understand cards and/or Club App with proper check-in credentials are mandatory and must be presented prior to entering NMSW. These forms of entry are not transferable to another person. There will be a replacement fee for each lost card. I acknowledge that I am responsible for all charges incurred on my membership card.</p>
          
          <p><strong>7. HOURS OF OPERATION</strong> - Operation schedules may vary and are subject to change. Schedule of hours of operation and any changes will be posted in NMSW.</p>
          
          <p><strong>8. LEAVE OF ABSENCE POLICY</strong> - This Membership may be put on a Leave of Absence (LOA). LOA requests must be in writing and submitted by the last day of the month for the LOA to be effective the following month. LOA must state the leave and return date. There is a monthly charge for accounts in LOA (exceptions for medical LOAs may be approved for no charge with proper medical documentation). There will be no retroaction or partial month adjustments. A medical LOA must be accompanied by a doctor's note. If member chooses to cancel their membership while on a LOA, the membership is reinstated, full dues will be charged for the final month of membership and the cancellation policy takes effect. An LOA extends any memberships in an Extended Plan by the number of months the membership is in a LOA status.</p>
          
          <p><strong>9. PERSONAL TRAINING</strong> - Personal trainers not employed by NMSW are not allowed to train or consult in any part of the clubs due to NMSW's interest in ensuring the accuracy of information relayed, as well as to reduce the potential for injury.</p>
          
          <p><strong>10. EMERGENCY MEDICAL AID</strong> - NMSW reserves the right to call emergency medical aid for an injured Member or guest and said Member or guest accepts responsibility for any financial obligations arising from such emergency medical aid or transportation to a medical facility.</p>
          
          <p><strong>11. AMENDING OF RULES</strong> - I understand NMSW reserves the right to amend or add to these conditions and to adopt new conditions as it may deem necessary for the proper management of the clubs and the business.</p>
          
          <p><strong>12. UNAVAILABILITY OF FACILITY OR SERVICES</strong> - I agree to accept the fact that a particular facility or service in the premises may be unavailable at any particular time due to mechanical breakdown, fire, act of God, condemnation, loss of lease, catastrophe or any other reason. Further, I agree not to hold NMSW responsible or liable for such occurrences.</p>
          
          <p><strong>13. HEALTH WARRANTY</strong> - I warrant and represent that I, any family member, ward or guest (each, a "Guest") who uses any NMSW facility has no disability, impairment or illness preventing such person from engaging in active or passive exercise or that will be detrimental or inimical to such person's health, safety or physical condition. I acknowledge and agree that: (1) NMSW will rely on the foregoing warranty in issuing my membership, (2) NMSW may perform a fitness assessment or similar testing to establish my or my Guests' initial physical statistics, (3) if any fitness or similar testing is performed by NMSW, it is solely for the purpose of providing comparative data with which I or my Guests may chart progress in a program and is not for any diagnostic purposes whatsoever, and (4) NMSW shall not be subject to any claim or demand whatsoever on account of NMSW's evaluation or interpretation of such fitness assessment or similar testing. I and my Guests are responsible for understanding our respective medical history and should consult with a physician prior to engaging in exercise or continuation of exercise if a medical condition appears to be developing.</p>
          
          <p><strong>14. DAMAGE TO FACILITIES</strong> - I agree to pay for any damage that I, my family or my Guests may cause this club's facilities through careless or negligent use thereof.</p>
          
          <p><strong>15. THEFT OR DAMAGE TO PERSONAL PROPERTY</strong> - I acknowledge that NMSW will not accept responsibility for theft, loss or damage to personal property left in a locker or in NMSW or for theft, loss or damage to automobiles or personal property left in NMSW parking lot. NMSW suggests that members do not bring valuables on NMSW premises. Signs are posted throughout the club and are strictly enforced.</p>
          
          <p><strong>16. RELEASE FROM LIABILITY</strong> - I agree, in attending and using the facilities and equipment therein, that I do so at my own risk. NMSW shall not be liable for any damages arising from personal injuries sustained by me and/or my guest(s) in, or about the premises. I assume full responsibility for any injuries or damages which may occur to me in, on or about the premises, and I do hereby fully and forever release and discharge NMSW and all associated owners, employees, and agents from any and all claims, demands, damages, rights of action or causes of action present or future, whether the same be known or unknown, anticipated or unanticipated, resulting from or arising out of my use or intended use of the said facilities and equipment there of.</p>
          
          <p><strong>17. WAIVER AND RELEASE OF ELECTRONIC MEDIA</strong> - I recognize, acknowledge and grant permission for Starmark Holdings, LLC, its affiliates, subsidiaries, employees, successors and/or anyone acting with its authority, to take and use still photographs, motion picture, video, sound recordings and/or testimonials of me and/or any family member, ward or guest.</p>
          <p>I hereby waive any right to inspect or approve the photographs, electronic matter, and/or finished products that may be used in conjunction with them now or in the future. I hereby grant all right, title and interest I may now have in the photographs, electronic matter, and/or finished products to Starmark Holdings, LLC and/or anyone acting with its authority, and hereby waive any right to royalties or other compensation arising from or related to the use of the photographs, electronic matter, and/or finished matter.</p>
          <p>I hereby consent to receive future calls, text messages, and/or short message service ("SMS") calls (collectively, "Calls") that deliver prerecorded or prewritten messages by or on behalf of Wellbridge to me. Providing consent to receive such Calls is not a condition of purchasing any goods or services from Wellbridge. I understand that I may revoke this consent by following the 'opt-out' procedures presented upon receiving a Call.</p>
          
          <p><strong>18. CORPORATE MEMBERS REGULATIONS</strong></p>
          <p><strong>1.</strong> Corporate members must be a W-2 paid employee or associate of a firm or approved organization that has a corporate membership with NMSW, unless otherwise agreed to in writing. NMSW must be notified immediately of any change in employment status.</p>
          <p><strong>2.</strong> Discounts on monthly dues may change in accordance with the number or employees of the corporate firm who belong to NMSW. I understand I will lose my corporate discount and will be readjusted to regular rates if my employer drops below the minimum required number of participating employees for them to be eligible in the corporate discount program.</p>
          <p><strong>3.</strong> It is the member's responsibility to notify NMSW of any change in employment status. I understand that I will be assessed appropriate monthly fees should I leave the above corporation/organization, or the corporation/organization drops its corporate membership.</p>
          <p><strong>4.</strong> Proof of employment must be provided to obtain the corporate discount.</p>
          <p className="initial-line">
            <strong>INITIAL</strong>
            <InitialBox
              ref={initialBoxRefs.corporate}
              onClick={() => toggleInitialBox('corporate')}
              value={initialsText}
              font={selectedFont}
              isInitialed={initialedBoxes.corporate}
            />
          </p>
          
          <p><strong>19. STUDENT YOUNG PROFESSIONAL (SYP) MEMBERSHIPS</strong></p>
          <p>Student/Young Professional (SYP) discounted memberships are offered exclusively to members between the ages of 19-29. This special discounted rate will be honored through the age of 29. I understand that beginning the month after my 30th birthday my monthly dues rate will increase by $10. Each year thereafter my monthly rate will increase by an additional $10 until my rate reaches the then current rate. I also understand that my rate may also change for any other upgrades or downgrades of the membership that I may initiate.</p>
          <p>Proof of age must be received within 14 days; otherwise your membership will be converted to the equivalent of one individually priced membership and you will be responsible for the entire billed amount. If the documentation is not received by {formData?.requestedStartDate ? calculateCancellationDate(formData.requestedStartDate) : ''}, your rate will go to $115.00 per month until the proper documentation is provided. The club will not issue a dues credit for any portion of the additional charges once billed.</p>
          <p className="initial-line">
            <strong>INITIAL</strong>
            <InitialBox
              ref={initialBoxRefs.syp}
              onClick={() => toggleInitialBox('syp')}
              value={initialsText}
              font={selectedFont}
              isInitialed={initialedBoxes.syp}
            />
          </p>
          
          <p>As used herein, the abbreviation "NMSW" means New Mexico Sports & Wellness, its successors, assigns, employees, officers, directors, shareholders, and all persons, corporations, partnerships and other entities with which it is or may in the future become affiliated. The terms and conditions contained herein, along with the Rules and Regulations, constitute the full agreement between NMSW and the member, and no oral promises are made a part of it.</p>
          
          <div className="contract-signature-container">
            {formData.specialtyMembership === 'J' ? (
              /* Show only Guardian Signature for Junior Memberships */
              <>
                <div className="guardian-signature-label">Legal Guardian Signature:</div>
                <div 
                  className={`contract-signature-box ${isSigned ? 'signed' : ''}`}
                  onClick={handleSignatureClick}
                  style={{ 
                    fontFamily: selectedFont?.font || 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  {isSigned ? `${formData.guardianFirstName || ''} ${formData.guardianLastName || ''}` : 'Click to sign'}
                </div>
              </>
            ) : (
              /* Show regular Signature for all other memberships */
              <div 
                className={`contract-signature-box ${isSigned ? 'signed' : ''}`}
                onClick={handleSignatureClick}
                style={{ 
                  fontFamily: selectedFont?.font || 'inherit',
                  cursor: 'pointer'
                }}
              >
                {isSigned ? signature?.text || 'Click to sign' : 'Click to sign'}
              </div>
            )}
            <div className="contract-date-box">
              {isSigned ? signatureDate : 'Date'}
            </div>
          </div>
          {errors?.contractSignature && <div className="error-message">{errors.contractSignature}</div>}
        </div>
      </div>
    </>
  );
};

export default ContractPage;
