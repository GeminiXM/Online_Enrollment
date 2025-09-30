# Production Logging System

## Overview

The Online Enrollment System now includes a comprehensive logging infrastructure for both backend and frontend, with automatic log rotation, console capture, and production-ready features.

## Backend Logging

### Features

✅ **Daily Log Rotation**
- Logs automatically rotate daily
- Old logs are automatically deleted based on retention policy
- Files are named with dates: `application-2025-09-30.log`

✅ **Size-Based Rotation**
- Logs rotate when they reach 20MB
- Prevents disk space issues

✅ **Multiple Log Files**
- **Application Logs** (`application-YYYY-MM-DD.log`) - All info-level and above logs (14-day retention)
- **Error Logs** (`error-YYYY-MM-DD.log`) - Error-level only (30-day retention)
- **HTTP Logs** (`http-YYYY-MM-DD.log`) - HTTP request logs (7-day retention)

✅ **Production Optimized**
- Info level in production (reduces noise)
- Debug level in development (detailed debugging)
- Structured logging with timestamps and metadata

### Log Levels

```javascript
logger.error('Critical error occurred', { userId: 123, error: err.message });
logger.warn('Warning: High memory usage', { usage: '85%' });
logger.info('User logged in', { userId: 123, ip: req.ip });
logger.http('GET /api/users', { status: 200, duration: '45ms' });
logger.debug('Debugging info', { variable: value });
```

### Log Files Location

All logs are stored in: `backend/logs/`

```
backend/logs/
├── application-2025-09-30.log  (General application logs)
├── error-2025-09-30.log         (Error logs only)
├── http-2025-09-30.log          (HTTP request logs)
└── [older rotated logs]
```

### Log Retention

| Log Type | Retention Period | Max File Size | Rotation |
|----------|-----------------|---------------|----------|
| Application | 14 days | 20MB | Daily or when full |
| Errors | 30 days | 20MB | Daily or when full |
| HTTP | 7 days | 20MB | Daily or when full |

### Log Format

```
2025-09-30 14:23:15:123 info: User submitted enrollment {"userId":"12345","clubId":"254","amount":"99.99"}
2025-09-30 14:23:16:456 error: Database connection failed {"error":"Connection timeout","host":"db.example.com"}
```

## Frontend Logging

### Features

✅ **Console Capture (Production Only)**
- Automatically captures all `console.log()`, `console.error()`, `console.warn()` calls
- Stores logs in memory and localStorage
- Only active in production mode

✅ **Local Storage**
- Keeps last 200 console logs in localStorage
- Persists across page refreshes
- Error logs are stored immediately

✅ **Send Logs to Backend**
- Logs can be sent to backend for debugging
- Stored in backend log files with `[Frontend SESSION-ID]` prefix
- Useful for troubleshooting user issues

✅ **Download Logs**
- Users can download their console logs as a text file
- Helpful for support tickets

### Using Frontend Logging

**Automatic Capture (Production):**
```javascript
// These are automatically captured in production
console.log('User clicked submit button');
console.error('API call failed:', error);
console.warn('Network slow');
```

**Manual Functions:**

In the browser console, you can use:

```javascript
// Send all captured logs to backend
window.sendConsoleLogs()

// Download logs as a file
window.downloadConsoleLogs()
```

**In Code:**
```javascript
import consoleLogger from './utils/consoleLogger';

// Send logs to backend
await consoleLogger.sendLogsToBackend();

// Download logs
consoleLogger.downloadLogs();

// Get logs array
const logs = consoleLogger.getLogs();

// Clear logs
consoleLogger.clearLogs();
```

## Log Management

### Viewing Logs

**Backend Logs:**
```bash
# View latest application logs
tail -f backend/logs/application-2025-09-30.log

# View latest error logs
tail -f backend/logs/error-2025-09-30.log

# Search for specific errors
grep "error" backend/logs/application-2025-09-30.log

# View all logs from a specific date
cat backend/logs/application-2025-09-28.log
```

**Frontend Logs:**
```bash
# Frontend logs are sent to backend with [Frontend] prefix
grep "\[Frontend" backend/logs/application-2025-09-30.log
```

### Log Rotation Schedule

Logs rotate automatically:
- **Daily** - At midnight (00:00)
- **Size-based** - When file reaches 20MB
- **Auto-cleanup** - Old logs deleted per retention policy

### Disk Space Management

Estimated disk usage:
- Application logs: ~280MB (14 days × 20MB)
- Error logs: ~600MB (30 days × 20MB)  
- HTTP logs: ~140MB (7 days × 20MB)
- **Total: ~1GB maximum**

Old logs are automatically deleted, so disk space is self-managing.

### Production Deployment

**Environment Variables:**

Add to `backend/.env`:
```env
# Logging Configuration
NODE_ENV=production           # Sets log level to 'info'
LOG_LEVEL=info               # Optional: Override default log level
```

**Log Levels by Environment:**
- **Production**: `info` (info, warn, error)
- **Development**: `debug` (all levels including debug)

## Troubleshooting with Logs

### Common Scenarios

**1. User Reports Error:**
```bash
# Ask user for their session ID (shown in browser console or error page)
# Then search logs for that session
grep "SESSION-abc123" backend/logs/application-2025-09-30.log
```

**2. API Errors:**
```bash
# Check error logs
tail -100 backend/logs/error-2025-09-30.log

# Or check HTTP logs for failed requests
grep "500\|400\|404" backend/logs/http-2025-09-30.log
```

**3. Performance Issues:**
```bash
# Check for slow requests in HTTP logs
grep "duration.*[5-9][0-9][0-9]ms" backend/logs/http-2025-09-30.log
```

**4. Database Issues:**
```bash
# Search for database-related errors
grep -i "database\|connection\|query" backend/logs/error-2025-09-30.log
```

**5. Frontend Issues:**
```bash
# View frontend console logs sent to backend
grep "\[Frontend" backend/logs/application-2025-09-30.log
```

### Debugging User Issues

When a user reports a problem:

1. **Get Session ID** - Ask user to check browser console or error page
2. **Search Logs** - `grep "SESSION-ID" backend/logs/`
3. **Check Timeline** - Look at all logs from that session
4. **Request Frontend Logs** - Ask user to run `window.sendConsoleLogs()` in browser console
5. **Download User Logs** - Ask user to run `window.downloadConsoleLogs()` and send file

## Log Analysis Tools

### Recommended Tools

**1. Simple Text Search:**
```bash
grep -r "error" backend/logs/
```

**2. Log Viewers:**
- **PowerShell:** `Get-Content backend/logs/application-2025-09-30.log -Tail 50 -Wait`
- **Windows:** Use Notepad++, VS Code, or any text editor
- **Advanced:** Use tools like Loggly, Splunk, or ELK stack (for large scale)

**3. Filter by Date Range:**
```bash
# Get all logs from September 28-30
cat backend/logs/application-2025-09-{28,29,30}.log | grep "error"
```

## Best Practices

### When to Log

**DO Log:**
- ✅ Errors and exceptions
- ✅ Important business events (enrollment submitted, payment processed)
- ✅ Authentication events (login, logout)
- ✅ API requests (method, URL, status, duration)
- ✅ Database queries (in debug mode)
- ✅ External service calls

**DON'T Log:**
- ❌ Sensitive data (passwords, credit cards, SSN)
- ❌ Excessive debug info in production
- ❌ Every function call (too noisy)
- ❌ Personal user data unnecessarily

### Log Format Tips

**Good:**
```javascript
logger.error('Payment processing failed', {
  userId: user.id,
  amount: payment.amount,
  error: err.message,
  timestamp: new Date().toISOString()
});
```

**Bad:**
```javascript
logger.error('Error!'); // Not helpful
logger.error(err); // Missing context
```

### Security Considerations

The system automatically redacts sensitive fields:
- Passwords
- Credit card numbers
- CVV codes
- SSN

But always be careful what you log!

## Monitoring and Alerts

### Current Setup

✅ **Error Email Notifications** - See `ERROR_NOTIFICATION_SETUP.md`
✅ **Log Rotation** - Automatic
✅ **Log Retention** - Automatic cleanup

### Future Enhancements

Consider adding:
- [ ] Log aggregation service (Loggly, Papertrail)
- [ ] Real-time log monitoring dashboard
- [ ] Automated alerts for error thresholds
- [ ] Log analytics and metrics
- [ ] Centralized logging for multiple servers

## Files Modified/Created

### Backend Files

**Modified:**
- `backend/src/utils/logger.js` - Enhanced with log rotation

**Dependencies Added:**
- `winston-daily-rotate-file` - Daily log rotation

### Frontend Files

**Created:**
- `frontend/src/utils/consoleLogger.js` - Console capture system

**Modified:**
- `frontend/src/index.js` - Initialize console logger

**Backend Routes:**
- `backend/src/routes/enrollmentRoutes.js` - Added `/api/enrollment/report-logs` endpoint

## Quick Reference

### Common Commands

```bash
# View live logs
tail -f backend/logs/application-2025-09-30.log

# Count errors today
grep -c "error" backend/logs/error-2025-09-30.log

# Find all database errors
grep -i "database" backend/logs/error-*.log

# Check log file sizes
ls -lh backend/logs/

# Clean up old logs manually (if needed)
# Note: This is automatic, but can be done manually
rm backend/logs/*-2025-08-*.log
```

### Browser Console Commands

```javascript
// Send logs to backend
window.sendConsoleLogs()

// Download logs
window.downloadConsoleLogs()
```

## Support

For questions about the logging system:
- Check logs in `backend/logs/`
- Review `ERROR_NOTIFICATION_SETUP.md` for error notifications
- Contact: mmoore@wellbridge.com

---

**Remember:** Logs are your best friend for debugging production issues! 📝
