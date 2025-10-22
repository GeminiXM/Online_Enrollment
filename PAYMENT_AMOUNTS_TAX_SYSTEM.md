# Payment Amounts, Taxes, and Calculations System

## Overview
This document provides a complete reference for the payment processing, tax calculations, amount flows, and database storage in the Online Enrollment system. Use this to understand, debug, or recreate the system.

## Table of Contents
1. [Tax System](#tax-system)
2. [Amount Calculations](#amount-calculations)
3. [Data Flow Between Pages](#data-flow-between-pages)
4. [Credit Card Processing](#credit-card-processing)
5. [Database Storage](#database-storage)
6. [Key Files and Components](#key-files-and-components)
7. [Common Issues and Solutions](#common-issues-and-solutions)
8. [Debugging Guide](#debugging-guide)

## Tax System

### Tax Rate and Application
- **Tax Rate**: 7.625% (0.07625) for New Mexico clubs only
- **Tax Application**: Only when `selectedClub?.state === 'NM'`
- **Taxable Items**:
  - Enrollment fee ($19.00)
  - Prorated dues amount
  - Prorated addons amount
  - PT package (separate calculation)

### Tax Calculation Logic
```javascript
// Frontend tax calculation (EnrollmentForm.jsx)
const isNewMexicoClub = selectedClub?.state === 'NM';
const effectiveTaxRate = isNewMexicoClub ? taxRate : 0;

// Tax on enrollment fee + prorated amounts
const enrollmentFee = 19.0;
const totalTaxableAmount = enrollmentFee + prorated;
const proratedTax = Number((totalTaxableAmount * effectiveTaxRate).toFixed(2));

// PT package tax (separate calculation)
if (isNewMexicoClub) {
  const base = Math.round(ptPackagePriceWithTax / (1 + taxRate));
  ptPackageAmount = Number(base).toFixed(2);
  ptPackageTax = ptPackagePriceWithTax - base;
}
```

### Tax Fields in Database
- `proratedDuesTax`: Tax on prorated dues amount
- `proratedAddOnsTax`: Tax on prorated addons amount
- `proratedDuesAddonTax`: Combined tax (dues + addons)
- `initiationFeeTax`: Tax on $19 enrollment fee

## Amount Calculations

### Frontend Calculations (ContractPage.jsx)

#### Prorated Amount Calculation
```javascript
// Calculate prorated factor based on start date
const calculateProratedFactor = (startDate) => {
  const start = new Date(startDate);
  const today = new Date();
  const effectiveDate = start > today ? start : today;
  const lastDay = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth() + 1, 0);
  const daysInMonth = lastDay.getDate();
  const daysRemaining = lastDay.getDate() - effectiveDate.getDate() + 1;
  return daysRemaining / daysInMonth;
};

// Calculate prorated dues
const proratedDues = (fullPrice * proratedFactor).toFixed(2);
```

#### Total Amount Calculation
```javascript
const totalCollected = (
  parseFloat(initiationFee) +        // $19.00
  parseFloat(proratedDues) +         // Prorated membership dues
  parseFloat(proratedAddOns) +      // Prorated addons
  parseFloat(ptPackageAmount) +      // PT package (one-time)
  parseFloat(taxAmount)              // Tax (NM clubs only)
).toFixed(2);
```

#### Monthly Amount (Going Forward)
```javascript
const totalMonthlyRate = (
  parseFloat(monthlyDues) + 
  serviceAddons?.reduce((total, addon) => total + (addon.price || 0), 0) || 0
).toFixed(2);
// Note: Monthly amounts do NOT include tax
```

### Backend Calculations (enrollmentController.js)

#### Amount Processing
```javascript
// Extract amounts from request
const proratedDues = parseFloat(req.body.proratedDues) || 0;
const proratedDuesTax = parseFloat(req.body.proratedDuesTax) || 0;
const proratedAddOns = parseFloat(req.body.proratedAddOns) || 0;
const proratedAddOnsTax = parseFloat(req.body.proratedAddOnsTax) || 0;
const proratedDuesAddon = proratedDues + proratedAddOns;
const proratedDuesAddonTax = proratedDuesTax + proratedAddOnsTax;
```

#### Database Item Insertion
```javascript
// Enrollment fee item
await executeSqlProcedure("web_proc_InsertAsptitemd", club, [
  transactionId,
  "202500000713", // UPC for enrollment fee
  "19.00",        // $19 enrollment fee
  enrollmentFeeTax.toFixed(2), // Tax amount
  1
]);

// Prorated dues item
await executeSqlProcedure("web_proc_InsertAsptitemd", club, [
  transactionId,
  "701592007513", // UPC for prorated dues
  proratedDues.toFixed(2),     // Prorated dues amount
  proratedDuesTax.toFixed(2),  // Prorated dues tax
  1
]);
```

## Data Flow Between Pages

### 1. EnrollmentForm → ContractPage
**Data Passed:**
- `formData`: Complete enrollment form data
- `signatureData`: Signature and initials data
- `initialedSections`: Required sections that need initials

**ContractPage Processing:**
- Calculates final amounts and taxes
- Processes PT package tax separation (NM clubs)
- Sets `totalCollected` for payment processing

### 2. ContractPage → Payment Pages
**Routing Logic:**
```javascript
const isColoradoClub = selectedClub?.state === 'CO';
const paymentRoute = isColoradoClub ? '/payment-fluidpay' : '/converge-payment';
```

**Data Passed:**
- `formData`: Processed form data with calculated amounts
- `signatureData`: Signature and initials
- `initialedSections`: Required sections

### 3. Payment Pages → Backend
**ConvergePaymentPage (NM clubs):**
- Uses `calculateProratedAmount()` for payment amount
- Processes payment through Converge HPP
- Returns normalized payment response

**FluidPayPaymentPage (CO clubs):**
- Uses `calculateProratedAmount()` for payment amount
- Processes payment through FluidPay API
- Returns payment response with vault token

### 4. Backend → Database
**Enrollment Submission:**
- Stores payment information
- Inserts item lines with amounts and taxes
- Creates customer record with payment details

## Credit Card Processing

### Converge (New Mexico Clubs)

#### Payment Processing
```javascript
// Create session token
const response = await api.post(`/payment/converge-hpp/session-token`, {
  amount: calculateProratedAmount().toFixed(2),
  orderId: `ENROLL-${Date.now()}`,
  customerId: `${formData.firstName} ${formData.lastName}`,
  clubId: formData.club || selectedClub?.id || '254',
  addToken: true,
  memberData: memberData
});
```

#### Response Processing
```javascript
// Normalize card details from Converge response
const rawLast4 = result.ssl_last4 || (result.ssl_card_number ? String(result.ssl_card_number).slice(-4) : null);
const normalizedLast4 = rawLast4 && String(rawLast4).length === 4 ? String(rawLast4) : '****';
const maskedCardNumber = '************' + (normalizedLast4 !== '****' ? normalizedLast4 : '****');
const cardType = result.ssl_card_short_description || result.ssl_card_type || '';
```

### FluidPay (Colorado Clubs)

#### Payment Processing
```javascript
// Process payment with token
const paymentData = {
  clubId: formData.club || selectedClub?.id || "001",
  amount: calculateProratedAmount().toFixed(2),
  token: token,
  customerInfo: {
    firstName: customerInfo.firstName,
    lastName: customerInfo.lastName,
    email: customerInfo.email,
    phone: customerInfo.phone,
    address: customerInfo.address,
    city: customerInfo.city,
    state: customerInfo.state,
    zipCode: customerInfo.zipCode
  }
};
```

#### Vault Creation
```javascript
// Create customer vault for recurring payments
const vaultResponse = await createFluidPayCustomerVault(fluidPayInfo, {
  token,
  customerInfo,
  user,
  billing,
});
```

## Database Storage

### Payment Information Storage
```javascript
// Payment data extracted for database
const paymentData = {
  token: paymentInfo?.vaultToken || "",           // Vault token for recurring
  cardExpDate: paymentInfo?.expirationDate || "", // YYYY-MM-DD format
  cardNumber: maskedCardNumber,                   // ************NNNN format
  cardType: formatCardType(paymentInfo?.cardType || ""), // VISA, MC, etc.
  processorName: paymentInfo?.processorName || "", // CONVERGE or FLUIDPAY
};
```

### Database Fields
- `parToken`: Vault token (customer ID for recurring payments)
- `parCardNo`: Masked card number (************NNNN)
- `parCcExpDate`: Expiration date (YYYY-MM-DD format)
- `parCardHolder`: Cardholder name (max 20 characters)
- `parCcMethod`: Card type (VISA, MC, AMEX, etc.)

### Item Lines in Database
1. **Enrollment Fee**: UPC `202500000713`, $19.00 + tax
2. **Prorated Dues**: UPC `701592007513`, prorated amount + tax
3. **Prorated Addons**: Individual UPCs or combined (when `combineAddons = true`)
4. **PT Package**: Individual UPC, full price + tax

## Key Files and Components

### Frontend Files
- `EnrollmentForm.jsx`: Initial form, tax calculations, prorated amounts
- `ContractPage.jsx`: Final amount calculations, tax processing
- `ConvergePaymentPage.jsx`: Converge payment processing (NM clubs)
- `FluidPayPaymentPage.jsx`: FluidPay payment processing (CO clubs)
- `EnrollmentConfirmation.jsx`: Confirmation page, PDF generation

### Backend Files
- `enrollmentController.js`: Main enrollment processing, database insertion
- `paymentController.js`: Payment processing (Converge/FluidPay)
- `emailService.js`: Email processing with contract PDFs

### Database Procedures
- `web_proc_InsertWebStrcustr`: Insert customer record
- `web_proc_InsertWebAsamembr`: Insert member record
- `web_proc_InsertAsptitemd`: Insert item lines
- `web_proc_InsertProduction`: Production migration

## Common Issues and Solutions

### 1. Prorated Dues Showing $0.00
**Problem**: Backend using combined amount instead of individual dues amount
**Solution**: Ensure backend uses `req.body.proratedDues` for dues line, not `req.body.proratedDuesAddon`

### 2. Tax Calculation Inconsistencies
**Problem**: Different tax calculations across components
**Solution**: Use consistent tax rate and calculation method across all components

### 3. Amount Mismatches Between Pages
**Problem**: Different `calculateProratedAmount()` functions
**Solution**: Ensure all components use the same calculation logic and fallback values

### 4. Credit Card Data Not Appearing in PDFs
**Problem**: Masked card data not properly passed to PDF generation
**Solution**: Ensure `paymentResponse.maskedCardNumber` is correctly formatted and passed

### 5. Database Item Lines Missing
**Problem**: Items not inserted due to missing UPC codes or amounts
**Solution**: Verify all required fields are present and UPC codes exist in system

## Debugging Guide

### 1. Check Amount Calculations
```javascript
// Add logging to ContractPage.jsx
console.log('Amount calculation debug:', {
  initiationFee: 19.00,
  proratedDues: proratedDues,
  proratedAddOns: proratedAddOns,
  ptPackageAmount: ptPackageAmount,
  taxAmount: taxAmount,
  totalCollected: totalCollected
});
```

### 2. Verify Tax Application
```javascript
// Check tax rate and application
console.log('Tax calculation:', {
  isNewMexicoClub: selectedClub?.state === 'NM',
  taxRate: taxRate,
  effectiveTaxRate: isNewMexicoClub ? taxRate : 0,
  proratedTax: proratedTax
});
```

### 3. Check Payment Data Flow
```javascript
// Log payment data in payment pages
console.log('Payment data:', {
  formData: formData,
  calculateProratedAmount: calculateProratedAmount(),
  totalCollected: formData.totalCollected
});
```

### 4. Verify Database Insertion
```javascript
// Check backend logs for amount insertion
logger.info("Inserting membership dues item:", {
  membershipPrice: membershipPrice.toFixed(2),
  membershipDuesTax: correctMembershipDuesTax.toFixed(2)
});
```

### 5. Check Credit Card Processing
```javascript
// Verify payment response processing
console.log('Payment response:', {
  transactionId: paymentResult.transaction_id,
  maskedCardNumber: paymentResult.maskedCardNumber,
  cardType: paymentResult.cardType,
  vaultToken: paymentResult.vault_token
});
```

## Critical Dependencies

### Frontend Dependencies
- `proratedPrice` state must be updated when `membershipPrice` changes
- `formData.proratedDues` must be updated when `proratedPrice` changes
- Tax calculations must be consistent across all components

### Backend Dependencies
- `combineAddons` variable must be declared before use
- UPC codes must exist in the system
- Payment data must be properly formatted before database insertion

### Database Dependencies
- All required fields must be present for successful insertion
- UPC codes must match existing inventory items
- Payment tokens must be valid for recurring payments

## Testing Checklist

### Frontend Testing
- [ ] Tax calculations correct for NM clubs
- [ ] No tax applied for non-NM clubs
- [ ] Prorated amounts calculated correctly
- [ ] Total amounts consistent across pages
- [ ] Payment amounts match calculated totals

### Backend Testing
- [ ] Payment data properly extracted
- [ ] Database items inserted with correct amounts
- [ ] Tax amounts stored correctly
- [ ] Credit card data properly masked
- [ ] Vault tokens stored for recurring payments

### Integration Testing
- [ ] End-to-end enrollment flow works
- [ ] PDFs generated with correct amounts
- [ ] Email notifications sent with correct data
- [ ] Database records match frontend calculations
- [ ] Payment processing completes successfully

This document provides a complete reference for understanding and maintaining the payment processing system. Use it to debug issues, recreate functionality, or onboard new developers to the system.
