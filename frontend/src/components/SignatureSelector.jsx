import React, { useState, useEffect } from 'react';
import './SignatureSelector.css';

// Array of cursive font styles to choose from
const SIGNATURE_FONTS = [
  "'Dancing Script', cursive",
  "'Pacifico', cursive",
  "'Great Vibes', cursive",
  "'Sacramento', cursive",
  "'Tangerine', cursive"
];

const SignatureSelector = ({ onChange, name, type = 'signature' }) => {
  const [selectedFont, setSelectedFont] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  
  // Create initials if the type is 'initials'
  const displayText = type === 'initials' 
    ? name.split(' ').map(part => part.charAt(0)).join('') 
    : name;
  
  useEffect(() => {
    if (confirmed) {
      // Pass back the signature data (font and text)
      onChange({
        text: displayText,
        font: SIGNATURE_FONTS[selectedFont]
      });
    } else {
      // Clear the signature if not confirmed
      onChange('');
    }
  }, [confirmed, selectedFont, displayText, onChange]);
  
  const handleFontChange = (direction) => {
    setConfirmed(false);
    setSelectedFont(prev => {
      let newIndex = prev + direction;
      if (newIndex < 0) newIndex = SIGNATURE_FONTS.length - 1;
      if (newIndex >= SIGNATURE_FONTS.length) newIndex = 0;
      return newIndex;
    });
  };
  
  return (
    <div className="signature-selector">
      <div className="signature-preview-container">
        <div 
          className={`signature-preview ${confirmed ? 'confirmed' : ''}`}
          style={{ fontFamily: SIGNATURE_FONTS[selectedFont] }}
        >
          {displayText}
        </div>
      </div>
      
      <div className="signature-controls">
        <button 
          type="button" 
          className="font-selector-btn"
          onClick={() => handleFontChange(-1)}
          disabled={confirmed}
        >
          ← Previous Style
        </button>
        
        <button 
          type="button"
          className={`confirm-btn ${confirmed ? 'confirmed' : ''}`}
          onClick={() => setConfirmed(!confirmed)}
        >
          {confirmed ? 'Change' : 'Confirm'}
        </button>
        
        <button 
          type="button" 
          className="font-selector-btn"
          onClick={() => handleFontChange(1)}
          disabled={confirmed}
        >
          Next Style →
        </button>
      </div>
      
      <p className="signature-notice">
        By confirming this {type}, I acknowledge that this electronic signature 
        represents my legal signature.
      </p>
    </div>
  );
};

export default SignatureSelector;
