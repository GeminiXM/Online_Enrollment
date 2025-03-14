import React, { createContext, useState, useContext } from 'react';

// Create the context
const MembershipContext = createContext();

// Custom hook to use the membership context
export const useMembership = () => useContext(MembershipContext);

// Provider component
export const MembershipProvider = ({ children }) => {
  // State for selected membership type
  const [membershipType, setMembershipType] = useState(null);

  // Function to update the selected membership type
  const selectMembershipType = (type) => {
    setMembershipType(type);
    // Store in localStorage for persistence
    if (type) {
      localStorage.setItem('selectedMembershipType', JSON.stringify(type));
    } else {
      localStorage.removeItem('selectedMembershipType');
    }
  };

  // Initialize from localStorage if available
  React.useEffect(() => {
    const storedType = localStorage.getItem('selectedMembershipType');
    if (storedType) {
      try {
        setMembershipType(JSON.parse(storedType));
      } catch (error) {
        console.error('Error parsing stored membership type:', error);
        localStorage.removeItem('selectedMembershipType');
      }
    }
  }, []);

  // Value object to be provided to consumers
  const value = {
    membershipType,
    selectMembershipType
  };

  return (
    <MembershipContext.Provider value={value}>
      {children}
    </MembershipContext.Provider>
  );
};

export default MembershipContext; 