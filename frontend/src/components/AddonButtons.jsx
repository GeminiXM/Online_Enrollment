// frontend/src/components/AddonButtons.jsx
// This component displays a grid of addon buttons for child memberships

import React from 'react';
import { useClub } from '../context/ClubContext';
import { useMembership } from '../context/MembershipContext';
import './EnrollmentForm.css';

const AddonButtons = ({ addons, selectedAddons, onAddonClick, membershipTypeValue }) => {
  // Get the selected club to check if it's a New Mexico club
  const { selectedClub } = useClub();
  const isNewMexicoClub = selectedClub?.id?.toString().includes('NM') || selectedClub?.state === 'NM';
  
  // Filter addons to only show those that include "Child" in the description
  // For New Mexico clubs, exclude addons that include "Unlimited"
  const childAddons = addons?.filter(addon => {
    if (!addon.invtr_desc || !addon.invtr_desc.includes("Child")) {
      return false;
    }
    
    // For New Mexico clubs, exclude "Unlimited" addons as they'll be shown in the Additional Services tab
    if (isNewMexicoClub && addon.invtr_desc.includes("Unlimited")) {
      return false;
    }
    
    // For New Mexico clubs, only show Child Addon when membership type is 'I' (Individual)
    if (isNewMexicoClub && membershipTypeValue !== 'I') {
      return false;
    }
    
    return true;
  }) || [];

  // If no child addons are available or membership type is 'D'/'F' for New Mexico clubs, show appropriate message
  if (childAddons.length === 0) {
    if (isNewMexicoClub && (membershipTypeValue === 'D' || membershipTypeValue === 'F')) {
      return (
        <div className="no-addons-message">
          <p>Child memberships are included with your Dual/Family membership. You can add children without additional fees.</p>
        </div>
      );
    } else {
      return (
        <div className="no-addons-message">
          <p>No child program options are currently available.</p>
        </div>
      );
    }
  }

  return (
    <div className="addons-grid">
      {childAddons.map((addon, index) => (
        <button
          key={index}
          type="button"
          className={`addon-button ${
            selectedAddons.some(
              (item) => item.invtr_desc === addon.invtr_desc
            )
              ? "selected"
              : ""
          }`}
          onClick={() => onAddonClick(addon)}
        >
          <div className="addon-description">
            {addon.invtr_desc}
          </div>
          <div className="addon-price">${addon.invtr_price}</div>
          {selectedAddons.some(
            (item) => item.invtr_desc === addon.invtr_desc
          ) && <span className="checkmark">✔</span>}
        </button>
      ))}
    </div>
  );
};

export default AddonButtons;
