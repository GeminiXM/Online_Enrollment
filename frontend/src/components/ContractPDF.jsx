/**
 * ContractPDF.jsx
 * 
 * This component creates a PDF version of the contract/membership agreement
 * for saving and printing purposes. It takes membership information and signatures
 * and formats them into a properly structured PDF document.
 */

import React, { useState } from 'react';
import { Document, Page, Text, View, StyleSheet, Font, PDFDownloadLink, PDFViewer, pdf } from '@react-pdf/renderer';
import { useClub } from '../context/ClubContext';

// Register fonts for PDF generation
Font.register({
  family: 'Open Sans',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf', fontWeight: 'normal' },
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf', fontWeight: 'semibold' },
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-700.ttf', fontWeight: 'bold' },
  ]
});

// Register signature fonts
Font.register({ family: 'Alex Brush', src: 'https://fonts.gstatic.com/s/alexbrush/v20/SZc83FzrJKuqFbwMKk6EtUL57A.ttf' });
Font.register({ family: 'Allura', src: 'https://fonts.gstatic.com/s/allura/v19/9oRPNYsQpS4zjuAPjAIXPtrrGA.ttf' });
Font.register({ family: 'Dancing Script', src: 'https://fonts.gstatic.com/s/dancingscript/v24/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7BMSoHTLpV.ttf' });
Font.register({ family: 'Great Vibes', src: 'https://fonts.gstatic.com/s/greatvibes/v15/RWmMoKWR9v4ksMfaWd_JN-XCg6UKDXlq.ttf' });
Font.register({ family: 'Parisienne', src: 'https://fonts.gstatic.com/s/parisienne/v13/E21i_d3kivvAkxhLEVZpcy96DuKuavM.ttf' });
Font.register({ family: 'Sacramento', src: 'https://fonts.gstatic.com/s/sacramento/v13/buEzpo6gcdjy0EiZMBUG0CMfcGw.ttf' });

// Styles for PDF document
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Open Sans',
    fontSize: 10
  },
  headerSection: {
    marginBottom: 20,
    textAlign: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 'semibold',
    marginBottom: 15,
    marginTop: 25
  },
  section: {
    marginBottom: 10
  },
  infoBox: {
    border: '1pt solid #cccccc',
    padding: 10,
    marginBottom: 10
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5
  },
  label: {
    fontWeight: 'semibold',
    width: '35%'
  },
  value: {
    width: '65%'
  },
  columnLabel: {
    fontWeight: 'semibold',
    marginBottom: 3
  },
  column: {
    flex: 1,
    paddingHorizontal: 5
  },
  membershipRow: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 10,
    border: '1pt solid #dddddd',
    padding: 5
  },
  contractText: {
    marginVertical: 10,
    fontSize: 9,
    lineHeight: 1.5
  },
  signatureSection: {
    marginTop: 20,
    borderTop: '1pt solid #cccccc',
    paddingTop: 10
  },
  signatureRow: {
    flexDirection: 'row',
    marginTop: 15
  },
  signatureBox: {
    width: '50%',
    borderBottom: '1pt solid #000000',
    marginRight: 10,
    minHeight: 30,
    position: 'relative',
    paddingTop: 2,
    fontSize: 14
    // Font family is set dynamically based on the user's selection
  },
  dateBox: {
    width: '20%',
    borderBottom: '1pt solid #000000',
    height: 20,
    position: 'relative',
    paddingTop: 2
  },
  signatureLabel: {
    position: 'absolute',
    top: 22,
    left: 0,
    fontSize: 8
  },
  dateLabel: {
    position: 'absolute',
    top: 22,
    left: 0,
    fontSize: 8
  },
  initialBox: {
    width: '15%',
    marginLeft: 5,
    minHeight: 20,
    position: 'relative',
    fontFamily: 'Open Sans',
    fontSize: 12
  },
  initialLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 10
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8
  },
  financialDetails: {
    marginBottom: 15
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: '1pt solid #eeeeee',
    paddingVertical: 3
  },
  financialTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    fontWeight: 'bold',
    borderTop: '1pt solid #000000',
    marginTop: 3
  },
  familyMember: {
    marginVertical: 3
  }
});

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

// PDF Document Component
const ContractPDF = ({ formData, signatureData, signatureDate, initialedSections, selectedClub }) => {
  // Check if club is in New Mexico
  const isNewMexicoClub = selectedClub?.id?.toString().includes('NM') || 
                          selectedClub?.state === 'NM' ||
                          formData?.club?.toString().includes('NM');
  
  // Club name based on state
  const clubName = isNewMexicoClub ? 'New Mexico Sports and Wellness' : 'Colorado Athletic Club';
  
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>{clubName}</Text>
          <Text style={styles.title}>Membership Agreement</Text>
        </View>
        
        {/* Membership Information Section */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Membership Information</Text>
          
          {/* Primary Member Section */}
          <View style={styles.infoBox}>
            <Text style={styles.columnLabel}>PRIMARY MEMBER</Text>
            <View style={styles.row}>
              <View style={styles.column}>
                <Text style={styles.columnLabel}>Last Name</Text>
                <Text>{formData.lastName}</Text>
              </View>
              <View style={styles.column}>
                <Text style={styles.columnLabel}>First Name</Text>
                <Text>{formData.firstName}</Text>
              </View>
              <View style={styles.column}>
                <Text style={styles.columnLabel}>DOB</Text>
                <Text>{formData.dob ? formatDate(formData.dob) : 
                      formData.dateOfBirth ? formatDate(formData.dateOfBirth) : ''}</Text>
              </View>
              <View style={styles.column}>
                <Text style={styles.columnLabel}>Gender</Text>
                <Text>{formData.gender}</Text>
              </View>
            </View>
          </View>
          
          {/* Contact Information */}
          <View style={styles.infoBox}>
            <View style={styles.row}>
              <View style={styles.column}>
                <Text style={styles.columnLabel}>E-mail</Text>
                <Text>{formData.email}</Text>
              </View>
            </View>
            
            <View style={styles.row}>
              <View style={{...styles.column, width: '40%'}}>
                <Text style={styles.columnLabel}>Home Address</Text>
                <Text>{formData.address}</Text>
              </View>
              <View style={{...styles.column, width: '25%'}}>
                <Text style={styles.columnLabel}>City</Text>
                <Text>{formData.city}</Text>
              </View>
              <View style={{...styles.column, width: '15%'}}>
                <Text style={styles.columnLabel}>State</Text>
                <Text>{formData.state}</Text>
              </View>
              <View style={{...styles.column, width: '20%'}}>
                <Text style={styles.columnLabel}>ZIP Code</Text>
                <Text>{formData.zipCode}</Text>
              </View>
            </View>
            
            <View style={styles.row}>
              <View style={styles.column}>
                <Text style={styles.columnLabel}>Cell Phone</Text>
                <Text>{formData.mobilePhone || formData.cellPhone || ''}</Text>
              </View>
              <View style={styles.column}>
                <Text style={styles.columnLabel}>Home Phone</Text>
                <Text>{formData.homePhone || ''}</Text>
              </View>
              <View style={styles.column}>
                <Text style={styles.columnLabel}>Work Phone</Text>
                <Text>{formData.workPhone || ''}</Text>
              </View>
            </View>
          </View>
          
          {/* Membership Details */}
          <View style={styles.membershipRow}>
            <View style={styles.column}>
              <Text style={styles.columnLabel}>Membership Type</Text>
              <Text>{formData.displayMembershipType || 'Individual'}</Text>
            </View>
            
            <View style={styles.column}>
              <Text style={styles.columnLabel}>Add-on Options</Text>
              <Text>{formData.addOns && formData.addOns.length > 0 ? formData.addOns.join(', ') : 'None'}</Text>
            </View>
            
            <View style={styles.column}>
              <Text style={styles.columnLabel}>Specialty Membership</Text>
              <Text>{formData.displaySpecialtyMembership || 'None'}</Text>
            </View>
            
            <View style={styles.column}>
              <Text style={styles.columnLabel}>Agreement Type</Text>
              <Text>{formData.displayAgreementType || 'Month-to-month'}</Text>
            </View>
          </View>
          
          {/* Family Members Section (if applicable) */}
          {formData.familyMembers && formData.familyMembers.length > 0 && (
            <View style={styles.infoBox}>
              <Text style={styles.columnLabel}>Family Members ({formData.familyMembers.length})</Text>
              {formData.familyMembers.map((member, index) => (
                <View key={`family-${index}`} style={styles.familyMember}>
                  <Text>{member.name} - {member.type}</Text>
                </View>
              ))}
            </View>
          )}
          
          {/* Child Programs Section (if applicable) */}
          {formData.childPrograms && (
            <View style={styles.infoBox}>
              <Text style={styles.columnLabel}>Child Programs</Text>
              <Text>{formData.childPrograms}</Text>
              {formData.childProgramsMonthly && (
                <Text>Monthly: ${formData.childProgramsMonthly}</Text>
              )}
              {formData.childProgramsDueNow && (
                <Text>Due now: ${formData.childProgramsDueNow}</Text>
              )}
            </View>
          )}
          
          {/* Additional Services Detail Section (if applicable) */}
          {formData.additionalServicesDetails && formData.additionalServicesDetails.length > 0 && (
            <View style={styles.infoBox}>
              <Text style={styles.columnLabel}>Additional Services</Text>
              {formData.additionalServicesDetails.map((service, index) => (
                <View key={`service-${index}`} style={styles.familyMember}>
                  <Text>{service.name}</Text>
                  {service.dueNow && <Text>Due now: ${service.dueNow}</Text>}
                  {service.monthly && <Text>Monthly: ${service.monthly}</Text>}
                </View>
              ))}
            </View>
          )}
          
          {/* Membership ID Section (if available) */}
          {formData.membershipId && (
            <View style={styles.infoBox}>
              <Text style={styles.columnLabel}>Membership ID</Text>
              <Text>{formData.membershipId}</Text>
            </View>
          )}
          
          {/* Financial Details Section */}
          <View style={styles.financialDetails}>
            <Text style={styles.columnLabel}>Financial Details</Text>
            <View style={styles.infoBox}>
              <View style={styles.financialRow}>
                <Text>Initiation Fee</Text>
                <Text>${formData.initiationFee || '0.00'}</Text>
              </View>
              <View style={styles.financialRow}>
                <Text>Pro-rated Dues</Text>
                <Text>${formData.proratedDues || '0.00'}</Text>
              </View>
              <View style={styles.financialRow}>
                <Text>Pro-rated Add-Ons</Text>
                <Text>${formData.proratedAddOns || '0.00'}</Text>
              </View>
              <View style={styles.financialRow}>
                <Text>Packages</Text>
                <Text>${formData.packagesFee || '0.00'}</Text>
              </View>
              <View style={styles.financialRow}>
                <Text>Taxes</Text>
                <Text>${formData.taxAmount || '0.00'}</Text>
              </View>
              <View style={styles.financialTotal}>
                <Text>Total Collected (Tax included)</Text>
                <Text>${formData.totalCollected || (
                  parseFloat(formData.initiationFee || 0) + 
                  parseFloat(formData.proratedDues || 0) + 
                  parseFloat(formData.proratedAddOns || 0) + 
                  parseFloat(formData.packagesFee || 0) + 
                  parseFloat(formData.taxAmount || 0)
                ).toFixed(2) || '0.00'}</Text>
              </View>
            </View>
          </View>
          
          {/* Payment Summary Section */}
          <View style={styles.infoBox}>
            <Text style={styles.columnLabel}>Monthly Cost Going Forward</Text>
            <View style={styles.financialRow}>
              <Text>{formData.displayMembershipType || 'Individual'} Dues {formData.displayAgreementType || 'Month-to-month'}</Text>
              <Text>${formData.monthlyDues || '0.00'}</Text>
            </View>
            <View style={styles.financialRow}>
              <Text>Total Monthly Membership Dues Rate</Text>
              <Text>${formData.totalMonthlyRate || formData.monthlyDues || '0.00'}</Text>
            </View>
            <View style={styles.financialRow}>
              <Text>Membership Start Date</Text>
              <Text>{formData.requestedStartDate ? formatDate(formData.requestedStartDate) : ''}</Text>
            </View>
          </View>
          
          {/* Payment Authorization Section */}
          <View style={styles.infoBox}>
            <Text>
              I hereby request and authorize {isNewMexicoClub ? 'New Mexico Sports and Wellness' : 'Colorado Athletic Club'} to charge my account via Electronic Funds Transfer on a monthly basis beginning {formData.requestedStartDate ? formatDate(formData.requestedStartDate) : ''}.
            </Text>
            <Text style={{ marginTop: 10 }}>
              The debit will consist of monthly dues plus any other club charges (if applicable) made by myself or other persons included in my membership in accordance with the resignation policy detailed in the Terms and Conditions within this Agreement. The authorization is extended by me to {isNewMexicoClub ? 'New Mexico Sports and Wellness' : 'Colorado Athletic Club'} and/or its authorized agents or firms engaged in the business of processing check and charge card debits.
            </Text>
            
            <View style={{...styles.row, marginTop: 10}}>
              <View style={styles.column}>
                <Text style={styles.columnLabel}>Payment Method</Text>
                <Text>{formData.paymentMethod || 'Credit Card'}</Text>
              </View>
            </View>
            
            <View style={{...styles.row, marginTop: 5}}>
              <View style={styles.column}>
                <Text style={styles.columnLabel}>Credit Card Number</Text>
                <Text>{formData.creditCardNumber ? `${formData.creditCardNumber.replace(/\d(?=\d{4})/g, '*')}` : ''}</Text>
              </View>
              <View style={styles.column}>
                <Text style={styles.columnLabel}>Expiration</Text>
                <Text>{formData.expirationDate ? formatDate(formData.expirationDate) : ''}</Text>
              </View>
              <View style={styles.column}>
                <Text style={styles.columnLabel}>Name on Account</Text>
                <Text>{formData.firstName} {formData.lastName}</Text>
              </View>
            </View>
          </View>
        </View>
        
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `${pageNumber} / ${totalPages}`
        )} fixed />
      </Page>
      
      {/* Contract Terms Page */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Terms and Conditions</Text>
        
        {/* Cancellation Right Section */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>CANCELLATION RIGHT</Text>
          <Text style={{...styles.contractText, fontWeight: 'bold'}}>
            {isNewMexicoClub ? 'NEW MEXICO SPORTS AND WELLNESS (NMSW) MONEY BACK GUARANTEE:' : 'COLORADO ATHLETIC CLUB (CAC) MONEY BACK GUARANTEE:'}
          </Text>
          <Text style={styles.contractText}>
            {isNewMexicoClub ? 'NMSW' : 'CAC'} EXTENDS A FOURTEEN (14) DAY TRIAL PERIOD WITH A FULL REFUND. THIS REFUND DOES NOT APPLY TO AMOUNTS OWED BY MEMBER TO {isNewMexicoClub ? 'NMSW' : 'CAC'} UNDER ANY OTHER MEMBERSHIP APPLICATION OR AGREEMENT. THE 14 DAYS INCLUDE THE DATE ON THIS AGREEMENT. YOU MAY RESCIND THIS AGREEMENT BY SENDING WRITTEN NOTICE TO {isNewMexicoClub ? 'NEW MEXICO SPORTS AND WELLNESS' : 'COLORADO ATHLETIC CLUB'} THAT YOU ARE EXERCISING YOUR RIGHT TO RESCIND BY FACSIMILE TRANSMITTAL, MAIL, EMAIL, HAND DELIVERY OR COMPLETING A MEMBERSHIP CANCELATION FORM AT THE CLUB.
          </Text>
        </View>
        
        {/* Full Membership Agreement Section */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>MEMBERSHIP AGREEMENT</Text>
          
          {/* Month-to-Month Section */}
          <View>
            <Text style={styles.contractText}>
              <Text style={{fontWeight: 'bold'}}>MONTH-TO-MONTH</Text> - I understand that I am committing to a minimum three (3) month membership. The three (3) month period commences on the 1st of the month following the date the membership begins. After fulfilling my minimum three (3) month membership commitment, I understand that the membership may be cancelled at any time with written notice pursuant to the Resignation Policy and the total dues owing for the membership as well as all discounts and initiation fees are not refundable.
            </Text>
            <View style={styles.initialLine}>
              <Text>INITIAL</Text>
              <Text style={{
                ...styles.initialBox, 
                fontFamily: signatureData.selectedFont?.font ? 
                  signatureData.selectedFont.font.split(',')[0].trim() : 'Open Sans'
              }}>
                {initialedSections?.monthToMonth ? signatureData.initials?.text : ''}
              </Text>
            </View>
          </View>
          
          {/* Extended Plan Section */}
          <View>
            <Text style={styles.contractText}>
              <Text style={{fontWeight: 'bold'}}>EXTENDED PLAN</Text> - I elect to pay for the number of selected months on this agreement for consecutive months of member dues plus any club charges (if applicable) made by myself or any other persons included in my membership. I understand that I am committing to a minimum three (3) month membership.
            </Text>
            <Text style={styles.contractText}>
              Member acknowledges that in order to be relieved of the agreement terms, the balance of the dues owed for the remaining months of the agreement must be paid in full. Special consideration can be made if cause for cancellation is based on a medical contingency and written authorization from a doctor is received; or if a member moves 50 miles or more away from the nearest {isNewMexicoClub ? 'New Mexico Sports and Wellness' : 'Colorado Athletic Club'} with proof of new residency.
            </Text>
            <View style={styles.initialLine}>
              <Text>INITIAL</Text>
              <Text style={{
                ...styles.initialBox, 
                fontFamily: signatureData.selectedFont?.font ? 
                  signatureData.selectedFont.font.split(',')[0].trim() : 'Open Sans'
              }}>
                {initialedSections?.extendedPlan ? signatureData.initials?.text : ''}
              </Text>
            </View>
          </View>
          
          {/* Resignation Policy Section */}
          <View>
            <Text style={styles.contractText}>
              <Text style={{fontWeight: 'bold'}}>RESIGNATION POLICY:</Text> A month-to-month membership may be cancelled by providing at least one (1) month's written notice. Cancellation shall be effective on the 1st of the month that is at least one (1) month after the date the notice is delivered. Notice can be provided by first class mail (Certified with Return Receipt Recommended), personal delivery of cancelation form at the club (Obtaining a copy from Club Personnel Recommended), and facsimile transmission of cancelation form.
            </Text>
            <Text style={styles.contractText}>
              Concurrently with the delivery of written notice, Member must pay the club any amounts due on the account as of the cancellation date and on or before the cancellation date member must return all membership cards. Those who have signed on an Extended Plan agreement are subject to the terms of their agreement and are responsible for the balance of remaining dues. All memberships are non-refundable, non-transferable, non-assignable and non-proprietary.
            </Text>
            <View style={styles.initialLine}>
              <Text>INITIAL</Text>
              <Text style={{
                ...styles.initialBox, 
                fontFamily: signatureData.selectedFont?.font ? 
                  signatureData.selectedFont.font.split(',')[0].trim() : 'Open Sans'
              }}>
                {initialedSections?.resignation ? signatureData.initials?.text : ''}
              </Text>
            </View>
          </View>
          
          {/* Corporate Members Section */}
          <View>
            <Text style={styles.contractText}>
              <Text style={{fontWeight: 'bold'}}>CORPORATE MEMBERS REGULATIONS</Text>
            </Text>
            <Text style={styles.contractText}>
              1. Corporate members must be a W-2 paid employee or associate of a firm or approved organization that has a corporate membership with {isNewMexicoClub ? 'NMSW' : 'CAC'}, unless otherwise agreed to in writing. {isNewMexicoClub ? 'NMSW' : 'CAC'} must be notified immediately of any change in employment status.
            </Text>
            <Text style={styles.contractText}>
              2. Discounts on monthly dues may change in accordance with the number or employees of the corporate firm who belong to {isNewMexicoClub ? 'NMSW' : 'CAC'}. I understand I will lose my corporate discount and will be readjusted to regular rates if my employer drops below the minimum required number of participating employees for them to be eligible in the corporate discount program.
            </Text>
            <Text style={styles.contractText}>
              3. It is the member's responsibility to notify {isNewMexicoClub ? 'NMSW' : 'CAC'} of any change in employment status. I understand that I will be assessed appropriate monthly fees should I leave the above corporation/organization, or the corporation/organization drops its corporate membership.
            </Text>
            <Text style={styles.contractText}>
              4. Proof of employment must be provided to obtain the corporate discount.
            </Text>
            <View style={styles.initialLine}>
              <Text>INITIAL</Text>
              <Text style={{
                ...styles.initialBox, 
                fontFamily: signatureData.selectedFont?.font ? 
                  signatureData.selectedFont.font.split(',')[0].trim() : 'Open Sans'
              }}>
                {initialedSections?.corporate ? signatureData.initials?.text : ''}
              </Text>
            </View>
          </View>
          
          {/* Student/Young Professional Section */}
          <View>
            <Text style={styles.contractText}>
              <Text style={{fontWeight: 'bold'}}>STUDENT YOUNG PROFESSIONAL (SYP) MEMBERSHIPS</Text>
            </Text>
            <Text style={styles.contractText}>
              Student/Young Professional (SYP) discounted memberships are offered exclusively to members between the ages of 19-29. This special discounted rate will be honored through the age of 29. I understand that beginning the month after my 30th birthday my monthly dues rate will increase by $10. Each year thereafter my monthly rate will increase by an additional $10 until my rate reaches the then current rate. I also understand that my rate may also change for any other upgrades or downgrades of the membership that I may initiate.
            </Text>
            <View style={styles.initialLine}>
              <Text>INITIAL</Text>
              <Text style={{
                ...styles.initialBox, 
                fontFamily: signatureData.selectedFont?.font || 'Open Sans'
              }}>
                {initialedSections?.syp ? signatureData.initials?.text : ''}
              </Text>
            </View>
          </View>
          
          {/* Corporate Proof Section (Denver only) */}
          {!isNewMexicoClub && (
            <View>
              <Text style={styles.contractText}>
                <Text style={{fontWeight: 'bold'}}>CORPORATE PROOF</Text>
              </Text>
              <Text style={styles.contractText}>
                Although you were unable to provide corporate proof when beginning your membership, we would like to offer you the opportunity to immediately take advantage of your membership.
              </Text>
              <Text style={styles.contractText}>
                If this proof is not received within 14 days, your membership will be converted to the equivalent of one individually priced membership and you will be responsible for the entire billed amount. If the documentation is not received, your rate will go to the current standard rate per month until the proper documentation is provided. The club will not issue a dues credit for any portion of the additional charges once billed.
              </Text>
              <View style={styles.initialLine}>
                <Text>INITIAL</Text>
                <Text style={{
                  ...styles.initialBox, 
                  fontFamily: signatureData.selectedFont?.font || 'Open Sans'
                }}>
                  {initialedSections?.corporateProof ? signatureData.initials?.text : ''}
                </Text>
              </View>
            </View>
          )}
          
          {/* Signature Line */}
          <View style={styles.signatureSection}>
            <Text style={styles.contractText}>
              The terms and conditions contained herein, along with the Rules and Regulations, constitute the full agreement between {isNewMexicoClub ? 'NMSW' : 'CAC'} and the Member, and no oral promises are made a part of it.
            </Text>
            
            <View style={styles.signatureRow}>
              <View style={styles.signatureBox}>
                <Text style={{ 
                  fontFamily: signatureData.selectedFont?.font ? 
                    signatureData.selectedFont.font.split(',')[0].trim() : 'Open Sans', 
                  fontSize: 18 
                }}>
                  {signatureData.signature?.text || ''}
                </Text>
                <Text style={styles.signatureLabel}>Signature</Text>
              </View>
              <View style={styles.dateBox}>
                <Text>{signatureDate}</Text>
                <Text style={styles.dateLabel}>Date</Text>
              </View>
            </View>
          </View>
        </View>
        
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
          `${pageNumber} / ${totalPages}`
        )} fixed />
      </Page>
    </Document>
  );
};

// PDF Download Button Component
export const PDFDownloadButton = ({ formData, signatureData, signatureDate, initialedSections, selectedClub }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const generatePDF = async () => {
    if (!formData || !signatureData || !signatureDate) {
      return;
    }
    
    try {
      setIsGenerating(true);
      
      // Create the PDF document
      const pdfDoc = (
        <ContractPDF 
          formData={formData} 
          signatureData={signatureData} 
          signatureDate={signatureDate}
          initialedSections={initialedSections}
          selectedClub={selectedClub}
        />
      );
      
      // Use the blob provider to generate the PDF
      const blob = await pdf(pdfDoc).toBlob();
      
      // Create a URL for the blob
      const url = URL.createObjectURL(blob);
      
      // Create a filename
      const fileName = `${formData.lastName}_${formData.firstName}_membership_agreement.pdf`;
      
      // Create a temporary link and trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      setIsGenerating(false);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setIsGenerating(false);
      // More detailed error message
      alert(`PDF Generation Error: ${error.message || 'Unknown error'}`);
    }
  };
  
  return (
    <button 
      className="pdf-button" 
      onClick={generatePDF}
      disabled={isGenerating || !formData || !signatureData || !signatureDate}
    >
      {isGenerating ? 'Generating PDF...' : 'Download PDF'}
    </button>
  );
};

// PDF Preview Component (for viewing in a modal or dedicated page)
export const PDFPreview = ({ formData, signatureData, signatureDate, initialedSections, selectedClub }) => {
  if (!formData || !signatureData || !signatureDate) {
    return <div>Loading PDF preview...</div>;
  }
  
  return (
    <PDFViewer style={{ width: '100%', height: '80vh' }}>
      <ContractPDF 
        formData={formData} 
        signatureData={signatureData} 
        signatureDate={signatureDate}
        initialedSections={initialedSections}
        selectedClub={selectedClub}
      />
    </PDFViewer>
  );
};

export default ContractPDF;
