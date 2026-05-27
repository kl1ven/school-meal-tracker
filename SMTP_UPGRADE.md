# 📧 Email System Upgrade Summary

## What Was Done

Successfully upgraded the School Meal Tracker notification system to support **real SMTP providers** while maintaining **Ethereal test account as fallback**.

### ✅ Completed Tasks

1. **Enhanced `server/mailer.js`**
   - Added support for `SMTP_SECURE` environment variable (boolean)
   - Improved SMTP configuration validation
   - Added `EMAIL_FROM` environment variable support
   - Better console logging with mode detection (real SMTP vs Ethereal)
   - Added `getMailConfig()` helper function for debugging

2. **Updated `server/index.js`**
   - Added `require('dotenv').config()` at the top
   - Now automatically loads `.env` file on server startup

3. **Created `.env.example`**
   - Template file with all supported SMTP providers
   - Includes examples for: Brevo, Gmail, Yandex, Mail.ru
   - Safe to commit to Git (marked as template)

4. **Created `.env`** 
   - Default file with safe values (all commented out)
   - Uses Ethereal fallback when empty
   - Should NOT be committed to Git (already in .gitignore)

5. **Updated `README.md`**
   - Added comprehensive email configuration section
   - Documented all supported SMTP providers
   - Added setup instructions for each provider
   - Included email notification triggers

6. **Created `EMAIL_SETUP.md`**
   - Detailed email configuration guide
   - Provider setup instructions
   - Troubleshooting section
   - Security best practices

7. **Installed `dotenv` package**
   - Added to project dependencies
   - Enables automatic environment variable loading

---

## How to Use

### Development Mode (Default) 
**No configuration needed!**

```bash
npm run dev
```

Server will create temporary Ethereal test account and log credentials:
```
[Mailer] ✅ Ethereal test account created:
  Email: xxxxx@ethereal.email
  Password: xxxxxxxxxxxxx
  Preview URL: https://ethereal.email/messages
```

View emails at: https://ethereal.email/messages

### Production Mode
Create `.env` file with your SMTP credentials:

```bash
# Example: Using Brevo
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_login
SMTP_PASS=your_smtp_password
EMAIL_FROM=noreply@yourschool.com
```

Then restart server. Console will show:
```
[Mailer] Real SMTP configured:
  Host: smtp-relay.brevo.com
  Port: 587
  Secure: false
  From: noreply@yourschool.com
```

---

## Supported SMTP Providers

| Provider | Host | Port | Secure | Notes |
|----------|------|------|--------|-------|
| **Brevo** | `smtp-relay.brevo.com` | 587 | false | Recommended, free tier: 300/day |
| **Gmail** | `smtp.gmail.com` | 587 | false | Requires app password (2FA) |
| **Yandex** | `smtp.yandex.ru` | 465 | true | Russian mail service |
| **Mail.ru** | `smtp.mail.ru` | 465 | true | Russian mail service |
| **Ethereal** | (auto) | (auto) | (auto) | Default test account |

See `.env.example` for complete examples.

---

## Environment Variables Reference

### Email Configuration
```env
SMTP_HOST=smtp.example.com        # SMTP server hostname
SMTP_PORT=587                      # SMTP server port (587 or 465)
SMTP_SECURE=false                  # true for SSL (port 465), false for TLS (port 587)
SMTP_USER=user@example.com         # SMTP username
SMTP_PASS=your_password            # SMTP password or app password
EMAIL_FROM=noreply@example.com     # From address for emails
```

### System Configuration
```env
PORT=4000                          # Server port (default 4000)
```

---

## File Structure

```
school-meal-tracker/
├── .env                    ← Your SMTP credentials (DON'T commit)
├── .env.example            ← Template with all options (OK to commit)
├── EMAIL_SETUP.md          ← This guide (new)
├── README.md               ← Updated with email section
├── server/
│   ├── index.js            ← Updated: added dotenv
│   ├── mailer.js           ← Updated: enhanced SMTP support
│   └── routes/
│       └── notifications.js ← No changes needed
├── src/
│   ├── components/
│   │   ├── NotificationBell.tsx
│   │   └── NotificationList.tsx
│   └── services/
│       └── api.ts
└── package.json            ← Updated: added dotenv
```

---

## Testing Email Notifications

### 1. Test with Development (Ethereal)
```bash
npm run dev
# App ready at http://localhost:3000
# Backend ready at http://localhost:4000
```

1. Login as Manager
2. Go to Dashboard
3. Scroll to "Test Notification" form
4. Select a user and write a test message
5. Click "Send"
6. Copy preview URL from console output
7. Open in browser to view email

### 2. Test with Production SMTP
1. Set up `.env` with real SMTP credentials
2. Run `npm run dev`
3. Follow same steps as above
4. Check your real email inbox

### 3. Verify Auto-Triggers
- **Teacher submits meal request** → Manager receives email
- **Canteen reports discrepancy** → Manager receives email  
- **Manager confirms order** → Canteen receives email

---

## Security Notes

✅ **Best Practices:**
- Keep `.env` in `.gitignore` (already configured)
- Use app passwords instead of account passwords
- For production: use environment-level secrets (GitHub Actions, Railway, Render)
- Rotate credentials periodically

⚠️ **Never:**
- Commit `.env` to Git
- Share credentials in Slack/email
- Use account passwords (use app passwords)
- Hardcode credentials in code

---

## Troubleshooting

### Email not sending?
1. Check console for error messages: `npm run dev`
2. Verify `.env` variables are set correctly
3. Test SMTP credentials with provider's test tool
4. Ensure SMTP_SECURE matches port:
   - Port 587 → `SMTP_SECURE=false`
   - Port 465 → `SMTP_SECURE=true`

### Ethereal account not created?
1. Check internet connection
2. Ensure nodemailer is installed: `npm ls nodemailer`
3. Check console for specific error

### `.env` not loading?
1. Verify file is at project root (not in `src/` or `server/`)
2. Restart dev server: Kill terminal, run `npm run dev`
3. Check for typos in variable names

### Connection refused?
1. Verify SMTP_HOST is correct
2. Check if port 587/465 is open (firewall/ISP blocks)
3. Try switching SMTP_SECURE value

---

## Code Changes Summary

### server/mailer.js
- Added `SMTP_SECURE` environment variable support
- Improved `EMAIL_FROM` handling
- Better error handling and logging
- Clear distinction between real SMTP and Ethereal modes
- Added `getMailConfig()` function

### server/index.js
- Added `require('dotenv').config()` at top
- Enables automatic `.env` file loading

### New Files
- `.env` — Development environment variables (empty/safe defaults)
- `.env.example` — Template with all providers
- `EMAIL_SETUP.md` — Detailed setup guide

### Updated Files
- `README.md` — Added email configuration section
- `package.json` — Added dotenv dependency

---

## Next Steps

1. ✅ Development: Use default Ethereal for testing
2. 📧 Production: Set up real SMTP in `.env`
3. 🧪 Test: Send test notifications as Manager
4. ✉️ Deploy: Include `.env` on production server

---

## Files Ready for Copy-Paste

All code is production-ready and can be copied directly:
- ✅ `server/mailer.js` — Enhanced SMTP support
- ✅ `server/index.js` — With dotenv integration
- ✅ `.env.example` — Complete provider examples
- ✅ `README.md` — Updated documentation
- ✅ `EMAIL_SETUP.md` — Setup guide

---

## Questions?

Check these files for more info:
- `EMAIL_SETUP.md` — Detailed setup guide
- `.env.example` — Provider examples
- `README.md` — General email section

---

**Status**: ✅ Ready for production use
**Dev Server**: Running on http://localhost:3000 (Frontend) & http://localhost:4000 (Backend)
**Email Mode**: Ethereal (development)
**Last Updated**: 2026-05-25
