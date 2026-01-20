# 🚀 Deployment Checklist - Quick Reference

Use this checklist while deploying. Check off each item as you complete it.

---

## Before You Start

- [ ] I have Namecheap hosting account login details
- [ ] I can access cPanel
- [ ] I have my domain name ready
- [ ] I have the project files on my computer
- [ ] I have Node.js installed on my computer
- [ ] I have a text editor (Notepad, VS Code, etc.)

---

## Part 1: Database Setup (in cPanel)

- [ ] Logged into cPanel
- [ ] Created database: `billoo_travel_db`
- [ ] Created database user: `billoo_user`
- [ ] Generated and saved password for database user
- [ ] Added user to database with ALL PRIVILEGES
- [ ] Opened phpMyAdmin
- [ ] Imported `database/migration.sql` file
- [ ] Verified tables `users` and `queries` exist

**Write down:**
```
Database Name: ___________________________
Database User: ___________________________
Database Password: ___________________________
```

---

## Part 2: Build Frontend (on your computer)

- [ ] Opened Terminal/Command Prompt
- [ ] Navigated to `frontend` folder
- [ ] Ran `npm install`
- [ ] Created `.env` file in frontend folder
- [ ] Added `VITE_API_URL=https://yourdomain.com/api` to .env
- [ ] Ran `npm run build`
- [ ] Verified `dist` folder was created

---

## Part 3: Upload Frontend (to cPanel)

- [ ] Opened File Manager in cPanel
- [ ] Went to `public_html` folder
- [ ] Deleted old files (kept cgi-bin and .well-known)
- [ ] Uploaded all files from `frontend/dist` folder
- [ ] Created `.htaccess` file in public_html
- [ ] Copied .htaccess content from guide
- [ ] Saved .htaccess file

---

## Part 4: Build Backend (on your computer)

- [ ] Navigated to `backend` folder in Terminal
- [ ] Ran `npm install`
- [ ] Created `.env` file in backend folder
- [ ] Added all environment variables (DB credentials, JWT secret, etc.)
- [ ] Verified all values are correct
- [ ] Ran `npm run build`
- [ ] Verified `dist` folder was created

---

## Part 5: Upload Backend (to cPanel)

- [ ] Created `travel-backend` folder in home directory (not public_html)
- [ ] Uploaded `dist` folder to travel-backend
- [ ] Uploaded `package.json` to travel-backend
- [ ] Uploaded `.env` file to travel-backend
- [ ] Installed node_modules (via Terminal or upload)

---

## Part 6: Setup Node.js App (in cPanel)

- [ ] Found "Setup Node.js App" in cPanel
- [ ] Created new application
- [ ] Selected Node.js version 18.x or higher
- [ ] Set Application mode to "Production"
- [ ] Set Application root to `travel-backend`
- [ ] Set Application startup file to `dist/index.js`
- [ ] Added all environment variables
- [ ] Started the application
- [ ] Application status shows "Running"

---

## Part 7: SSL Certificate (in cPanel)

- [ ] Went to SSL/TLS Status
- [ ] Selected my domain
- [ ] Ran AutoSSL
- [ ] SSL certificate installed successfully
- [ ] Green checkmark showing

---

## Part 8: Testing

- [ ] Opened https://yourdomain.com in browser
- [ ] Login page loads correctly
- [ ] No console errors (checked with F12)
- [ ] Tested https://yourdomain.com/api/health
- [ ] Got JSON response from API
- [ ] Logged in with admin@billoo.com / admin123
- [ ] Dashboard page loads
- [ ] Can navigate to Queries page
- [ ] Can create a new query
- [ ] Query appears in the list
- [ ] Can update query status

---

## Part 9: Post-Deployment

- [ ] Changed admin password
- [ ] Saved new admin password securely
- [ ] Bookmarked cPanel URL
- [ ] Bookmarked phpMyAdmin URL
- [ ] Tested from mobile device
- [ ] Tested from different browser
- [ ] Created backup of database

---

## Important Information to Save

```
===========================================
PRODUCTION CREDENTIALS
===========================================

Domain: https://___________________________

cPanel:
  - URL: https://yourdomain.com:2083
  - Username: ___________________________
  - Password: ___________________________

Database:
  - Name: ___________________________
  - User: ___________________________
  - Password: ___________________________

Application:
  - Admin Email: admin@billoo.com
  - Admin Password: ___________________________ (CHANGED)

Node.js App Location:
  - Folder: ~/travel-backend
  - Port: 3001

Frontend Location:
  - Folder: ~/public_html
```

---

## Common Issues Quick Fix

| Problem | Quick Fix |
|---------|-----------|
| Can't login | Check if Node.js app is running |
| Database error | Verify .env credentials |
| Blank page | Check .htaccess file exists |
| 404 errors | Clear browser cache |
| API not working | Restart Node.js app |
| SSL warning | Install SSL certificate |

---

## Need the Detailed Guide?

See: `NAMECHEAP_DEPLOYMENT_SIMPLE.md` for step-by-step instructions with explanations.

---

✅ **ALL DONE!** Your application is live!

**Next:** Change the admin password and start using your system!

---

**Last Deployment Date:** ___________________

**Deployed By:** ___________________

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________
