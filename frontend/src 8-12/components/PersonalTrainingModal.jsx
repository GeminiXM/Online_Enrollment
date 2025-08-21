import React, { useState, useEffect } from 'react';
import './PersonalTrainingModal.css';

// Import single PT image
import ptImage from '../assets/images/PT.png';

const PersonalTrainingModal = ({ isOpen, onClose, onAccept, selectedClub }) => {
  const [ptPackage, setPtPackage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch PT package when modal opens
  useEffect(() => {
    if (isOpen && selectedClub?.id) {
      fetchPTPackage();
    }
  }, [isOpen, selectedClub?.id]);

  const fetchPTPackage = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/enrollment/pt-package?clubId=${selectedClub.id}`);
      const data = await response.json();
      
      if (data.success && data.ptPackage) {
        setPtPackage(data.ptPackage);
      } else {
        // Fallback to default price if API fails
        setPtPackage({ price: 149, description: "4 Sessions with a Trainer/Instructor" });
      }
    } catch (error) {
      console.error('Error fetching PT package:', error);
      // Fallback to default price if API fails
      setPtPackage({ price: 149, description: "4 Sessions with a Trainer/Instructor" });
    } finally {
      setIsLoading(false);
    }
  };

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
            
            {isLoading ? (
              <p>Loading PT package...</p>
            ) : ptPackage ? (
              <p>Add <span className="pt-price-highlight">{ptPackage.description || "4 Sessions with a Trainer/Instructor"} for only ${ptPackage.price || 149}</span></p>
            ) : (
              <p>Add <span className="pt-price-highlight">4 Sessions with a Trainer/Instructor for only $149</span></p>
            )}
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