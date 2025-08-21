import React from "react";
import { useMembership } from "../context/MembershipContext";
import "./MembershipTypeModal.css";

const membershipTypes = [
  {
    id: "standard",
    title: "Standard Adult",
    description: "30-64 years old",
    icon: "🏋️‍♀️"
  },
  {
    id: "young-professional",
    title: "Student/Young Professional",
    description: "For adults 18-29 years old",
    icon: "🎓"
  },
  {
    id: "junior",
    title: "Junior",
    description: "Under 18 years old (requires Legal Guardian)",
    icon: "👦🏽"
  },

    {
    id: "senior",
    title: "Senior",
    description: "For adults 65 years and older",
    icon: "👵🏼"
  }
];

function MembershipTypeModal({ isOpen, onClose, onSelectMembershipType }) {
  const { selectMembershipType } = useMembership();
  // Get the dateOfBirth error message from EnrollmentForm
  const dateOfBirthError = window.dateOfBirthError || null;

  if (!isOpen) return null;

  const handleSelectType = (type) => {
    // Update global context
    selectMembershipType(type);
    
    // Call the component's callback
    if (onSelectMembershipType) {
      onSelectMembershipType(type);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content membership-type-modal">
        <button className="modal-close-button" onClick={onClose} aria-label="Close">
          &times;
        </button>
        <h2>Select Your Membership Type</h2>
        {dateOfBirthError ? (
          <div className="modal-error">
            {dateOfBirthError}<br/>
            Please select the membership type that better applies to your age:
          </div>
        ) : (
          <p className="modal-description">
            Please select the membership type that best applies to you:
          </p>
        )}
        
        <div className="membership-type-options">
          {membershipTypes.map((type) => (
            <button
              key={type.id}
              className="membership-type-button"
              onClick={() => handleSelectType(type)}
            >
              <div className="membership-type-icon">{type.icon}</div>
              <h3>{type.title}</h3>
              <p>{type.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MembershipTypeModal;
