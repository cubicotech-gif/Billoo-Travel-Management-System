# 🚀 Namecheap Deployment Guide - Step by Step (Beginner Friendly)

This guide will walk you through deploying your Billoo Travel Management System to Namecheap hosting. We'll explain everything in simple terms.

---

## 📋 What You'll Need

Before we start, make sure you have:
- ✅ A Namecheap hosting account (Shared or VPS hosting)
- ✅ Your Namecheap login credentials (username and password)
- ✅ A domain name (example: billootravel.com)
- ✅ Access to cPanel
- ✅ FileZilla or any FTP client installed on your computer

---

## 🎯 Overview: What We're Going to Do

We'll do 5 main steps:
1. **Setup the database** (where we store data)
2. **Build the frontend** (the website people see)
3. **Upload the frontend** (put it on the internet)
4. **Upload the backend** (the server that handles requests)
5. **Configure everything** (make it all work together)

Let's start! 🚀

---

## STEP 1: Login to cPanel

### 1.1 Go to cPanel

1. Open your web browser (Chrome, Firefox, etc.)
2. Type this in the address bar: `https://yourdomain.com:2083`
   - Replace `yourdomain.com` with your actual domain
   - Example: `https://billootravel.com:2083`

   **OR**

   - Go to Namecheap.com
   - Login to your account
   - Click on "Hosting List"
   - Click "Manage" next to your hosting package
   - Click "cPanel" or "Go to cPanel"

3. Enter your cPanel username and password
4. Click "Log in"

**You should now see the cPanel dashboard** - It has lots of icons like a control panel.

---

## STEP 2: Create MySQL Database

### 2.1 Find MySQL Databases

1. In cPanel, scroll down to the section called **"DATABASES"**
2. Click on **"MySQL® Databases"** icon

### 2.2 Create a New Database

1. Under **"Create New Database"** section:
   - In the "New Database" box, type: `billoo_travel_db`
   - Click the blue **"Create Database"** button

2. You'll see a success message: "Added the database billoo_travel_db"
3. Click **"Go Back"**

**✅ Database created!** Write this down:
```
Database Name: [your_cpanel_username]_billoo_travel_db
(Example: johndoe_billoo_travel_db)
```

### 2.3 Create a Database User

1. Scroll down to **"MySQL Users"** section
2. Under **"Add New User"**:
   - Username: Type `billoo_user`
   - Password: Click **"Password Generator"** button
   - A popup will show - Click **"Use Password"** button
   - **IMPORTANT:** Copy the password and save it somewhere safe (Notepad, Notes app)

3. Click **"Create User"** button

**✅ User created!** Write this down:
```
Database User: [your_cpanel_username]_billoo_user
Database Password: [the password you just copied]
```

### 2.4 Link User to Database

1. Scroll down to **"Add User To Database"** section
2. In the **"User"** dropdown: Select `billoo_user`
3. In the **"Database"** dropdown: Select `billoo_travel_db`
4. Click **"Add"** button
5. A new page appears with checkboxes
6. Check the box that says **"ALL PRIVILEGES"** (at the top)
7. Click **"Make Changes"** button
8. Click **"Go Back"**

**✅ Database setup complete!**

### 2.5 Import the Database Schema

1. In cPanel, go back to the main page (click the home icon)
2. Scroll to **"DATABASES"** section
3. Click **"phpMyAdmin"** icon
4. A new tab opens with phpMyAdmin
5. On the left side, click on your database name (`[username]_billoo_travel_db`)
6. Click the **"Import"** tab at the top
7. Click **"Choose File"** button
8. Navigate to your computer and find: `Billoo-Travel-Management-System/database/migration.sql`
9. Select the file and click **"Open"**
10. Scroll to the bottom and click **"Import"** button (it's blue/green)
11. Wait for it to finish (you'll see green success message)

**✅ Database tables created!** You should see `users` and `queries` tables on the left.

---

## STEP 3: Build the Frontend on Your Computer

Now we need to prepare the frontend files.

### 3.1 Open Terminal/Command Prompt on Your Computer

**Windows:**
- Press `Windows Key + R`
- Type `cmd` and press Enter

**Mac:**
- Press `Command + Space`
- Type `terminal` and press Enter

### 3.2 Navigate to Frontend Folder

Type these commands one by one (press Enter after each):

```bash
cd path/to/Billoo-Travel-Management-System
cd frontend
```

Replace `path/to/` with where you saved the project.

**Example:**
```bash
cd C:\Users\YourName\Desktop\Billoo-Travel-Management-System
cd frontend
```

### 3.3 Install Dependencies

Type this command and press Enter:

```bash
npm install
```

**Wait for it to finish** - This might take 2-5 minutes. You'll see lots of text scrolling.

### 3.4 Create Production Environment File

1. In the `frontend` folder, create a new file called `.env`
2. Open it with Notepad or any text editor
3. Type this:

```env
VITE_API_URL=https://yourdomain.com/api
```

**Replace `yourdomain.com` with your actual domain!**

Example:
```env
VITE_API_URL=https://billootravel.com/api
```

4. Save the file

### 3.5 Build the Frontend

In the terminal/command prompt (still in the frontend folder), type:

```bash
npm run build
```

**Wait for it to finish** - Takes 30 seconds to 2 minutes.

You'll see a message like: "✓ built in 45s"

**✅ A new folder called `dist` is created!** This contains your website files.

---

## STEP 4: Upload Frontend to Namecheap

### 4.1 Open File Manager in cPanel

1. Go back to cPanel (the main dashboard)
2. Scroll to **"FILES"** section
3. Click **"File Manager"** icon
4. A new tab opens

### 4.2 Go to public_html Folder

1. On the left side, you'll see folders
2. Double-click **"public_html"** folder
3. This is where your website files go

### 4.3 Clear Old Files (If Any)

1. Select all files in `public_html` (you can press Ctrl+A or Cmd+A)
   - **EXCEPT** these folders if they exist: `cgi-bin`, `.well-known`
2. Click **"Delete"** at the top
3. Confirm deletion

### 4.4 Upload Frontend Files

**Method 1: Using File Manager Upload (Easier)**

1. Click **"Upload"** button at the top
2. Click **"Select File"** button
3. Navigate to `Billoo-Travel-Management-System/frontend/dist/` on your computer
4. Select **ALL FILES** in the dist folder (Ctrl+A or Cmd+A)
5. Click **"Open"**
6. Wait for upload to complete (you'll see 100% for each file)
7. Click **"Go Back to ..."** link

**Method 2: Using Zip File (Faster for many files)**

1. On your computer, go to `frontend/dist` folder
2. Select all files inside dist
3. Right-click and choose "Send to > Compressed (zipped) folder" (Windows) or "Compress" (Mac)
4. Name it `frontend.zip`
5. In cPanel File Manager, click **"Upload"**
6. Choose `frontend.zip`
7. Wait for upload
8. Go back to File Manager
9. Right-click on `frontend.zip`
10. Click **"Extract"**
11. Click **"Extract Files"**
12. Delete `frontend.zip` after extraction

**✅ Frontend uploaded!**

### 4.5 Create .htaccess File

1. In File Manager (still in public_html), click **"+ File"** at the top
2. Name it: `.htaccess`
3. Click **"Create New File"**
4. Right-click on `.htaccess` file
5. Click **"Edit"**
6. Click **"Edit"** again in the popup
7. Paste this code:

```apache
# Enable Rewrite Engine
RewriteEngine On

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# API Proxy - Send /api requests to backend
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^api/(.*)$ http://localhost:3001/api/$1 [P,L]

# React Router - Send all other requests to index.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
</apache>
```

8. Click **"Save Changes"** (top right)
9. Click **"Close"**

**✅ .htaccess configured!**

---

## STEP 5: Prepare Backend on Your Computer

### 5.1 Navigate to Backend Folder

In terminal/command prompt:

```bash
cd ..
cd backend
```

### 5.2 Install Dependencies

```bash
npm install
```

Wait for it to finish.

### 5.3 Create Production Environment File

1. In the `backend` folder, create a file called `.env`
2. Open it with Notepad
3. Type this (replace with YOUR actual values):

```env
PORT=3001
NODE_ENV=production

# Database Configuration (USE YOUR VALUES FROM STEP 2)
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_cpanel_username_billoo_user
DB_PASSWORD=the_password_you_saved_in_step_2.3
DB_NAME=your_cpanel_username_billoo_travel_db

# JWT Configuration
JWT_SECRET=change-this-to-a-long-random-string-abc123xyz789
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com
```

**IMPORTANT REPLACEMENTS:**
- `DB_USER`: Your actual database user (from step 2.3)
- `DB_PASSWORD`: Your actual database password (from step 2.3)
- `DB_NAME`: Your actual database name (from step 2.2)
- `JWT_SECRET`: Make up a long random string (at least 32 characters)
- `CORS_ORIGIN`: Your actual domain

**Example:**
```env
DB_USER=johndoe_billoo_user
DB_PASSWORD=X9#mK2$pL4@nR8
DB_NAME=johndoe_billoo_travel_db
JWT_SECRET=my-super-secret-key-12345-abcdef-67890
CORS_ORIGIN=https://billootravel.com
```

4. Save the file

### 5.4 Build the Backend

```bash
npm run build
```

This creates a `dist` folder with compiled code.

**✅ Backend built!**

---

## STEP 6: Upload Backend to Namecheap

### 6.1 Create Backend Folder

1. Go to cPanel File Manager
2. Make sure you're in the **home directory** (not public_html)
   - Click on your username folder at the top left
3. Click **"+ Folder"** button
4. Name it: `travel-backend`
5. Click **"Create New Folder"**

### 6.2 Upload Backend Files

**Option A: Using File Manager**

1. Double-click `travel-backend` folder to open it
2. Click **"Upload"**
3. Upload these files/folders from your computer's `backend` folder:
   - The entire `dist` folder (contains compiled code)
   - `package.json` file
   - `.env` file
   - `node_modules` folder (optional, we can install later)

**Option B: Using Zip (Recommended)**

1. On your computer, go to the `backend` folder
2. Select: `dist` folder, `package.json`, `.env`
3. Create a zip file called `backend.zip`
4. Upload to `travel-backend` folder in cPanel
5. Extract it

### 6.3 Install Node Modules on Server

**If your hosting supports SSH:**

1. In cPanel, find **"Terminal"** icon (under Advanced section)
2. Click it
3. Type these commands:

```bash
cd ~/travel-backend
npm install --production
```

**If no SSH/Terminal:**
- Zip your local `node_modules` folder
- Upload it to the server
- Extract it in `travel-backend` folder

**✅ Backend files uploaded!**

---

## STEP 7: Setup Node.js Application in cPanel

### 7.1 Find Setup Node.js App

1. Go back to cPanel main page
2. Scroll to **"SOFTWARE"** section
3. Click **"Setup Node.js App"** or **"Node.js Selector"**

### 7.2 Create Node.js Application

1. Click **"Create Application"** button
2. Fill in the form:

   - **Node.js version**: Select latest version (18.x or higher)
   - **Application mode**: Select **"Production"**
   - **Application root**: Click folder icon and select `travel-backend`
   - **Application URL**: Leave empty or select your domain
   - **Application startup file**: Type `dist/index.js`
   - **Passenger log file**: Leave default

3. Click **"Create"** button

### 7.3 Configure Environment Variables

1. After creation, you'll see the application listed
2. Click **"Edit"** or click on your application
3. Scroll down to **"Environment Variables"** section
4. Add these one by one (click "Add Variable" for each):

```
PORT = 3001
NODE_ENV = production
DB_HOST = localhost
DB_PORT = 3306
DB_USER = your_actual_user
DB_PASSWORD = your_actual_password
DB_NAME = your_actual_database
JWT_SECRET = your_secret_key
JWT_EXPIRES_IN = 7d
CORS_ORIGIN = https://yourdomain.com
```

Replace with your actual values!

5. Click **"Save"**

### 7.4 Start the Application

1. Click **"Start App"** or **"Restart"** button
2. Wait for status to show **"Running"**

**✅ Backend is running!**

---

## STEP 8: Configure SSL Certificate (HTTPS)

### 8.1 Install SSL Certificate

1. Go to cPanel main page
2. Scroll to **"SECURITY"** section
3. Click **"SSL/TLS Status"** or **"Let's Encrypt SSL"**
4. Check the box next to your domain
5. Click **"Run AutoSSL"** or **"Install"**
6. Wait for it to complete (1-2 minutes)
7. You should see a green checkmark ✅

**✅ SSL installed! Your site now has HTTPS.**

---

## STEP 9: Test Your Application

### 9.1 Test Frontend

1. Open a new browser tab
2. Go to: `https://yourdomain.com`
3. You should see the login page!

### 9.2 Test Backend API

1. Go to: `https://yourdomain.com/api/health`
2. You should see a JSON response like:
```json
{
  "success": true,
  "message": "Server is running"
}
```

### 9.3 Login to Application

1. Go to your main domain
2. Enter:
   - **Email**: `admin@billoo.com`
   - **Password**: `admin123`
3. Click **"Sign In"**
4. You should see the Dashboard!

---

## STEP 10: Troubleshooting Common Issues

### Issue 1: "Cannot connect to server"

**Solution:**
1. Check if Node.js app is running in cPanel
2. Click "Restart" on the Node.js app
3. Check `.htaccess` file has correct proxy rules

### Issue 2: "Database connection error"

**Solution:**
1. Check `.env` file in backend folder
2. Verify database credentials are correct
3. Make sure database name includes your cPanel username prefix

### Issue 3: "Blank page" or "404 Error"

**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Check `.htaccess` file exists in public_html
3. Verify all frontend files are uploaded

### Issue 4: "Mixed content" warnings

**Solution:**
1. Make sure CORS_ORIGIN in .env uses `https://` not `http://`
2. Check SSL certificate is installed

### Issue 5: Node.js app won't start

**Solution:**
1. Check error logs in cPanel Node.js app section
2. Verify `dist/index.js` exists in travel-backend folder
3. Make sure all npm packages are installed

---

## ✅ Final Checklist

After deployment, verify:

- [ ] Website loads at https://yourdomain.com
- [ ] Login page appears
- [ ] Can login with admin@billoo.com / admin123
- [ ] Dashboard shows (even with 0 data is fine)
- [ ] Can navigate to Queries page
- [ ] Can create a new query
- [ ] No console errors (press F12 to check)
- [ ] SSL certificate shows (padlock icon in browser)

---

## 🎉 Congratulations!

Your Billoo Travel Management System is now LIVE on the internet!

### Important Next Steps:

1. **Change Admin Password**
   - Login and change the default password immediately

2. **Backup Your Database**
   - Go to phpMyAdmin
   - Export your database regularly

3. **Monitor Performance**
   - Check cPanel logs regularly
   - Monitor Node.js app status

---

## 📞 Need Help?

If you get stuck:
1. Check the error message carefully
2. Look at cPanel error logs (in Node.js app section)
3. Check browser console (F12 key)
4. Verify all credentials are correct

---

**Remember:**
- Keep your `.env` file secret
- Never share your database password
- Backup regularly
- Update the admin password after first login

---

Made with ❤️ for Billoo Travel Agency
