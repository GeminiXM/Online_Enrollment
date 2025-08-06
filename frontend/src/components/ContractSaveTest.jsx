import React, { useState } from 'react';
import SaveContractPDF from './SaveContractPDF.jsx';
import './ContractSaveTest.css';

const ContractSaveTest = () => {
  const [formData, setFormData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    dateOfBirth: '1990-01-01',
    address: '123 Main St',
    city: 'Denver',
    state: 'CO',
    zipCode: '80202',
    cellPhone: '555-123-4567',
    membershipType: 'Basic Membership',
    monthlyDues: 49.99,
    serviceAddons: [
      { name: 'Personal Training', price: 25.0 },
      { name: 'Group Classes', price: 15.0 }
    ]
  });

  const [signatureData, setSignatureData] = useState({
    signature: { text: 'John Doe' },
    initials: { text: 'JD' },
    selectedFont: { font: "'Great Vibes', cursive" }
  });

  const [selectedClub] = useState({
    name: 'Wellbridge Test Club',
    shortName: 'WTC',
    address: '123 Test St, Denver, CO 80202',
    state: 'CO'
  });

  const [membershipNumber, setMembershipNumber] = useState('TEST123456');
  const [memberName, setMemberName] = useState('John Doe');

  return (
    <div className="contract-save-test">
      <div className="test-header">
        <h1>Contract PDF Save Test</h1>
        <p>This page demonstrates saving contract PDFs to the contracts folder without sending emails.</p>
      </div>

      <div className="test-controls">
        <div className="control-group">
          <label htmlFor="membershipNumber">Membership Number:</label>
          <input
            id="membershipNumber"
            type="text"
            value={membershipNumber}
            onChange={(e) => setMembershipNumber(e.target.value)}
            placeholder="Enter membership number"
          />
        </div>

        <div className="control-group">
          <label htmlFor="memberName">Member Name:</label>
          <input
            id="memberName"
            type="text"
            value={memberName}
            onChange={(e) => setMemberName(e.target.value)}
            placeholder="Enter member name"
          />
        </div>
      </div>

      <div className="test-data-display">
        <h3>Test Data</h3>
        <div className="data-section">
          <h4>Form Data:</h4>
          <pre>{JSON.stringify(formData, null, 2)}</pre>
        </div>
        
        <div className="data-section">
          <h4>Signature Data:</h4>
          <pre>{JSON.stringify(signatureData, null, 2)}</pre>
        </div>
        
        <div className="data-section">
          <h4>Selected Club:</h4>
          <pre>{JSON.stringify(selectedClub, null, 2)}</pre>
        </div>
      </div>

      <div className="save-contract-section">
        <h3>Save Contract PDF</h3>
        <SaveContractPDF
          formData={formData}
          signatureData={signatureData}
          signatureDate={new Date().toLocaleDateString()}
          initialedSections={['A', 'B', 'C']}
          selectedClub={selectedClub}
          membershipPrice={formData.monthlyDues}
          membershipNumber={membershipNumber}
          memberName={memberName}
        />
      </div>

      <div className="instructions">
        <h3>Instructions</h3>
        <ol>
          <li>Enter a membership number and member name above</li>
          <li>Click the "Save Contract PDF" button</li>
          <li>The contract PDF will be generated and saved to the contracts folder</li>
          <li>Check the backend logs to see the file path where it was saved</li>
          <li>The file will be named: <code>contract_{membershipNumber}_[timestamp].pdf</code></li>
        </ol>
      </div>
    </div>
  );
};

export default ContractSaveTest; 