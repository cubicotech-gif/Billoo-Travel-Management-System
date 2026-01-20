# Setup & Deployment Guide - Namecheap Hosting

## Prerequisites

- Namecheap cPanel hosting account (Shared or VPS)
- Domain name configured
- MySQL database access
- Node.js support (verify with your hosting plan)
- SSH access (for VPS) or File Manager access

---

## Part 1: Namecheap cPanel Setup

### Step 1: Create MySQL Database

1. **Login to cPanel**
   - Go to: https://yourdomain.com:2083
   - Login with your Namecheap credentials

2. **Create Database**
   - Navigate to: **MySQL® Databases**
   - Create a new database:
     - Database Name: `travel_agency_db`
   - Click **Create Database**

3. **Create Database User**
   - Scroll to: **Add New User**
   - Username: `travel_user`
   - Password: Generate a strong password (save it!)
   - Click **Create User**

4. **Grant Privileges**
   - Scroll to: **Add User To Database**
   - Select User: `travel_user`
   - Select Database: `travel_agency_db`
   - Click **Add**
   - Check **ALL PRIVILEGES**
   - Click **Make Changes**

5. **Note Database Credentials**
   ```
   DB_HOST: localhost
   DB_USER: cpanel_username_travel_user
   DB_PASSWORD: [your generated password]
   DB_NAME: cpanel_username_travel_agency_db
   
   Note: Namecheap adds your cPanel username as prefix
   ```

---

### Step 2: Import Database Schema

**Option A: Using phpMyAdmin**

1. In cPanel, open **phpMyAdmin**
2. Select your database: `cpanel_username_travel_agency_db`
3. Click **Import** tab
4. Choose file: `DATABASE_SCHEMA.md` (convert SQL parts to .sql file)
5. Click **Go**
6. Verify all tables created successfully

**Option B: Using SQL Query**

1. Open phpMyAdmin
2. Select database
3. Click **SQL** tab
4. Copy and paste schema from `DATABASE_SCHEMA.md`:
   - First paste table creation queries
   - Then paste triggers
   - Then paste views
   - Finally paste seed data
5. Execute each section

---

### Step 3: Setup Node.js Application

**For Namecheap Shared Hosting:**

1. **Check Node.js Version**
   - cPanel → **Setup Node.js App**
   - If available, proceed. If not, you may need VPS.

2. **Create Node.js App**
   - Click **Create Application**
   - Node.js version: Select latest (18+ recommended)
   - Application mode: Production
   - Application root: `/home/username/travel-agency-backend`
   - Application URL: `yourdomain.com/api` or `api.yourdomain.com`
   - Application startup file: `dist/server.js`
   - Click **Create**

3. **Install Dependencies**
   - After app is created, note the **Run NPM Install** command
   - Use **Terminal** or upload via File Manager

**For VPS Hosting:**

1. **SSH into Server**
   ```bash
   ssh username@your-server-ip
   ```

2. **Install Node.js (if not installed)**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install PM2 (Process Manager)**
   ```bash
   sudo npm install -g pm2
   ```

---

### Step 4: Upload Project Files

**Option A: Using File Manager**

1. **Upload Backend**
   - In cPanel, open **File Manager**
   - Navigate to: `/home/username/`
   - Create folder: `travel-agency-backend`
   - Upload all backend files (zip and extract)

2. **Upload Frontend**
   - Navigate to: `/home/username/public_html/`
   - Upload built frontend files (from `frontend/dist/`)

**Option B: Using FTP/SFTP**

1. **Use FileZilla or similar**
   - Host: `ftp.yourdomain.com`
   - Username: Your cPanel username
   - Password: Your cPanel password
   - Port: 21 (FTP) or 22 (SFTP)

2. **Upload Files**
   - Upload `backend/` to `/home/username/travel-agency-backend/`
   - Upload `frontend/dist/` contents to `/home/username/public_html/`

**Option C: Using Git (Recommended)**

1. **SSH into server**
2. **Clone Repository**
   ```bash
   cd /home/username
   git clone https://github.com/yourusername/travel-agency-system.git
   ```

3. **Navigate to backend**
   ```bash
   cd travel-agency-system/backend
   ```

---

### Step 5: Configure Environment Variables

1. **Create .env file in backend**
   ```bash
   cd /home/username/travel-agency-backend
   nano .env
   ```

2. **Paste Configuration** (update with your actual values):
   ```env
   # Environment
   NODE_ENV=production
   PORT=3001
   
   # Database
   DB_HOST=localhost
   DB_USER=cpanel_username_travel_user
   DB_PASSWORD=your_strong_password_here
   DB_NAME=cpanel_username_travel_agency_db
   
   # JWT Secret (generate a random 64-character string)
   JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-this-immediately
   JWT_EXPIRE=7d
   
   # File Upload
   UPLOAD_PATH=/home/username/travel-agency-backend/uploads
   MAX_FILE_SIZE=5242880
   
   # Email Configuration (Optional)
   SMTP_HOST=mail.yourdomain.com
   SMTP_PORT=587
   SMTP_USER=noreply@yourdomain.com
   SMTP_PASS=your_email_password
   SMTP_FROM=Travel Agency <noreply@yourdomain.com>
   
   # WhatsApp API (Optional - Future)
   WHATSAPP_API_KEY=
   WHATSAPP_API_URL=
   
   # Frontend URL
   FRONTEND_URL=https://yourdomain.com
   ```

3. **Save file**: Ctrl+X, then Y, then Enter

4. **Create .env for frontend** (if using client-side env vars)
   ```bash
   cd /home/username/public_html
   nano .env
   ```
   
   Paste:
   ```env
   VITE_API_URL=https://yourdomain.com/api
   ```

---

### Step 6: Install Dependencies & Build

**For Shared Hosting (cPanel):**

1. **Terminal Access**
   - cPanel → **Terminal**

2. **Navigate to backend**
   ```bash
   cd ~/travel-agency-backend
   ```

3. **Install Dependencies**
   ```bash
   npm install --production
   ```

4. **Build TypeScript**
   ```bash
   npm run build
   ```

**For VPS:**

1. **Install Backend Dependencies**
   ```bash
   cd /home/username/travel-agency-system/backend
   npm install
   npm run build
   ```

2. **Build Frontend**
   ```bash
   cd /home/username/travel-agency-system/frontend
   npm install
   npm run build
   ```

3. **Copy built frontend to public_html**
   ```bash
   cp -r dist/* /home/username/public_html/
   ```

---

### Step 7: Start Backend Server

**For Shared Hosting (cPanel):**

1. Go to **Setup Node.js App**
2. Find your application
3. Click **Edit**
4. Click **Run NPM Install** if not done
5. Application should start automatically
6. Note the **Restart** button if you need to restart

**For VPS (using PM2):**

1. **Start with PM2**
   ```bash
   cd /home/username/travel-agency-system/backend
   pm2 start dist/server.js --name travel-agency
   ```

2. **Setup PM2 to start on boot**
   ```bash
   pm2 startup
   pm2 save
   ```

3. **Check status**
   ```bash
   pm2 status
   pm2 logs travel-agency
   ```

---

### Step 8: Configure .htaccess (Apache)

1. **Create/Edit .htaccess in public_html**
   ```bash
   nano /home/username/public_html/.htaccess
   ```

2. **Paste the following** (for React SPA routing + API proxy):
   ```apache
   # Enable RewriteEngine
   RewriteEngine On
   
   # Force HTTPS
   RewriteCond %{HTTPS} off
   RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [L,R=301]
   
   # API Proxy - Forward /api requests to Node.js backend
   RewriteCond %{REQUEST_URI} ^/api/
   RewriteRule ^api/(.*)$ http://127.0.0.1:3001/api/$1 [P,L]
   
   # React Router - Serve index.html for all non-file routes
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /index.html [L]
   
   # Security Headers
   <IfModule mod_headers.c>
       Header set X-Content-Type-Options "nosniff"
       Header set X-Frame-Options "SAMEORIGIN"
       Header set X-XSS-Protection "1; mode=block"
   </IfModule>
   
   # Compression
   <IfModule mod_deflate.c>
       AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
   </IfModule>
   
   # Cache Control
   <IfModule mod_expires.c>
       ExpiresActive On
       ExpiresByType image/jpg "access plus 1 year"
       ExpiresByType image/jpeg "access plus 1 year"
       ExpiresByType image/gif "access plus 1 year"
       ExpiresByType image/png "access plus 1 year"
       ExpiresByType text/css "access plus 1 month"
       ExpiresByType application/javascript "access plus 1 month"
   </IfModule>
   ```

3. **Save file**

**Note**: If Node.js app is on subdomain (e.g., api.yourdomain.com), skip the proxy rules.

---

### Step 9: SSL Certificate Setup

1. **In cPanel → SSL/TLS Status**
2. Click **AutoSSL** (Let's Encrypt - Free)
3. Enable for your domain
4. Wait for certificate to be issued (usually instant)
5. Verify HTTPS is working

**Manual SSL (if needed):**
- cPanel → **SSL/TLS** → **Manage SSL sites**
- Install certificate files if you have them

---

### Step 10: File Permissions

**Set correct permissions for uploads directory:**

```bash
cd /home/username/travel-agency-backend
chmod 755 uploads
chmod 755 uploads/*
```

**Set permissions for backend files:**
```bash
chmod 644 .env
chmod 755 dist/
```

---

### Step 11: Test Installation

1. **Test Backend API**
   ```
   https://yourdomain.com/api/health
   ```
   Should return: `{"status": "ok"}`

2. **Test Frontend**
   ```
   https://yourdomain.com
   ```
   Should load the React app

3. **Test Login**
   - Use default admin credentials:
     - Email: `admin@travelagency.com`
     - Password: `Admin@123`
   - **CHANGE PASSWORD IMMEDIATELY**

---

## Part 2: Post-Deployment Configuration

### Email Setup (Optional)

1. **Create Email Account in cPanel**
   - cPanel → **Email Accounts**
   - Create: `noreply@yourdomain.com`

2. **Update .env with SMTP details**
   ```env
   SMTP_HOST=mail.yourdomain.com
   SMTP_PORT=587
   SMTP_USER=noreply@yourdomain.com
   SMTP_PASS=your_email_password
   ```

3. **Restart backend**

---

### Backup Setup

**Automated Database Backup (cron job):**

1. **Create backup script**
   ```bash
   nano /home/username/backup-db.sh
   ```

2. **Paste script**:
   ```bash
   #!/bin/bash
   DATE=$(date +%Y%m%d_%H%M%S)
   BACKUP_DIR="/home/username/backups"
   DB_NAME="cpanel_username_travel_agency_db"
   DB_USER="cpanel_username_travel_user"
   DB_PASS="your_password"
   
   mkdir -p $BACKUP_DIR
   mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/backup_$DATE.sql
   
   # Keep only last 7 days
   find $BACKUP_DIR -type f -mtime +7 -delete
   ```

3. **Make executable**
   ```bash
   chmod +x /home/username/backup-db.sh
   ```

4. **Setup cron job**
   - cPanel → **Cron Jobs**
   - Add: `0 2 * * * /home/username/backup-db.sh`
   - (Runs daily at 2 AM)

---

### Monitoring & Logs

**View Backend Logs:**

**Shared Hosting:**
- Check Node.js app logs in cPanel

**VPS (PM2):**
```bash
pm2 logs travel-agency
pm2 monit
```

**Apache Error Logs:**
```bash
tail -f /home/username/logs/error_log
```

---

## Part 3: Updating the Application

### Update Backend Code

1. **Pull latest code**
   ```bash
   cd /home/username/travel-agency-system
   git pull origin main
   ```

2. **Install new dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Rebuild**
   ```bash
   npm run build
   ```

4. **Restart**
   - **Shared**: cPanel → Setup Node.js App → Restart
   - **VPS**: `pm2 restart travel-agency`

### Update Frontend

1. **Build new version**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Copy to public_html**
   ```bash
   rm -rf /home/username/public_html/*
   cp -r dist/* /home/username/public_html/
   ```

---

## Part 4: Troubleshooting

### Issue: Backend not starting

**Check:**
1. Node.js app logs in cPanel
2. Verify .env file exists and has correct values
3. Check database connection:
   ```bash
   mysql -u DB_USER -p DB_NAME
   ```
4. Verify port 3001 is not blocked

### Issue: API 404 errors

**Check:**
1. .htaccess proxy rules are correct
2. Backend is running on correct port
3. API routes are properly defined

### Issue: Database connection failed

**Check:**
1. Database credentials in .env
2. Database user has privileges
3. Database server is running
4. Firewall not blocking MySQL port

### Issue: File uploads not working

**Check:**
1. Uploads directory exists
2. Permissions: `chmod 755 uploads`
3. UPLOAD_PATH in .env is correct
4. Check max file size in .env

### Issue: Frontend blank page

**Check:**
1. Browser console for errors
2. Verify API_URL in frontend .env
3. Check if index.html exists in public_html
4. Check .htaccess routing rules

---

## Part 5: Security Checklist

- [ ] Change default admin password
- [ ] Use strong JWT_SECRET (min 32 chars)
- [ ] Enable HTTPS (SSL certificate)
- [ ] Set secure file permissions
- [ ] Enable firewall
- [ ] Regular database backups
- [ ] Keep dependencies updated
- [ ] Monitor logs for suspicious activity
- [ ] Use strong database passwords
- [ ] Disable directory browsing
- [ ] Set up rate limiting (in code)

---

## Part 6: Performance Optimization

### Enable Gzip Compression

Already in .htaccess above.

### Enable Browser Caching

Already in .htaccess above.

### Database Indexing

All important indexes are in DATABASE_SCHEMA.md

### CDN (Optional)

- Use Cloudflare for static assets
- Configure DNS through Namecheap

---

## Support

For issues:
1. Check logs (backend, Apache, MySQL)
2. Review documentation
3. Contact: roohul@cubicotechnologies.com

---

**Your Travel Agency System is now deployed on Namecheap!** 🎉
