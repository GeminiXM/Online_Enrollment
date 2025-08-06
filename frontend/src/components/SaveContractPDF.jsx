import React, { useState } from 'react';
import { generateContractPDFBuffer } from '../utils/contractPDFGenerator.js';
import api from '../services/api.js';
import './SaveContractPDF.css';

const SaveContractPDF = ({ 
  formData, 
  signatureData, 
  signatureDate, 
  initialedSections, 
  selectedClub, 
  membershipPrice,
  membershipNumber,
  memberName 
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const handleSaveContract = async () => {
    if (!formData || !signatureData) {
      alert("Missing required data for PDF generation");
      return;
    }

    try {
      setIsSaving(true);
      setSaveStatus(null);

      // Generate the contract PDF buffer
      const contractPDFBuffer = await generateContractPDFBuffer(
        formData,
        signatureData,
        signatureDate,
        initialedSections,
        selectedClub,
        membershipPrice
      );

      console.log('Contract PDF generated successfully');
      console.log('PDF buffer type:', typeof contractPDFBuffer);
      console.log('PDF buffer length:', contractPDFBuffer?.byteLength || 0);

      // Convert ArrayBuffer to Uint8Array and then to regular array for JSON serialization
      const uint8Array = new Uint8Array(contractPDFBuffer);
      const pdfArray = Array.from(uint8Array);
      
      console.log('Converted to array, length:', pdfArray.length);

      // Save the contract PDF to the contracts folder
      const result = await api.saveContractPDF(
        pdfArray,
        membershipNumber,
        memberName
      );

      if (result.success) {
        setSaveStatus({
          type: 'success',
          message: `Contract PDF saved successfully to: ${result.filepath}`,
          filepath: result.filepath
        });
        console.log('Contract PDF saved successfully:', result);
      } else {
        setSaveStatus({
          type: 'error',
          message: result.message || 'Failed to save contract PDF'
        });
        console.error('Failed to save contract PDF:', result);
      }
    } catch (error) {
      console.error('Error saving contract PDF:', error);
      setSaveStatus({
        type: 'error',
        message: `Error saving contract PDF: ${error.message}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="save-contract-container">
      <button
        className="save-contract-button"
        onClick={handleSaveContract}
        disabled={isSaving || !formData || !signatureData}
      >
        {isSaving ? 'Saving Contract PDF...' : 'Save Contract PDF'}
      </button>

      {saveStatus && (
        <div className={`save-status ${saveStatus.type}`}>
          <div className="status-message">
            {saveStatus.type === 'success' ? '✓' : '✗'} {saveStatus.message}
          </div>
          {saveStatus.filepath && (
            <div className="filepath-info">
              <strong>File saved to:</strong> {saveStatus.filepath}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SaveContractPDF; 