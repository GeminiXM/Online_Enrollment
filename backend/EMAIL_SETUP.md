# Email Setup Guide

## Overview
The enrollment system now sends welcoming emails with contract PDFs attached upon successful payment. This guide explains how to configure the email functionality.

## Required Environment Variables

Add these variables to your `.env` file:

```env
# Email Configuration for Wellbridge SMTP
SMTP_HOST=wellbridge.prxy.com
SMTP_PORT=25
SMTP_USER=onlineenrollment@wellbridge.com
SMTP_PASS=W3llbridge&0nl1n3
SMTP_FROM=onlineenrollment@wellbridge.com
SMTP_SECURE=false
```

## Wellbridge SMTP Setup (Production Configuration)

The system is configured to use the Wellbridge SMTP server:

1. **Server Configuration**
   - Host: `wellbridge.prxy.com`
   - Port: `25`
   - Authentication: Basic
   - Username: `onlineenrollment@wellbridge.com`
   - Password: `W3llbridge&0nl1n3`

2. **Environment Variables**
   ```env
   SMTP_HOST=wellbridge.prxy.com
   SMTP_PORT=25
   SMTP_USER=onlineenrollment@wellbridge.com
   SMTP_PASS=W3llbridge&0nl1n3
   SMTP_FROM=onlineenrollment@wellbridge.com
   SMTP_SECURE=false
   ```

3. **Security Notes**
   - Port 25 is unencrypted (standard for internal SMTP)
   - Basic authentication is used
   - Emails will be sent from `onlineenrollment@wellbridge.com`

## Production Email Services

For production, consider these services:

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=noreply@yourclub.com
```

### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
SMTP_FROM=noreply@yourclub.com
```

### Amazon SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
SMTP_FROM=noreply@yourclub.com
```

## Testing

1. **Development Testing**
   - Use Gmail with app password for testing
   - Check logs for email success/failure messages

2. **Production Testing**
   - Test with a small number of enrollments first
   - Monitor email delivery rates
   - Check spam folders

## Email Content

The welcome email includes:
- Personalized greeting with member name
- Membership details (number, type, transaction ID)
- Next steps for the member
- Club hours and contact information
- Contract PDF attachment

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Check SMTP credentials
   - Verify username: `onlineenrollment@wellbridge.com`
   - Verify password: `W3llbridge&0nl1n3`
   - Ensure server `wellbridge.prxy.com` is accessible

2. **Email Not Sending**
   - Check server logs for errors
   - Verify environment variables are set
   - Test SMTP connection to `wellbridge.prxy.com:25`
   - Check firewall settings for port 25

3. **PDF Generation Fails**
   - Check if pdf-lib is installed
   - Verify form data structure
   - Check server logs for errors

### Log Messages

The system logs email events:
- `Welcome email sent successfully for membership: [number]`
- `Failed to send welcome email for membership: [number]`
- `Error sending welcome email: [error details]`

## Security Notes

- Never commit real email credentials to version control
- Use environment variables for all sensitive data
- Consider using email service APIs instead of SMTP for better security
- Implement rate limiting for email sending
- Monitor for email abuse/spam reports 