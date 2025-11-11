# Production-Safe Logging Guide

## 🔒 Overview

This guide explains how to use the development logger to keep sensitive information out of production console logs while maintaining helpful debugging in development.

---

## 🚨 The Problem

Regular `console.log()` statements can expose sensitive information in production:

```javascript
// ❌ BAD - Exposed in production browser console
console.log('User data:', { 
  email: 'user@example.com',
  cardNumber: '4111111111111111',
  ssn: '123-45-6789'
});

// ❌ BAD - API keys visible
console.log('Payment response:', paymentData);

// ❌ BAD - Internal logic exposed
console.log('Database query:', sqlQuery);
```

**Risks:**
- Users can see sensitive data in browser console (F12)
- Competitors can see business logic
- Security vulnerabilities exposed
- Compliance issues (PCI-DSS, HIPAA, etc.)

---

## ✅ The Solution: Development Logger

Use `devLogger` instead of `console.log()` for anything you don't want visible in production.

### Import the Logger

```javascript
import devLogger from '../utils/devLogger';
```

---

## 📋 Usage Examples

### 1. General Debug Logging

```javascript
// ✅ GOOD - Only visible in development
devLogger.log('Component mounted');
devLogger.debug('Current state:', this.state);
```

### 2. API Requests/Responses

```javascript
// ✅ GOOD - API details hidden in production
devLogger.api('POST', '/api/enrollment', enrollmentData);

// After API call
devLogger.api('Response', '/api/enrollment', responseData);
```

### 3. Form Data (Often Sensitive)

```javascript
// ✅ GOOD - Form data hidden in production
devLogger.form('EnrollmentForm', formData);
devLogger.form('PaymentForm', paymentInfo);
```

### 4. Payment/Financial Data

```javascript
// ✅ GOOD - Payment details hidden
devLogger.payment('Processing payment', {
  amount: amount,
  processor: 'Converge',
  clubId: clubId
});
```

### 5. State Changes

```javascript
// ✅ GOOD - State tracking in dev only
devLogger.state('EnrollmentForm', 'selectedClub', selectedClub);
devLogger.state('PaymentPage', 'isProcessing', true);
```

### 6. Database/Backend Data

```javascript
// ✅ GOOD - Internal data hidden
devLogger.data('User enrollment', enrollmentRecord);
devLogger.data('Database response', dbResult);
```

### 7. Performance Timing

```javascript
// ✅ GOOD - Performance metrics in dev only
devLogger.time('PDF Generation');
// ... code to measure ...
devLogger.timeEnd('PDF Generation');
```

### 8. Grouped Logs

```javascript
// ✅ GOOD - Organized logging
devLogger.group('Payment Processing');
devLogger.log('Step 1: Validate');
devLogger.log('Step 2: Process');
devLogger.log('Step 3: Confirm');
devLogger.groupEnd();
```

### 9. Sanitized Logging

```javascript
// ✅ GOOD - Auto-redact sensitive fields
const sanitizedData = devLogger.sanitize(formData);
devLogger.log('Form data (sanitized):', sanitizedData);

// Before: { cardNumber: '4111111111111111', cvv: '123' }
// After:  { cardNumber: '***REDACTED***', cvv: '***REDACTED***' }
```

### 10. Production-Safe Messages

```javascript
// ✅ Always visible (use for user-facing messages only)
devLogger.info('Form submitted successfully');

// ❌ Don't use for sensitive data
// devLogger.info('User password:', password); // NEVER DO THIS
```

### 11. Styled Console Logs (Dev Only)

```javascript
// ✅ GOOD - Colorful logs in development
devLogger.styled('🎉 Payment Successful!', 'color: green; font-size: 16px;');
devLogger.styled('⚠️ Warning: High latency', 'color: orange; font-weight: bold;');
```

### 12. Conditional Logging

```javascript
import { logOnlyInDev } from '../utils/devLogger';

// ✅ GOOD - Complex logging only in dev
logOnlyInDev(() => {
  console.log('Complex debug info');
  console.table(userData);
  console.dir(complexObject);
});
```

---

## 🔄 Migration Guide

### Replace Standard Console Calls

**Before:**
```javascript
console.log('User data:', userData);
console.log('API Response:', response);
console.error('Payment failed:', error);
```

**After:**
```javascript
import devLogger from '../utils/devLogger';

devLogger.data('User data', userData);
devLogger.api('Response', '/api/payment', response);
devLogger.error('Payment failed:', error);
```

---

## 📊 What Gets Logged Where

| Method | Development | Production | Use Case |
|--------|------------|------------|----------|
| `devLogger.log()` | ✅ Visible | ❌ Hidden | General debug info |
| `devLogger.debug()` | ✅ Visible | ❌ Hidden | Detailed debugging |
| `devLogger.warn()` | ✅ Visible | ❌ Hidden | Development warnings |
| `devLogger.error()` | ✅ Full details | ⚠️ Generic message | Errors |
| `devLogger.api()` | ✅ Visible | ❌ Hidden | API calls |
| `devLogger.form()` | ✅ Visible | ❌ Hidden | Form data |
| `devLogger.payment()` | ✅ Visible | ❌ Hidden | Payment data |
| `devLogger.state()` | ✅ Visible | ❌ Hidden | State changes |
| `devLogger.data()` | ✅ Visible | ❌ Hidden | Database/backend data |
| `devLogger.info()` | ✅ Visible | ✅ Visible | User-safe messages only |

---

## 🛡️ Sensitive Fields Auto-Redacted

The `sanitize()` method automatically redacts these fields:

- `password`
- `cardNumber`
- `cvv` / `securityCode`
- `ssn` / `socialSecurityNumber`
- `accountNumber`
- `routingNumber`
- `pin`
- `creditCard` / `debitCard`

**Example:**
```javascript
const formData = {
  firstName: 'John',
  email: 'john@example.com',
  cardNumber: '4111111111111111',
  cvv: '123'
};

devLogger.log('Raw form:', formData); // Shows all in dev
devLogger.log('Sanitized:', devLogger.sanitize(formData)); // CVV/card redacted

// Production: Both are hidden
// Development: First shows all, second redacts sensitive fields
```

---

## 🎯 Best Practices

### ✅ DO:

1. **Use `devLogger` for all debugging**
   ```javascript
   devLogger.log('Debugging info here');
   ```

2. **Use `devLogger.info()` only for user-safe messages**
   ```javascript
   devLogger.info('Loading complete'); // OK - not sensitive
   ```

3. **Sanitize data before logging**
   ```javascript
   devLogger.log('Data:', devLogger.sanitize(sensitiveData));
   ```

4. **Use specific methods for context**
   ```javascript
   devLogger.api('POST', '/api/users', userData);
   devLogger.payment('Processing', paymentInfo);
   ```

5. **Group related logs**
   ```javascript
   devLogger.group('Enrollment Process');
   // ... multiple logs ...
   devLogger.groupEnd();
   ```

### ❌ DON'T:

1. **Don't use regular console.log for sensitive data**
   ```javascript
   console.log(paymentData); // ❌ Visible in production!
   ```

2. **Don't use devLogger.info() for sensitive data**
   ```javascript
   devLogger.info('Password:', password); // ❌ Still visible in production!
   ```

3. **Don't log sensitive data without sanitizing**
   ```javascript
   devLogger.log('Credit card:', cardNumber); // ❌ Use devLogger.payment() instead
   ```

4. **Don't expose business logic**
   ```javascript
   console.log('Pricing algorithm:', pricingLogic); // ❌ Competitive info
   ```

---

## 🔍 Checking Production Build

Test that logs are hidden in production:

1. **Build for production:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Check the build:**
   - Open browser DevTools (F12)
   - Navigate through the app
   - Verify `[DEV]`, `[DEBUG]`, `[API]` logs don't appear

3. **Only these should be visible:**
   - Generic error messages
   - `devLogger.info()` messages (user-safe only)
   - Browser's own messages

---

## 📝 Code Review Checklist

Before deploying, check:

- [ ] No `console.log()` with sensitive data
- [ ] All debugging uses `devLogger`
- [ ] Payment data uses `devLogger.payment()`
- [ ] Form data uses `devLogger.form()` or sanitized
- [ ] API calls use `devLogger.api()`
- [ ] `devLogger.info()` only has user-safe messages
- [ ] No hardcoded credentials in logs
- [ ] No SQL queries in logs
- [ ] No internal URLs/paths exposed

---

## 🚀 Quick Reference

```javascript
import devLogger from '../utils/devLogger';

// Development only (hidden in production)
devLogger.log('General info');
devLogger.debug('Debug details');
devLogger.warn('Warning');
devLogger.api('POST', '/api/endpoint', data);
devLogger.form('FormName', formData);
devLogger.payment('Processing payment', paymentInfo);
devLogger.state('Component', 'stateName', value);
devLogger.data('Label', data);

// Performance
devLogger.time('Label');
devLogger.timeEnd('Label');

// Grouping
devLogger.group('Group Name');
devLogger.groupEnd();

// Sanitize sensitive data
const clean = devLogger.sanitize(dirtyData);

// Production-safe (always visible - use carefully!)
devLogger.info('User-safe message only');

// Check environment
if (devLogger.isDevelopment()) {
  // Complex dev-only code
}
```

---

## 🔧 Environment Detection

The logger automatically detects the environment:

- **Development:** `NODE_ENV=development` or `NODE_ENV` not set
- **Production:** `NODE_ENV=production`

Vite automatically sets this when you build:
- `npm start` → Development mode
- `npm run build` → Production mode (sets `NODE_ENV=production`)

---

## 📚 Related Documentation

- Main logging system: `LOGGING_SYSTEM.md`
- Production monitoring: `PRODUCTION_MONITORING_GUIDE.md`
- Error notifications: `ERROR_NOTIFICATION_SETUP.md`

---

**Last Updated:** September 30, 2025











