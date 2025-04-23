// frontend/src/components/ServiceAddonButtons.jsx
// This component displays a grid of addon buttons for additional services

import React from 'react';
import { useClub } from '../context/ClubContext';
import './EnrollmentForm.css';

const ServiceAddonButtons = ({ addons, selectedAddons, onAddonClick }) => {
  // Get the selected club to check if it's a New Mexico club
  const { selectedClub } = useClub();
  const isNewMexicoClub = selectedClub?.id?.toString().includes('NM') || selectedClub?.state === 'NM';

  // Filter addons based on conditions
  const serviceAddons = addons?.filter(addon => {
    if (!addon.invtr_desc) return false;
    
    const descLower = addon.invtr_desc.toLowerCase();
    const isChildRelated = descLower.includes("child") || descLower.includes("children");
    
    // Include all non-child related addons
    if (!isChildRelated) return true;
    
    // For New Mexico clubs, include child-related addons that contain "Unlimited"
    if (isNewMexicoClub && addon.invtr_desc.includes("Unlimited")) {
      return true;
    }
    
    // Exclude other child-related addons
    return false;
  }) || [];

  // If no service addons are available, show a message
  if (serviceAddons.length === 0) {
    return (
      <div className="no-addons-message">
        <p>No additional service options are currently available.</p>
      </div>
    );
  }

  return (
    <div className="addons-grid">
      {serviceAddons.map((addon, index) => (
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

export default ServiceAddonButtons;
