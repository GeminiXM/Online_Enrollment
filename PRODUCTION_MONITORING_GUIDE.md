# Production Monitoring & Problem Detection Guide

## 🎯 Overview

This guide covers all the monitoring tools, health checks, and alerting systems to help you track down problems and know when something has stopped working in production.

---

## 📊 Health Check Endpoints

### 1. Basic Health Check
```bash
GET http://your-domain/api/health
```
**Returns:** Simple OK status with uptime

**Use Case:** Quick check if API is running

**Response:**
```json
{
  "status": "OK",
  "message": "API is running",
  "timestamp": "2025-09-30T10:00:00.000Z",
  "uptime": 86400
}
```

### 2. Detailed Health Check
```bash
GET http://your-domain/api/health/detailed
```
**Returns:** Full system health including database connections, memory, CPU

**Use Case:** Comprehensive system status check

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-09-30T10:00:00.000Z",
  "uptime": 86400,
  "environment": "production",
  "server": {
    "platform": "win32",
    "memory": { "total": "16GB", "free": "8GB", "used": "8GB" },
    "cpu": { "cores": 8, "loadAverage": [1.2, 1.5, 1.3] }
  },
  "services": {
    "database": {
      "club_254": "connected",
      "club_259": "connected",
      "club_266": "connected"
    },
    "email": "configured"
  }
}
```

### 3. Database Health Check (Specific Club)
```bash
GET http://your-domain/api/health/database/254
```
**Returns:** Connection status and response time for specific club

**Use Case:** Test specific club database connectivity

### 4. Application Statistics
```bash
GET http://your-domain/api/health/stats
```
**Returns:** Memory usage, CPU usage, uptime

**Use Case:** Monitor resource consumption

---

## 🚨 Automated Alerts

### Email Alerts Configured

**Error Notifications** (Already Set Up):
- All application errors
- Frontend crashes
- Unhandled exceptions

**Critical Alerts** (New):
1. **Database Connection Failures**
   - When: Database unreachable for any club
   - Impact: Users can't enroll
   - Alert includes: Club ID, error message, consecutive failures

2. **Payment Processor Failures**
   - When: Converge/FluidPay service is down
   - Impact: Users can't complete payments
   - Alert includes: Processor name, club, error details

3. **Enrollment Submission Failures**
   - When: Enrollment fails after payment
   - Impact: User paid but not enrolled
   - Alert includes: User details, club, error (for manual completion)

4. **Email Service Failures**
   - When: Welcome email fails to send
   - Impact: User doesn't receive contract
   - Alert includes: Recipient email, error (to manually send)

5. **High Error Rate**
   - When: Many errors in short time window
   - Impact: Possible widespread system issues
   - Alert includes: Error count, time window

6. **Service Restored**
   - When: Previously failed service is working again
   - Info: Downtime duration

### Configure Alert Recipients

Add to `backend/.env`:
```env
# Critical alerts (database, payment processor failures)
CRITICAL_ALERT_EMAILS=manager@wellbridge.com,oncall@wellbridge.com

# Error notifications (code errors, exceptions)
ERROR_NOTIFICATION_EMAILS=developer@wellbridge.com,mmoore@wellbridge.com

# Force alerts in development for testing
SEND_CRITICAL_ALERTS=false
SEND_ERROR_EMAILS=false
```

---

## 📝 Logging & Log Analysis

### Log Files Location
```
backend/logs/
├── application-2025-09-30.log  (all logs, 14-day retention)
├── error-2025-09-30.log        (errors only, 30-day retention)
└── http-2025-09-30.log         (HTTP requests, 7-day retention)
```

### Quick Log Commands

**View latest errors:**
```powershell
Get-Content backend/logs/error-2025-09-30.log -Tail 50 -Wait
```

**Search for specific user:**
```powershell
Select-String "SESSION-abc123" backend/logs/application-*.log
```

**Count errors today:**
```powershell
(Select-String "error" backend/logs/error-2025-09-30.log).Count
```

**Find database errors:**
```powershell
Select-String -Pattern "database|connection" backend/logs/error-*.log
```

**Monitor logs in real-time:**
```powershell
Get-Content backend/logs/application-2025-09-30.log -Tail 20 -Wait
```

### What to Look For

**🔴 Critical Issues:**
- `Database connection failed`
- `Payment processor error`
- `ECONNREFUSED`
- `ETIMEDOUT`
- `500` status codes

**⚠️ Warning Signs:**
- `High memory usage`
- Multiple `429` (rate limit) errors
- `SMTP` email errors
- `Unable to load`

**✅ Normal Operations:**
- `info: Enrollment submitted`
- `200` status codes
- `Email sent successfully`
- `Connected to database`

---

## 🔍 Troubleshooting Workflows

### Problem: User Reports Error

1. **Get Session ID**
   - Check error email alert
   - Or ask user to check browser console

2. **Search Logs**
   ```powershell
   Select-String "SESSION-{id}" backend/logs/application-*.log
   ```

3. **Check Timeline**
   - Review all logs from that session
   - Look for errors before user's action

4. **Get Frontend Logs**
   - Ask user to run: `window.sendConsoleLogs()` in browser console
   - Or: `window.downloadConsoleLogs()` to download

### Problem: Enrollments Failing

1. **Check Database Health**
   ```bash
   GET /api/health/database/254
   ```

2. **Review Error Logs**
   ```powershell
   Get-Content backend/logs/error-2025-09-30.log -Tail 100
   ```

3. **Check for Alerts**
   - Check email for database/payment alerts

4. **Test Enrollment Flow**
   - Try test enrollment
   - Check each step (form → contract → payment)

### Problem: No Emails Being Sent

1. **Check SMTP Settings**
   ```bash
   GET /api/health/detailed
   ```

2. **Review Email Logs**
   ```powershell
   Select-String "email" backend/logs/application-*.log | Select-Object -Last 20
   ```

3. **Test Email System**
   ```bash
   POST /api/health/test-email-alert
   ```

4. **Check Email Alerts**
   - Should receive "Email Service Failure" alert

### Problem: Payment Processor Down

1. **Check Health**
   ```bash
   GET /api/health/detailed
   ```

2. **Review Payment Logs**
   ```powershell
   Select-String "payment|converge|fluidpay" backend/logs/error-*.log
   ```

3. **Test Processors**
   - Check processor status pages
   - Verify API credentials in `.env`

4. **Check for Alerts**
   - Should receive "Payment Processor Down" alert

### Problem: High Error Rate

1. **Count Recent Errors**
   ```powershell
   (Select-String "error" backend/logs/error-2025-09-30.log | 
    Where-Object {$_.Line -match (Get-Date).ToString("HH:")}
   ).Count
   ```

2. **Identify Pattern**
   ```powershell
   Select-String "error" backend/logs/error-2025-09-30.log | 
   Group-Object {$_.Line -replace '.*error: (.*?) \{.*','$1'} | 
   Sort-Object Count -Descending
   ```

3. **Check System Resources**
   ```bash
   GET /api/health/stats
   ```

4. **Review Recent Deployments**
   - Was code recently changed?
   - Check git history

---

## 📈 Monitoring Best Practices

### Daily Checks

**Morning:**
- [ ] Check `/api/health/detailed` - Verify all systems green
- [ ] Review error logs from previous day
- [ ] Check email for any overnight alerts

**During Business Hours:**
- [ ] Monitor error email alerts
- [ ] Check logs if user reports issue
- [ ] Verify enrollment completions in database

**Evening:**
- [ ] Review error count for the day
- [ ] Check system stats (memory, CPU)
- [ ] Verify log rotation working

### Weekly Checks

- [ ] Review error trends (are certain errors increasing?)
- [ ] Check disk space usage for logs
- [ ] Test health endpoints
- [ ] Verify email alerts working (send test alert)
- [ ] Review database connection stability

### Monthly Checks

- [ ] Review all alert emails
- [ ] Analyze enrollment success rate
- [ ] Check for outdated logs (should auto-delete)
- [ ] Update monitoring documentation
- [ ] Review and update alert recipients

---

## 🛠️ Monitoring Tools Setup

### 1. Set Up URL Monitoring (Recommended)

Use a service like:
- **UptimeRobot** (free) - https://uptimerobot.com
- **Pingdom** - https://pingdom.com
- **StatusCake** - https://statuscake.com

**Configure:**
- Monitor: `https://your-domain/api/health`
- Interval: Every 5 minutes
- Alert if: Response time > 5 seconds OR status != 200
- Alert via: Email/SMS

### 2. Windows Task Scheduler Health Check (Optional)

Create a scheduled task to check health every 15 minutes:

```powershell
# Save as: check-health.ps1
$response = Invoke-RestMethod -Uri "https://your-domain/api/health/detailed"
if ($response.status -ne "OK") {
    # Send alert or log issue
    Write-EventLog -LogName Application -Source "OnlineEnrollment" `
                   -EntryType Error -EventId 1000 `
                   -Message "Health check failed: $($response | ConvertTo-Json)"
}
```

### 3. Email Filter Rules

Set up email filters to:
- **🔴 CRITICAL alerts** → Send SMS/notification
- **⚠️ Warning alerts** → Flag for review
- **✅ Service restored** → Mark as read

---

## 📋 Pre-Production Checklist

Before deploying to production, verify:

### Configuration
- [ ] `NODE_ENV=production` set
- [ ] All `.env` variables configured
- [ ] Error notification emails configured
- [ ] Critical alert emails configured
- [ ] SMTP settings verified

### Testing
- [ ] Test all health endpoints
- [ ] Verify database connections
- [ ] Test email sending
- [ ] Test error alerts (send test error)
- [ ] Test critical alerts
- [ ] Verify logs are rotating

### Monitoring
- [ ] Set up external uptime monitoring
- [ ] Configure email alerts
- [ ] Test alert notifications
- [ ] Document incident response procedures

### Cleanup
- [ ] Remove development/test files (see `FILES_TO_REMOVE_BEFORE_PRODUCTION.md`)
- [ ] Remove test data from database
- [ ] Clear old logs
- [ ] Remove debug code

---

## 🔔 Alert Response Guide

### When You Receive an Alert

**1. Database Connection Failed**
- Check database server status
- Verify network connectivity
- Check database credentials
- Review firewall rules
- **ETA to Fix:** 5-30 minutes

**2. Payment Processor Down**
- Check processor status page
- Verify API credentials
- Test with their test environment
- Contact processor support if needed
- **ETA to Fix:** 15 minutes - 2 hours (depends on processor)

**3. Enrollment Submission Failed**
- Retrieve user details from alert
- Check if payment was processed
- Manually complete enrollment in database
- Send welcome email manually
- Contact user to confirm
- **ETA to Fix:** 30 minutes per user

**4. Email Service Failure**
- Check SMTP server status
- Verify credentials
- Test with test email
- Manually send welcome email to user
- **ETA to Fix:** 15-30 minutes

**5. High Error Rate**
- Check health endpoint immediately
- Review recent error logs
- Check system resources (memory, CPU)
- Rollback recent deployment if needed
- **ETA to Fix:** 30 minutes - 2 hours

---

## 📞 Escalation Procedures

**Level 1: Minor Issues** (Handle during business hours)
- Individual enrollment failures
- Email delivery issues
- Performance degradation

**Level 2: Service Degradation** (Handle within 1 hour)
- Database connection issues for one club
- Payment processor intermittent failures
- High error rate

**Level 3: Critical Outage** (Handle immediately)
- Complete database failure
- Payment processor down for all clubs
- Application completely unreachable

**Contact Chain:**
1. Primary: mmoore@wellbridge.com
2. Secondary: [Manager email]
3. Escalation: [IT Director]

---

## 📚 Additional Resources

- **Error Notifications:** `ERROR_NOTIFICATION_SETUP.md`
- **Logging System:** `LOGGING_SYSTEM.md`
- **File Cleanup:** `FILES_TO_REMOVE_BEFORE_PRODUCTION.md`
- **Health Check API:** `/api/health/*`

---

**Last Updated:** September 30, 2025









