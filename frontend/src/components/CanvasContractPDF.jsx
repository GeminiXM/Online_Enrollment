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
    return selectedClub?.id?.toString().includes('NM') || 
           selectedClub?.state === 'NM' ||
           formData?.club?.toString().includes('NM');
  };
  
  // Function to get club name
  const getClubName = () => {
    return isNewMexicoClub() ? 'New Mexico Sports and Wellness' : 'Colorado Athletic Club';
  };
  
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
      if (isNewMexicoClub()) {
        pdf.text('New Mexico Sports and Wellness', 105, 20, { align: 'center' });
        pdf.text('Membership Agreement', 105, 30, { align: 'center' });
      } else {
        pdf.text('Membership Agreement', 105, 20, { align: 'center' });
      }
      
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
      const authText = `I hereby request and authorize ${isNewMexicoClub() ? 'New Mexico Sports and Wellness' : 'Colorado Athletic Club'} to charge my account via Electronic Funds Transfer on a monthly basis beginning ${formatDate(formData.requestedStartDate) || ''}.`;
      const additionalAuthText = `The debit will consist of monthly dues plus any other club charges (if applicable) made by myself or other persons included in my membership in accordance with the resignation policy detailed in the Terms and Conditions within this Agreement. The authorization is extended by me to ${isNewMexicoClub() ? 'New Mexico Sports and Wellness' : 'Colorado Athletic Club'} and/or its authorized agents or firms engaged in the business of processing check and charge card debits.`;
      
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
      
      // Contract Terms Section - on a new page
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Terms and Conditions', 105, 20, { align: 'center' });
  
      // CANCELLATION RIGHT Section - Fixed header spacing
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CANCELLATION RIGHT', 20, 35);
      
      // Added spacing after section header
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      
      const cancellationHeader = "NEW MEXICO SPORTS AND WELLNESS (NMSW) MONEY BACK GUARANTEE:";
      pdf.text(cancellationHeader, 20, 45);
      
      // Cancellation terms
      pdf.setFont('helvetica', 'normal');
      const cancellationText = `NMSW EXTENDS A FOURTEEN (14) DAY TRIAL PERIOD WITH A FULL REFUND. THIS REFUND DOES NOT APPLY TO AMOUNTS OWED BY MEMBER TO NMSW UNDER ANY OTHER MEMBERSHIP APPLICATION OR AGREEMENT. THE 14 DAYS INCLUDE THE DATE ON THIS AGREEMENT. YOU MAY RESCIND THIS AGREEMENT BY SENDING WRITTEN NOTICE TO NEW MEXICO SPORTS AND WELLNESS THAT YOU ARE EXERCISING YOUR RIGHT TO RESCIND BY FACSIMILE TRANSMITTAL, MAIL, EMAIL, HAND DELIVERY OR COMPLETING A MEMBERSHIP CANCELATION FORM AT THE CLUB. A NOTICE IS DEEMED DELIVERED ON THE DATE POSTMARKED IF MAILED, ON THE DATE DELIVERED IF BY HAND DELIVERY, FACSIMILE OR EMAIL. IF YOU PROPERLY EXERCISE YOUR RIGHT TO RESCIND WITHIN 14 DAYS (NOT LATER THAN 5PM) OF ${formData?.requestedStartDate ? calculateCancellationDate(formData.requestedStartDate) : ''}, YOU WILL BE ENTITLED TO A REFUND OF ALL PAYMENTS MADE PURSUANT TO THIS MEMBERSHIP APPLICATION.`;
      
      const splitCancellationText = pdf.splitTextToSize(cancellationText, 170);
      pdf.text(splitCancellationText, 20, 50);
      
      // Adjust vertical position after cancellation text
      let currentYPos = 50 + (splitCancellationText.length * 5) + 3; // Reduced space
      
      // Acknowledgment text
      pdf.setFont('helvetica', 'bold');
      const acknowledgmentText = "EACH OF THE UNDERSIGNED MEMBERS ACKNOWLEDGES RECEIPT OF THE FOREGOING NOTICE AND COPIES HEREOF:";
      pdf.text(acknowledgmentText, 20, currentYPos);
      
      // Agreement understanding text
      pdf.setFont('helvetica', 'normal');
      currentYPos += 7; // Reduced space
      const agreementUnderstandingText = "I have read and understand this agreement along with the terms and conditions contained on this document and will abide by the rules and regulations of New Mexico Sports & Wellness. In addition, I understand that the primary member represents all members and accepts all responsibility on the account and that all memberships are non-transferable and non-assignable to another individual. By signing this document or sending this by facsimile, I do intend it to be my legally binding and valid signature on this agreement as if it were an original signature.";
      
      const splitAgreementText = pdf.splitTextToSize(agreementUnderstandingText, 170);
      pdf.text(splitAgreementText, 20, currentYPos);
      
      // Update position for next section
      currentYPos += (splitAgreementText.length * 5) + 3;
      
      // MEMBERSHIP AGREEMENT Section - Fixed header spacing
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MEMBERSHIP AGREEMENT', 20, currentYPos);
      
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
      const feeStructureAText = "The Member is required to immediately pay an Initiation Fee which is due and owing separate and apart from the monthly dues stated on this membership agreement.";
      const splitFeeStructureAText = pdf.splitTextToSize(feeStructureAText, 160);
      pdf.text(splitFeeStructureAText, 30, currentYPos);
      
      currentYPos += (splitFeeStructureAText.length * 5) + 3; // Reduced space
      pdf.text('B.', 20, currentYPos);
      const feeStructureBText = "The Member elects to purchase a membership and to pay to New Mexico Sports and Wellness (NMSW) the required total monthly dues as indicated on this agreement under one of the following scenarios:";
      const splitFeeStructureBText = pdf.splitTextToSize(feeStructureBText, 160);
      pdf.text(splitFeeStructureBText, 30, currentYPos);
      
      // Update position for next subsection - reduced spacing
      currentYPos += (splitFeeStructureBText.length * 5) + 3;
      
      
      // Month-to-Month Section - Fixed header spacing
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MONTH-TO-MONTH', 20, currentYPos);
      
      // Added spacing after section header
      currentYPos += 3;
      
      pdf.setFont('helvetica', 'normal');
      const monthToMonthText = 'I understand that I am committing to a minimum three (3) month membership. The three (3) month period commences on the 1st of the month following the date the membership begins. After fulfilling my minimum three (3) month membership commitment, I understand that the membership may be cancelled at any time with written notice pursuant to the Resignation Policy.';
      
      const splitMonthToMonth = pdf.splitTextToSize(monthToMonthText, 170);
      pdf.text(splitMonthToMonth, 20, currentYPos);
      
      const paragraphHeight = splitMonthToMonth.length * 5;

      // Display initials if section is initialed - with less spacing
      if (initialedSections?.monthToMonth && signatureData?.initials?.text) {
        pdf.setFont(signatureData.selectedFont?.font || 'helvetica', 'italic');
        const initialsY = currentYPos + paragraphHeight;
        pdf.text(`INITIAL: ${signatureData.initials.text}`, 20, initialsY) ;
        pdf.setFont('helvetica', 'normal');
      }
      
      // Update position for next subsection - reduced space
      const totalAdvance = paragraphHeight + 5 + (initialedSections?.monthToMonth ? 5 : 0);

      currentYPos += totalAdvance + 5;
      
      // Check if we need a new page for the Extended Plan section
      if (currentYPos > 230) {
        pdf.addPage();
        currentYPos = 20;
      }
      
      // Extended Plan Section
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('EXTENDED PLAN', 20, currentYPos);
      pdf.setFont('helvetica', 'normal');
      
      const extendedPlanText = 'I elect to pay for the number of selected months on this agreement for consecutive months of member dues plus any club charges (if applicable) made by myself or any other persons included in my membership. I understand that I am committing to a minimum three (3) month membership. The three (3) month period commences on the 1st of the month following the date the membership begins. Member acknowledges that in order to be relieved of the agreement terms, the balance of the dues owed for the remaining months of the agreement must be paid in full. Special consideration can be made if cause for cancellation is based on a medical contingency and written authorization from a doctor is received; or if a member moves 50 miles or more away from the nearest New Mexico Sports and Wellness with proof of new residency. Any Leave of Absence taken during the initial term of this agreement will extend the commitment by the number of months the member\'s account is on Leave of Absence. Rate for Student/Young Professional memberships will only be honored through the current maximum age for this type of membership regardless of whether the number of selected months on this agreement has expired or not. AT THE END OF THE AGREEMENT PERIOD CHOSEN THIS PLAN REMAINS IN EFFECT ON A MONTH-TO-MONTH BASIS and the Resignation Policy (Item 4A) applies. I authorize NMSW to collect payment under the method of payment indicated on the agreement and the balance of the remaining dues owed should I not satisfy the terms of the agreement.';
      
      const splitExtendedPlan = pdf.splitTextToSize(extendedPlanText, 170);
      pdf.text(splitExtendedPlan, 20, currentYPos + 3);
      
      // Display initials if section is initialed - with less space
      if (initialedSections?.extendedPlan && signatureData?.initials?.text) {
        pdf.setFont(signatureData.selectedFont?.font || 'helvetica', 'italic');
        pdf.text(`INITIAL: ${signatureData.initials.text}`, 20, currentYPos + 3 + (splitExtendedPlan.length * 5) + 2);
        pdf.setFont('helvetica', 'normal');
      }
      
      // Update position for refund text - adjusted based on initials
      currentYPos += (splitExtendedPlan.length * 5) + (initialedSections?.extendedPlan ? 10 : 15);
      
      // Check if we need a new page for the next sections
      if (currentYPos > 230) {
        pdf.addPage();
        currentYPos = 20;  // Reset Y position for new page
      }
      
      // Refund text - with proper spacing
      const refundText = 'Except as expressly provided in this Membership Agreement, no portion of the initial fee or monthly membership dues is refundable, regardless of whether member attends or uses, or is able to attend or use, the facilities or programs of the club.';
      
      const splitRefundText = pdf.splitTextToSize(refundText, 170);
      pdf.text(splitRefundText, 20, currentYPos);
      
      // Update position for next subsection - reduced spacing
      currentYPos += (splitRefundText.length * 5) + 3;
      
      // Paid-In-Full Section - Fixed header spacing
      pdf.setFont('helvetica', 'bold');
      pdf.text('C. PAID-IN-FULL', 20, currentYPos);
      
      // Added spacing after section header
      currentYPos += 3;
      
      pdf.setFont('helvetica', 'normal');
      const paidInFullText = 'I elect to pay my total dues, as indicated on this agreement, in advance in consideration of a discount on yearly dues. At the completion of the prepaid period, my membership will automatically revert to month-to-month billing unless I prepay another year in advance or terminate with a written notice pursuant to the Resignation Policy (Item 4A.). If terminating prior to the completion of the prepaid agreement, a refund will be granted minus the discount percent indicated above. If a renewal of membership is requested by the applicant and approved at the conclusion of the term indicated, I understand that the renewal monthly dues to be charged will be those dues rates in effect at the time of renewal.';
      
      const splitPaidInFull = pdf.splitTextToSize(paidInFullText, 160);
      pdf.text(splitPaidInFull, 30, currentYPos);
      
      // Update position for next subsection
      currentYPos += (splitPaidInFull.length * 5) + 15;
      
      // Check if we need a new page for the next sections
      if (currentYPos > 230) {
        pdf.addPage();
        currentYPos = 20;  // Reset Y position for new page
      }
      
      // EFT Section - Fixed header spacing
      pdf.setFont('helvetica', 'bold');
      pdf.text('D. EFT', 20, currentYPos);
      
      // Added spacing after section header
      currentYPos += 3;
      
      pdf.setFont('helvetica', 'normal');
      const eftText = 'All dues and Member charges will be payable monthly (with the exception of annual dues prepayments) and collected by Electronic Funds Transfer (EFT) from either the Member\'s bank account or charged to an approved credit card. Please notify New Mexico Sports and Wellness (NMSW) at the time you change bank accounts or credit cards and provide the appropriate information to avoid having your old account charged for your monthly dues.';
      
      const splitEFT = pdf.splitTextToSize(eftText, 160);
      pdf.text(splitEFT, 30, currentYPos);
      
      // Update position for next subsection
      currentYPos += (splitEFT.length * 5) + 3;
      
      // Delinquent Accounts Section - Fixed header spacing
      pdf.setFont('helvetica', 'bold');
      pdf.text('E. DELINQUENT ACCOUNTS', 20, currentYPos);
      
      // Added spacing after section header
      currentYPos += 3;
      
      pdf.setFont('helvetica', 'normal');
      const delinquentText = 'In the event a bank account or credit card is unable to be charged at the designated date, the membership is subject to a late fee. A charge will be issued for checks returned due to insufficient funds and credit cards that are declined when a balance is due. The Primary Member is responsible for all charges incurred.';
      
      const splitDelinquent = pdf.splitTextToSize(delinquentText, 160);
      pdf.text(splitDelinquent, 30, currentYPos);
      
      // Update position for next subsection
      currentYPos += (splitDelinquent.length * 5) + 3;
      
      // Check if we need a new page for the next sections
      if (currentYPos > 230) {
        pdf.addPage();
        currentYPos = 20;  // Reset Y position for new page
      }
      
      // Referrals Section - Fixed header spacing
      pdf.setFont('helvetica', 'bold');
      pdf.text('F. REFERRALS', 20, currentYPos);
      
      // Added spacing after section header
      currentYPos += 3;
      
      pdf.setFont('helvetica', 'normal');
      const referralsText = 'If a dues referral program is in effect, it will not extend or modify the terms of the membership agreement. Any Member in default of payment due may NOT cure the default by way of credit for "referral" members to New Mexico Sports and Wellness.';
      
      const splitReferrals = pdf.splitTextToSize(referralsText, 160);
      pdf.text(splitReferrals, 30, currentYPos);
      
      // Referrals Section - Fixed spacing after content
      // Update position for next subsection - reduced spacing
      currentYPos += (splitReferrals.length * 5) + 3;
      
      // Check if we need a new page for the next sections
      if (currentYPos > 230) {
        pdf.addPage();
        currentYPos = 20;  // Reset Y position for new page
      }
      
      // Email Section - Fixed header spacing
      pdf.setFont('helvetica', 'bold');
      pdf.text('G. EMAIL', 20, currentYPos);
      
      // Added spacing after section header
      currentYPos += 3;
      
      pdf.setFont('helvetica', 'normal');
      const emailText = 'By providing my email address, I am consenting to receive information via email from New Mexico Sports and Wellness, The Wellbridge Company and their affiliated companies. Any further distribution of my email address is unauthorized.';
      
      const splitEmail = pdf.splitTextToSize(emailText, 160);
      pdf.text(splitEmail, 30, currentYPos);
      
      // Email Section - Fixed spacing after content
      // Update position for next subsection - reduced spacing
      currentYPos += (splitEmail.length * 5) + 3;
      
      // Check if we need a new page for the next sections
      if (currentYPos > 230) {
        pdf.addPage();
        currentYPos = 20;  // Reset Y position for new page
      }
      
      // Upgrades/Downgrades Section - Fixed header spacing
      pdf.setFont('helvetica', 'bold');
      pdf.text('2. UPGRADES/DOWNGRADES', 20, currentYPos);
      
      // Added spacing after section header
      currentYPos += 3;
      
      pdf.setFont('helvetica', 'normal');
      const upgradesText = 'Requests for upgrades/downgrades of membership must be made in writing. Upgrades will be effective immediately unless otherwise requested. Requests for downgrades must be submitted by the last day of the month for the downgrade to be effective for the following month. Primary Member\'s signature is required for all changes. Proof of eligibility/residency to upgrade/add members is required.';
      
      const splitUpgrades = pdf.splitTextToSize(upgradesText, 160);
      pdf.text(splitUpgrades, 30, currentYPos);
      
      // Update position for next subsection - reduced spacing
      currentYPos += (splitUpgrades.length * 5) + 3;
      
      // Check if we need a new page for the next sections
      if (currentYPos > 230) {
        pdf.addPage();
        currentYPos = 20;  // Reset Y position for new page
      }
      
      // Club's Right of Cancellation Section - Fixed header spacing
      pdf.setFont('helvetica', 'bold');
      pdf.text('3. CLUB\'S RIGHT OF CANCELLATION', 20, currentYPos);
      
      // Added spacing after section header
      currentYPos += 3;
      
      pdf.setFont('helvetica', 'normal');
      const cancellationRightText = 'Management of NMSW may suspend or cancel the rights, privileges or membership of any Member whose actions are detrimental to the facility or do not comply with the rules and regulations of the facility or upon any failure of a Member to make payment to NMSW of all amounts due from the Member within sixty (60) days after billed. NMSW has the option of declaring any other indebtedness of the Member to NMSW immediately due and payable, without notice or demand. The Member agrees to pay NMSW a reasonable attorney\'s fee, court costs and all other expenses incurred by NMSW in making the collection. All outstanding amounts not paid when due shall accumulate interest at the rate of 1.5% per month.';
      
      const splitCancellationRight = pdf.splitTextToSize(cancellationRightText, 160);
      pdf.text(splitCancellationRight, 30, currentYPos);
      
      // Update position for next subsection - reduced spacing
      currentYPos += (splitCancellationRight.length * 5) + 3;
      
      // Check if we need a new page for the next sections
      if (currentYPos > 230) {
        pdf.addPage();
        currentYPos = 20;  // Reset Y position for new page
      }
      
      // Termination/Resignation Rights Section - Fixed header spacing
      pdf.setFont('helvetica', 'bold');
      pdf.text('4. TERMINATION/RESIGNATION RIGHTS', 20, currentYPos);
      
      // Added spacing after section header
      currentYPos += 3;
      
      pdf.setFont('helvetica', 'normal');
      const terminationText = 'In addition to the Cancellation Right set forth on this agreement, Member has the following rights to terminate:';
      
      const splitTermination = pdf.splitTextToSize(terminationText, 160);
      pdf.text(splitTermination, 30, currentYPos);
      
      // Update position for resignation policy - reduced spacing
      currentYPos += (splitTermination.length * 5) + 3;

      // Resignation Policy Section - Fixed header spacing
      pdf.setFont('helvetica', 'bold');
      pdf.text('A. RESIGNATION POLICY', 30, currentYPos);
      
      // Added spacing after section header
      currentYPos += 3;
      
      pdf.setFont('helvetica', 'normal');
      const resignationText = 'All resignations must be made in writing (letter, fax, email, or in person at the club) and received by The Club by the last day of the current calendar month to be effective for the following calendar month. For example, if a written notice is received on or before January 30, the membership will terminate on February 28. If a written notice is received on January 31, the membership will terminate on March 31. Resignation requests will not be accepted over the telephone.';
      
      const splitResignation = pdf.splitTextToSize(resignationText, 150);
      pdf.text(splitResignation, 40, currentYPos);
      
      // Update position for medical section - reduced spacing
      currentYPos += (splitResignation.length * 5) + 3;
      
      // Check if we need a new page for the next sections
      if (currentYPos > 230) {
        pdf.addPage();
        currentYPos = 20;  // Reset Y position for new page
      }
      
      // Medical Termination Section - Fixed header spacing
      pdf.setFont('helvetica', 'bold');
      pdf.text('B. MEDICAL TERMINATION', 30, currentYPos);
      
      // Added spacing after section header
      currentYPos += 3;
      
      pdf.setFont('helvetica', 'normal');
      const medicalText = 'Member may cancel this agreement for medical reasons. Verification from a medical doctor must be provided to New Mexico Sports and Wellness. This verification must state that the member cannot utilize membership or facilities due to a medical condition. A medical termination will become effective with the normal billing cycle beginning the month following receipt of written notice and verification. Monthly dues will be payable through the normal billing cycle of the month in which notice is received.';
      
      const splitMedical = pdf.splitTextToSize(medicalText, 150);
      pdf.text(splitMedical, 40, currentYPos);
      
      // Update position for relocation section - reduced spacing
      currentYPos += (splitMedical.length * 5) + 3;
      
      // Check if we need a new page for the next sections
      if (currentYPos > 220) {
        pdf.addPage();
        currentYPos = 20;  // Reset Y position for new page
      }
      
      // Relocation Section - Fixed header spacing
      pdf.setFont('helvetica', 'bold');
      pdf.text('C. RELOCATION', 30, currentYPos);
      
      // Added spacing after section header
      currentYPos += 3;
      
      pdf.setFont('helvetica', 'normal');
      const relocationText = 'Member may cancel this agreement upon relocation. The cancellation will be effective with the normal billing cycle beginning the month following receipt of written notice. Monthly dues will be payable through the normal billing cycle of the month in which notice is received. In order to qualify for relocation, the member must provide proof of move outside a 50-mile radius of the nearest New Mexico Sports and Wellness. No other forms of relocation other than that stated in this section will be considered.';
      
      const splitRelocation = pdf.splitTextToSize(relocationText, 150);
      pdf.text(splitRelocation, 40, currentYPos);
      
      // Update position for temporary absence section - reduced spacing
      currentYPos += (splitRelocation.length * 5) + 3;
      
      // Check if we need a new page for the next sections
      if (currentYPos > 220) {
        pdf.addPage();
        currentYPos = 20;  // Reset Y position for new page
      }
      
      // Temporary Absence Section - Fixed header spacing
      pdf.setFont('helvetica', 'bold');
      pdf.text('5. TEMPORARY ABSENCE (LEAVE OF ABSENCE)', 20, currentYPos);
      
      // Added spacing after section header
      currentYPos += 3;
      
      pdf.setFont('helvetica', 'normal');
      const temporaryAbsenceText = 'Any member in good standing may suspend all membership privileges for a period of not less than one (1) month and not more than six (6) months once per calendar year due to medical or temporary relocation reasons. Written notice must be received by New Mexico Sports and Wellness no less than seven (7) days from the time the leave is to commence. Member must choose a specific date for the re-activation of membership. All fees or dues that would be applicable during the leave period are suspended, but will resume upon the re-activation of the membership. At the time of re-activation the monthly dues rate will be adjusted to the current rate, if different from the rate paid prior to leave. Should Member not return to the club after the six (6) month period, the Member must pay a new membership initiation fee. New Mexico Sports and Wellness may at any time modify or discontinue the Leave of Absence privilege entirely.';
      
      const splitTemporaryAbsence = pdf.splitTextToSize(temporaryAbsenceText, 160);
      pdf.text(splitTemporaryAbsence, 30, currentYPos);
      
      // Update position for Death section - reduced spacing
      currentYPos += (splitTemporaryAbsence.length * 5) + 3;
      
      // Check if we need a new page for the next sections
      if (currentYPos > 220) {
        pdf.addPage();
        currentYPos = 20;  // Reset Y position for new page
      }
      
      // Death Section - Fixed header spacing
      pdf.setFont('helvetica', 'bold');
      pdf.text('6. DEATH', 20, currentYPos);
      
      // Added spacing after section header
      currentYPos += 3;
      
      pdf.setFont('helvetica', 'normal');
      const deathText = 'Upon the death of the Primary Member, the Primary Member\'s surviving spouse or domestic partner shall automatically become the Primary Member. If there is no surviving spouse or domestic partner or if the surviving spouse or domestic partner does not want to continue the membership, the membership may be cancelled upon the personal representative of the estate providing written notification to New Mexico Sports and Wellness of the death.';
      
      const splitDeath = pdf.splitTextToSize(deathText, 160);
      pdf.text(splitDeath, 30, currentYPos);
      
      // Update position for indemnification section - reduced spacing
      currentYPos += (splitDeath.length * 5) + 3;
      
      // Check if we need a new page for the next sections
      if (currentYPos > 220) {
        pdf.addPage();
        currentYPos = 20;  // Reset Y position for new page
      }
      
      // Indemnification Section - Fixed header spacing
      pdf.setFont('helvetica', 'bold');
      pdf.text('7. INDEMNIFICATION AND RISK', 20, currentYPos);
      
      // Added spacing after section header
      currentYPos += 3;
      
      pdf.setFont('helvetica', 'normal');
      const indemnificationText = 'It is expressly agreed that all use of New Mexico Sports and Wellness shall be undertaken by the Member at his or her sole risk and New Mexico Sports and Wellness shall not be liable for any injuries or any damage to any member, or the property of any member, or be subject to any claim, demand, injury or damages. The Member hereby holds New Mexico Sports and Wellness, its officers, owners, employees, agents and contractors (including but not limited to the owner, proprietors, partners or shareholders of New Mexico Sports and Wellness), harmless from all claims which may be brought by the undersigned member and/or his or her guests and invitees against any of the foregoing for any such injuries or claims aforesaid. The undersigned acknowledges that he/she has read this paragraph and fully understands it.';
      
      const splitIndemnification = pdf.splitTextToSize(indemnificationText, 160);
      pdf.text(splitIndemnification, 30, currentYPos);
      
      // Update position for signature section
      currentYPos += (splitIndemnification.length * 5) + 20;
      
      // Check if we need a new page for the signature section
      if (currentYPos > 220) {
        pdf.addPage();
        currentYPos = 20;  // Reset Y position for new page
      }
      
      // Signature Section - Fixed header spacing
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SIGNATURE', 20, currentYPos);
      
      // Added spacing after section header
      currentYPos += 7;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const signatureText = 'By signing below, I acknowledge that I have read and understand this agreement along with the terms and conditions contained in this document and agree to abide by the rules and regulations of New Mexico Sports and Wellness.';
      
      const splitSignatureText = pdf.splitTextToSize(signatureText, 170);
      pdf.text(splitSignatureText, 20, currentYPos);
      
      // Update position for signature lines with some spacing - reduced spacing
      currentYPos += (splitSignatureText.length * 5) + 10;
      
      // Signature line
      if (signatureData?.signature?.text) {
        pdf.setFont(signatureData.selectedFont?.font || 'helvetica', 'italic');
        pdf.setFontSize(14);
        pdf.text(signatureData.signature.text, 60, currentYPos);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text('Member Signature', 60, currentYPos + 5);
      } else {
        // Just draw a line for signature
        pdf.line(20, currentYPos, 100, currentYPos);
        pdf.setFontSize(10);
        pdf.text('Member Signature', 60, currentYPos + 5);
      }
      
      // Date
      if (signatureDate) {
        pdf.text(signatureDate, 150, currentYPos);
      } else {
        pdf.line(120, currentYPos, 180, currentYPos);
      }
      pdf.text('Date', 150, currentYPos + 5);
      
      // Club Representative signature
      currentYPos += 15;
      pdf.line(20, currentYPos, 100, currentYPos);
      pdf.text('Club Representative', 60, currentYPos + 5);
      
      // Date for club signature
      pdf.line(120, currentYPos, 180, currentYPos);
      pdf.text('Date', 150, currentYPos + 5);
      
      // Add page numbers
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
      }
      
      // Save the PDF
      const fileName = `${formData.lastName || 'Member'}_${formData.firstName || ''}_membership_agreement.pdf`;
      pdf.save(fileName);
      
      setIsGenerating(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
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