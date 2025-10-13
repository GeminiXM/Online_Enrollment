import React from "react";

function RestrictedMembershipMessage({ membershipType, onChangeMembershipType }) {
  return (
    <div className="tab-panel restricted-membership-message">
      <div className="message-container">
        <h3>Membership Restriction</h3>
        <p>
          Your selected membership type <strong>({membershipType.title})</strong> does not allow adding additional members.
        </p>
        <p>
          If you would like to add family members to your membership, please change to a Standard membership type.
        </p>
        <button 
          onClick={onChangeMembershipType} 
          className="change-membership-button"
        >
          Switch to Standard Membership
        </button>
      </div>
    </div>
  );
}

export default RestrictedMembershipMessage; 