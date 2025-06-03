import React, { useState, useEffect } from 'react';
import './PersonalTrainingModal.css';

// Import images
import image1 from '../assets/images/photo-1648542036561-e1d66a5ae2b1.jpg';
import image2 from '../assets/images/mina-rad-J1z_duF7WQg-unsplash.jpg';
import image3 from '../assets/images/jonathan-borba-R0y_bEUjiOM-unsplash.jpg';
import image4 from '../assets/images/michael-demoya-zaBe9Cl4Hqo-unsplash.jpg';

const PersonalTrainingModal = ({ isOpen, onClose, onAccept }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = [image1, image2, image3, image4];

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, images.length]);

  if (!isOpen) return null;

  return (
    <div className="pt-modal-overlay">
		  <div className="pt-modal">
			
			  <h2>Enhance Your Fitness Journey</h2>
			  <br /> {/* ← adds a blank line below the heading */}
        <div className="pt-modal-content">
          <div className="pt-modal-image">
            <img 
              src={images[currentImageIndex]} 
              alt="Personal Training Session"
            />
          </div>
          <div className="pt-modal-text">
            
            <p>Add <span className="pt-price-highlight">4 Personal Training sessions for just $149</span></p>
            <p className="pt-offer-note">Special offer available only at time of joining!</p>
          </div>
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
  );
};

export default PersonalTrainingModal; 