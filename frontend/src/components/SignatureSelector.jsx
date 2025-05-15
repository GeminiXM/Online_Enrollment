import React, { useState, useEffect } from 'react';
import './SignatureSelector.css';

// Array of cursive font styles to choose from with display names and CSS classes 
const SIGNATURE_FONTS = [
  { font: "'Great Vibes', cursive", name: "Great Vibes", class: "font-great-vibes" },
  { font: "'Rouge Script', cursive", name: "Rouge Script", class: "font-rouge-script" },
  { font: "'Whisper', cursive", name: "Whisper", class: "font-whisper" },
  { font: "'Over the Rainbow', cursive", name: "Over the Rainbow", class: "font-over-the-rainbow" },
  { font: "'La Belle Aurore', cursive", name: "La Belle Aurore", class: "font-la-belle-aurore" },
  { font: "'Bilbo Swash Caps', cursive", name: "Bilbo Swash Caps", class: "font-bilbo-swash-caps" }
];


const SignatureSelector = ({ 
  onChange, 
  name, 
  type = 'signature',
  forcedFont = null,
  showFontControls = true 
}) => {
  const [selectedFontIndex, setSelectedFontIndex] = useState(0); // Start with Great Vibes
  const [confirmed, setConfirmed] = useState(false);
  
  // Create initials if the type is 'initials'
  const displayText = type === 'initials' 
    ? name.split(' ').map(part => part.charAt(0)).join('') 
    : name;
  
  // Font determined by selectedFontIndex
  
  // Auto-confirm for initials
  useEffect(() => {
    // If this is initials with a forced font, auto-confirm
    if (type === 'initials' && forcedFont) {
      setConfirmed(true);
    }
  }, [type, forcedFont]);

  // If a font is forced, find its index
  useEffect(() => {
    if (forcedFont) {
      const index = SIGNATURE_FONTS.findIndex(font => 
        font.name === forcedFont.name || font.font === forcedFont.font || font.class === forcedFont.class
      );
      
      if (index !== -1) {
        setSelectedFontIndex(index);
      }
    }
  }, [forcedFont]);

  // Use a ref to keep track of the previous value to avoid infinite updates
  const prevValueRef = React.useRef(null);
  
  useEffect(() => {
    // Create the current value object
    let currentValue;
    if (confirmed || type === 'initials') {
      currentValue = {
        text: displayText,
        font: SIGNATURE_FONTS[selectedFontIndex].font
      };
    } else {
      currentValue = '';
    }
    
    // Only call onChange if the value has actually changed
    const prevValue = prevValueRef.current;
    const valueChanged = 
      prevValue === null || // First render, always trigger onChange
      typeof prevValue !== typeof currentValue ||
      (typeof currentValue === 'object' && prevValue && 
       (prevValue.text !== currentValue.text || prevValue.font !== currentValue.font)) ||
      (typeof currentValue === 'string' && prevValue !== currentValue);
    
    if (valueChanged) {
      // Update the ref with current value
      prevValueRef.current = currentValue;
      
      if (confirmed || type === 'initials') {
        // For initials, always pass value even without confirmation
        // For signature, only pass when confirmed
        onChange(currentValue, SIGNATURE_FONTS[selectedFontIndex]);
      } else if (type === 'signature' && !confirmed) {
        // Clear the signature if not confirmed and it's a signature
        onChange('');
      }
    }
  }, [confirmed, selectedFontIndex, displayText, type]);
  
  // Note: No need to dynamically load fonts as they're now included via CSS @font-face rules

  const handlePrevFont = () => {
    setConfirmed(false);
    setSelectedFontIndex(prev => {
      const newIndex = prev === 0 ? SIGNATURE_FONTS.length - 1 : prev - 1;
      return newIndex;
    });
  };
  
  const handleNextFont = () => {
    setConfirmed(false);
    setSelectedFontIndex(prev => {
      const newIndex = prev === SIGNATURE_FONTS.length - 1 ? 0 : prev + 1;
      return newIndex;
    });
  };
  
  return (
    <div className={`signature-selector ${type === 'initials' ? 'initials-selector' : ''}`}>
      <div className="signature-preview-container">
        <div 
          className={`signature-preview ${confirmed ? 'confirmed' : ''} ${SIGNATURE_FONTS[selectedFontIndex].class}`}
          data-type={type}
        >
          {displayText}
        </div>
        {!forcedFont && (
          <div className="font-name">
            {SIGNATURE_FONTS[selectedFontIndex].name}
          </div>
        )}
      </div>
      
      {/* Only show controls for signature, not for initials */}
      {type === 'signature' && (
        <>
          <div className="signature-controls">
            <button 
              type="button" 
              className="font-selector-btn"
              onClick={handlePrevFont}
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
              onClick={handleNextFont}
              disabled={confirmed}
            >
              Next Style →
            </button>
          </div>
          
          <p className="signature-notice">
            By confirming this signature, I acknowledge that this electronic signature and initials
            represent my legal signature.
          </p>
        </>
      )}
    </div>
  );
};

export default SignatureSelector;
