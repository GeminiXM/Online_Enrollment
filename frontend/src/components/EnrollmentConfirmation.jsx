import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useClub } from '../context/ClubContext';
import './EnrollmentConfirmation.css';

function EnrollmentConfirmation() {
  const location = useLocation();
  const { enrollmentData, memberName, successMessage } = location.state || {};
  const { selectedClub } = useClub();

  return (
    <div className="enrollment-confirmation">
      <div className="confirmation-container">
        <div className="confirmation-header">
          <h1>Enrollment Confirmation</h1>
          <div className="success-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </div>
        </div>

        <div className="confirmation-message">
          <h2>{successMessage || `Thank you for enrolling, ${memberName || 'new member'}!`}</h2>
          <p>Your enrollment has been successfully submitted to {selectedClub.name}.</p>
        </div>

        <div className="confirmation-details">
          <h3>What's Next?</h3>
          <ul>
            <li>You will receive a confirmation email with your enrollment details.</li>
            <li>Visit your selected club location to complete the enrollment process.</li>
            <li>Bring a valid photo ID and any required documentation.</li>
          </ul>
        </div>

        <div className="confirmation-actions">
          <Link to="/" className="btn btn-primary">
            Return to Home
          </Link>
          <Link to="/clubs" className="btn btn-secondary">
            Find a Club
          </Link>
        </div>
      </div>
    </div>
  );
}

export default EnrollmentConfirmation;
