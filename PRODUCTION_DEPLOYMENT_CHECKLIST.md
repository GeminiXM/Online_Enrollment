# Production Deployment Checklist

## 📋 Complete Pre-Production Checklist

Use this checklist before deploying to production to ensure everything is properly configured and monitored.

---

## ✅ Phase 1: Configuration & Environment

### Environment Variables
- [ ] Set `NODE_ENV=production` in backend
- [ ] Set `NODE_ENV=production` for frontend build
- [ ] Configure all database connection strings
- [ ] Verify SMTP email settings (host, port, user, password)
- [ ] Set error notification emails (`ERROR_NOTIFICATION_EMAILS`)
- [ ] Set critical alert emails (`CRITICAL_ALERT_EMAILS`)
- [ ] Configure payment processor credentials (Converge, FluidPay)
- [ ] Set CORS allowed origins for production domain
- [ ] Remove or comment out debug environment variables

### Security
- [ ] Change all default passwords
- [ ] Update SMTP password if using default
- [ ] Verify database user permissions (minimum required)
- [ ] Check firewall rules (ports 5001 for backend)
- [ ] Ensure sensitive data is not in git repository
- [ ] Review `.gitignore` file
- [ ] Verify SSL/TLS certificates for production domain

---

## ✅ Phase 2: Code & File Cleanup

### Remove Development Files
- [ ] Run cleanup script from `FILES_TO_REMOVE_BEFORE_PRODUCTION.md`
- [ ] Remove all test scripts (`backend/test-*.js`, `test-*.js`)
- [ ] Remove frontend test HTML files (`frontend/public/*test*.html`)
- [ ] Remove demo/iframe files (`frontend/public/*demo*.html`)
- [ ] Delete old CSS backups (`EnrollmentForm_*.css`)
- [ ] Delete duplicate files (`PaymentPage.css/jsx` in root)
- [ ] Delete misplaced SQL files (`frontend/src/contexts/*.sql`)
- [ ] Delete invalid files (`frontend/src/utils/invalid*.js`)
- [ ] Delete old static logs (`backend/logs/all.log`, `error.log`)
- [ ] Optionally delete test PDF contracts (`backend/src/contracts/*.pdf`)

### Remove Documentation/Planning Files
- [ ] Remove temporary Office files (`~$*.docx`, `~$*.xlsx`)
- [ ] Remove planning spreadsheets (unless needed for reference)
- [ ] Remove old Word documents (unless needed for reference)
- [ ] Keep only essential docs: README.md, setup guides, monitoring docs

### Code Review
- [ ] Remove all `console.log()` debug statements (or ensure they're captured)
- [ ] Remove commented-out code blocks
- [ ] Verify no hardcoded credentials
- [ ] Check for `TODO` or `FIXME` comments
- [ ] Ensure development routes are hidden (header toggle works)

---

## ✅ Phase 3: Testing & Verification

### Health Checks
- [ ] Test `/api/health` endpoint - returns OK
- [ ] Test `/api/health/detailed` - all services show as connected
- [ ] Test `/api/health/database/254` - database connects successfully
- [ ] Test `/api/health/database/259` - database connects successfully
- [ ] Test `/api/health/database/266` - database connects successfully
- [ ] Test `/api/health/stats` - returns memory and CPU info

### Functional Testing
- [ ] Test complete enrollment flow (form → contract → payment → confirmation)
- [ ] Test Converge payment processing
- [ ] Test FluidPay payment processing
- [ ] Test email sending (welcome email received)
- [ ] Test PDF contract generation
- [ ] Test family member enrollments
- [ ] Test different membership types
- [ ] Test different clubs
- [ ] Verify data saves to correct database tables
- [ ] Test signature functionality
- [ ] Test form validation
- [ ] Test error handling (intentionally cause error, verify email received)

### Email Testing
- [ ] Send test enrollment → verify welcome email received
- [ ] Test error notification: `/api/enrollment/test-error-notification`
- [ ] Test critical alert: `/api/health/test-email-alert`
- [ ] Verify PDF attachment in welcome email
- [ ] Check email formatting in different email clients
- [ ] Verify email sent from correct address

### Logging & Monitoring
- [ ] Verify logs are being written to rotating files
- [ ] Check log file permissions
- [ ] Verify old logs are auto-deleted per retention policy
- [ ] Test frontend console log capture (in production build)
- [ ] Verify error logs capture full stack traces
- [ ] Check HTTP request logging works

---

## ✅ Phase 4: Monitoring & Alerts Setup

### External Monitoring
- [ ] Set up UptimeRobot or similar service
- [ ] Monitor `https://your-domain/api/health` every 5 minutes
- [ ] Configure alert if response time > 5 seconds
- [ ] Configure alert if status code != 200
- [ ] Add SMS/phone alerts for critical failures
- [ ] Test monitoring service (stop server, verify alert received)

### Email Alerts Configuration
- [ ] Verify error notification emails configured
- [ ] Verify critical alert emails configured
- [ ] Set up email filtering rules:
  - 🔴 CRITICAL alerts → SMS/Immediate notification
  - ⚠️ Errors → Flag for review
  - ✅ Service restored → Archive
- [ ] Test alert email delivery
- [ ] Verify alert emails not going to spam

### Log Monitoring
- [ ] Set up log review schedule (daily, weekly)
- [ ] Document how to access logs
- [ ] Train team on log analysis
- [ ] Set up log backup (optional)

---

## ✅ Phase 5: Performance & Optimization

### Backend Performance
- [ ] Verify database connection pooling configured
- [ ] Check memory usage under load (`/api/health/stats`)
- [ ] Optimize slow database queries
- [ ] Enable gzip compression for API responses
- [ ] Set appropriate cache headers

### Frontend Performance
- [ ] Build production frontend (`npm run build`)
- [ ] Verify bundle size is optimized
- [ ] Check for console errors in production build
- [ ] Test on slow network connection
- [ ] Verify images are optimized
- [ ] Test on different browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile devices

### Load Testing (Optional but Recommended)
- [ ] Test with 10 concurrent users
- [ ] Test with 50 concurrent users
- [ ] Monitor memory usage during load
- [ ] Check for memory leaks (monitor over 24 hours)
- [ ] Verify database handles concurrent connections

---

## ✅ Phase 6: Documentation & Training

### Documentation
- [ ] Update README.md with production setup instructions
- [ ] Document all environment variables needed
- [ ] Create runbook for common issues
- [ ] Document emergency contacts
- [ ] Document rollback procedure
- [ ] Keep monitoring guide accessible (`PRODUCTION_MONITORING_GUIDE.md`)

### Team Training
- [ ] Train team on how to check health endpoints
- [ ] Train team on how to read logs
- [ ] Train team on alert response procedures
- [ ] Train team on how to manually complete failed enrollments
- [ ] Document escalation procedures
- [ ] Create on-call rotation (if applicable)

---

## ✅ Phase 7: Deployment

### Pre-Deployment
- [ ] Backup production database (if applicable)
- [ ] Create git tag/release for deployment version
- [ ] Notify team of deployment window
- [ ] Schedule deployment during low-traffic period
- [ ] Have rollback plan ready

### Deployment Steps
- [ ] Stop current production services
- [ ] Deploy new code to production server
- [ ] Install dependencies (`npm install` in backend and frontend)
- [ ] Build frontend (`npm run build`)
- [ ] Update environment variables
- [ ] Start backend service
- [ ] Start frontend service  
- [ ] Start port forwarder (if using Cloudflare tunnels)
- [ ] Verify Cloudflare tunnels are running

### Post-Deployment Verification
- [ ] Test health endpoint immediately
- [ ] Test one complete enrollment
- [ ] Verify email was sent
- [ ] Check logs for errors
- [ ] Monitor for 30 minutes
- [ ] Verify external monitoring is reporting healthy

---

## ✅ Phase 8: Post-Deployment

### First 24 Hours
- [ ] Monitor error alerts closely
- [ ] Review logs every 4 hours
- [ ] Check health endpoints regularly
- [ ] Monitor system resources (memory, CPU)
- [ ] Verify enrollments are completing successfully
- [ ] Check that emails are being sent
- [ ] Monitor payment processor transactions

### First Week
- [ ] Daily log review
- [ ] Check error trends
- [ ] Monitor system performance
- [ ] Verify alerts are working
- [ ] Collect user feedback
- [ ] Address any issues immediately

### Ongoing
- [ ] Weekly health check review
- [ ] Monthly log analysis
- [ ] Review and update monitoring
- [ ] Update documentation as needed
- [ ] Plan improvements based on issues found

---

## 🚨 Rollback Procedure

If critical issues occur:

1. **Immediate Actions**
   - [ ] Stop new enrollments (display maintenance message)
   - [ ] Notify team of issue
   - [ ] Check if data corruption occurred

2. **Rollback Steps**
   - [ ] Stop production services
   - [ ] Restore previous code version (from git tag)
   - [ ] Restore database backup (if data corrupted)
   - [ ] Restart services
   - [ ] Verify health endpoints

3. **Post-Rollback**
   - [ ] Investigate root cause
   - [ ] Fix issue in development
   - [ ] Test thoroughly
   - [ ] Schedule re-deployment

---

## 📊 Success Criteria

Deployment is successful when:
- ✅ All health checks return "OK"
- ✅ Complete enrollment flow works end-to-end
- ✅ Welcome emails are being sent
- ✅ Payments are processing successfully
- ✅ No critical errors in logs for 1 hour
- ✅ External monitoring shows 100% uptime
- ✅ Alert emails are being received
- ✅ Team can access and understand logs

---

## 📞 Emergency Contacts

**Primary Contact:** mmoore@wellbridge.com  
**Secondary Contact:** [Manager Email]  
**Database Admin:** [DBA Contact]  
**Hosting Support:** [Hosting Provider]  
**Payment Processor Support:**
- Converge: [Support Phone/Email]
- FluidPay: [Support Phone/Email]

---

## 📚 Reference Documents

- Health & Monitoring: `PRODUCTION_MONITORING_GUIDE.md`
- Error Notifications: `ERROR_NOTIFICATION_SETUP.md`  
- Logging System: `LOGGING_SYSTEM.md`
- File Cleanup: `FILES_TO_REMOVE_BEFORE_PRODUCTION.md`
- Setup Instructions: `README.md`

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Version/Tag:** _______________  
**Sign-off:** _______________  

---

## ✅ Final Checklist Sign-off

- [ ] All configuration verified
- [ ] All files cleaned up
- [ ] All tests passed
- [ ] Monitoring configured
- [ ] Team trained
- [ ] Documentation complete
- [ ] Deployment successful
- [ ] Post-deployment verification complete

**Ready for Production:** YES / NO

---

**Last Updated:** September 30, 2025
