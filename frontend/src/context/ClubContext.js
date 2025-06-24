import React, { createContext, useState, useContext, useEffect } from "react";

// Club data
const clubList = [
  {
    id: "201",
    name: "Highpoint Sports & Wellness",
    address: "4300 Landau NE, Albuquerque, NM 87111",
    state: "NM",
    shortName: "Highpoint",
  },
  {
    id: "202",
    name: "Midtown Sports & Wellness",
    address: "4100 Prospect NE, Albuquerque, NM 87110",
    state: "NM",
    shortName: "Midtown",
  },
  {
    id: "203",
    name: "Downtown Sports & Wellness",
    address: "40 First Plaza NW, Suite 76, Albuquerque, NM 87102",
    state: "NM",
    shortName: "Downtown",
  },
  {
    id: "204",
    name: "Del Norte Sports & Wellness",
    address: "7120 Wyoming Blvd NE, Suite 8B, Albuquerque, NM 87109",
    state: "NM",
    shortName: "Del Norte",
  },
  {
    id: "205",
    name: "Riverpoint Sports & Wellness",
    address: "9190 Coors Blvd NW, Albuquerque, NM 87120",
    state: "NM",
    shortName: "Riverpoint",
  },
  {
    id: "252",
    name: "Colorado Athletic Club - Denver Tech Center",
    address: "5555 DTC Parkway, Greenwood Village, CO 80111",
    state: "CO",
    shortName: "Denver Tech Center",
  },
  {
    id: "254",
    name: "Colorado Athletic Club - Tabor Center",
    address: "1201 16th Street, Suite 300, Denver, CO 80202",
    state: "CO",
    shortName: "Tabor Center",
  },
  {
    id: "257",
    name: "Colorado Athletic Club - Flatirons",
    address: "505 Thunderbird Drive, Boulder, CO 80303",
    state: "CO",
    shortName: "Flatirons",
  },
  {
    id: "292",
    name: "Colorado Athletic Club - Monaco",
    address: "2695 South Monaco Parkway, Denver, CO 80222",
    state: "CO",
    shortName: "Monaco",
  },
  { id: "375", name: "MAC", address: "", state: "CO" },
];

// Create the context
const ClubContext = createContext();

// Custom hook to use the club context
export const useClub = () => useContext(ClubContext);

// Provider component
export const ClubProvider = ({ children }) => {
  // Get stored club from localStorage or default to Tabor Center (id: 254)
  const getInitialClub = () => {
    const storedClubId = localStorage.getItem("selectedClubId");
    if (storedClubId) {
      const club = clubList.find((club) => club.id === storedClubId);
      if (club) return club;
    }
    return clubList.find((club) => club.id === "254");
  };

  const [selectedClub, setSelectedClub] = useState(getInitialClub);

  // Function to update the selected club
  const changeClub = (clubId) => {
    const club = clubList.find((club) => club.id === clubId);
    if (club) {
      setSelectedClub(club);
      localStorage.setItem("selectedClubId", clubId);
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
