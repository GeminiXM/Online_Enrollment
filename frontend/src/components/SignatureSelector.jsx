import React, { useState, useEffect } from 'react';
import './SignatureSelector.css';

// Array of cursive font styles to choose from with display names and CSS classes
const SIGNATURE_FONTS = [
  { font: "'Great Vibes', cursive", name: "Great Vibes", class: "font-great-vibes" },
  { font: "'Dancing Script', cursive", name: "Dancing Script", class: "font-dancing-script" },
  { font: "'Tangerine', cursive", name: "Tangerine", class: "font-tangerine" },
  { font: "'Pacifico', cursive", name: "Pacifico", class: "font-pacifico" },
  { font: "'Sacramento', cursive", name: "Sacramento", class: "font-sacramento" }
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
  
  // For debugging
  console.log(`Current font: ${SIGNATURE_FONTS[selectedFontIndex].name}, Index: ${selectedFontIndex}`);
  
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

  useEffect(() => {
    if (confirmed || type === 'initials') {
      // For initials, always pass value even without confirmation
      // For signature, only pass when confirmed
      onChange(
        {
          text: displayText,
          font: SIGNATURE_FONTS[selectedFontIndex].font
        }, 
        SIGNATURE_FONTS[selectedFontIndex]
      );
    } else if (type === 'signature' && !confirmed) {
      // Clear the signature if not confirmed and it's a signature
      onChange('');
    }
  }, [confirmed, selectedFontIndex, displayText, onChange, type]);
  
  // Force reload of fonts to ensure they display properly
  useEffect(() => {
    // Load the fonts explicitly
    const fontLinks = SIGNATURE_FONTS.map(font => {
      const fontName = font.name.replace(/\s/g, '+');
      return `https://fonts.googleapis.com/css2?family=${fontName}&display=swap`;
    });
    
    // Create link elements for each font
    fontLinks.forEach(link => {
      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.href = link;
      document.head.appendChild(linkElement);
    });
    
    // Log current font for debugging
    console.log(`Setting font to: ${SIGNATURE_FONTS[selectedFontIndex].name}`);
    
    // Return cleanup function
    return () => {
      // Optional: Remove the dynamically added link elements when component unmounts
    };
  }, [selectedFontIndex]);

  const handlePrevFont = () => {
    setConfirmed(false);
    setSelectedFontIndex(prev => {
      const newIndex = prev === 0 ? SIGNATURE_FONTS.length - 1 : prev - 1;
      console.log(`Changed font from ${SIGNATURE_FONTS[prev].name} to ${SIGNATURE_FONTS[newIndex].name}`);
      return newIndex;
    });
  };
  
  const handleNextFont = () => {
    setConfirmed(false);
    setSelectedFontIndex(prev => {
      const newIndex = prev === SIGNATURE_FONTS.length - 1 ? 0 : prev + 1;
      console.log(`Changed font from ${SIGNATURE_FONTS[prev].name} to ${SIGNATURE_FONTS[newIndex].name}`);
      return newIndex;
    });
  };
  
  return (
    <div className={`signature-selector ${type === 'initials' ? 'initials-selector' : ''}`}>
      <div className="signature-preview-container">
        <div 
          className={`signature-preview ${confirmed ? 'confirmed' : ''} ${SIGNATURE_FONTS[selectedFontIndex].class}`}
          style={{ 
            fontSize: type === 'initials' ? '2.5rem' : '2rem' 
          }}
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
