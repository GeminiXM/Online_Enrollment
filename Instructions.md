# Technical Instructions for Recreating Recent Changes

## Overview
These instructions document the changes made to the enrollment form system since April 6th, focusing on addons, buttons, styling, and functionality.

## 1. Addon Components

### 1.1 AddonButtons Component
- Created a new component `AddonButtons.jsx` for child program addons
- Implemented selection functionality with visual feedback
- Added support for multiple child selection based on addon description

### 1.2 ServiceAddonButtons Component
- Created a new component `ServiceAddonButtons.jsx` for service addons
- Implemented toggle functionality for service selection
- Added visual indicators for selected services

## 2. CSS Styling

### 2.1 Addon Button Styling
```css
.addon-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
}

.addon-button {
  background-color: var(--light-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 200px;
  text-align: center;
}

.addon-button.selected {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.addon-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
```

### 2.2 Service Addon Styling
```css
.service-addon-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
}

.service-addon-button {
  background-color: var(--light-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 200px;
  text-align: center;
}

.service-addon-button.selected {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.service-addon-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
```

### 2.3 Child Form Styling
```css
.child-forms-container {
  margin-top: 2rem;
  border-top: 1px solid var(--border-color);
  padding-top: 2rem;
}

.child-form {
  background-color: var(--light-bg);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.child-form h5 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--primary-color);
  font-size: 1.1rem;
}
```

## 3. Functionality Implementation

### 3.1 Child Addon Selection
```javascript
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
```

### 3.2 Child Count Extraction
```javascript
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
```

### 3.3 Service Addon Selection
```javascript
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
```

### 3.4 Child Form Handling
```javascript
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
```

### 3.5 Adding Child Members
```javascript
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
```

## 4. Form Data Transformation

### 4.1 Child Addon Data
```javascript
// Add selected child addons to submission data
if (selectedChildAddons.length > 0) {
  submissionData.childAddons = selectedChildAddons.map(addon => ({
    invtr_desc: addon.invtr_desc,
    invtr_price: parseFloat(addon.invtr_price),
    invtr_code: addon.invtr_code || ''
  }));
}
```

### 4.2 Service Addon Data
```javascript
// Add selected service addons to submission data
if (selectedServiceAddons.length > 0) {
  submissionData.serviceAddons = selectedServiceAddons.map(addon => ({
    invtr_desc: addon.invtr_desc,
    invtr_price: parseFloat(addon.invtr_price),
    invtr_code: addon.invtr_code || ''
  }));
}
```

## 5. Shopping Cart Integration

### 5.1 Child Addon Display
```javascript
{member.memberType === 'child' && member.childAddons && member.childAddons.length > 0 && (
  <div className="child-addons">
    <p><strong>Selected Programs:</strong></p>
    <ul>
      {member.childAddons.map((addon, index) => (
        <li key={index}>{addon.invtr_desc} - ${parseFloat(addon.invtr_price).toFixed(2)}/month</li>
      ))}
    </ul>
  </div>
)}
```

### 5.2 Service Addon Display
```javascript
{selectedServiceAddons.length > 0 && (
  <div className="service-addons">
    <h4>Selected Services</h4>
    <ul>
      {selectedServiceAddons.map((addon, index) => (
        <li key={index}>{addon.invtr_desc} - ${parseFloat(addon.invtr_price).toFixed(2)}/month</li>
      ))}
    </ul>
  </div>
)}
```

## 6. Form Validation

### 6.1 Child Addon Validation
```javascript
// Validate child addons if any are selected
if (selectedChildAddons.length > 0) {
  const childMembers = formData.familyMembers.filter(member => member.memberType === 'child');
  if (childMembers.length === 0) {
    newErrors.childAddons = "You must add at least one child member to select child programs";
  }
}
```

## 7. API Integration

### 7.1 Fetching Addons
```javascript
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
```

## 8. Tab Content Rendering

### 8.1 Child Tab Content
```javascript
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
            <div key={index} className="child-form">
              {/* Child form fields */}
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
```

### 8.2 Services Tab Content
```javascript
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
```

## 9. State Management

### 9.1 Addon State
```javascript
// State for addons
const [addons, setAddons] = useState([]);
const [selectedChildAddons, setSelectedChildAddons] = useState([]);
const [childForms, setChildForms] = useState([]);
const [selectedServiceAddons, setSelectedServiceAddons] = useState([]);
```

## 10. Form Submission

### 10.1 Form Data Transformation
```javascript
const transformFormDataForSubmission = () => {
  // Format the data to match backend expectations
  const submissionData = {
    // ... other form data
    
    // Add selected child addons to submission data
    childAddons: selectedChildAddons.map(addon => ({
      invtr_desc: addon.invtr_desc,
      invtr_price: parseFloat(addon.invtr_price),
      invtr_code: addon.invtr_code || ''
    })),
    
    // Add selected service addons to submission data
    serviceAddons: selectedServiceAddons.map(addon => ({
      invtr_desc: addon.invtr_desc,
      invtr_price: parseFloat(addon.invtr_price),
      invtr_code: addon.invtr_code || ''
    }))
  };
  
  return submissionData;
};
```

### 10.2 Form Submission Handler
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Reset submission states
  setIsSubmitting(true);
  setSubmitError("");
  setSubmitSuccess(false);
  
  // Validate form data
  if (!validateForm()) {
    setIsSubmitting(false);
    return;
  }
  
  try {
    // Transform form data for submission
    const submissionData = transformFormDataForSubmission();
    
    // Submit the form data
    const response = await api.post('/enrollment/submit', submissionData);
    
    if (response.success) {
      setSubmitSuccess(true);
      // Clear form data or redirect to success page
      navigate('/enrollment/success');
    } else {
      setSubmitError(response.message || "Failed to submit enrollment. Please try again.");
    }
  } catch (error) {
    console.error('Error submitting form:', error);
    setSubmitError("An unexpected error occurred. Please try again later.");
  } finally {
    setIsSubmitting(false);
  }
};
``` 