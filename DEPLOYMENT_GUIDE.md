# Deployment Guide - Billoo Travel Management System

This guide walks you through deploying the Billoo Travel Management System to Namecheap hosting.

## 📋 Prerequisites

- Namecheap hosting account with cPanel access
- Domain name configured
- MySQL database access
- Node.js support (check with hosting provider)
- SSH access (recommended for easier deployment)

---

## 🚀 Deployment Steps

### Step 1: Database Setup

1. **Login to cPanel**
   - Go to your Namecheap cPanel (usually: yourdomain.com/cpanel)

2. **Create MySQL Database**
   - Navigate to **MySQL Databases**
   - Create a new database: `billoo_travel_db`
   - Create a database user with a strong password
   - Add the user to the database with **ALL PRIVILEGES**
   - Note down:
     - Database name: `username_billoo_travel_db` (usually prefixed with your cPanel username)
     - Database user: `username_dbuser`
     - Database password: (your chosen password)
     - Database host: `localhost` (usually)

3. **Import Database Schema**
   - Go to **phpMyAdmin** in cPanel
   - Select your database
   - Click **Import** tab
   - Upload and execute: `database/migration.sql`
   - Verify tables are created (users, queries)

---

### Step 2: Backend Deployment

#### Option A: Using SSH (Recommended)

1. **Connect via SSH**
   ```bash
   ssh username@yourdomain.com
   ```

2. **Navigate to your home directory**
   ```bash
   cd ~
   ```

3. **Create backend directory**
   ```bash
   mkdir billoo-travel-backend
   cd billoo-travel-backend
   ```

4. **Upload backend files**
   - Use SCP or SFTP to upload the `backend` folder contents
   ```bash
   # From your local machine
   scp -r backend/* username@yourdomain.com:~/billoo-travel-backend/
   ```

5. **Install dependencies**
   ```bash
   npm install
   ```

6. **Create .env file**
   ```bash
   nano .env
   ```

   Add the following (replace with your actual values):
   ```env
   PORT=3001
   NODE_ENV=production

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=username_dbuser
   DB_PASSWORD=your_database_password
   DB_NAME=username_billoo_travel_db

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-CHANGE-THIS-TO-RANDOM-STRING
   JWT_EXPIRES_IN=7d

   # CORS Configuration
   CORS_ORIGIN=https://yourdomain.com
   ```

7. **Build the application**
   ```bash
   npm run build
   ```

8. **Start the application with PM2** (if available)
   ```bash
   # Install PM2 globally
   npm install -g pm2

   # Start the app
   pm2 start dist/index.js --name billoo-travel-api

   # Save PM2 configuration
   pm2 save

   # Setup PM2 to start on reboot
   pm2 startup
   ```

#### Option B: Using cPanel File Manager

1. **Upload files**
   - Zip the `backend` folder
   - In cPanel, go to **File Manager**
   - Navigate to home directory
   - Upload the zip file
   - Extract it

2. **Setup Node.js Application** (if cPanel has Node.js support)
   - Go to **Setup Node.js App**
   - Click **Create Application**
   - Node.js version: Latest available (18+)
   - Application mode: Production
   - Application root: `/home/username/billoo-travel-backend`
   - Application URL: Leave empty
   - Application startup file: `dist/index.js`
   - Click **Create**

3. **Configure environment variables**
   - In the Node.js app settings, add environment variables from Step 6 above

4. **Install dependencies and build**
   - Click **Run NPM Install**
   - Then run: `npm run build`
   - Restart the application

---

### Step 3: Frontend Deployment

1. **Build frontend locally**
   ```bash
   cd frontend

   # Create production .env file
   echo "VITE_API_URL=https://yourdomain.com/api" > .env

   # Install dependencies
   npm install

   # Build for production
   npm run build
   ```

2. **Upload to cPanel**
   - The build creates a `dist` folder
   - In cPanel **File Manager**, navigate to `public_html`
   - Upload all contents from `frontend/dist` to `public_html`
   - Your structure should be:
     ```
     public_html/
     ├── index.html
     ├── assets/
     │   ├── index-xxxxx.js
     │   └── index-xxxxx.css
     └── .htaccess
     ```

3. **Create .htaccess file** (for React Router)
   - In `public_html`, create `.htaccess` with:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /

     # Proxy API requests to backend
     RewriteCond %{REQUEST_URI} ^/api
     RewriteRule ^api/(.*)$ http://localhost:3001/api/$1 [P,L]

     # React Router - serve index.html for all routes
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteCond %{REQUEST_URI} !^/api
     RewriteRule . /index.html [L]
   </IfModule>
   ```

---

### Step 4: SSL Configuration

1. **Install SSL Certificate**
   - In cPanel, go to **SSL/TLS Status**
   - Enable **AutoSSL** (Let's Encrypt)
   - Wait for certificate to be issued

2. **Force HTTPS**
   - Add to `.htaccess` (at the top):
   ```apache
   # Force HTTPS
   RewriteCond %{HTTPS} off
   RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   ```

---

### Step 5: Verification

1. **Test the application**
   - Visit: `https://yourdomain.com`
   - You should see the login page
   - Login with: `admin@billoo.com` / `admin123`

2. **Test API**
   - Visit: `https://yourdomain.com/api/health`
   - Should return: `{"success": true, "message": "Server is running"}`

3. **Test features**
   - Create a new query
   - View dashboard stats
   - Logout and login again

---

## 🔧 Troubleshooting

### Issue: Cannot connect to database
- Check database credentials in `.env`
- Verify database user has correct permissions
- Check if database host is `localhost` or `127.0.0.1`

### Issue: API requests failing
- Check if Node.js app is running (PM2 or cPanel)
- Verify `.htaccess` proxy rules
- Check server logs: `pm2 logs` or cPanel error logs

### Issue: 404 on page refresh
- Ensure `.htaccess` has React Router rules
- Check if `mod_rewrite` is enabled

### Issue: CORS errors
- Update `CORS_ORIGIN` in backend `.env` to match your domain
- Include both `http://` and `https://` if testing

---

## 📝 Post-Deployment

1. **Change default admin password**
   - Login as admin
   - Go to profile settings
   - Change password from `admin123` to something secure

2. **Create additional users**
   - Use the register endpoint or add via database

3. **Backup database**
   - Setup automatic backups in cPanel
   - Or use: `mysqldump -u username -p database_name > backup.sql`

4. **Monitor application**
   - Check PM2 logs: `pm2 logs`
   - Check cPanel error logs
   - Setup uptime monitoring (UptimeRobot, etc.)

---

## 🔄 Updates and Maintenance

### Updating Backend
```bash
ssh username@yourdomain.com
cd ~/billoo-travel-backend
git pull  # if using git
npm install
npm run build
pm2 restart billoo-travel-api
```

### Updating Frontend
```bash
# Local machine
cd frontend
npm run build

# Upload dist folder to public_html
scp -r dist/* username@yourdomain.com:~/public_html/
```

---

## 📞 Support

For deployment issues:
1. Check cPanel error logs
2. Check PM2 logs: `pm2 logs billoo-travel-api`
3. Verify all environment variables
4. Test database connection: `mysql -u username -p database_name`

---

## ✅ Deployment Checklist

- [ ] Database created and migrated
- [ ] Backend deployed and running
- [ ] Frontend built and uploaded
- [ ] .htaccess configured
- [ ] SSL certificate installed
- [ ] Application accessible via HTTPS
- [ ] Login works
- [ ] Dashboard shows stats
- [ ] Queries can be created
- [ ] Admin password changed
- [ ] Backups configured

---

**Congratulations! Your Billoo Travel Management System is now live! 🎉**
