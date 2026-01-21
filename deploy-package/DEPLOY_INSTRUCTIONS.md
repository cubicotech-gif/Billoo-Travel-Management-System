# 🚀 Super Simple Deployment Instructions

You have **2 ZIP files** ready to upload:
1. `backend-deploy.zip` - Your API server
2. `frontend-deploy.zip` - Your website

---

## ✅ Step 1: Upload Frontend (Already Done! ✓)

Since you already created `tmsportal` folder, let's use it:

1. **Go to cPanel → File Manager**
2. **Navigate to** `public_html/tmsportal/`
3. **Delete everything** inside tmsportal folder (if anything exists)
4. **Click "Upload"** button
5. **Choose file:** `frontend-deploy.zip`
6. **Wait** for upload to complete
7. **Right-click** on `frontend-deploy.zip` → **Extract**
8. **Select** "Extract Files" (it will extract to current folder)
9. **Delete** the ZIP file after extraction

✅ **Frontend deployed!**

---

## ✅ Step 2: Upload Backend

1. **Still in File Manager**, click **home icon** (top left) to go to home directory
2. **Create new folder:** Click "+ Folder" button
3. **Name it:** `travel-backend`
4. **Open** the `travel-backend` folder
5. **Click "Upload"**
6. **Choose file:** `backend-deploy.zip`
7. **Wait** for upload
8. **Right-click** on `backend-deploy.zip` → **Extract**
9. **Delete** the ZIP file

### Create .env File

1. **Still in** `travel-backend` folder
2. **Click "+ File"**
3. **Name it:** `.env`
4. **Right-click** on `.env` → **Edit**
5. **Paste this** (REPLACE with YOUR actual values):

```env
PORT=3001
NODE_ENV=production

DB_HOST=localhost
DB_PORT=3306
DB_USER=billbewf_billoo_user
DB_PASSWORD=YOUR_DATABASE_PASSWORD_FROM_STEP2
DB_NAME=billbewf_billoo_travel

JWT_SECRET=make-this-a-long-random-string-abc123xyz789uvw456
JWT_EXPIRES_IN=7d

CORS_ORIGIN=*
```

6. **Save** and **Close**

✅ **Backend files ready!**

---

## ✅ Step 3: Setup Node.js Application

1. **Go to cPanel main page**
2. **In SOFTWARE section**, click **"Setup Node.js App"**
3. **Click "Create Application"** button
4. **Fill the form:**

   - **Node.js version:** Select **18.x** or higher
   - **Application mode:** Select **Production**
   - **Application root:** Click folder icon → Select `travel-backend`
   - **Application URL:** Leave blank or select your domain
   - **Application startup file:** Type `dist/index.js`

5. **Click "Create"** button
6. **Wait** for it to create (30 seconds)

### Install Dependencies

After app is created, you'll see a command like this:

```bash
source /home/billbewf/nodevenv/travel-backend/18/bin/activate && cd /home/billbewf/travel-backend
```

1. **Copy that command** exactly as shown
2. **Add this** to the end:
   ```
   && npm install --production
   ```
3. **Click "Run NPM Install"** button (if available)

   **OR**

   If you see a **"Run npm install"** button, just click it!

4. **Wait** for installation (2-3 minutes)

### Start the Application

1. **Click "Restart"** or **"Start App"** button
2. **Wait** for status to show **"Running"** (green)

✅ **Backend is running!**

---

## ✅ Step 4: Test Your Application

1. **Open browser**
2. **Go to:** `https://yoursubdomain.yourdomain.com`
   - Example: `https://tms.billootravel.com`

3. **You should see:** Login page! 🎉

4. **Login with:**
   - Email: `admin@billoo.com`
   - Password: `admin123`

5. **You should see:** Dashboard!

---

## ✅ Troubleshooting

### Problem: "Cannot connect to server"

**Fix:**
1. Go to cPanel → Setup Node.js App
2. Click your application
3. Click "Restart"
4. Wait 30 seconds and try again

### Problem: "Blank page"

**Fix:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Try incognito/private mode
3. Check .htaccess file exists in tmsportal folder

### Problem: "Database error"

**Fix:**
1. Check .env file in travel-backend
2. Verify database password is correct
3. Make sure database name has your prefix (billbewf_billoo_travel)

---

## ✅ Important Files Location

```
Your Namecheap Server:
├── public_html/
│   └── tmsportal/          ← Frontend (your website)
│       ├── index.html
│       ├── assets/
│       └── .htaccess
│
└── travel-backend/         ← Backend (your API)
    ├── dist/              ← Compiled code
    ├── package.json
    └── .env               ← YOUR CREDENTIALS
```

---

## ✅ After Successful Login

**IMPORTANT:** Change the admin password immediately!

1. Login to the dashboard
2. (We'll add password change feature in next update)
3. For now, you can change it in database:
   - Go to phpMyAdmin
   - Click `billbewf_billoo_travel` database
   - Click `users` table
   - Edit the admin user password

---

## 📞 Quick Support Checklist

If something doesn't work:

- [ ] Is database created and imported? (Step 2 from before)
- [ ] Is backend-deploy.zip uploaded and extracted?
- [ ] Is .env file created with correct credentials?
- [ ] Is Node.js app showing "Running" status?
- [ ] Is frontend-deploy.zip uploaded to tmsportal?
- [ ] Does .htaccess file exist in tmsportal?
- [ ] Did you try clearing browser cache?

---

## 🎉 Congratulations!

Your Billoo Travel Management System is LIVE!

**Next Steps:**
1. Change admin password
2. Create new users (agents)
3. Start creating queries!

---

**Need help?** Check error logs in:
- cPanel → Setup Node.js App → Your app → View Logs
