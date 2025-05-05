/**
 * ContractPDFFixed.jsx
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

// Helper function to get cleaned font name from font string (e.g., "Great Vibes, cursive" -> "Great Vibes")
const getCleanedFontName = (fontString) => {
  if (!fontString) return 'Open Sans';
  
  // Remove any extra styles like "cursive" after the comma
  const cleanName = fontString.split(',')[0].trim();
  
  // Map to exact registered font family names to avoid mismatch
  const fontMap = {
    'Alex Brush': 'Alex Brush',
    'Allura': 'Allura',
    'Dancing Script': 'Dancing Script',
    'Great Vibes': 'Great Vibes',
    'Parisienne': 'Parisienne',
    'Sacramento': 'Sacramento'
  };
  
  // Return the mapped font name if found, otherwise fall back to Open Sans
  return fontMap[cleanName] || 'Open Sans';
};

// PDF Document Component
const ContractPDFFixed = ({ formData, signatureData, signatureDate, initialedSections, selectedClub }) => {
  // Check if club is in New Mexico
  const isNewMexicoClub = selectedClub?.id?.toString().includes('NM') || 
                          selectedClub?.state === 'NM' ||
                          formData?.club?.toString().includes('NM');
  
  // Club name based on state
  const clubName = isNewMexicoClub ? 'New Mexico Sports and Wellness' : 'Colorado Athletic Club';
  
  // Get font name from signature data - avoid any potential issues with complex font strings
  const signatureFontName = getCleanedFontName(signatureData?.selectedFont?.font);
  
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
                <Text style={styles.columnLabel}>Name</Text>
                <Text>{formData.firstName} {formData.lastName}</Text>
              </View>
              <View style={styles.column}>
                <Text style={styles.columnLabel}>Membership Type</Text>
                <Text>{formData.displayMembershipType || 'Individual'}</Text>
              </View>
            </View>
          </View>
          
          {/* Contract Sections */}
          <View style={styles.section}>
            <Text style={styles.subtitle}>MEMBERSHIP AGREEMENT</Text>
            
            {/* Month-to-Month Section */}
            <View>
              <Text style={styles.contractText}>
                <Text style={{fontWeight: 'bold'}}>MONTH-TO-MONTH</Text> - I understand that I am committing to a minimum three (3) month membership. The three (3) month period commences on the 1st of the month following the date the membership begins. After fulfilling my minimum three (3) month membership commitment, I understand that the membership may be cancelled at any time with written notice pursuant to the Resignation Policy.
              </Text>
              <View style={styles.initialLine}>
                <Text>INITIAL</Text>
                <Text style={{
                  ...styles.initialBox, 
                  fontFamily: signatureFontName || 'Open Sans'
                }}>
                  {initialedSections?.monthToMonth ? signatureData?.initials?.text || '' : ''}
                </Text>
              </View>
            </View>
            
            {/* Resignation Policy Section */}
            <View>
              <Text style={styles.contractText}>
                <Text style={{fontWeight: 'bold'}}>RESIGNATION POLICY:</Text> A month-to-month membership may be cancelled by providing at least one (1) month's written notice. Cancellation shall be effective on the 1st of the month that is at least one (1) month after the date the notice is delivered.
              </Text>
              <View style={styles.initialLine}>
                <Text>INITIAL</Text>
                <Text style={{
                  ...styles.initialBox, 
                  fontFamily: signatureFontName || 'Open Sans'
                }}>
                  {initialedSections?.resignation ? signatureData?.initials?.text || '' : ''}
                </Text>
              </View>
            </View>
            
            {/* Signature Line */}
            <View style={styles.signatureSection}>
              <Text style={styles.contractText}>
                The terms and conditions contained herein, along with the Rules and Regulations, constitute the full agreement between {isNewMexicoClub ? 'NMSW' : 'CAC'} and the Member, and no oral promises are made a part of it.
              </Text>
              
              <View style={styles.signatureRow}>
                <View style={styles.signatureBox}>
                  <Text style={{ 
                    fontFamily: signatureFontName || 'Open Sans',
                    fontSize: 18 
                  }}>
                    {signatureData?.signature?.text || ''}
                  </Text>
                  <Text style={styles.signatureLabel}>Signature</Text>
                </View>
                <View style={styles.dateBox}>
                  <Text>{signatureDate || ''}</Text>
                  <Text style={styles.dateLabel}>Date</Text>
                </View>
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
        <ContractPDFFixed 
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
      const fileName = `${formData.lastName || 'Member'}_${formData.firstName || ''}_membership_agreement.pdf`;
      
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
      <ContractPDFFixed 
        formData={formData} 
        signatureData={signatureData} 
        signatureDate={signatureDate}
        initialedSections={initialedSections}
        selectedClub={selectedClub}
      />
    </PDFViewer>
  );
};

export default ContractPDFFixed;
