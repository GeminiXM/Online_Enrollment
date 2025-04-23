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

  // Separate unlimited addons from regular addons
  const unlimitedAddons = serviceAddons.filter(addon => 
    addon.invtr_desc && addon.invtr_desc.includes("Unlimited")
  );
  
  const regularAddons = serviceAddons.filter(addon => 
    !addon.invtr_desc || !addon.invtr_desc.includes("Unlimited")
  );

  // If no service addons are available, show a message
  if (serviceAddons.length === 0) {
    return (
      <div className="no-addons-message">
        <p>No additional service options are currently available.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Regular addons */}
      <div className="addons-grid">
        {regularAddons.map((addon, index) => (
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
      
      {/* Only show unlimited section if there are unlimited addons */}
      {unlimitedAddons.length > 0 && (
        <>
          <div className="addon-section-separator">
            <h4>Child Care Options</h4>
            <p className="note">Note: You can only select one of the following options at a time.</p>
          </div>
          
          <div className="addons-grid unlimited-addons">
            {unlimitedAddons.map((addon, index) => (
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
        </>
      )}
    </div>
  );
};

export default ServiceAddonButtons;
