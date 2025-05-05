/**
 * CanvasContractPDF.jsx
 * 
 * This component creates a PDF version of the contract/membership agreement
 * using HTML Canvas instead of React-PDF renderer.
 */

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
      
      // Check if we need a new page for the contract terms
      if (pdf.lastAutoTable.finalY > 230) {  // If we're getting close to the bottom of the page
        pdf.addPage();
        currentY = 20;  // Reset Y position for new page
      } else {
        currentY = pdf.lastAutoTable.finalY + 20;
      }
      



      // Contract Terms Section
      pdf.addPage();
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Terms and Conditions', 105, 20, { align: 'center' });
  
      // CANCELLATION RIGHT Section
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CANCELLATION RIGHT', 20, 35);
      pdf.setFontSize(10);
      
      // NMSW Money Back Guarantee text
      pdf.setFont('helvetica', 'bold');
      const cancellationHeader = "NEW MEXICO SPORTS AND WELLNESS (NMSW) MONEY BACK GUARANTEE:";
      pdf.text(cancellationHeader, 20, 45);
      
      // Cancellation terms
      pdf.setFont('helvetica', 'normal');
      const cancellationText = `NMSW EXTENDS A FOURTEEN (14) DAY TRIAL PERIOD WITH A FULL REFUND. THIS REFUND DOES NOT APPLY TO AMOUNTS OWED BY MEMBER TO NMSW UNDER ANY OTHER MEMBERSHIP APPLICATION OR AGREEMENT. THE 14 DAYS INCLUDE THE DATE ON THIS AGREEMENT. YOU MAY RESCIND THIS AGREEMENT BY SENDING WRITTEN NOTICE TO NEW MEXICO SPORTS AND WELLNESS THAT YOU ARE EXERCISING YOUR RIGHT TO RESCIND BY FACSIMILE TRANSMITTAL, MAIL, EMAIL, HAND DELIVERY OR COMPLETING A MEMBERSHIP CANCELATION FORM AT THE CLUB. A NOTICE IS DEEMED DELIVERED ON THE DATE POSTMARKED IF MAILED, ON THE DATE DELIVERED IF BY HAND DELIVERY, FACSIMILE OR EMAIL. IF YOU PROPERLY EXERCISE YOUR RIGHT TO RESCIND WITHIN 14 DAYS (NOT LATER THAN 5PM) OF ${formData?.requestedStartDate ? calculateCancellationDate(formData.requestedStartDate) : ''}, YOU WILL BE ENTITLED TO A REFUND OF ALL PAYMENTS MADE PURSUANT TO THIS MEMBERSHIP APPLICATION.`;
      
      const splitCancellationText = pdf.splitTextToSize(cancellationText, 170);
      pdf.text(splitCancellationText, 20, 50);
      
      let currentYPos = 50 + (splitCancellationText.length * 5);
      
      // Acknowledgment text
      pdf.setFont('helvetica', 'bold');
      const acknowledgmentText = "EACH OF THE UNDERSIGNED MEMBERS ACKNOWLEDGES RECEIPT OF THE FOREGOING NOTICE AND COPIES HEREOF:";
      pdf.text(acknowledgmentText, 20, currentYPos);
      
      // Agreement understanding text
      pdf.setFont('helvetica', 'normal');
      currentYPos += 10;
      const agreementUnderstandingText = "I have read and understand this agreement along with the terms and conditions contained on this document and will abide by the rules and regulations of New Mexico Sports & Wellness. In addition, I understand that the primary member represents all members and accepts all responsibility on the account and that all memberships are non-transferable and non-assignable to another individual. By signing this document or sending this by facsimile, I do intend it to be my legally binding and valid signature on this agreement as if it were an original signature.";
      
      const splitAgreementText = pdf.splitTextToSize(agreementUnderstandingText, 170);
      pdf.text(splitAgreementText, 20, currentYPos);
      
      // Update position for next section
      currentYPos += (splitAgreementText.length * 5) + 10;
      
      // Check if we need a new page for the MEMBERSHIP AGREEMENT section
      if (currentYPos > 250) {  // If we're getting close to the bottom of the page
        pdf.addPage();
        currentYPos = 20;  // Reset Y position for new page
      }
      
      // MEMBERSHIP AGREEMENT Section
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MEMBERSHIP AGREEMENT', 20, currentYPos);
      
      // Fee Structures
      currentYPos += 10;
      pdf.setFontSize(10);
      pdf.text('1. MEMBERSHIP FEE STRUCTURES', 20, currentYPos);
      
      currentYPos += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.text('A.', 20, currentYPos);
      const feeStructureA = "The Member is required to immediately pay an Initiation Fee which is due and owing separate and apart from the monthly dues stated on this membership agreement.";
      const splitFeeStructureA = pdf.splitTextToSize(feeStructureA, 160);
      pdf.text(splitFeeStructureA, 30, currentYPos);
      
      currentYPos += (splitFeeStructureA.length * 5) + 5;
      pdf.text('B.', 20, currentYPos);
      const feeStructureB = "The Member elects to purchase a membership and to pay to New Mexico Sports and Wellness (NMSW) the required total monthly dues as indicated on this agreement under one of the following scenarios:";
      const splitFeeStructureB = pdf.splitTextToSize(feeStructureB, 160);
      pdf.text(splitFeeStructureB, 30, currentYPos);
      
      // Update position for next subsection
      currentYPos += (splitFeeStructureB.length * 5) + 10;
      
      // Month-to-Month Section
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MONTH-TO-MONTH', 20, currentYPos);
      pdf.setFont('helvetica', 'normal');
      const monthToMonthText = 'I understand that I am committing to a minimum three (3) month membership. The three (3) month period commences on the 1st of the month following the date the membership begins. After fulfilling my minimum three (3) month membership commitment, I understand that the membership may be cancelled at any time with written notice pursuant to the Resignation Policy.';
      
      const splitMonthToMonth = pdf.splitTextToSize(monthToMonthText, 170);
      pdf.text(splitMonthToMonth, 20, currentYPos + 5);
      
      // Display initials if section is initialed
      if (initialedSections?.monthToMonth && signatureData?.initials?.text) {
        pdf.setFont(signatureData.selectedFont?.font || 'helvetica', 'italic');
        pdf.text(`INITIAL: ${signatureData.initials.text}`, 20, currentYPos + 5 + splitMonthToMonth.length * 5);
        pdf.setFont('helvetica', 'normal');
      }
      
      // Update position for next subsection
      currentYPos += (splitMonthToMonth.length * 5) + 15;
      
 
      // Extended Plan Section
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('EXTENDED PLAN', 20, currentYPos);
      pdf.setFont('helvetica', 'normal');
      
      const extendedPlanText = 'I elect to pay for the number of selected months on this agreement for consecutive months of member dues plus any club charges (if applicable) made by myself or any other persons included in my membership. I understand that I am committing to a minimum three (3) month membership. The three (3) month period commences on the 1st of the month following the date the membership begins. Member acknowledges that in order to be relieved of the agreement terms, the balance of the dues owed for the remaining months of the agreement must be paid in full. Special consideration can be made if cause for cancellation is based on a medical contingency and written authorization from a doctor is received; or if a member moves 50 miles or more away from the nearest New Mexico Sports and Wellness with proof of new residency. Any Leave of Absence taken during the initial term of this agreement will extend the commitment by the number of months the member\'s account is on Leave of Absence. Rate for Student/Young Professional memberships will only be honored through the current maximum age for this type of membership regardless of whether the number of selected months on this agreement has expired or not. AT THE END OF THE AGREEMENT PERIOD CHOSEN THIS PLAN REMAINS IN EFFECT ON A MONTH-TO-MONTH BASIS and the Resignation Policy (Item 4A) applies. I authorize NMSW to collect payment under the method of payment indicated on the agreement and the balance of the remaining dues owed should I not satisfy the terms of the agreement.';
      
      const splitExtendedPlan = pdf.splitTextToSize(extendedPlanText, 170);
      pdf.text(splitExtendedPlan, 20, currentYPos + 5);
      
      // Display initials if section is initialed
      if (initialedSections?.extendedPlan && signatureData?.initials?.text) {
        pdf.setFont(signatureData.selectedFont?.font || 'helvetica', 'italic');
        pdf.text(`INITIAL: ${signatureData.initials.text}`, 20, currentYPos + 5 + splitExtendedPlan.length * 5);
        pdf.setFont('helvetica', 'normal');
      }
      
      // Update position for refund text
      currentYPos += (splitExtendedPlan.length * 5) + 15;
      
      // Refund text
      const refundText = 'Except as expressly provided in this Membership Agreement, no portion of the initial fee or monthly membership dues is refundable, regardless of whether member attends or uses, or is able to attend or use, the facilities or programs of the club.';
      
      const splitRefundText = pdf.splitTextToSize(refundText, 170);
      pdf.text(splitRefundText, 20, currentYPos);
      
      // Update position for next subsection
      currentYPos += (splitRefundText.length * 5) + 10;
      
      // Check if we need a new page for the next sections
      if (currentYPos > 230) {
        pdf.addPage();
        currentYPos = 20;  // Reset Y position for new page
      }
      
      // Paid-In-Full Section
      pdf.setFont('helvetica', 'bold');
      pdf.text('C. PAID-IN-FULL', 20, currentYPos);
      pdf.setFont('helvetica', 'normal');
      
      const paidInFullText = 'I elect to pay my total dues, as indicated on this agreement, in advance in consideration of a discount on yearly dues. At the completion of the prepaid period, my membership will automatically revert to month-to-month billing unless I prepay another year in advance or terminate with a written notice pursuant to the Resignation Policy (Item 4A.). If terminating prior to the completion of the prepaid agreement, a refund will be granted minus the discount percent indicated above. If a renewal of membership is requested by the applicant and approved at the conclusion of the term indicated, I understand that the renewal monthly dues to be charged will be those dues rates in effect at the time of renewal.';
      
      const splitPaidInFull = pdf.splitTextToSize(paidInFullText, 160);
      pdf.text(splitPaidInFull, 30, currentYPos);
      
      // Update position for next subsection
      currentYPos += (splitPaidInFull.length * 5) + 10;
      
      // EFT Section
      pdf.setFont('helvetica', 'bold');
      pdf.text('D. EFT', 20, currentYPos);
      pdf.setFont('helvetica', 'normal');
      
      const eftText = 'All dues and Member charges will be payable monthly (with the exception of annual dues prepayments) and collected by Electronic Funds Transfer (EFT) from either the Member\'s bank account or charged to an approved credit card. Please notify New Mexico Sports and Wellness (NMSW) at the time you change bank accounts or credit cards and provide the appropriate information to avoid having your old account charged for your monthly dues.';
      
      const splitEFT = pdf.splitTextToSize(eftText, 160);
      pdf.text(splitEFT, 30, currentYPos);
      
      // Update position for next subsection
      currentYPos += (splitEFT.length * 5) + 10;
      
      // Check if we need a new page for the next sections
      if (currentYPos > 230) {
        pdf.addPage();
        currentYPos = 20;  // Reset Y position for new page
      }
      
      // Delinquent Accounts Section
      pdf.setFont('helvetica', 'bold');
      pdf.text('E. DELINQUENT ACCOUNTS', 20, currentYPos);
      pdf.setFont('helvetica', 'normal');
      
      const delinquentText = 'In the event a bank account or credit card is unable to be charged at the designated date, the membership is subject to a late fee. A charge will be issued for checks returned due to insufficient funds and credit cards that are declined when a balance is due. The Primary Member is responsible for all charges incurred.';
      
      const splitDelinquent = pdf.splitTextToSize(delinquentText, 160);
      pdf.text(splitDelinquent, 30, currentYPos);
      
      // Update position for next subsection
      currentYPos += (splitDelinquent.length * 5) + 10;
      
      // Referrals Section
      pdf.setFont('helvetica', 'bold');
      pdf.text('F. REFERRALS', 20, currentYPos);
      pdf.setFont('helvetica', 'normal');
      
      const referralsText = 'If a dues referral program is in effect, it will not extend or modify the terms of the membership agreement. Any Member in default of payment due may NOT cure the default by way of credit for "referral" members to New Mexico Sports and Wellness.';
      
      const splitReferrals = pdf.splitTextToSize(referralsText, 160);
      pdf.text(splitReferrals, 30, currentYPos);
      
      // Update position for next subsection
      currentYPos += (splitReferrals.length * 5) + 10;
      
      // Email Section
      pdf.setFont('helvetica', 'bold');
      pdf.text('G. EMAIL', 20, currentYPos);
      pdf.setFont('helvetica', 'normal');
      
      const emailText = 'By providing my email address, I am consenting to receive information via email from New Mexico Sports and Wellness, The Wellbridge Company and their affiliated companies. Any further distribution of my email address is unauthorized.';
      
      const splitEmail = pdf.splitTextToSize(emailText, 160);
      pdf.text(splitEmail, 30, currentYPos);
      
      // Update position for next subsection
      currentYPos += (splitEmail.length * 5) + 10;
      
      // Check if we need a new page for the next sections
      if (currentYPos > 230) {
        pdf.addPage();
        currentYPos = 20;  // Reset Y position for new page
      }
      
      // Upgrades/Downgrades Section
      pdf.setFont('helvetica', 'bold');
      pdf.text('2. UPGRADES/DOWNGRADES', 20, currentYPos);
      pdf.setFont('helvetica', 'normal');
      
      const upgradesText = 'Requests for upgrades/downgrades of membership must be made in writing. Upgrades will be effective immediately unless otherwise requested. Requests for downgrades must be submitted by the last day of the month for the downgrade to be effective for the following month. Primary Member\'s signature is required for all changes. Proof of eligibility/residency to upgrade/add members is required.';
      
      const splitUpgrades = pdf.splitTextToSize(upgradesText, 160);
      pdf.text(splitUpgrades, 30, currentYPos);
      
      // Update position for next subsection
      currentYPos += (splitUpgrades.length * 5) + 10;
      
      // Club's Right of Cancellation Section
      pdf.setFont('helvetica', 'bold');
      pdf.text('3. CLUB\'S RIGHT OF CANCELLATION', 20, currentYPos);
      pdf.setFont('helvetica', 'normal');
      
      const cancellationRightText = 'Management of NMSW may suspend or cancel the rights, privileges or membership of any Member whose actions are detrimental to the facility or do not comply with the rules and regulations of the facility or upon any failure of a Member to make payment to NMSW of all amounts due from the Member within sixty (60) days after billed. NMSW has the option of declaring any other indebtedness of the Member to NMSW immediately due and payable, without notice or demand. The Member agrees to pay NMSW a reasonable attorney\'s fee, court costs and all other expenses incurred by NMSW in making the collection. All outstanding amounts not paid when due shall accumulate interest at the rate of 1.5% per month.';
      
      const splitCancellationRight = pdf.splitTextToSize(cancellationRightText, 160);
      pdf.text(splitCancellationRight, 30, currentYPos);
      
      // Update position for next subsection
      currentYPos += (splitCancellationRight.length * 5) + 10;
      
      // Check if we need a new page for the next sections
      if (currentYPos > 230) {
        pdf.addPage();
        currentYPos = 20;  // Reset Y position for new page
      }
      
      // Termination/Resignation Rights Section
      pdf.setFont('helvetica', 'bold');
      pdf.text('4. TERMINATION/RESIGNATION RIGHTS', 20, currentYPos);
      pdf.setFont('helvetica', 'normal');
      
      const terminationText = 'In addition to the Cancellation Right set forth on this agreement, Member has the following rights to terminate:';
      
      const splitTermination = pdf.splitTextToSize(terminationText, 160);
      pdf.text(splitTermination, 30, currentYPos);
      
      // Update position for next section
      currentYPos += (splitTermination.length * 5) + 15;
      
      ///////////////////////////////////////////////////////////////



      // Update position for signature section with some spacing
      currentYPos += (splitAgreementText.length * 5) + 20;
      
      // Signature
      if (signatureData?.signature?.text) {
        pdf.setFont(signatureData.selectedFont?.font || 'helvetica', 'italic');
        pdf.setFontSize(14);
        pdf.text(signatureData.signature.text, 60, currentYPos);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text('Signature', 60, currentYPos + 5);
      } else {
        pdf.setFontSize(10);
        pdf.text('Signature', 60, currentYPos + 5);
      }
      
      // Date
      pdf.text(signatureDate || '', 150, currentYPos);
      pdf.text('Date', 150, currentYPos + 5);
      
      // Add page numbers
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
      }
      
      // Save the PDF
      const fileName = `${formData.lastName || 'Member'}_${formData.firstName || ''}_membership_agreement_canvas.pdf`;
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
