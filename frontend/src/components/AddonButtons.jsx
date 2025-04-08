// frontend/src/components/AddonButtons.jsx
// This component displays a grid of addon buttons for child memberships

import React from 'react';
import './EnrollmentForm.css';

const AddonButtons = ({ addons, selectedAddons, onAddonClick }) => {
  // Filter addons to only show those that include "Child" in the description
  const childAddons = addons?.filter(addon => 
    addon.invtr_desc && addon.invtr_desc.includes("Child")
  ) || [];

  // If no child addons are available, show a message
  if (childAddons.length === 0) {
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
