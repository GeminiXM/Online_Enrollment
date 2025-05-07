import React, { useRef, useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

const CanvasContractPDF = ({ formData, signatureData, signatureDate, initialedSections, selectedClub }) => {
  const canvasRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  
  // Function to calculate cancellation date (14 days from start date)
  const calculateCancellationDate = (startDate) => {
    if (!startDate) return '';
    try {
      // Parse the start date
      const date = new Date(startDate);
      if (isNaN(date.getTime())) return '';
      
      // Add 14 days to the start date
      date.setDate(date.getDate() + 14);
      
      // Format as MM/DD/YYYY
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      console.error("Error calculating cancellation date:", e);
      return '';
    }
  };
  
  // Function to check if club is in New Mexico
  const isNewMexicoClub = () => {
    console.log("Club detection - selectedClub:", selectedClub);
    
    // Important: Match the logic in ContractPage exactly
    if (selectedClub?.id?.toString().includes('NM') || selectedClub?.state === 'NM') {
      console.log("Is New Mexico club based on selectedClub: true");
      return true;
    }
    
    console.log("Is New Mexico club: false (defaulting to Denver/Colorado)");
    return false;
  };
  
  // Function to get club name
  const getClubName = () => {
    return isNewMexicoClub() ? 'New Mexico Sports and Wellness' : 'Colorado Athletic Club';
  };
  
  // Function to get club abbreviation
  const getClubAbbreviation = () => {
    return isNewMexicoClub() ? 'NMSW' : 'CAC';
  };
  
/**
 * Draws an array of lines, paginating as needed.
 *
 * @param {jsPDF} pdf           your jsPDF instance
 * @param {string[]} lines      the lines to draw (from splitTextToSize)
 * @param {number} x            x position for text
 * @param {number} startY       starting y position
 * @param {number} lineHeight   vertical space per line (e.g. 5)
 * @param {number} bottomMargin how close to the bottom before a new page
 * @returns {number}            the new y position after drawing
 */
function drawPagedText(pdf, lines, x, startY, lineHeight = 5, bottomMargin = 10) {
  const pageHeight = pdf.internal.pageSize.getHeight();
  let y = startY;
  for (const line of lines) {
    // if next line would go past the bottomMargin, start a new page
    if (y + lineHeight > pageHeight - bottomMargin) {
      pdf.addPage();
      y = 20; // reset to whatever your top margin is
    }
    pdf.text(line, x, y);
    y += lineHeight;
  }
  return y;
}



  // Function to format dates consistently
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      // Parse the date string - handle different formats
      const parts = dateString.split(/[-/T]/);
      if (parts.length >= 3) {
        let year, month, day;
        
        // Handle different date formats (YYYY-MM-DD or MM/DD/YYYY)
        if (parts[0].length === 4) {
          // YYYY-MM-DD format
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          day = parseInt(parts[2], 10);
        } else {
          // MM/DD/YYYY format
          month = parseInt(parts[0], 10) - 1;
          day = parseInt(parts[1], 10);
          year = parseInt(parts[2], 10);
        }
        
        // Create date with specific year, month, day in local timezone
        const date = new Date(year, month, day);
        
        // Format to mm/dd/yyyy
        return date.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        });
      }
      
      // If it already looks like MM/DD/YYYY format, return as is
      if (dateString.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
        return dateString;
      }
      
      // For other formats, try to use Date object's localization
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        });
      }
    } catch (e) {
      console.error("Error formatting date:", e);
    }
    
    // Fallback for unexpected format
    return dateString;
  };

  const generatePDF = async () => {
    if (!formData || !signatureData) {
      alert("Missing required data for PDF generation");
      return;
    }
    
    try {
      setIsGenerating(true);
      
      // Create new jsPDF instance
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });
      
      // Set font styles
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      // Add title based on club type
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(getClubName(), 105, 20, { align: 'center' });
      pdf.text('Membership Agreement', 105, 30, { align: 'center' });
      
      // Member Information Section
      pdf.setFontSize(14);
      pdf.text('Membership Information', 20, 45);
      
      // PRIMARY MEMBER SECTION
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PRIMARY MEMBER', 20, 55);
      
      // Primary Member details table - matches ContractPage layout
      autoTable(pdf, {
        startY: 60,
        head: [['Last Name', 'First Name', 'DOB', 'Gender']],
        body: [
          [
            formData.lastName || '',
            formData.firstName || '',
            formatDate(formData.dob || formData.dateOfBirth) || '',
            formData.gender || ''
          ]
        ],
        theme: 'grid',
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
        margin: { left: 20, right: 20 }
      });
      
      // Contact Information
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      const memberTableEndY = pdf.lastAutoTable.finalY;
      pdf.text('E-mail', 20, memberTableEndY + 10);
      
      // Email row
      autoTable(pdf, {
        startY: memberTableEndY + 15,
        body: [
          [formData.email || '']
        ],
        theme: 'grid',
        margin: { left: 20, right: 20 }
      });
      
      // Address information
      const emailTableEndY = pdf.lastAutoTable.finalY;
      autoTable(pdf, {
        startY: emailTableEndY + 5,
        head: [['Home Address', 'City', 'State', 'ZIP Code']],
        body: [
          [
            formData.address || '',
            formData.city || '',
            formData.state || '',
            formData.zipCode || ''
          ]
        ],
        theme: 'grid',
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
        margin: { left: 20, right: 20 }
      });
      
      // Phone information
      const addressTableEndY = pdf.lastAutoTable.finalY;
      autoTable(pdf, {
        startY: addressTableEndY + 5,
        head: [['Cell Phone', 'Home Phone', 'Work Phone']],
        body: [
          [
            formData.mobilePhone || formData.cellPhone || '',
            formData.homePhone || '',
            formData.workPhone || ''
          ]
        ],
        theme: 'grid',
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
        margin: { left: 20, right: 20 }
      });
      
      // Membership details section
      const phoneTableEndY = pdf.lastAutoTable.finalY;
      autoTable(pdf, {
        startY: phoneTableEndY + 10,
        head: [['Membership Type', 'Add-on Options', 'Specialty Membership', 'Agreement Type']],
        body: [
          [
            formData.displayMembershipType || 'Individual',
            formData.addOns && formData.addOns.length > 0 ? formData.addOns.join(', ') : 'None',
            formData.displaySpecialtyMembership || 'None',
            formData.displayAgreementType || 'Month-to-month'
          ]
        ],
        theme: 'grid',
        headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: 'bold' },
        margin: { left: 20, right: 20 }
      });
      
      // Financial Information
      const membershipTableEndY = pdf.lastAutoTable.finalY;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Financial Details', 20, membershipTableEndY + 15);
      
      // Financial details table
      autoTable(pdf, {
        startY: membershipTableEndY + 20,
        head: [['Item', 'Amount']],
        body: [
          ['Initiation Fee', `$${formData.initiationFee || '0.00'}`],
          ['Pro-rated Dues', `$${formData.proratedDues || '0.00'}`],
          ['Pro-rated Add-Ons', `$${formData.proratedAddOns || '0.00'}`],
          ['Packages', `$${formData.packagesFee || '0.00'}`],
          ['Taxes', `$${formData.taxAmount || '0.00'}`],
          ['Total Collected (Tax included)', `$${formData.totalCollected || '0.00'}`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
        margin: { left: 20, right: 20 }
      });
      
      // Monthly Cost Going Forward
      const financialTableEndY = pdf.lastAutoTable.finalY;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Monthly Cost Going Forward', 20, financialTableEndY + 15);
      
      autoTable(pdf, {
        startY: financialTableEndY + 20,
        body: [
          [{content: `${formData.displayMembershipType || 'Individual'} Dues ${formData.displayAgreementType || 'Month-to-month'}`, styles: {fontStyle: 'normal'}}, 
           {content: `$${formData.monthlyDues || '0.00'}`, styles: {fontStyle: 'normal'}}],
          [{content: 'Total Monthly Membership Dues Rate', styles: {fontStyle: 'normal'}}, 
           {content: `$${formData.totalMonthlyRate || formData.monthlyDues || '0.00'}`, styles: {fontStyle: 'normal'}}],
          [{content: 'Membership Start Date', styles: {fontStyle: 'normal'}}, 
           {content: formatDate(formData.requestedStartDate) || '', styles: {fontStyle: 'bold'}}]
        ],
        theme: 'grid',
        margin: { left: 20, right: 20 }
      });
      
      // Family Members Section (if applicable)
      const monthlyTableEndY = pdf.lastAutoTable.finalY;
      let currentY = monthlyTableEndY + 15;
      
      if (formData.familyMembers && formData.familyMembers.length > 0) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Family Members (${formData.familyMembers.length})`, 20, currentY);
        
        // Create family members table
        const familyMembersData = formData.familyMembers.map(member => [
          member.name || `${member.firstName || ''} ${member.lastName || ''}`,
          member.type || ''
        ]);
        
        autoTable(pdf, {
          startY: currentY + 5,
          head: [['Name', 'Type']],
          body: familyMembersData,
          theme: 'grid',
          headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
          margin: { left: 20, right: 20 }
        });
        
        currentY = pdf.lastAutoTable.finalY + 10;
      }
      
      // Child Programs Section (if applicable)
      if (formData.childPrograms) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Child Programs', 20, currentY);
        
        const childProgramsData = [
          [formData.childPrograms]
        ];
        
        if (formData.childProgramsMonthly) {
          childProgramsData.push([`Monthly: $${formData.childProgramsMonthly}`]);
        }
        
        if (formData.childProgramsDueNow) {
          childProgramsData.push([`Due now: $${formData.childProgramsDueNow}`]);
        }
        
        autoTable(pdf, {
          startY: currentY + 5,
          body: childProgramsData,
          theme: 'grid',
          margin: { left: 20, right: 20 }
        });
        
        currentY = pdf.lastAutoTable.finalY + 10;
      }
      
      // Additional Services Section (if applicable)
      if (formData.additionalServicesDetails && formData.additionalServicesDetails.length > 0) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Additional Services', 20, currentY);
        
        const additionalServicesData = [];
        
        formData.additionalServicesDetails.forEach(service => {
          const serviceInfo = [service.name || ''];
          if (service.dueNow) additionalServicesData.push([`Due now: $${service.dueNow}`]);
          if (service.monthly) additionalServicesData.push([`Monthly: $${service.monthly}`]);
          additionalServicesData.push(serviceInfo);
        });
        
        autoTable(pdf, {
          startY: currentY + 5,
          body: additionalServicesData,
          theme: 'grid',
          margin: { left: 20, right: 20 }
        });
        
        currentY = pdf.lastAutoTable.finalY + 10;
      }
      
      // Membership ID Section (if applicable)
      if (formData.membershipId) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Membership ID', 20, currentY);
        
        autoTable(pdf, {
          startY: currentY + 5,
          body: [[formData.membershipId]],
          theme: 'grid',
          margin: { left: 20, right: 20 }
        });
        
        currentY = pdf.lastAutoTable.finalY + 10;
      }
      
      // Payment Authorization Section
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Payment Authorization', 20, currentY);
      
      // Authorization text
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const authText = `I hereby request and authorize ${getClubName()} to charge my account via Electronic Funds Transfer on a monthly basis beginning ${formatDate(formData.requestedStartDate) || ''}.`;
      const additionalAuthText = `The debit will consist of monthly dues plus any other club charges (if applicable) made by myself or other persons included in my membership in accordance with the resignation policy detailed in the Terms and Conditions within this Agreement. The authorization is extended by me to ${getClubName()} and/or its authorized agents or firms engaged in the business of processing check and charge card debits.`;
      
      const splitAuthText = pdf.splitTextToSize(authText, 170);
      const splitAdditionalAuthText = pdf.splitTextToSize(additionalAuthText, 170);
      
      pdf.text(splitAuthText, 20, currentY + 5);
      pdf.text(splitAdditionalAuthText, 20, currentY + 15);
      
      // Payment method table
      autoTable(pdf, {
        startY: currentY + 30,
        head: [['Payment Method']],
        body: [[formData.paymentMethod || 'Credit Card']],
        theme: 'grid',
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
        margin: { left: 20, right: 20 }
      });
      
      // Credit card information
      const paymentMethodEndY = pdf.lastAutoTable.finalY;
      
      // Format credit card number to show only last 4 digits
      const formatCreditCardNumber = (ccNumber) => {
        if (!ccNumber) return '';
        return ccNumber.replace(/\d(?=\d{4})/g, '*');
      };
      
      autoTable(pdf, {
        startY: paymentMethodEndY + 5,
        head: [['Credit Card Number', 'Expiration', 'Name on Account']],
        body: [
          [
            formatCreditCardNumber(formData.creditCardNumber || ''),
            formatDate(formData.expirationDate || ''),
            `${formData.firstName || ''} ${formData.lastName || ''}`
          ]
        ],
        theme: 'grid',
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
        margin: { left: 20, right: 20 }
      });
      
      // Always add a new page for terms and conditions
      pdf.addPage();
      


      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    
      

      // Contract Terms Section - on a new page
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Terms and Conditions', 105, 20, { align: 'center' });
  
      // CANCELLATION RIGHT Section - Fixed header spacing
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CANCELLATION RIGHT', 105, 35,  { align: 'center' });
      
      // Added spacing after section header
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      
      const cancellationHeader = `${getClubName()} (${getClubAbbreviation()}) MONEY BACK GUARANTEE:`;
      pdf.text(cancellationHeader, 20, 45);
      
      // Cancellation terms
      pdf.setFont('helvetica', 'normal');
      const cancellationText = `${getClubAbbreviation()} EXTENDS A FOURTEEN (14) DAY TRIAL PERIOD WITH A FULL REFUND. THIS REFUND DOES ` +
        `NOT APPLY TO AMOUNTS OWED BY MEMBER TO ${getClubAbbreviation()} UNDER ANY OTHER MEMBERSHIP APPLICATION OR AGREEMENT. THE 14 DAYS ` +
        `INCLUDE THE DATE ON THIS AGREEMENT. YOU MAY RESCIND THIS AGREEMENT BY SENDING WRITTEN NOTICE TO ${getClubName()} THAT ` +
        `YOU ARE EXERCISING YOUR RIGHT TO RESCIND BY FACSIMILE TRANSMITTAL, MAIL, EMAIL, HAND ` +
        `DELIVERY OR COMPLETING A MEMBERSHIP CANCELATION FORM AT THE CLUB. A NOTICE IS DEEMED DELIVERED ON THE DATE ` +
        `POSTMARKED IF MAILED, ON THE DATE DELIVERED IF BY HAND DELIVERY, FACSIMILE OR EMAIL. IF YOU PROPERLY EXERCISE ` +
        `YOUR RIGHT TO RESCIND WITHIN 14 DAYS (NOT LATER THAN 5PM) OF ${formData?.requestedStartDate ? calculateCancellationDate(formData.requestedStartDate) : ''}, ` +
        `YOU WILL BE ENTITLED TO A REFUND OF ALL PAYMENTS MADE PURSUANT TO THIS MEMBERSHIP APPLICATION.`;
      
      const splitCancellationText = pdf.splitTextToSize(cancellationText, 170);
      pdf.text(splitCancellationText, 20, 50);
      
      // Adjust vertical position after cancellation text
      let currentYPos = 50 + (splitCancellationText.length * 4) + 5; // Reduced space
      
        // Acknowledgment text — wrap at 170 pts
        pdf.setFont('helvetica', 'bold');
        const acknowledgmentText =
          'EACH OF THE UNDERSIGNED MEMBERS ACKNOWLEDGES RECEIPT OF THE FOREGOING NOTICE ' +
          'AND COPIES HEREOF:';
        const lines = pdf.splitTextToSize(acknowledgmentText, 170);
        pdf.text(lines, 20, currentYPos);

        // advance Y if you need to draw more content below
        currentYPos += lines.length * 4;

      
      // Agreement understanding text
      pdf.setFont('helvetica', 'normal');
      currentYPos += 5; // Reduced space
      const agreementUnderstandingText = `I have read and understand this agreement along with the terms and conditions ` +
        `contained on this document and will abide by the rules and regulations of ${getClubName()}. In addition, ` +
        `I understand that the primary member represents all members and accepts all responsibility on the account and that all ` +
        `memberships are non-transferable and non-assignable to another individual. By signing this document or sending this ` +
        `by facsimile, I do intend it to be my legally binding and valid signature on this agreement as if it were an original signature.`;
      
      const splitAgreementText = pdf.splitTextToSize(agreementUnderstandingText, 170);
      pdf.text(splitAgreementText, 20, currentYPos);
      
      // Update position for next section
      currentYPos += (splitAgreementText.length * 5) + 3;
      
      // MEMBERSHIP AGREEMENT Section - Fixed header spacing
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MEMBERSHIP AGREEMENT', 105, currentYPos,  { align: 'center' });
      
      // Added spacing after section header
      currentYPos += 3;
      
      // Fee Structures - Fixed header spacing
      currentYPos += 3;
      pdf.setFontSize(10);
      pdf.text('1. MEMBERSHIP FEE STRUCTURES', 20, currentYPos);
      
      // Added spacing after section header
      currentYPos += 5;
      
      pdf.setFont('helvetica', 'normal');
      pdf.text('A.', 20, currentYPos);
      const feeStructureAText = "The Member is required to immediately pay an Initiation Fee which is due and owing separate " +
        "and apart from the monthly dues stated on this membership agreement.";
      const splitFeeStructureAText = pdf.splitTextToSize(feeStructureAText, 160);
      pdf.text(splitFeeStructureAText, 30, currentYPos);
      
      currentYPos += (splitFeeStructureAText.length * 5) + 3; // Reduced space
      pdf.text('B.', 20, currentYPos);
      const feeStructureBText = `The Member elects to purchase a membership and to pay ` +
      `to ${getClubName()} (${getClubAbbreviation()}) the required total monthly dues as indicated on this agreement under one of the following scenarios: `;
      const splitFeeStructureBText = pdf.splitTextToSize(feeStructureBText, 160);
      pdf.text(splitFeeStructureBText, 30, currentYPos);
      
      // Update position for next subsection - reduced spacing
      currentYPos += (splitFeeStructureBText.length * 5) + 3;
      
      {
        // Month-to-Month Section - Fixed header spacing
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('MONTH-TO-MONTH', 20, currentYPos);
      
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;
      
        pdf.setFont('helvetica', 'normal');
        const monthToMonthText = 
'I understand that I am committing to a minimum three (3) month membership. ' +
  'The three (3) month period commences on the 1st of the month following the date ' +
  'the membership begins. After fulfilling my minimum three (3) month membership ' +
  'commitment, I understand that the membership may be cancelled at any time with ' +
  'written notice pursuant to the Resignation Policy (Item 4A) and the total dues ' +
  'owing for the membership as well as all discounts and initiation fees are not ' +
  'refundable. As such, any failure to use the membership indicated above and/or the ' +
  'facilities and programs associated therewith does not relieve applicant of any ' +
  'liability for payment of the total dues or other charges owing as indicated above, ' +
  'regardless of circumstances. Dues may increase at any time, with a one (1) month ' +
  'notice.';

      
        const splitMonthToMonth = pdf.splitTextToSize(monthToMonthText, 170);
        pdf.text(splitMonthToMonth, 20, currentYPos);
      
        const paragraphHeight = splitMonthToMonth.length * 5;

        // Display initials if section is initialed - with less spacing
        if (initialedSections?.monthToMonth && signatureData?.initials?.text) {
          pdf.setFont(signatureData.selectedFont?.font || 'helvetica', 'italic');
          const initialsY = currentYPos + paragraphHeight;
          pdf.text(`INITIAL: ${signatureData.initials.text}`, 20, initialsY);
          pdf.setFont('helvetica', 'normal');
        }
      
        // Update position for next subsection - reduced space
        const totalAdvance = paragraphHeight + 5 + (initialedSections?.monthToMonth ? 5 : 0);

        currentYPos += totalAdvance;
      
        // Check if we need a new page for the Extended Plan section
        if (currentYPos > 230) {
          pdf.addPage();
          currentYPos = 20;
        }
      
      }

    
    
      {
        // --- EXTENDED PLAN Section ---
        // 1) Header
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('EXTENDED PLAN', 20, currentYPos);

        // 2) Small gap after header - removing this lays the header on top of the text paragraph
        currentYPos += 5;

        // 3) Body text
        pdf.setFont('helvetica', 'normal');
        const extendedPlanText =
          `I elect to pay for the number of selected months on this agreement for consecutive ` +
          `months of member dues plus any club charges (if applicable) made by myself or any other ` +
          `persons included in my membership. I understand that I am committing to a minimum ` +
          `three (3) month membership. The three (3) month period commences on the 1st of the month ` +
          `following the date the membership begins. Member acknowledges that in order to be relieved ` +
          `of the agreement terms, the balance of the dues owed for the remaining months of the ` +
          `agreement must be paid in full. Special consideration can be made if cause for cancellation ` +
          `is based on a medical contingency and written authorization from a doctor is received; or ` +
          `if a member moves 50 miles or more away from the nearest ${getClubName()} ` +
          `with proof of new residency. Any Leave of Absence taken during the initial term of this ` +
          `agreement will extend the commitment by the number of months the member's account is on ` +
          `Leave of Absence. Rate for Student/Young Professional memberships will only be honored ` +
          `through the current maximum age for this type of membership regardless of whether the ` +
          `number of selected months on this agreement has expired or not. AT THE END OF THE AGREEMENT ` +
          `PERIOD CHOSEN THIS PLAN REMAINS IN EFFECT ON A MONTH-TO-MONTH BASIS and the Resignation ` +
          `Policy (Item 4A) applies. I authorize ${getClubAbbreviation()} to collect payment under the method of payment ` +
          `indicated on the agreement and the balance of the remaining dues owed should I not satisfy ` +
          `the terms of the agreement.`;

  
        const splitExtendedPlan = pdf.splitTextToSize(extendedPlanText, 170);

        // (header + drawPagedText omitted for brevity)
        currentYPos = drawPagedText(pdf, splitExtendedPlan, 20, currentYPos);

        // 5) Initials 5 pts up (so they sit right against the last line)
        if (initialedSections?.extendedPlan && signatureData?.initials?.text) {
          // page‑overflow check
          if (currentYPos + 5 > pdf.internal.pageSize.getHeight() - 20) {
            pdf.addPage();
            currentYPos = 20;
          }

          pdf.setFont(signatureData.selectedFont?.font || 'helvetica', 'italic');
          // place initials 5pts above currentYPos
          pdf.text(`INITIAL: ${signatureData.initials.text}`, 20, currentYPos + 5);
          pdf.setFont('helvetica', 'normal');
        }

        // 6) Now advance by 15pts total: 5 for that “lift,” +10 for gap before refund
        currentYPos += 15;

        // overflow check again, if needed
        if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
          pdf.addPage();
          currentYPos = 20;
        }
      }
      


      // ——— REFUND PARAGRAPH ———
      // (no extra currentYPos += 5 here—it's already included above)
// 1) Body text
      pdf.setFont('helvetica', 'normal');
const refundText = 
  'Except as expressly provided in this Membership Agreement, no portion of the initial fee ' +
  'or monthly membership dues is refundable, regardless of whether member attends or uses, ' +
  'or is able to attend or use, the facilities or programs of the club.';

const splitRefundText = pdf.splitTextToSize(refundText, 170);

// drawPagedText already moved you past the text
currentYPos = drawPagedText(pdf, splitRefundText, 20, currentYPos);

// now only add the fixed 5pt gap before the next header
currentYPos += 5;

// 5) Overflow check
if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
      }
      


// ——— C. PAID‑IN‑FULL Section ———
// 1) Header
pdf.setFont('helvetica', 'bold');
pdf.text('C. PAID-IN-FULL', 20, currentYPos);

// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;

// 3) Body text
pdf.setFont('helvetica', 'normal');
const paidInFullText = 
  'I elect to pay my total dues, as indicated on this agreement, in advance in consideration ' +
  'of a discount on yearly dues. At the completion of the prepaid period, my membership ' +
  'will automatically revert to month-to-month billing unless I prepay another year in advance or ' +
  'terminate with a written notice pursuant to the Resignation Policy (Item 4A.). If terminating ' +
  'prior to the completion of the prepaid agreement, a refund will be granted minus the discount ' +
  'percent indicated above. If a renewal of membership is requested by the applicant and approved ' +
  'at the conclusion of the term indicated, I understand that the renewal monthly dues to be charged ' +
  'will be those dues rates in effect at the time of renewal.';

const splitPaidInFull = pdf.splitTextToSize(paidInFullText, 160);

// 4) Draw and paginate
currentYPos = drawPagedText(pdf, splitPaidInFull, 20, currentYPos);

// only add your fixed 5pt gap
currentYPos += 5;

// 7) Overflow check for next header
if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
}

      


// ——— D. EFT Section ———
pdf.setFont('helvetica', 'bold');
pdf.text('D. EFT', 20, currentYPos);
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;

pdf.setFont('helvetica', 'normal');
const eftText = 
  `All dues and Member charges will be payable monthly (with the exception of annual ` +
  `dues prepayments) and collected by Electronic Funds Transfer (EFT) from either the ` +
  `Member's bank account or charged to an approved credit card. Please notify ${getClubName()} ` +
  `(${getClubAbbreviation()}) at the time you change bank accounts or credit ` +
  `cards and provide the appropriate information to avoid having your old account charged ` +
  `for your monthly dues.`;
const splitEFT = pdf.splitTextToSize(eftText, 160);
currentYPos = drawPagedText(pdf, splitEFT, 20, currentYPos);

// currentYPos now at bottom of EFT text
// only add your fixed 5pt gap
currentYPos += 5;

if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
}

// ——— E. DELINQUENT ACCOUNTS Section ———
pdf.setFont('helvetica', 'bold');
pdf.text('E. DELINQUENT ACCOUNTS', 20, currentYPos);
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;

pdf.setFont('helvetica', 'normal');
const delinquentText = 
  'In the event a bank account or credit card is unable to be charged at the designated ' +
  'date, the membership is subject to a late fee. A charge will be issued for checks ' +
  'returned due to insufficient funds and credit cards that are declined when a balance ' +
  'is due. The Primary Member is responsible for all charges incurred.';
const splitDelinquent = pdf.splitTextToSize(delinquentText, 160);
currentYPos = drawPagedText(pdf, splitDelinquent, 20, currentYPos);

// currentYPos now at bottom of EFT text
// only add your fixed 5pt gap
currentYPos += 5;

if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
}

// ——— F. REFERRALS Section ———
pdf.setFont('helvetica', 'bold');
pdf.text('F. REFERRALS', 20, currentYPos);
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;

pdf.setFont('helvetica', 'normal');
const referralsText = 
  `If a dues referral program is in effect, it will not extend or modify the terms of ` +
  `the membership agreement. Any Member in default of payment due may NOT cure the default ` +
  `by way of credit for "referral" members to ${getClubName()}.`;
const splitReferrals = pdf.splitTextToSize(referralsText, 160);
currentYPos = drawPagedText(pdf, splitReferrals, 20, currentYPos);

// only add your fixed 5pt gap
currentYPos += 5;

if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
}

// ——— G. EMAIL Section ———
pdf.setFont('helvetica', 'bold');
pdf.text('G. EMAIL', 20, currentYPos);
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;

pdf.setFont('helvetica', 'normal');
const emailText = 
  `By providing my email address, I am consenting to receive information via email from ` +
  `${getClubName()}, The Wellbridge Company and their affiliated companies. ` +
  `Any further distribution of my email address is unauthorized.`;
const splitEmail = pdf.splitTextToSize(emailText, 160);
currentYPos = drawPagedText(pdf, splitEmail, 20, currentYPos);

// only add your fixed 5pt gap
currentYPos += 5;

if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
}

// ——— 2. UPGRADES/DOWNGRADES Section ———
pdf.setFont('helvetica', 'bold');
pdf.text('2. UPGRADES/DOWNGRADES', 20, currentYPos);
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;

pdf.setFont('helvetica', 'normal');
const upgradesText = 
  'Requests for upgrades/downgrades of membership must be made in writing. Upgrades ' +
  'will be effective immediately unless otherwise requested. Requests for downgrades must ' +
  'be submitted by the last day of the month for the downgrade to be effective for the ' +
  'following month. Primary Member\'s signature is required for all changes. Proof of ' +
  'eligibility/residency to upgrade/add members is required.';
const splitUpgrades = pdf.splitTextToSize(upgradesText, 160);
currentYPos = drawPagedText(pdf, splitUpgrades, 20, currentYPos);

// only add your fixed 5pt gap
currentYPos += 5;

if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
}

      
 // ——— 3. CLUB’S RIGHT OF CANCELLATION ———
pdf.setFont('helvetica', 'bold');
pdf.text("3. CLUB'S RIGHT OF CANCELLATION", 20, currentYPos);
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;

pdf.setFont('helvetica', 'normal');
const cancellationRightText =
  `Management of ${getClubAbbreviation()} may suspend or cancel the rights, privileges or membership of any Member whose ` +
  `actions are detrimental to the facility or do not comply with the rules and regulations of the facility ` +
  `upon any failure of a Member to make payment to ${getClubAbbreviation()} of all amounts due from the Member within sixty ` +
  `(60) days after billed. ${getClubAbbreviation()} has the option of declaring any other indebtedness of the Member to ${getClubAbbreviation()} ` +
  `immediately due and payable, without notice or demand. The Member agrees to pay ${getClubAbbreviation()} a reasonable ` +
  `attorney's fee, court costs and all other expenses incurred by ${getClubAbbreviation()} in making the collection. All ` +
  `outstanding amounts not paid when due shall accumulate interest at the rate of 1.5% per month.`;
const splitCancellationRight = pdf.splitTextToSize(cancellationRightText, 160);
currentYPos = drawPagedText(pdf, splitCancellationRight, 20, currentYPos);

// only add your fixed 5pt gap
currentYPos += 5;

if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
}

      
      
// ——— 4. TERMINATION/RESIGNATION RIGHTS ———
pdf.setFont('helvetica', 'bold');
pdf.text('4. TERMINATION/RESIGNATION RIGHTS', 20, currentYPos);
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;

pdf.setFont('helvetica', 'normal');
const terminationText =
  'In addition to the Cancellation Right set forth on this agreement, Member has the following rights to terminate:';
const splitTermination = pdf.splitTextToSize(terminationText, 160);
currentYPos = drawPagedText(pdf, splitTermination, 20, currentYPos);

// only add your fixed 5pt gap
currentYPos += 5;

if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
}

// ——— A. RESIGNATION POLICY ———
// 1) Render section header in bold
pdf.setFont('helvetica', 'bold');
pdf.text('A. RESIGNATION POLICY', 30, currentYPos);

// 2) Small gap after header to separate from body text
currentYPos += 5;

// 3) Switch to normal font for body
pdf.setFont('helvetica', 'normal');
const resignationText = `
A month-to-month membership may be cancelled by providing at least one (1) month's
written notice. Cancellation shall be effective on the 1st of the month that is at
least one (1) month after the date the notice is delivered. Notice can be provided by
first class mail (Certified with Return Receipt Recommended), personal delivery of
cancellation form at the club (Obtaining a copy from Club Personnel Recommended), and
facsimile transmission of cancellation form to 303-813-4197. Concurrently with the
delivery of written notice, Member must pay the club any amounts due on the account as
of the cancellation date and on or before the cancellation date member must return all
membership cards. Those who have signed on an Extended Plan agreement are subject to the
terms of their agreement and are responsible for the balance of remaining dues. All
memberships are non-refundable, non-transferable, non-assignable and non-proprietary.
`.trim();

// 4) Split into lines that fit the page width
const splitResignation = pdf.splitTextToSize(resignationText, 150);

// 5) Draw the body text with automatic page breaks
currentYPos = drawPagedText(pdf, splitResignation, 30, currentYPos);

// ——— Initials for Resignation Policy ———
// 6) If this section needs initials, render them 5 pts below the last line
if (initialedSections?.resignation && signatureData?.initials?.text) {
  // 6a) Check if initials would overflow past bottom margin
  if (currentYPos + 5 > pdf.internal.pageSize.getHeight() - 20) {
    pdf.addPage();
    currentYPos = 20;
  }

  pdf.setFont(signatureData.selectedFont?.font || 'helvetica', 'italic');
  pdf.text(`INITIAL: ${signatureData.initials.text}`, 20, currentYPos + 5);
  pdf.setFont('helvetica', 'normal');
}

// 7) Advance cursor 15 pts to leave space below initials and before next section
currentYPos += 15;

// ——— Overflow check before next section ———
if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
}

      
      

// ——— B. DEATH OR DISABILITY ———
pdf.setFont('helvetica', 'bold');
pdf.text('B. DEATH OR DISABILITY', 30, currentYPos);
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;

pdf.setFont('helvetica', 'normal');
const medicalText =
  'The contract may be cancelled in the event of member\'s death or total disability during the ' +
  'membership term. Total disability means a condition which has existed or will exist for more than ' +
  'six (6) months and which will prevent Member from using the club. In order to establish death, the ' +
  'member\'s estate must furnish to the club a death certificate. In order to establish disability, ' +
  'Member must furnish the club certification of the disability by a licensed physician whose diagnosis ' +
  'or treatment is within his scope of practice. Cancellation will be effective upon establishment of ' +
  'death or disability according to these provisions. In the event that Member has paid membership fees ' +
  'in advance, the club shall be entitled to retain an amount equal to the amount computed by dividing ' +
  'the total cost of the membership by the total number of months under the membership and multiplying ' +
  'the result by the number of months expired under the membership term. As to membership fees paid ' +
  'monthly, dues will be refunded for the month in which written notification is received of the death ' +
  'or disability and the proper documentation outlined above has been provided.';
const splitMedical = pdf.splitTextToSize(medicalText, 150);
currentYPos = drawPagedText(pdf, splitMedical, 30, currentYPos);

// only add your fixed 5pt gap
currentYPos += 5;

if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
}

      

// ——— 5. MEMBERSHIP POLICY ———
// 1) Section header in bold
pdf.setFont('helvetica', 'bold');
pdf.text('5. MEMBERSHIP POLICY', 20, currentYPos);

// 2) Small gap after header
currentYPos += 5;

// 3) Switch to normal font for body
pdf.setFont('helvetica', 'normal');

// First paragraph
const membershipTermsParagraph1 =
  `This membership contract is in force monthly upon payment of dues and other account charges. ` +
  `By submitting this application, the member acknowledges that ${getClubAbbreviation()} reserves the right to refuse ` +
  `membership, or to terminate this agreement at any time without notice. Member agrees to abide by ` +
  `the Corporate Member Regulations and by ${getClubAbbreviation()} Membership Policies as they exist or may be amended ` +
  `from time-to-time.`.trim();

const splitTerms1 = pdf.splitTextToSize(membershipTermsParagraph1, 160);

// Draw first paragraph with pagination
currentYPos = drawPagedText(pdf, splitTerms1, 20, currentYPos);

// 4) Fixed 5 pt gap between paragraphs
currentYPos += 5;

// Second paragraph
      const membershipTermsParagraph2 = 
      `Furthermore, member understands that should member's account balance become more than 60-days past due, ` +
`${getClubAbbreviation()} may cancel the membership at its sole discretion. If the collection process is commenced by ${getClubAbbreviation()} for ` +
  `unpaid amounts, member agrees to pay collection costs, including attorney fees should they be incurred.  ` +
  `Member recognizes the inherent risks of participating in an exercise program and hereby holds ${getClubAbbreviation()} harmless  ` +
  `from any and all injuries member, and/or member's family might incur in connection with member's membership  ` +
  `activities at ${getClubAbbreviation()}. This is our entire agreement; no verbal statements may alter or change its provisions.  ` +
  `Except as expressly provided in this Membership Agreement, no portion of the initial fee or monthly membership  ` +
  `dues is refundable, regardless of whether member attends or uses, or is able to attend or use, the facilities ` +
  `or programs of the club.`.trim();

const splitTerms2 = pdf.splitTextToSize(membershipTermsParagraph2, 160);

// Draw second paragraph with pagination
currentYPos = drawPagedText(pdf, splitTerms2, 20, currentYPos);

// 5) Fixed 5 pt gap before next section
currentYPos += 5;

// 6) Overflow check for next section
if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
}

      

// ——— 6. MEMBERSHIP CARDS  ———
pdf.setFont('helvetica', 'bold');
pdf.text('6. MEMBERSHIP CARDS', 20, currentYPos);
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;

pdf.setFont('helvetica', 'normal');
const mbrCardText =
`I understand cards are mandatory and must be presented prior to entering ${getClubAbbreviation()}. ` +
  `Cards are not transferable to another person. There will be a replacement fee for each ` +
  `lost card. I acknowledge that I am responsible for all charges incurred on my membership card.`;
const splitmbrCardText = pdf.splitTextToSize(mbrCardText, 160);
currentYPos = drawPagedText(pdf, splitmbrCardText, 20, currentYPos);

// only add your fixed 5pt gap
currentYPos += 5;

if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
}

      
// ——— 7. HOURS OF OPERATION  ———
pdf.setFont('helvetica', 'bold');
pdf.text('7. HOURS OF OPERATION ', 20, currentYPos);
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;

pdf.setFont('helvetica', 'normal');
const indemnificationText =
  `Operation schedules may vary and are subject to change. Schedule of hours of operation and any changes will be posted in ${getClubAbbreviation()}.`;
const splitIndemnification = pdf.splitTextToSize(indemnificationText, 160);
currentYPos = drawPagedText(pdf, splitIndemnification, 20, currentYPos);

// only add your fixed 5pt gap
currentYPos += 5;

// 7) Overflow check for next header
if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
}

      
      // ——— 8. LEAVE OF ABSENCE POLICY   ———
pdf.setFont('helvetica', 'bold');
pdf.text('8. LEAVE OF ABSENCE POLICY', 20, currentYPos);
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;

pdf.setFont('helvetica', 'normal');
const leaveOfAbsencePolicyText =
  'This Membership may be put on a Leave of Absence (LOA). LOA requests must be in writing ' +
  'and submitted by the last day of the month for the LOA to be effective the following month. ' +
  'LOA must state the leave and return date. There is a monthly charge for accounts in LOA ' +
  '(exceptions for medical LOAs may be approved for no charge with proper medical documentation). ' +
  'There will be no retroaction or partial month adjustments. A medical LOA must be accompanied ' +
  'by a doctor\'s note. If member chooses to cancel their membership while on a LOA, the ' +
  'membership is reinstated, full dues will be charged for the final month of membership and ' +
  'the cancellation policy takes effect. An LOA extends any memberships in an Extended Plan by ' +
  'the number of months the membership is in a LOA status.';

      
const splitleaveOfAbsencePolicyText = pdf.splitTextToSize(leaveOfAbsencePolicyText, 160);
currentYPos = drawPagedText(pdf, splitleaveOfAbsencePolicyText, 20, currentYPos);

// only add your fixed 5pt gap
currentYPos += 5;

// 7) Overflow check for next header
if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
}
      
      
            // ——— 9. PERSONAL TRAINING   ———
pdf.setFont('helvetica', 'bold');
pdf.text('9. PERSONAL TRAINING', 20, currentYPos);
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;

pdf.setFont('helvetica', 'normal');
const personalTrainerPolicyText =
  `Personal trainers not employed by ${getClubAbbreviation()} are not allowed to train or consult in any part of ` +
  `the clubs due to ${getClubAbbreviation()}'s interest in ensuring the accuracy of information relayed, as well as ` +
  `to reduce the potential for injury.`;
      
const splitpersonalTrainerPolicyText = pdf.splitTextToSize(personalTrainerPolicyText, 160);
currentYPos = drawPagedText(pdf, splitpersonalTrainerPolicyText, 20, currentYPos);

// only add your fixed 5pt gap
currentYPos += 5;

// 7) Overflow check for next header
if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
      }
      

            // ——— 10. EMERGENCY MEDICAL AID    ———
pdf.setFont('helvetica', 'bold');
pdf.text('10. EMERGENCY MEDICAL AID', 20, currentYPos);
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;

pdf.setFont('helvetica', 'normal');
const emergencyMedicalPolicyText =
  `${getClubAbbreviation()} reserves the right to call emergency medical aid for an injured Member or guest ` +
  `and said Member or guest accepts responsibility for any financial obligations arising ` +
  `from such emergency medical aid or transportation to a medical facility.`;

      
const splitemergencyMedicalPolicyText = pdf.splitTextToSize(emergencyMedicalPolicyText, 160);
currentYPos = drawPagedText(pdf, splitemergencyMedicalPolicyText, 20, currentYPos);

// only add your fixed 5pt gap
currentYPos += 5;

// 7) Overflow check for next header
if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
}


                  // ——— 11. AMENDING OF RULES    ———
pdf.setFont('helvetica', 'bold');
pdf.text('11. AMENDING OF RULES', 20, currentYPos);
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;

pdf.setFont('helvetica', 'normal');
const amendmentPolicyText =
  `I understand ${getClubAbbreviation()} reserves the right to amend or add to these conditions and to adopt ` +
  `new conditions as it may deem necessary for the proper management of the clubs and the business.`;

const splitamendmentPolicyText  = pdf.splitTextToSize(amendmentPolicyText , 160);
currentYPos = drawPagedText(pdf, splitamendmentPolicyText , 20, currentYPos);

// only add your fixed 5pt gap
currentYPos += 5;

// 7) Overflow check for next header
if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
      }
      


                        // ——— 12. UNAVAILABILITY OF FACILITY OR SERVICES   ———
pdf.setFont('helvetica', 'bold');
pdf.text('12. UNAVAILABILITY OF FACILITY OR SERVICES', 20, currentYPos);
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;

pdf.setFont('helvetica', 'normal');
const facilityUnavailabilityPolicyText =
  `I agree to accept the fact that a particular facility or service in the premises ` +
  `may be unavailable at any particular time due to mechanical breakdown, fire, act of ` +
  `God, condemnation, loss of lease, catastrophe or any other reason. Further, I agree ` +
  `not to hold ${getClubAbbreviation()} responsible or liable for such occurrences.`;


const splitfacilityUnavailabilityPolicyText  = pdf.splitTextToSize(facilityUnavailabilityPolicyText , 160);
currentYPos = drawPagedText(pdf, splitfacilityUnavailabilityPolicyText , 20, currentYPos);

// only add your fixed 5pt gap
currentYPos += 5;

// 7) Overflow check for next header
if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
      }
      


                              // ——— 13. HEALTH WARRANTY   ———
pdf.setFont('helvetica', 'bold');
pdf.text('13. HEALTH WARRANTY', 20, currentYPos);
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;

pdf.setFont('helvetica', 'normal');
const healthWarrantyText =
  `I warrant and represent that I, any family member, ward or guest (each, a "Guest") who uses any ` +
  `${getClubAbbreviation()} facility has no disability, impairment or illness preventing such person from engaging in ` +
  `active or passive exercise or that will be detrimental or inimical to such person's health, ` +
  `safety or physical condition. I acknowledge and agree that: (1) ${getClubAbbreviation()} will rely on the foregoing ` +
  `warranty in issuing my membership, (2) ${getClubAbbreviation()} may perform a fitness assessment or similar testing ` +
  `to establish my or my Guests' initial physical statistics, (3) if any fitness or similar testing ` +
  `is performed by ${getClubAbbreviation()}, it is solely for the purpose of providing comparative data with which I or ` +
  `my Guests may chart progress in a program and is not for any diagnostic purposes whatsoever, ` +
  `and (4) ${getClubAbbreviation()} shall not be subject to any claim or demand whatsoever on account of ${getClubAbbreviation()}'s evaluation ` +
  `or interpretation of such fitness assessment or similar testing. I and my Guests are responsible ` +
  `for understanding our respective medical history and should consult with a physician prior to ` +
  `engaging in exercise or continuation of exercise if a medical condition appears to be developing.`;


const splithealthWarrantyText = pdf.splitTextToSize(healthWarrantyText , 160);
currentYPos = drawPagedText(pdf, splithealthWarrantyText , 20, currentYPos);

// only add your fixed 5pt gap
currentYPos += 5;

// 7) Overflow check for next header
if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
      }



                                    // ———14. DAMAGE TO FACILITIES    ———
pdf.setFont('helvetica', 'bold');
pdf.text('14. DAMAGE TO FACILITIES', 20, currentYPos);
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;

pdf.setFont('helvetica', 'normal');
const damageText = `I agree to pay for any damage that I, my family or my Guests may cause this club's facilities through careless or negligent use thereof.`.trim();


const splitdamageText = pdf.splitTextToSize(damageText , 160);
currentYPos = drawPagedText(pdf, splitdamageText , 20, currentYPos);

// only add your fixed 5pt gap
currentYPos += 5;

// 7) Overflow check for next header
if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
      }



      
                                    // ———15. THEFT OR DAMAGE TO PERSONAL PROPERTY   ———
pdf.setFont('helvetica', 'bold');
pdf.text('15. THEFT OR DAMAGE TO PERSONAL PROPERTY', 20, currentYPos);
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;

pdf.setFont('helvetica', 'normal');
const liabilityPropertyText =
  `I acknowledge that ${getClubAbbreviation()} will not accept responsibility for theft, loss or damage to ` +
  `personal property left in a locker or in ${getClubAbbreviation()} or for theft, loss or damage to automobiles ` +
  `or personal property left in ${getClubAbbreviation()} parking lot. ${getClubAbbreviation()} suggests that members do not bring ` +
  `valuables on ${getClubAbbreviation()} premises. Signs are posted throughout the club and are strictly enforced.`;

const splitliabilityPropertyText = pdf.splitTextToSize(liabilityPropertyText , 160);
currentYPos = drawPagedText(pdf, splitliabilityPropertyText , 20, currentYPos);

// only add your fixed 5pt gap
currentYPos += 5;

// 7) Overflow check for next header
if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
      }



            
                                    // ———16. RELEASE FROM LIABILITY    ———
pdf.setFont('helvetica', 'bold');
pdf.text('16. RELEASE FROM LIABILITY ', 20, currentYPos);
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;

pdf.setFont('helvetica', 'normal');
const assumptionOfRiskText =
  `I agree, in attending and using the facilities and equipment therein, that I do so at my own risk. ` +
  `${getClubAbbreviation()} shall not be liable for any damages arising from personal injuries sustained by me and/or my guest(s) ` +
  `in, or about the premises. I assume full responsibility for any injuries or damages which may occur to me ` +
  `in, on or about the premises, and I do hereby fully and forever release and discharge ${getClubAbbreviation()} and all associated ` +
  `owners, employees, and agents from any and all claims, demands, damages, rights of action or causes of action ` +
  `present or future, whether the same be known or unknown, anticipated or unanticipated, resulting from or arising ` +
  `out of my use or intended use of the said facilities and equipment thereof.`;


const splitassumptionOfRiskText = pdf.splitTextToSize(assumptionOfRiskText , 160);
currentYPos = drawPagedText(pdf, splitassumptionOfRiskText, 20, currentYPos);

// only add your fixed 5pt gap
currentYPos += 5;

// 7) Overflow check for next header
if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
      }



// ——— 17. WAIVER AND RELEASE OF ELECTRONIC MEDIA ———
// 1) Render section header in bold
pdf.setFont('helvetica', 'bold');
pdf.text('17. WAIVER AND RELEASE OF ELECTRONIC MEDIA', 20, currentYPos);

// 2) Small gap after header
currentYPos += 5;

// 3) Switch to normal font for paragraphs
pdf.setFont('helvetica', 'normal');

// Paragraph 1
const mediaReleaseText1 =
  'I recognize, acknowledge and grant permission for Starmark Holdings, LLC, its affiliates, ' +
  'subsidiaries, employees, successors and/or anyone acting with its authority, to take and use ' +
  'still photographs, motion picture, video, sound recordings and/or testimonials of me and/or any ' +
  'family member, ward or guest.';
const splitMedia1 = pdf.splitTextToSize(mediaReleaseText1, 160);
currentYPos = drawPagedText(pdf, splitMedia1, 20, currentYPos);
currentYPos += 5; // gap before next paragraph

// Paragraph 2
const mediaReleaseText2 =
  'I hereby waive any right to inspect or approve the photographs, electronic matter, and/or ' +
  'finished products that may be used in conjunction with them now or in the future. I hereby grant ' +
  'all right, title and interest I may now have in the photographs, electronic matter, and/or ' +
  'finished products to Starmark Holdings, LLC and/or anyone acting with its authority, and hereby ' +
  'waive any right to royalties or other compensation arising from or related to the use of the ' +
  'photographs, electronic matter, and/or finished matter.';
const splitMedia2 = pdf.splitTextToSize(mediaReleaseText2, 160);
currentYPos = drawPagedText(pdf, splitMedia2, 20, currentYPos);
currentYPos += 5; // gap before next paragraph

// Paragraph 3 (communications consent)
const communicationsConsentText3 =
  'I hereby consent to receive future calls, text messages, and/or short message service ("SMS") ' +
  'calls (collectively, "Calls") that deliver prerecorded or prewritten messages by or on behalf of ' +
  'Wellbridge to me. Providing consent to receive such Calls is not a condition of purchasing any ' +
  'goods or services from Wellbridge. I understand that I may revoke this consent by following the ' +
  "'opt-out' procedures presented upon receiving a Call.";
const splitComm = pdf.splitTextToSize(communicationsConsentText3, 160);
currentYPos = drawPagedText(pdf, splitComm, 20, currentYPos);

// 4) Fixed 5 pt gap before next section
currentYPos += 5;

// 5) Overflow check before next header
if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
}


 // ——— 18. CORPORATE MEMBERS REGULATIONS ———
// 1) Section header in bold
pdf.setFont('helvetica', 'bold');
pdf.text('18. CORPORATE MEMBERS REGULATIONS', 20, currentYPos);
currentYPos += 5;

// 2) Item 1 label in bold, text in normal
pdf.setFont('helvetica', 'bold');
pdf.text('1.', 30, currentYPos);
pdf.setFont('helvetica', 'normal');
      const corpItem1 = `Corporate members must be a W-2 paid employee or associate of a firm or approved organization ` +
        `that has a corporate membership with ${getClubAbbreviation()}, unless otherwise agreed to in writing.${getClubAbbreviation()} must be notified immediately of any change in employment status.`;
const splitCorp1 = pdf.splitTextToSize(corpItem1, 150);
currentYPos = drawPagedText(pdf, splitCorp1, 34, currentYPos);
currentYPos += 5;

// 3) Item 2 label in bold, text in normal
pdf.setFont('helvetica', 'bold');
pdf.text('2.', 30, currentYPos);
pdf.setFont('helvetica', 'normal');
      const corpItem2 = `Discounts on monthly dues may change in accordance with the number or employees of the corporate firm ` +
        `who belong to ${getClubAbbreviation()}.I understand I will lose my corporate discount and will be readjusted to regular rates if my ` +
        `employer drops below the minimum required number of participating employees for them to be eligible in the corporate discount program.`;
const splitCorp2 = pdf.splitTextToSize(corpItem2, 150);
currentYPos = drawPagedText(pdf, splitCorp2, 34, currentYPos);
currentYPos += 5;

// 4) Item 3 label in bold, text in normal
pdf.setFont('helvetica', 'bold');
pdf.text('3.', 30, currentYPos);
pdf.setFont('helvetica', 'normal');
      const corpItem3 = `It is the member's responsibility to notify ${getClubAbbreviation()} of any change in employment status. I understand that ` +
        `I will be assessed appropriate monthly fees should I leave the above corporation/organization, or the corporation/organization drops its corporate membership.`;
const splitCorp3 = pdf.splitTextToSize(corpItem3, 150);
currentYPos = drawPagedText(pdf, splitCorp3, 34, currentYPos);
currentYPos += 5;

// 5) Item 4 label in bold, text in normal
pdf.setFont('helvetica', 'bold');
pdf.text('4.', 30, currentYPos);
pdf.setFont('helvetica', 'normal');
const corpItem4 = 'Proof of employment must be provided to obtain the corporate discount.';
const splitCorp4 = pdf.splitTextToSize(corpItem4, 150);
currentYPos = drawPagedText(pdf, splitCorp4, 34, currentYPos);
      currentYPos += 5;
      

      // ——— Initials for Corporate Discount Section ———
// 6) If this section needs initials, render them 5 pts below the last line
if (initialedSections?.corporate && signatureData?.initials?.text) {
  // 6a) Check if initials would overflow past bottom margin
  if (currentYPos + 5 > pdf.internal.pageSize.getHeight() - 20) {
    pdf.addPage();
    currentYPos = 20;
  }

  pdf.setFont(signatureData.selectedFont?.font || 'helvetica', 'italic');
  pdf.text(`INITIAL: ${signatureData.initials.text}`, 20, currentYPos + 5);
  pdf.setFont('helvetica', 'normal');

  // 6b) Advance cursor past initials gap
  currentYPos += 15; // 10 pts for initials + 5 pts before next section
} else {
  // no initials, just leave a 5 pt gap
  currentYPos += 5;
}

// 6) Overflow check before next section
if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
}



                                          // ———19. STUDENT YOUNG PROFESSIONAL (SYP) MEMBERSHIPS    ———
pdf.setFont('helvetica', 'bold');
pdf.text('19. STUDENT YOUNG PROFESSIONAL (SYP) MEMBERSHIPS', 20, currentYPos);
// 2) Small gap after header - removing this lays the header on top of the text paragraph
currentYPos += 5;
// ——— SYP DISCOUNT DETAILS Section ———
// 1) Ensure font is normal for body text
pdf.setFont('helvetica', 'normal');

// Paragraph 1
const sypText1 =
  'Student/Young Professional (SYP) discounted memberships are offered exclusively to ' +
  'members between the ages of 19-29. This special discounted rate will be honored through ' +
  'the age of 29. I understand that beginning the month after my 30th birthday my monthly dues ' +
  'rate will increase by $10. Each year thereafter my monthly rate will increase by an additional ' +
  '$10 until my rate reaches the then current rate. I also understand that my rate may also change ' +
  'for any other upgrades or downgrades of the membership that I may initiate.';
const splitSyp1 = pdf.splitTextToSize(sypText1, 160);
currentYPos = drawPagedText(pdf, splitSyp1, 20, currentYPos);

// 2) Fixed 5 pt gap before next paragraph
currentYPos += 5;

// Paragraph 2
const sypText2 =
  'Proof of age must be received within 14 days; otherwise your membership will be converted to ' +
  'the equivalent of one individually priced membership and you will be responsible for the entire ' +
  'billed amount. If the documentation is not received by 04/30/2025, your rate will go to $115.00 ' +
  'per month until the proper documentation is provided. The club will not issue a dues credit for any ' +
  'portion of the additional charges once billed.';
const splitSyp2 = pdf.splitTextToSize(sypText2, 160);
currentYPos = drawPagedText(pdf, splitSyp2, 20, currentYPos);

// 3) Fixed 5 pt gap before next paragraph
currentYPos += 5;



// ——— Initials for SYP Discount Section ———
// 6) If this section needs initials, render them 5 pts below the last line
if (initialedSections?.syp && signatureData?.initials?.text) {
  // 6a) Check if initials would overflow past bottom margin
  if (currentYPos + 5 > pdf.internal.pageSize.getHeight() - 20) {
    pdf.addPage();
    currentYPos = 20;
  }

  pdf.setFont(signatureData.selectedFont?.font || 'helvetica', 'italic');
  pdf.text(`INITIAL: ${signatureData.initials.text}`, 20, currentYPos + 5);
  pdf.setFont('helvetica', 'normal');

  // 6b) Advance cursor past initials gap
  currentYPos += 15; // 10 pts for initials + 5 pts before next section
} else {
  // no initials, just leave a 5 pt gap
  currentYPos += 5;
}

      // Paragraph 3
      const sypText3 =
  `As used herein, the abbreviation "${getClubAbbreviation()}" means ${getClubName()}, its successors, ` +
  `assigns, employees, officers, directors, shareholders, and all persons, corporations, partnerships ` +
  `and other entities with which it is or may in the future become affiliated. The terms and conditions ` +
  `contained herein, along with the Rules and Regulations, constitute the full agreement between ${getClubAbbreviation()} ` +
  `and the member, and no oral promises are made a part of it.`;
const splitSyp3 = pdf.splitTextToSize(sypText3, 160);
currentYPos = drawPagedText(pdf, splitSyp3, 20, currentYPos);

     // Fixed 5 pt gap before next paragraph
currentYPos += 5;
      
// 5) Overflow check before the next header
if (currentYPos > pdf.internal.pageSize.getHeight() - 20) {
  pdf.addPage();
  currentYPos = 20;
}



//////////////////// SIGNATURE
      
      // Signature Section - Fixed header spacing
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SIGNATURE', 20, currentYPos);
      
      // Added spacing after section header
      currentYPos += 7;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const signatureText =
        `By signing below, I acknowledge that I have read and understand this agreement along ` +
        `with the terms and conditions contained in this document and agree to abide by the ` +
        `rules and regulations of ${getClubName()}.`;
      
      const splitSignatureText = pdf.splitTextToSize(signatureText, 170);
      pdf.text(splitSignatureText, 20, currentYPos);
      
      // Advance past the signature paragraph
      currentYPos += (splitSignatureText.length * 5) + 10;
      
      // Member Signature field
      if (signatureData?.signature?.text) {
        // Render the actual signature text
        pdf.setFont(signatureData.selectedFont?.font || 'helvetica', 'italic');
        pdf.setFontSize(14);
        pdf.text(signatureData.signature.text, 60, currentYPos);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
             // Fixed 5 pt gap before signature line
        currentYPos += 5;
                // Draw the signature line “Draw a horizontal line from (x=20, y=currentYPos) over to (x=100, y=currentYPos).”
        pdf.line(20, currentYPos, 100, currentYPos);
        pdf.setFontSize(10);
        pdf.text('Member Signature', 60, currentYPos + 5);
      } else {
        // Draw the signature line
        pdf.line(20, currentYPos, 100, currentYPos);
        pdf.setFontSize(10);
        pdf.text('Member Signature', 60, currentYPos + 5);
      }
      
      // Date field for member signature
      if (signatureDate) {
        pdf.text(signatureDate, 150, currentYPos);
                // Draw the signature line
        pdf.line(20, currentYPos, 100, currentYPos);
        pdf.setFontSize(10);
        pdf.text('Member Signature', 60, currentYPos + 5);
      } else {
        pdf.line(120, currentYPos, 180, currentYPos);
      }
      pdf.text('Date', 150, currentYPos + 5);
      

      
      // Add page numbers to footer
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
      }
      
      // Save the PDF file
      const fileName = `${formData.lastName || 'Member'}_${formData.firstName || ''}_membership_agreement.pdf`;
      pdf.save(fileName);
      
      setIsGenerating(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setIsGenerating(false);
      alert(`Canvas PDF Generation Error: ${error.message || 'Unknown error'}`);
    }
  };
  
  return (
    <button
      className="canvas-pdf-button"
      onClick={generatePDF}
      disabled={isGenerating || !formData || !signatureData}
    >
      {isGenerating ? 'Generating Canvas PDF...' : 'Download Canvas PDF'}
    </button>
  );
};

export default CanvasContractPDF;
