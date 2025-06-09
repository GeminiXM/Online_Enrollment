// frontend/src/components/AddonButtons.jsx
// This component displays a grid of addon buttons for child memberships

import React from 'react';
import { useClub } from '../context/ClubContext';
import './EnrollmentForm.css';

const AddonButtons = ({ addons, selectedAddons, onAddonClick, membershipTypeValue }) => {
  // Get the selected club to check if it's a New Mexico club
  const { selectedClub } = useClub();
  const isNewMexicoClub = selectedClub?.state === 'NM';
  
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
    
  // For New Mexico clubs with Family membership, we already show a message about included children
  // Don't filter out child addons for Dual membership anymore - show them for both I and D
  if (isNewMexicoClub && membershipTypeValue === 'F') {
    return false;
  }
    
    return true;
  }) || [];

  // If no child addons are available or membership type is 'D'/'F' for New Mexico clubs, show appropriate message
  if (childAddons.length === 0) {
    if (isNewMexicoClub) {
      if (membershipTypeValue === 'F') {
        return (
          <div className="no-addons-message">
            <p>Child memberships are included with your Family membership at no additional cost.</p>
          </div>
        );
      } else if (membershipTypeValue === 'D') {
        return (
          <div className="no-addons-message">
            <p>Adding children or youth to a Dual membership in New Mexico will convert it to a Family membership.</p>
          </div>
        );
      }
    }
    
    // Default message for any other cases (including non-NM clubs)
    return (
      <div className="no-addons-message">
        <p>No child program options are currently available.</p>
      </div>
    );
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
            <div className="addon-price">${addon.invtr_price} /mo</div>
            {selectedAddons.some(
              (item) => item.invtr_desc === addon.invtr_desc
            ) && <span className="checkmark">✔</span>}
          </button>
        ))}
      </div>
  );
};

export default AddonButtons;
