// frontend/src/components/ServiceAddonButtons.jsx
// This component displays a grid of addon buttons for additional services

import React from 'react';
import './EnrollmentForm.css';

const ServiceAddonButtons = ({ addons, selectedAddons, onAddonClick }) => {
  // Filter addons to exclude those that include "Child" or "Children" in the description
  const serviceAddons = addons?.filter(addon => 
    addon.invtr_desc && 
    !addon.invtr_desc.toLowerCase().includes("child") && 
    !addon.invtr_desc.toLowerCase().includes("children")
  ) || [];

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
