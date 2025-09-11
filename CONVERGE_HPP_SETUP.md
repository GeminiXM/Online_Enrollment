# Converge HPP Integration Setup

This document explains how to set up the Converge Hosted Payment Page (HPP) integration with Cloudflare tunnels for HTTPS access.

## Overview

The Converge HPP integration has been successfully implemented based on the working project at `M:\converge-hpp`. The integration includes:

- ✅ Backend API endpoints for session token creation and vault token storage
- ✅ Frontend components for payment processing
- ✅ Real member data integration (no more hardcoded values)
- ✅ Database storage using existing stored procedures
- ✅ Cloudflare tunnel support for HTTPS access

## Cloudflare Tunnel Configuration

### Required URLs

The integration uses the following Cloudflare tunnel URL from the working project:
- **Backend URL**: `https://frederick-pam-ones-testing.trycloudflare.com`

### Environment Variables

#### Backend (.env)
```env
# CORS Configuration for Cloudflare tunnels
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,https://your-frontend-tunnel.trycloudflare.com
CORS_ALLOWED_ORIGINS=https://frederick-pam-ones-testing.trycloudflare.com,https://your-frontend-tunnel.trycloudflare.com

# Converge API Configuration
CONVERGE_BASE=https://api.convergepay.com

# Server Configuration
PORT=5001
NODE_ENV=development
```

#### Frontend (.env)
```env
# Cloudflare tunnel URL for backend
REACT_APP_BACKEND_HTTPS=https://frederick-pam-ones-testing.trycloudflare.com
```

### Setting Up Cloudflare Tunnels

1. **Install cloudflared** (if not already installed):
   ```bash
   # Windows
   winget install --id Cloudflare.cloudflared
   
   # Or download from: https://github.com/cloudflare/cloudflared/releases
   ```

2. **Start Backend Tunnel**:
   ```bash
   # From the backend directory
   cd backend
   npm run dev
   
   # In another terminal, start tunnel for backend (port 5001)
   cloudflared tunnel --url http://localhost:5001
   ```

3. **Start Frontend Tunnel**:
   ```bash
   # From the frontend directory
   cd frontend
   npm run dev
   
   # In another terminal, start tunnel for frontend (port 5173)
   cloudflared tunnel --url http://localhost:5173
   ```

4. **Update Configuration**:
   - Copy the tunnel URLs from the cloudflared output
   - Update the `CORS_ALLOWED_ORIGINS` in backend `.env`
   - Update the `REACT_APP_BACKEND_HTTPS` in frontend `.env`

## API Endpoints

The following new endpoints have been added:

### Converge HPP Endpoints
- `POST /api/payment/converge-hpp/session-token` - Create session token
- `POST /api/payment/converge-hpp/store-vault-token` - Store vault token
- `POST /api/payment/converge-hpp/log-payment-response` - Log payment responses
- `GET /api/payment/converge-hpp/test` - Test integration

### Test Endpoint
You can test the integration by visiting:
```
GET https://frederick-pam-ones-testing.trycloudflare.com/api/payment/converge-hpp/test?clubId=001
```

## Components

### ConvergeHPP.jsx
Main payment component that replaces ConvergeLightboxPayment. Features:
- Real member data integration
- Session token creation with member information
- Vault token storage using `web_proc_InsertWebStrcustr`
- Comprehensive error handling and logging
- Emergency cancel functionality

### ConvergeHPPTest.jsx
Test component for verifying integration without affecting existing payment flow.

## Database Integration

The integration uses existing stored procedures:
- `procConvergeItemSelect1` - Retrieves Converge processor information
- `web_proc_InsertWebStrcustr` - Stores vault tokens with member data

## Security Features

- ✅ CORS protection with Cloudflare tunnel URLs
- ✅ HTTPS enforcement through Cloudflare tunnels
- ✅ Input validation and sanitization
- ✅ Comprehensive error logging
- ✅ Timeout protection (120 seconds)
- ✅ Emergency cancel functionality

## Testing

1. **Test Integration Status**:
   ```bash
   curl "https://frederick-pam-ones-testing.trycloudflare.com/api/payment/converge-hpp/test?clubId=001"
   ```

2. **Test Session Token Creation**:
   Use the ConvergeHPPTest component in the frontend

3. **Test Full Payment Flow**:
   Use the ConvergeHPP component with real member data

## Production Deployment

When ready for production:

1. **Update Cloudflare Tunnel URLs**:
   - Replace `frederick-pam-ones-testing.trycloudflare.com` with your production tunnel URLs
   - Update CORS configuration accordingly

2. **Configure Converge Credentials**:
   - Ensure Converge merchant credentials are properly configured in the database
   - Verify Allowed Referrers/Origins in Converge dashboard

3. **Replace Existing Component**:
   - Replace ConvergeLightboxPayment with ConvergeHPP
   - Update routing to use the new component

4. **Test Thoroughly**:
   - Test with real member data
   - Verify vault token storage
   - Test error scenarios

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Verify Cloudflare tunnel URLs are in `CORS_ALLOWED_ORIGINS`
   - Check that frontend is using the correct backend tunnel URL

2. **Script Load Failures**:
   - Ensure page is served over HTTPS (via Cloudflare tunnel)
   - Verify domain is whitelisted in Converge Allowed Referrers

3. **Session Token Failures**:
   - Check Converge credentials in database
   - Verify API user has Hosted Payment Page permissions

4. **Vault Token Storage Failures**:
   - Check database connection
   - Verify `web_proc_InsertWebStrcustr` procedure exists and is accessible

### Debug Information

The integration includes comprehensive logging:
- All API requests and responses are logged
- Payment responses are logged with full details
- Error scenarios are logged with stack traces
- CORS blocking is logged with origin information

## Files Modified/Created

### Backend
- `backend/src/routes/paymentRoutes.js` - Added Converge HPP endpoints
- `backend/src/app.js` - Updated CORS configuration for Cloudflare tunnels

### Frontend
- `frontend/src/components/ConvergeHPP.jsx` - Main payment component
- `frontend/src/components/ConvergeHPP.css` - Component styling
- `frontend/src/components/ConvergeHPPTest.jsx` - Test component
- `frontend/src/components/ConvergeHPPTest.css` - Test component styling

### Documentation
- `CONVERGE_HPP_SETUP.md` - This setup guide

## Next Steps

1. Set up Cloudflare tunnels for your environment
2. Update environment variables with your tunnel URLs
3. Test the integration using the test component
4. Verify Converge credentials are properly configured
5. Test with real member data
6. Deploy to production when ready

The integration is ready for use and can replace the existing ConvergeLightboxPayment component when you're ready to go live.
