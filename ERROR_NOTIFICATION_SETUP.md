# Error Notification System

## Overview

This project now includes a comprehensive error monitoring and notification system that automatically emails you when errors occur in production. The system captures detailed information about errors, user context, and what the user was doing when the error occurred.

## Features

✅ **Backend Error Monitoring**
- Global error handler catches all backend errors
- Captures request details (URL, method, body, params)
- Records user information (IP, user agent, session)
- Sends detailed email notifications in production

✅ **Frontend Error Monitoring**
- React Error Boundary catches component errors
- Global error handler catches unhandled JavaScript errors
- Captures unhandled promise rejections
- Records user session and navigation context
- Sends detailed error reports to backend

✅ **Email Notifications**
- Beautiful HTML email templates with error details
- Stack traces and debugging information
- User and request context
- Only sends in production (configurable)
- Sensitive data is automatically redacted

## Configuration

### 1. Environment Variables

Add these to your `.env` file in the `backend` folder:

```env
# Error Notification Configuration
ERROR_NOTIFICATION_EMAILS=mmoore@wellbridge.com,admin@wellbridge.com
SEND_ERROR_EMAILS=false  # Set to 'true' to force error emails in development
NODE_ENV=production      # Error emails only sent in production by default
```

### 2. Email Recipients

To configure who receives error notifications:

1. Open your `.env` file in the `backend` folder
2. Set `ERROR_NOTIFICATION_EMAILS` to a comma-separated list of email addresses:
   ```env
   ERROR_NOTIFICATION_EMAILS=manager@wellbridge.com,developer@wellbridge.com,support@wellbridge.com
   ```

### 3. SMTP Configuration

The error notification system uses the same SMTP settings as the welcome emails:

```env
SMTP_HOST=wellbridge.prxy.com
SMTP_PORT=25
SMTP_USER=onlineenrollment@wellbridge.com
SMTP_PASS=W3llbridge&0nl1n3
```

## What Gets Captured

### Backend Errors

When an error occurs on the backend, the following information is captured and emailed:

- **Error Details**
  - Error type and message
  - Stack trace
  - Timestamp
  - Environment (production/development)

- **User Information**
  - IP address
  - User agent (browser/device)
  - Session ID

- **Request Information**
  - HTTP method (GET, POST, etc.)
  - URL and route
  - Request parameters
  - Request body (sensitive fields redacted)
  - Query string

### Frontend Errors

When an error occurs in the React app, the following information is captured:

- **Error Details**
  - Error name and message
  - Stack trace
  - Component stack (which components were involved)
  - Timestamp

- **User Context**
  - Current page URL
  - Previous route
  - Session ID
  - Browser user agent

- **Form Data** (if applicable)
  - Any form data the user was entering (sensitive fields redacted)

## Error Email Format

Emails are sent with the subject:
```
🚨 Production Error Alert: [Error Message] - [Context]
```

The email body includes:
1. **Error Details** - Type, message, timestamp
2. **User Information** - Session, IP, browser
3. **Request Information** - URL, method, data
4. **Stack Trace** - Full error stack for debugging
5. **Action Required** - Reminder to investigate

## How It Works

### Backend Error Flow

1. Error occurs in Express route or middleware
2. Global error handler catches it
3. Error details are logged to `logs/error.log`
4. Email notification is sent (production only)
5. Sanitized error response sent to client

### Frontend Error Flow

1. Error occurs in React component or JavaScript
2. Error Boundary or global handler catches it
3. Error details sent to backend API (`/api/enrollment/report-error`)
4. Backend logs error and sends email notification
5. User sees friendly error page

### React Error Boundary

The Error Boundary component provides:
- **Production**: Clean error page with error ID
- **Development**: Detailed error information for debugging

## Testing Error Notifications

### Test in Development

To test error notifications in development mode:

1. Set environment variable:
   ```env
   SEND_ERROR_EMAILS=true
   ```

2. Restart the backend server

3. Trigger an error (see below)

### Trigger Test Errors

**Backend Error:**
```bash
# Visit a non-existent route
curl http://localhost:5001/api/this-route-does-not-exist
```

**Frontend Error:**
```javascript
// Add this to any component temporarily
throw new Error('Test error for notification system');
```

## Production Deployment

### Before Deploying

1. ✅ Set `NODE_ENV=production` in your production environment
2. ✅ Configure `ERROR_NOTIFICATION_EMAILS` with actual recipient emails
3. ✅ Verify SMTP settings are correct for production
4. ✅ Test the error notification system in staging first

### Environment Variables Checklist

```env
# Required for production
NODE_ENV=production
ERROR_NOTIFICATION_EMAILS=your-email@wellbridge.com
SMTP_HOST=wellbridge.prxy.com
SMTP_PORT=25
SMTP_USER=onlineenrollment@wellbridge.com
SMTP_PASS=your-password
```

## Files Added/Modified

### New Files Created

1. **Backend:**
   - `backend/src/services/errorNotificationService.js` - Email notification service
   - `backend/src/middlewares/errorHandler.js` - Global error handler
   - `backend/env-example.txt` - Environment configuration example

2. **Frontend:**
   - `frontend/src/components/ErrorBoundary.jsx` - React Error Boundary
   - `frontend/src/utils/errorLogger.js` - Global error logger

3. **Documentation:**
   - `ERROR_NOTIFICATION_SETUP.md` - This file

### Modified Files

1. **Backend:**
   - `backend/src/app.js` - Added error handling middleware
   - `backend/src/routes/enrollmentRoutes.js` - Added error reporting endpoint

2. **Frontend:**
   - `frontend/src/App.js` - Wrapped app with ErrorBoundary
   - `frontend/src/index.js` - Initialize error logger

## Sensitive Data Protection

The system automatically redacts sensitive information from error reports:

- `password`
- `cardNumber`
- `cvv`
- `ssn`
- `accountNumber`
- `cardVerificationValue`
- `creditCard`

These fields will show as `***REDACTED***` in error emails.

## Troubleshooting

### Not Receiving Error Emails

1. **Check environment:**
   - Ensure `NODE_ENV=production` (or `SEND_ERROR_EMAILS=true` in dev)
   - Verify `ERROR_NOTIFICATION_EMAILS` is set correctly

2. **Check SMTP settings:**
   - Verify SMTP credentials are correct
   - Check firewall/network allows SMTP on port 25

3. **Check logs:**
   - Look in `backend/logs/error.log` for errors
   - Check console for "Error notification email sent successfully"

### Emails Going to Spam

- Add `onlineenrollment@wellbridge.com` to your email safe senders
- Contact IT to whitelist the sender domain

### Too Many Error Emails

If you're getting too many error notifications:

1. Fix the underlying errors first
2. Temporarily disable by setting `SEND_ERROR_EMAILS=false`
3. Consider implementing rate limiting (future enhancement)

## Future Enhancements

Potential improvements to consider:

- [ ] Rate limiting to prevent email flood
- [ ] Error grouping/deduplication
- [ ] Dashboard for viewing errors
- [ ] Slack/Teams integration
- [ ] Error severity levels
- [ ] Automatic retry mechanisms

## Support

For questions or issues with the error notification system:
- Email: mmoore@wellbridge.com
- Check logs in `backend/logs/` directory
- Review this documentation

---

**Remember:** Error notifications only work in production by default. This prevents spam during development while ensuring you're notified of real issues in production.
