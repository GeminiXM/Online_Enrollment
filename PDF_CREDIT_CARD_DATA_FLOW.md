# PDF Credit Card Data Flow Documentation

## Overview
This document explains how credit card information flows from payment processing to PDF generation across all contract creation points in the Online Enrollment system. Understanding this flow is critical for maintaining credit card data in PDFs.

## System Architecture

### Payment Processors
- **Converge**: Returns data in `ssl_*` fields
- **FluidPay**: Returns data in `card.*` and direct fields

### PDF Generation Points
1. **Email PDFs** (automatic after payment)
2. **Local Contract PDFs** (automatic after payment) 
3. **Download PDF Button** (manual on EnrollmentConfirmation page)

## Data Flow Diagram

```
Payment Processor → EnrollmentConfirmation → PDF Generation
     ↓                    ↓                      ↓
Converge/FluidPay    Data Processing      CanvasContractPDF
     ↓                    ↓                      ↓
Payment Response    Credit Card Data      PDF with CC Info
```

## Detailed Data Flow

### 1. Payment Processing

#### Converge Payment Response Structure
```javascript
{
  processor: 'CONVERGE',
  success: true,
  transaction_id: 'ssl_transaction_id',
  authorization_code: 'ssl_approval_code',
  card_info: {
    last_four: '1234',
    card_type: 'VISA'
  },
  last4: '1234',
  maskedCardNumber: '************1234',  // KEY FIELD
  cardType: 'VISA',
  expirationDate: '2025-12-31',
  amount: '50.00',
  timestamp: '2025-01-15T10:30:00Z',
  vault_token: 'ssl_token',
  customerId: 'ssl_customer_id'
}
```

#### FluidPay Payment Response Structure
```javascript
{
  processor: 'FLUIDPAY',
  success: true,
  transaction_id: 'transaction_id',
  authorization_code: 'auth_code',
  cardNumber: '************1234',  // KEY FIELD
  cardType: 'VISA',
  expirationDate: '2025-12-31',
  amount: '50.00',
  vault_token: 'customer_id',
  paymentMethodId: 'payment_method_id'
}
```

### 2. EnrollmentConfirmation Data Processing

#### Email PDF Generation (Automatic)
Located in `EnrollmentConfirmation.jsx` lines 141-165:

```javascript
// Derive payment display details for PDF
const brand = (paymentResponse?.cardType || paymentResponse?.ssl_card_short_description || paymentResponse?.ssl_card_type || paymentResponse?.card?.card_type || '').toString();
const rawNumber = (paymentResponse?.maskedCardNumber || paymentResponse?.cardNumber || paymentResponse?.ssl_card_number || paymentResponse?.card?.masked_card || '').toString();
const last4 = rawNumber.replace(/\D/g, '').slice(-4);
const maskedNumber = last4 ? `************${last4}` : (rawNumber || '');
const exp = (paymentResponse?.expirationDate || paymentResponse?.ssl_exp_date || paymentResponse?.card?.expiration_date || formData?.expirationDate || '').toString();

// Derive name on account from processor response
const nameOnAccount = (
  paymentResponse?.card?.cardholder_name ||
  paymentResponse?.cardholder ||
  (paymentResponse?.ssl_first_name && paymentResponse?.ssl_last_name
    ? `${paymentResponse.ssl_first_name} ${paymentResponse.ssl_last_name}`
    : '') ||
  paymentResponse?.ssl_cardholder ||
  `${formData.firstName || ''} ${formData.lastName || ''}`
).trim();

const pdfFormData = {
  ...formData,
  membershipId: membershipNumber,
  paymentMethod: brand ? `Credit Card - ${brand.toUpperCase()}` : 'Credit Card',
  creditCardNumber: maskedNumber,  // KEY FIELD
  expirationDate: exp,
  nameOnAccount,
};
```

#### Download PDF Button (Manual)
Located in `EnrollmentConfirmation.jsx` lines 75-94:

```javascript
const getMaskedCardForPdf = () => {
  const rawNumber = (paymentResponse?.maskedCardNumber || paymentResponse?.cardNumber || paymentResponse?.ssl_card_number || paymentResponse?.card?.masked_card || '').toString();
  const last4 = rawNumber.replace(/\D/g, '').slice(-4);
  return last4 ? `************${last4}` : '';
};

const getExpirationForPdf = () => {
  return (paymentResponse?.expirationDate || paymentResponse?.ssl_exp_date || paymentResponse?.card?.expiration_date || formData?.expirationDate || '').toString();
};

const getNameOnAccountForPdf = () => {
  const name = (
    paymentResponse?.card?.cardholder_name ||
    paymentResponse?.cardholder ||
    (paymentResponse?.ssl_first_name && paymentResponse?.ssl_last_name
      ? `${paymentResponse.ssl_first_name} ${paymentResponse.ssl_last_name}`
      : '') ||
    paymentResponse?.ssl_cardholder ||
    `${formData?.firstName || ''} ${formData?.lastName || ''}`
  );
  return (name || '').trim();
};
```

### 3. PDF Generation Components

#### CanvasContractPDF.jsx (New Mexico Clubs)
Located in `CanvasContractPDF.jsx` lines 574-593:

```javascript
const formatCreditCardNumber = (ccNumber) => {
  if (!ccNumber) return '';
  const digits = String(ccNumber).replace(/\D/g, '');
  const last4 = digits.slice(-4);
  return last4 ? `************${last4}` : '';
};

autoTable(pdf, {
  startY: paymentMethodEndY + 5,
  head: [['Credit Card Number', 'Expiration', 'Name on Account']],
  body: [
    [
      formatCreditCardNumber(formData.creditCardNumber || ''),  // KEY FIELD
      formatDate(formData.expirationDate || ''),
      formData.nameOnAccount || `${formData.firstName || ''} ${formData.lastName || ''}`
    ]
  ],
  theme: 'grid',
  headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
  margin: { left: 20, right: 20 }
});
```

#### CanvasContractDenverPDF.jsx (Colorado Clubs)
Located in `CanvasContractDenverPDF.jsx` lines 582-601:

```javascript
const formatCreditCardNumber = (ccNumber) => {
  if (!ccNumber) return '';
  const digits = String(ccNumber).replace(/\D/g, '');
  const last4 = digits.slice(-4);
  return last4 ? `************${last4}` : '';
};

autoTable(pdf, {
  startY: paymentMethodEndY + 5,
  head: [['Credit Card Number', 'Expiration', 'Name on Account']],
  body: [
    [
      formatCreditCardNumber(formData.creditCardNumber || ''),  // KEY FIELD
      formatDate(formData.expirationDate || ''),
      formData.nameOnAccount || `${formData.firstName || ''} ${formData.lastName || ''}`
    ]
  ],
  theme: 'grid',
  headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
  margin: { left: 20, right: 20 }
});
```

## Critical Data Fields

### Payment Response Fields (by Processor)

#### Converge Fields
- `maskedCardNumber`: Primary field for masked card number
- `ssl_card_number`: Raw card number (if available)
- `ssl_exp_date`: Expiration date (MMYY format)
- `ssl_card_short_description`: Card type (VISA, MC, etc.)
- `ssl_first_name`, `ssl_last_name`: Cardholder name (if available)

#### FluidPay Fields
- `cardNumber`: Primary field for masked card number
- `card.number`: Alternative field for card number
- `expirationDate`: Expiration date
- `cardType`: Card type
- `card.cardholder_name`: Cardholder name (if available)

### PDF Form Data Fields
- `creditCardNumber`: **CRITICAL** - Must be set for PDF generation
- `expirationDate`: Expiration date
- `nameOnAccount`: Cardholder name
- `paymentMethod`: Payment method description

## Common Issues and Solutions

### Issue 1: Credit Card Data Missing in PDFs
**Cause**: `formData.creditCardNumber` is not set
**Solution**: Ensure the data flow from payment response to PDF form data is correct

### Issue 2: Download PDF Button Not Working
**Cause**: `getMaskedCardForPdf()` function missing `maskedCardNumber` field
**Solution**: Add `paymentResponse?.maskedCardNumber` to the field priority list

### Issue 3: PDF Generation Failing
**Cause**: Complex fallback logic in PDF generation
**Solution**: Use simple, direct field access: `formatCreditCardNumber(formData.creditCardNumber || '')`

## Best Practices

### 1. Data Flow Consistency
- Always use the same field priority order across all PDF generation points
- Ensure `maskedCardNumber` is checked first for Converge
- Ensure `cardNumber` is checked first for FluidPay

### 2. PDF Generation
- Use simple `formatCreditCardNumber()` function
- Avoid complex fallback logic in PDF components
- Use direct field access: `formData.creditCardNumber`

### 3. Testing
- Test all three PDF generation points:
  1. Email PDFs (automatic)
  2. Local contract PDFs (automatic)
  3. Download PDF button (manual)
- Verify credit card data appears in all PDFs

## File Locations

### Core Files
- `frontend/src/components/EnrollmentConfirmation.jsx` - Main data processing
- `frontend/src/components/CanvasContractPDF.jsx` - New Mexico PDF generation
- `frontend/src/components/CanvasContractDenverPDF.jsx` - Colorado PDF generation

### Payment Processing
- `frontend/src/components/ConvergePaymentPage.jsx` - Converge payment processing
- `frontend/src/components/FluidPayPayment.jsx` - FluidPay payment processing
- `backend/src/controllers/paymentController.js` - Backend payment processing

## Debugging Checklist

When credit card data is missing from PDFs:

1. **Check Payment Response**: Verify `paymentResponse` contains credit card data
2. **Check Data Processing**: Verify `pdfFormData.creditCardNumber` is set
3. **Check PDF Generation**: Verify `formData.creditCardNumber` is passed to PDF components
4. **Check Field Priority**: Ensure correct field priority order in data derivation
5. **Test All Points**: Verify all three PDF generation points work

## Recovery Procedure

If credit card data is missing from PDFs:

1. **Identify the Issue**: Check which PDF generation point is failing
2. **Check Data Flow**: Verify data is flowing correctly from payment to PDF
3. **Revert to Simple Approach**: Use direct field access instead of complex fallback logic
4. **Test All Points**: Verify all PDF generation points work
5. **Document Changes**: Update this documentation with any changes made

## Version History

- **2025-01-15**: Initial documentation created
- **2025-01-15**: Fixed credit card data flow issues
- **2025-01-15**: Reverted to simple, direct field access approach
