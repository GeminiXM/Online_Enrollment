import React, { createContext, useState, useContext, useEffect } from "react";

// Club data
const clubList = [
  { id: "201", name: "Highpoint" },
  { id: "202", name: "Midtown" },
  { id: "203", name: "Downtown" },
  { id: "204", name: "Del Norte" },
  { id: "205", name: "Riverpoint" },
  { id: "252", name: "DTC" },
  { id: "254", name: "Tabor Center" },
  { id: "257", name: "Flatirons" },
  { id: "292", name: "Monaco" },
  { id: "375", name: "MAC" },
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
