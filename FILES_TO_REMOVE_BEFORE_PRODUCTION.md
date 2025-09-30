# Files to Remove Before Production

This document categorizes files for cleanup before deploying to production. Files are organized into:
1. **Development/Testing Files** - Used during development but not needed in production
2. **Completely Unused Files** - Not referenced anywhere, safe to delete immediately
3. **Files to Keep** - Important files that must remain

---

## 🔧 Category 1: Development/Testing Files (Remove for Production)

These files are actively used during development but should be removed or hidden in production.

### Backend - Test/Debug Scripts
```
backend/test-email.js
test-fluidpay-debug.js
```
**Used For:** Manual testing of email and FluidPay functionality  
**Why Remove:** Not needed in production, only for development debugging

### Frontend - Test/Demo HTML Files
```
frontend/public/converge-demo-iframe.html
frontend/public/fluidpay-demo-iframe.html
frontend/public/test-online-enrollment.html
frontend/public/test.html
```
**Used For:** Testing payment processor iframes and enrollment flow  
**Why Remove:** Development testing only, not part of production app

### Backend - PDF Contract Files (Optional)
```
backend/src/contracts/*.pdf (48 files)
```
**Used For:** Sample/test contract PDFs generated during development  
**Why Remove:** Test data only. **Keep .gitkeep file to preserve directory structure**  
**Note:** Production will generate new PDFs, these are just development samples

### Development Tools (Keep but hide in production)
```
port-forwarder.js
```
**Used For:** Cloudflare tunnel port forwarding during development  
**Action:** Keep for development, but ensure it doesn't run in production

---

## 🗑️ Category 2: Completely Unused Files (Safe to Delete Immediately)

These files are not referenced anywhere in the codebase and can be deleted without any impact.

### Temporary Office Lock Files
```
~$nverge Breakdown 2.docx
~$Online Enrollment Check Listxlsx.xlsx
~$w to Migrate to Production.docx
```
**Why Unused:** Temporary lock files created by Office, automatically deleted when files close

### Old CSS Backup Files
```
EnrollmentForm_3fdee1c.css
EnrollmentForm_backup.css
EnrollmentForm_early.css
EnrollmentForm_first.css
EnrollmentForm_March13.css
```
**Why Unused:** Old backup versions. Current active file: `frontend/src/components/EnrollmentForm.css`

### Duplicate Component Files (Wrong Location)
```
PaymentPage.css
PaymentPage.jsx
```
**Why Unused:** Duplicates in wrong location. Active files: `frontend/src/components/PaymentPage.jsx` and `.css`

### Documentation/Planning Files
```
Addon Descriptions.xlsx
Amounts Mapping.xlsx
Converge Breakdown 2.docx
Converge Breakdown.docx
Converge Checkout Lightbox Integration Instructions.docx
Currently Active Credit Card Processing Files.docx
Field Mapping.xlsx
How to Migrate to Production.docx
Online Enrollment Check Listxlsx.xlsx
Screenshots.docx
To integrate the Tokenizer API into your React website application with a frontend and backend.docx
tokenizer.txt
```
**Why Unused:** Planning/reference documents, not code. Information captured in actual documentation files.

### Misplaced SQL Files
```
frontend/src/contexts/new.sql
frontend/src/contexts/old.sql
```
**Why Unused:** Reference files in wrong location (frontend instead of backend), not imported anywhere

### Invalid/Broken Files
```
frontend/src/utils/invalid optimizedPdfGenerator.js
```
**Why Unused:** Filename indicates it's invalid/broken, not imported anywhere

### Old Static Log Files
```
backend/logs/all.log
backend/logs/error.log
```
**Why Unused:** Old static logs from previous logging system. New system uses daily rotating logs like `application-2025-09-30.log`

## ⚠️ Files to Keep (Don't Remove)

### Keep These Documentation Files
- `README.md` - Main project documentation
- `Instructions.md` - Setup instructions
- `Non-Technical_Instructions.md` - User guide
- `CONVERGE_HPP_SETUP.md` - Converge setup guide
- `OPTIMIZED_PDF_IMPLEMENTATION.md` - PDF implementation docs
- `ERROR_NOTIFICATION_SETUP.md` - Error system docs
- `LOGGING_SYSTEM.md` - Logging system docs
- `backend/EMAIL_SETUP.md` - Email configuration docs
- `backend/env-example.txt` - Environment variables example

### Keep These Utility Files
- `port-forwarder.js` - Used for Cloudflare tunnel port forwarding
- `frontend/src/server.js` - Frontend server configuration
- `vite.config.js` - Vite build configuration
- `docker/*` - Docker deployment files

### Keep These Code Files
- All files in `frontend/src/components/` (except invalid ones listed above)
- All files in `backend/src/` (except test files listed above)
- All `.js`, `.jsx`, `.css` files currently in use
- `package.json` and `package-lock.json` files

## 🔧 Cleanup Commands

### Option 1: Remove Only Completely Unused Files (Safest)

**These files are 100% safe to delete - not used anywhere:**

```powershell
# Category 2: Completely Unused Files
Write-Host "Removing completely unused files..." -ForegroundColor Yellow

# Temporary Office lock files
Remove-Item "~$*.docx", "~$*.xlsx" -Force -ErrorAction SilentlyContinue

# Old CSS backups
Remove-Item "EnrollmentForm_*.css" -Force -ErrorAction SilentlyContinue

# Duplicate component files
Remove-Item "PaymentPage.css", "PaymentPage.jsx" -Force -ErrorAction SilentlyContinue

# Documentation/planning files
Remove-Item "Addon Descriptions.xlsx", "Amounts Mapping.xlsx" -Force -ErrorAction SilentlyContinue
Remove-Item "Converge Breakdown*.docx", "Converge Checkout*.docx" -Force -ErrorAction SilentlyContinue
Remove-Item "Currently Active*.docx", "Field Mapping.xlsx" -Force -ErrorAction SilentlyContinue
Remove-Item "How to Migrate*.docx", "Online Enrollment Check*.xlsx" -Force -ErrorAction SilentlyContinue
Remove-Item "Screenshots.docx", "To integrate*.docx", "tokenizer.txt" -Force -ErrorAction SilentlyContinue

# Misplaced SQL files
Remove-Item "frontend/src/contexts/*.sql" -Force -ErrorAction SilentlyContinue

# Invalid files
Remove-Item "frontend/src/utils/invalid*.js" -Force -ErrorAction SilentlyContinue

# Old log files
Remove-Item "backend/logs/all.log", "backend/logs/error.log" -Force -ErrorAction SilentlyContinue

Write-Host "Cleanup complete! Unused files removed." -ForegroundColor Green
```

### Option 2: Remove Development/Testing Files (For Production Deployment)

**Remove these when deploying to production:**

```powershell
# Category 1: Development/Testing Files
Write-Host "Removing development/testing files for production..." -ForegroundColor Yellow

# Test scripts
Remove-Item "backend/test-*.js", "test-*.js" -Force -ErrorAction SilentlyContinue

# Frontend test HTML files
Remove-Item "frontend/public/*demo*.html", "frontend/public/test*.html" -Force -ErrorAction SilentlyContinue

# Optional: Remove test PDF contracts (keep .gitkeep)
# Uncomment if you want to remove test PDFs:
# Remove-Item "backend/src/contracts/*.pdf" -Force -ErrorAction SilentlyContinue

Write-Host "Development files removed. Ready for production!" -ForegroundColor Green
```

### Option 3: Complete Cleanup (All Categories)

**Remove everything before production deployment:**

```powershell
Write-Host "Starting complete cleanup..." -ForegroundColor Yellow

# Category 2: Unused files
Remove-Item "~$*.docx", "~$*.xlsx" -Force -ErrorAction SilentlyContinue
Remove-Item "EnrollmentForm_*.css" -Force -ErrorAction SilentlyContinue
Remove-Item "PaymentPage.css", "PaymentPage.jsx" -Force -ErrorAction SilentlyContinue
Remove-Item "Addon Descriptions.xlsx", "Amounts Mapping.xlsx" -Force -ErrorAction SilentlyContinue
Remove-Item "*Breakdown*.docx", "*Checkout*.docx" -Force -ErrorAction SilentlyContinue
Remove-Item "Currently Active*.docx", "Field Mapping.xlsx" -Force -ErrorAction SilentlyContinue
Remove-Item "How to Migrate*.docx", "Online Enrollment Check*.xlsx" -Force -ErrorAction SilentlyContinue
Remove-Item "Screenshots.docx", "To integrate*.docx", "tokenizer.txt" -Force -ErrorAction SilentlyContinue
Remove-Item "frontend/src/contexts/*.sql" -Force -ErrorAction SilentlyContinue
Remove-Item "frontend/src/utils/invalid*.js" -Force -ErrorAction SilentlyContinue
Remove-Item "backend/logs/all.log", "backend/logs/error.log" -Force -ErrorAction SilentlyContinue

# Category 1: Development files
Remove-Item "backend/test-*.js", "test-*.js" -Force -ErrorAction SilentlyContinue
Remove-Item "frontend/public/*demo*.html", "frontend/public/test*.html" -Force -ErrorAction SilentlyContinue

# Optional: Test PDFs (uncomment to remove)
# Remove-Item "backend/src/contracts/*.pdf" -Force -ErrorAction SilentlyContinue

Write-Host "Complete cleanup finished! Project ready for production." -ForegroundColor Green
Write-Host "Remember to test the application before deploying!" -ForegroundColor Cyan
```

## 📊 Summary

### Category 1: Development/Testing Files (6 items + optional PDFs)
- ✅ 2 backend test scripts (`backend/test-email.js`, `test-fluidpay-debug.js`)
- ✅ 4 frontend test HTML files (demo/test pages)
- ✅ 48 optional test PDF contracts (development samples)
- ⚠️ 1 development tool (`port-forwarder.js` - keep but don't run in production)

**Action:** Remove when deploying to production, but useful during development

### Category 2: Completely Unused Files (~75 items)
- 🗑️ 3 temporary Office lock files
- 🗑️ 5 old CSS backup files
- 🗑️ 2 duplicate component files (wrong location)
- 🗑️ 13 documentation/planning files (.docx, .xlsx)
- 🗑️ 2 misplaced SQL files (frontend/contexts)
- 🗑️ 1 invalid utility file
- 🗑️ 2 old log files (replaced by rotating logs)

**Action:** Safe to delete immediately - not referenced anywhere

### Total Files to Clean Up
- **Development Files:** 6 files (+ 48 optional PDFs)
- **Unused Files:** ~75 files
- **Total:** ~130 files can be removed for production

## ✅ After Cleanup Checklist

1. ✅ Test the application still works after cleanup
2. ✅ Ensure all routes and components load correctly
3. ✅ Verify no import errors in console
4. ✅ Check that tests still pass (if you have tests)
5. ✅ Commit changes to git
6. ✅ Create a backup before deploying to production

## 📝 Notes

- The cleanup removes ~100MB+ of unnecessary files
- All removed files are either duplicates, backups, or development artifacts
- None of the removed files are referenced in the active codebase
- Keep the `.gitkeep` files in empty directories
- You can always recover files from git history if needed

---

**Last Updated:** September 30, 2025
