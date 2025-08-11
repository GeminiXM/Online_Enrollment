import React, { useState, useEffect } from 'react';
import './PersonalTrainingModal.css';

// Import single PT image
import ptImage from '../assets/images/PT.png';

const PersonalTrainingModal = ({ isOpen, onClose, onAccept }) => {
  // No need for image rotation state since we only have one image

  if (!isOpen) return null;

  return (
    <div className="pt-modal-overlay">
		  <div className="pt-modal">
        <h2>Enhance Your Fitness Journey</h2>
        <div className="pt-modal-content">
          <div className="pt-modal-image">
            <img 
              src={ptImage} 
              alt="Personal Training Session"
            />
          </div>
          <div className="pt-modal-text">
            
            <p>Add <span className="pt-price-highlight">4 Sessions with a Trainer/Instructor for only $149</span></p>
            <p className="pt-offer-note">Special offer available only at time of joining!</p>
            <div className="pt-modal-buttons">
              <button 
                className="pt-button accept" 
                onClick={onAccept}
              >
                Yes, Please!
              </button>
              <button 
                className="pt-button decline" 
                onClick={onClose}
              >
                No, Thank You
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalTrainingModal; 