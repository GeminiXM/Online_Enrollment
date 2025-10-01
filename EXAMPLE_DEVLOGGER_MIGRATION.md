# Example: Migrating to devLogger

## Before and After Comparison

This example shows how to migrate a component from using regular `console.log()` to production-safe `devLogger`.

---

## ❌ BEFORE (Unsafe for Production)

```javascript
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const PaymentPage = () => {
  const [formData, setFormData] = useState({});
  const [paymentInfo, setPaymentInfo] = useState({});
  
  useEffect(() => {
    console.log('PaymentPage mounted'); // Visible in production
    console.log('Form data:', formData); // Exposes user data
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Processing payment...'); // OK but clutters production
    console.log('Payment data:', paymentInfo); // ⚠️ SENSITIVE: Card number visible!
    console.log('API endpoint:', '/api/payment/process'); // Exposes internal API
    
    try {
      const response = await api.post('/api/payment/process', paymentInfo);
      console.log('Payment response:', response.data); // ⚠️ Shows transaction details
      console.log('User email:', formData.email); // PII exposure
      
      if (response.data.success) {
        console.log('Payment successful!'); // OK message
      }
    } catch (error) {
      console.error('Payment failed:', error); // Shows full error stack
      console.error('Failed data:', paymentInfo); // ⚠️ Shows sensitive data
    }
  };

  const handleInputChange = (field, value) => {
    console.log(`Updating ${field}:`, value); // ⚠️ Could show card number
    setPaymentInfo({ ...paymentInfo, [field]: value });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
};
```

**Problems:**
- ❌ Credit card numbers visible in console
- ❌ User personal information exposed
- ❌ Internal API structure revealed
- ❌ Error details show sensitive data
- ❌ All this is visible in production!

---

## ✅ AFTER (Production-Safe)

```javascript
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import devLogger from '../utils/devLogger'; // Import devLogger

const PaymentPage = () => {
  const [formData, setFormData] = useState({});
  const [paymentInfo, setPaymentInfo] = useState({});
  
  useEffect(() => {
    devLogger.log('PaymentPage mounted'); // Hidden in production
    devLogger.data('Form data', devLogger.sanitize(formData)); // Sanitized
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    devLogger.log('Processing payment...'); // Hidden in production
    devLogger.payment('Payment data', devLogger.sanitize(paymentInfo)); // Sanitized & hidden
    devLogger.api('POST', '/api/payment/process'); // API calls hidden
    
    try {
      const response = await api.post('/api/payment/process', paymentInfo);
      devLogger.api('Response', '/api/payment/process', { 
        success: response.data.success,
        // Don't log full response, just what's needed
      });
      
      if (response.data.success) {
        devLogger.info('Payment successful!'); // ✅ Safe to show users
      }
    } catch (error) {
      devLogger.error('Payment failed:', error.message); // Generic message in production
      devLogger.payment('Failed payment attempt', devLogger.sanitize(paymentInfo)); // Hidden in production
    }
  };

  const handleInputChange = (field, value) => {
    // Only log non-sensitive fields, or sanitize
    if (['cardNumber', 'cvv'].includes(field)) {
      devLogger.payment(`Updating ${field}`, '***'); // Don't log actual value
    } else {
      devLogger.log(`Updating ${field}:`, value); // Hidden in production
    }
    setPaymentInfo({ ...paymentInfo, [field]: value });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
};
```

**Benefits:**
- ✅ All sensitive data hidden in production
- ✅ Debugging still works in development
- ✅ Automatic data sanitization
- ✅ Clear intent with specific methods
- ✅ Production console is clean

---

## 🎯 Real-World Example: EnrollmentForm Component

### Key Areas to Update

```javascript
import devLogger from '../utils/devLogger';

// 1. Component lifecycle
useEffect(() => {
  devLogger.log('EnrollmentForm mounted');
  devLogger.state('EnrollmentForm', 'clubId', selectedClub.id);
}, []);

// 2. Form submission
const handleSubmit = async () => {
  devLogger.group('Enrollment Submission');
  devLogger.form('EnrollmentForm', devLogger.sanitize(formData));
  
  try {
    const response = await api.post('/api/enrollment', formData);
    devLogger.api('Response', '/api/enrollment', { 
      success: response.data.success,
      custCode: response.data.custCode 
    });
  } catch (error) {
    devLogger.error('Enrollment failed:', error);
  }
  
  devLogger.groupEnd();
};

// 3. State updates
const handleFieldChange = (field, value) => {
  devLogger.state('EnrollmentForm', field, 
    ['ssn', 'dateOfBirth'].includes(field) ? '***' : value
  );
  setFormData({ ...formData, [field]: value });
};

// 4. API calls
const fetchMembershipPrice = async () => {
  devLogger.api('GET', `/api/enrollment/price?type=${membershipType}`);
  
  try {
    const response = await api.get(`/api/enrollment/price?type=${membershipType}`);
    devLogger.api('Response', '/api/enrollment/price', response.data);
    setPrice(response.data.price);
  } catch (error) {
    devLogger.error('Failed to fetch price:', error);
  }
};

// 5. Database/backend data
const saveToDatabase = async (data) => {
  devLogger.data('Saving enrollment', devLogger.sanitize(data));
  
  const result = await submitToBackend(data);
  
  devLogger.data('Database result', { 
    success: result.success,
    id: result.id 
  });
};
```

---

## 📊 Quick Migration Checklist

For each component:

- [ ] Import `devLogger` at the top
- [ ] Replace `console.log()` with `devLogger.log()`
- [ ] Replace `console.error()` with `devLogger.error()`
- [ ] Use `devLogger.api()` for API calls
- [ ] Use `devLogger.form()` for form data
- [ ] Use `devLogger.payment()` for payment data
- [ ] Use `devLogger.state()` for state changes
- [ ] Sanitize sensitive data with `devLogger.sanitize()`
- [ ] Use `devLogger.info()` only for user-safe messages
- [ ] Test in production build to verify logs are hidden

---

## 🧪 Testing Your Migration

```bash
# 1. Build for production
cd frontend
npm run build

# 2. Serve the production build
npm run preview

# 3. Open browser DevTools (F12) and check:
# - No [DEV] logs visible
# - No [API] logs visible
# - No form/payment data visible
# - Only devLogger.info() messages visible (if any)

# 4. Switch back to development
npm start

# 5. Verify all logs appear in development
```

---

## 💡 Pro Tips

### 1. Use Grouped Logs for Complex Operations

```javascript
devLogger.group('PDF Generation');
devLogger.time('PDF Generation');

devLogger.log('Step 1: Fetching data');
const data = await fetchData();

devLogger.log('Step 2: Generating PDF');
const pdf = generatePDF(data);

devLogger.log('Step 3: Saving PDF');
await savePDF(pdf);

devLogger.timeEnd('PDF Generation');
devLogger.groupEnd();
```

### 2. Create Helper Functions

```javascript
const logAPICall = (method, url, data) => {
  devLogger.api(method, url, devLogger.sanitize(data));
};

// Usage
logAPICall('POST', '/api/enrollment', formData);
```

### 3. Conditional Complex Logging

```javascript
import { logOnlyInDev } from '../utils/devLogger';

logOnlyInDev(() => {
  console.table(userData);
  console.dir(complexObject, { depth: 3 });
  console.trace('Call stack');
});
```

### 4. Feature Flags with Logging

```javascript
if (devLogger.isDevelopment()) {
  // Enable debug features
  window.debugTools = {
    getFormData: () => formData,
    resetForm: () => setFormData({}),
    // etc.
  };
}
```

---

## 🔍 Common Patterns

### Pattern 1: Form Validation Logging

```javascript
const validateForm = (data) => {
  devLogger.group('Form Validation');
  
  const errors = {};
  
  if (!data.email) {
    devLogger.warn('Email is required');
    errors.email = 'Required';
  }
  
  if (!isValidCard(data.cardNumber)) {
    devLogger.warn('Invalid card number');
    errors.cardNumber = 'Invalid';
  }
  
  devLogger.log('Validation result:', { isValid: Object.keys(errors).length === 0 });
  devLogger.groupEnd();
  
  return errors;
};
```

### Pattern 2: Redux/State Management

```javascript
const dispatch = (action) => {
  devLogger.state('Store', action.type, devLogger.sanitize(action.payload));
  return actualDispatch(action);
};
```

### Pattern 3: Route Changes

```javascript
useEffect(() => {
  devLogger.log(`Navigated to: ${location.pathname}`);
}, [location]);
```

---

**Remember:** When in doubt, use `devLogger` instead of `console.log()`. It's always safer! 🔒


