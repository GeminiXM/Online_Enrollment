import React, { createContext, useState, useContext, useEffect } from "react";

// Club data
const clubList = [
  { id: "201", name: "Highpoint", state: "NM" },
  { id: "202", name: "Midtown", state: "NM" },
  { id: "203", name: "Downtown", state: "NM" },
  { id: "204", name: "Del Norte", state: "NM" },
  { id: "205", name: "Riverpoint", state: "NM" },
  { id: "252", name: "DTC", state: "CO" },
  { id: "254", name: "Tabor Center", state: "CO" },
  { id: "257", name: "Flatirons", state: "CO" },
  { id: "292", name: "Monaco", state: "CO" },
  { id: "375", name: "MAC", state: "CO" },
];

// Create the context
const ClubContext = createContext();

// Custom hook to use the club context
export const useClub = () => useContext(ClubContext);

// Provider component
export const ClubProvider = ({ children }) => {
  // Get stored club from localStorage or default to Tabor Center (id: 254)
  const getInitialClub = () => {
    const storedClubId = localStorage.getItem('selectedClubId');
    if (storedClubId) {
      const club = clubList.find(club => club.id === storedClubId);
      if (club) return club;
    }
    return clubList.find(club => club.id === '254');
  };

  const [selectedClub, setSelectedClub] = useState(getInitialClub);

  // Function to update the selected club
  const changeClub = (clubId) => {
    const club = clubList.find(club => club.id === clubId);
    if (club) {
      setSelectedClub(club);
      localStorage.setItem('selectedClubId', clubId);
    }
  };

  // Value object to be provided to consumers
  const value = {
    clubList,
    selectedClub,
    changeClub,
  };

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
};

export default ClubContext;
