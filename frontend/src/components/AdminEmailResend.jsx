import React, { useState } from 'react';
import './AdminEmailResend.css';

const AdminEmailResend = () => {
  const [membershipNumber, setMembershipNumber] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/enrollment/admin/resend-welcome-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          membershipNumber: membershipNumber.trim(),
          adminEmail: adminEmail.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message,
          details: {
            membershipNumber: data.membershipNumber,
            memberEmail: data.memberEmail,
            memberName: data.memberName,
            clubName: data.clubName,
          }
        });
        setMembershipNumber('');
      } else {
        setError(data.message || 'Failed to resend email');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-email-resend">
      <div className="admin-container">
        <h1>Admin: Resend Welcome Email</h1>
        <p className="admin-description">
          Use this tool to resend welcome emails to members who didn't receive theirs.
          Enter the membership number and your admin email address.
        </p>

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="membershipNumber">Membership Number:</label>
            <input
              type="text"
              id="membershipNumber"
              value={membershipNumber}
              onChange={(e) => setMembershipNumber(e.target.value)}
              placeholder="e.g., 1111329"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="adminEmail">Your Admin Email:</label>
            <input
              type="email"
              id="adminEmail"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="your.email@wellbridge.com"
              required
              disabled={isLoading}
            />
          </div>

          <button 
            type="submit" 
            className="resend-button"
            disabled={isLoading || !membershipNumber.trim() || !adminEmail.trim()}
          >
            {isLoading ? 'Sending...' : 'Resend Welcome Email'}
          </button>
        </form>

        {error && (
          <div className="error-message">
            <h3>Error:</h3>
            <p>{error}</p>
          </div>
        )}

        {result && result.success && (
          <div className="success-message">
            <h3>✅ Email Sent Successfully!</h3>
            <div className="result-details">
              <p><strong>Membership Number:</strong> {result.details.membershipNumber}</p>
              <p><strong>Member Name:</strong> {result.details.memberName}</p>
              <p><strong>Email Sent To:</strong> {result.details.memberEmail}</p>
              <p><strong>Club:</strong> {result.details.clubName}</p>
            </div>
            <p className="success-note">
              The welcome email with contract PDF has been resent to the member.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEmailResend;









