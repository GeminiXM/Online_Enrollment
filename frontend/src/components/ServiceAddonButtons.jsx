// frontend/src/components/ServiceAddonButtons.jsx
// This component displays a grid of addon buttons for additional services

import React, { useState } from 'react';
import { useClub } from '../context/ClubContext';
import './EnrollmentForm.css';

const ServiceAddonButtons = ({ addons, selectedAddons, onAddonClick }) => {
  const [hoveredAddon, setHoveredAddon] = useState(null);
  const { selectedClub } = useClub();
  const isNewMexicoClub = selectedClub?.id?.toString().includes('NM') || selectedClub?.state === 'NM';

  const serviceAddons = addons?.filter(addon => {
    if (!addon.invtr_desc) return false;
    const descLower = addon.invtr_desc.toLowerCase();
    const isChildRelated = descLower.includes("child") || descLower.includes("children");
    if (!isChildRelated) return true;
    if (isNewMexicoClub && addon.invtr_desc.includes("Unlimited")) {
      return true;
    }
    return false;
  }) || [];

  const unlimitedAddons = serviceAddons.filter(addon => 
    addon.invtr_desc && addon.invtr_desc.includes("Unlimited")
  );
  
  const regularAddons = serviceAddons.filter(addon => 
    !addon.invtr_desc || !addon.invtr_desc.includes("Unlimited")
  );

  if (serviceAddons.length === 0) {
    return (
      <div className="no-addons-message">
        <p>No additional service options are currently available.</p>
      </div>
    );
  }

  const getDescription = (addonName) => {
    // Find the addon in the addons array to get its description from the database
    const addon = addons?.find(a => a.invtr_desc === addonName);
    
    // If the addon has a description field from the database, use it
    if (addon && addon.description) {
      return addon.description;
    }
    
    // Fallback to hardcoded descriptions for backward compatibility
    switch(addonName) {
      case 'Tennis Passport':
        return 'Allows you to play tennis at any Wellbridge club location';
      case 'Racquet Court Reservation':
        return 'Reserve racquet courts for your preferred time';
      case 'Passport All Clubs':
        return 'Access to all Wellbridge club locations';
      case 'Child Care':
        return 'Access to our child care facilities during your workout';
      case 'Unlimited Child Care':
        return 'Unlimited access to our child care facilities';
      case 'Locker':
        return 'Reserved locker for your personal use';
      case 'Towel Service':
        return 'Clean towels provided during your visits';
      case 'Personal Training':
        return 'One-on-one training sessions with our certified trainers';
      case 'Group Fitness':
        return 'Access to all group fitness classes';
      case 'Spa Access':
        return 'Access to spa facilities and services';
      case 'Pool Access':
        return 'Access to swimming pool facilities';
      case 'Basketball Court':
        return 'Access to basketball court facilities';
      case 'Squash Court':
        return 'Access to squash court facilities';
      default:
        return `Description for: ${addonName}`;
    }
  };

  return (
    <div className="service-addons-container">
      <div className="addons-grid">
        {regularAddons.map((addon, index) => (
          <div 
            key={index}
            className="addon-button-container"
            onMouseEnter={() => setHoveredAddon(addon.invtr_desc)}
            onMouseLeave={() => setHoveredAddon(null)}
          >
            <button
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
          </div>
        ))}
      </div>
      
      {hoveredAddon && (
        <div 
          className="addon-description-text"
          onMouseEnter={() => setHoveredAddon(hoveredAddon)}
          onMouseLeave={() => setHoveredAddon(null)}
        >
          {getDescription(hoveredAddon)}
        </div>
      )}
      
      {/* Child Care Options section temporarily removed until later phase
      {unlimitedAddons.length > 0 && (
        <>
          <div className="addon-section-separator">
            <h4>Child Care Options</h4>
            <p className="note">Note: You can only select one of the following options at a time.</p>
          </div>
          
          <div className="addons-grid unlimited-addons">
            {unlimitedAddons.map((addon, index) => (
              <div 
                key={index}
                className="addon-button-container"
              >
                <button
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
              </div>
            ))}
          </div>
        </>
      )}
      */}
    </div>
  );
};

export default ServiceAddonButtons;
