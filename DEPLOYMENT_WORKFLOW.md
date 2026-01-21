# 🚀 Deployment Workflow - From Development to Production

This guide explains how to deploy changes from GitHub to your live Namecheap server.

---

## 📊 **The Complete Workflow**

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: DEVELOP & TEST                                     │
│  - Make changes to code                                      │
│  - Test locally                                              │
│  - Commit to GitHub                                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: BUILD FOR PRODUCTION                               │
│  - Run build script                                          │
│  - Creates deployment packages                               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: DEPLOY TO SERVER                                   │
│  - Upload built files                                        │
│  - Replace old files                                         │
│  - Restart application                                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: VERIFY & TEST                                      │
│  - Check application loads                                   │
│  - Test changed features                                     │
│  - Monitor for errors                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 **Method 1: Manual Deployment** (Recommended for Beginners)

### **When to Use:**
- Small changes
- Occasional updates
- No Terminal access on server

### **Process:**

#### **1. Make Changes**
```bash
# Edit your code
# Example: Add new feature to Dashboard.tsx

# Test locally
cd frontend
npm run dev

# Or test backend
cd backend
npm run dev
```

#### **2. Commit to GitHub**
```bash
git add .
git commit -m "Add new dashboard feature"
git push origin main
```

#### **3. Build Production Files**

**For Backend Changes:**
```bash
cd backend
npm run build
# This creates/updates the 'dist' folder
```

**For Frontend Changes:**
```bash
cd frontend
npm run build
# This creates/updates the 'dist' folder
```

#### **4. Deploy to Server**

**Backend Deployment:**
1. Zip the `backend/dist` folder
2. Go to cPanel → File Manager
3. Navigate to `travel-backend/`
4. **Backup:** Rename current `dist` to `dist-old`
5. Upload `dist.zip`
6. Extract
7. Delete ZIP
8. Go to **Setup Node.js App** → Click **"Restart"**

**Frontend Deployment:**
1. Zip the `frontend/dist` folder
2. Go to cPanel → File Manager
3. Navigate to `public_html/tmsportal/`
4. **Delete all files** EXCEPT `.htaccess`
5. Upload `dist.zip`
6. Extract
7. Delete ZIP
8. Clear browser cache (Ctrl+Shift+Delete)
9. Refresh page

#### **5. Verify**
- Visit: `https://tmsportal.billootravels.com`
- Test the changes
- Check browser console for errors

---

## 🔄 **Method 2: Using Deployment Script** (Automated Building)

### **One-Time Setup:**

Download repository to your computer:
```bash
git clone https://github.com/cubicotech-gif/Billoo-Travel-Management-System.git
cd Billoo-Travel-Management-System
```

### **Every Time You Deploy:**

#### **1. Pull Latest Changes**
```bash
git pull origin main
```

#### **2. Run Build Script**

**Linux/Mac:**
```bash
chmod +x scripts/build-for-deployment.sh
./scripts/build-for-deployment.sh
```

**Windows (using Git Bash):**
```bash
bash scripts/build-for-deployment.sh
```

This automatically:
- Builds backend
- Builds frontend
- Creates `backend-deploy.zip`
- Creates `frontend-deploy.zip`

#### **3. Upload to Server**
- Find files in `deploy-package/` folder
- Upload via cPanel File Manager
- Extract and replace old files
- Restart backend

---

## 🔄 **Method 3: FTP Deployment** (Fastest)

### **One-Time Setup:**

1. **Get FTP Credentials from cPanel:**
   - Go to cPanel → Files → FTP Accounts
   - Use main cPanel account OR create new FTP user
   - Note: hostname, username, password

2. **Install FTP Client:**
   - Download [FileZilla](https://filezilla-project.org/) (Free)
   - OR [WinSCP](https://winscp.net/) (Windows)

3. **Connect:**
   - Host: `ftp.yourdomain.com` or `IP address`
   - Username: Your cPanel username
   - Password: Your cPanel password
   - Port: 21

### **Deploy Process:**

#### **Backend:**
1. Build locally: `cd backend && npm run build`
2. Open FTP client
3. Navigate to `/travel-backend/dist/`
4. Upload all files from local `backend/dist/` folder
5. Restart via cPanel → Setup Node.js App

#### **Frontend:**
1. Build locally: `cd frontend && npm run build`
2. Open FTP client
3. Navigate to `/public_html/tmsportal/`
4. Upload all files from local `frontend/dist/` folder
5. Keep `.htaccess` file (don't overwrite)

---

## 🎯 **Quick Reference: What to Deploy When**

| Change Type | What to Build | What to Upload | Restart Needed? |
|-------------|---------------|----------------|-----------------|
| Backend API | `backend/dist` | Replace `travel-backend/dist/` | ✅ Yes |
| Frontend UI | `frontend/dist` | Replace `public_html/tmsportal/*` | ❌ No |
| Database | N/A | Run SQL in phpMyAdmin | ❌ No |
| .env config | N/A | Edit `.env` directly on server | ✅ Yes (backend) |
| Both | Both | Both locations | ✅ Yes (backend) |

---

## ⚡ **Fast Update Commands**

### **Backend Only:**
```bash
cd backend
npm run build
# Upload dist folder
# Restart Node.js app
```

### **Frontend Only:**
```bash
cd frontend
npm run build
# Upload dist folder
# Clear browser cache
```

### **Full Deployment:**
```bash
# Build both
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..

# Upload both
# Restart backend
# Clear browser cache
```

---

## 🐛 **Troubleshooting Deployments**

### **Problem: Changes Not Showing**

**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Try incognito/private mode
3. Check if files actually uploaded (timestamp in File Manager)
4. Verify you uploaded to correct folder

### **Problem: Backend Not Working After Deployment**

**Solution:**
1. Check Node.js app status (should be "Running")
2. Click "Restart" in Setup Node.js App
3. Check error logs (in Node.js App section)
4. Verify `.env` file still exists with correct values
5. Make sure `dist/index.js` exists

### **Problem: Build Fails Locally**

**Solution:**
```bash
# Clear and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 📝 **Deployment Checklist**

Before deploying, check:

- [ ] Code tested locally
- [ ] No console errors
- [ ] Built successfully (`npm run build`)
- [ ] Committed to GitHub
- [ ] Backed up current production files
- [ ] `.env` file not affected
- [ ] `.htaccess` file not overwritten

After deploying:

- [ ] Application loads without errors
- [ ] New features work as expected
- [ ] No broken functionality
- [ ] Backend status shows "Running"
- [ ] Database connections working

---

## 🚀 **Recommended Workflow Summary**

**For Small Projects (Like Yours):**

1. **Develop locally** or in development environment
2. **Test thoroughly**
3. **Commit to GitHub** (version control backup)
4. **Build on your computer** (`npm run build`)
5. **Upload via FTP** (fastest) or File Manager
6. **Restart backend if needed**
7. **Test on live site**

**Time:** ~5-10 minutes per deployment

---

## 💡 **Pro Tips**

1. **Always backup before deploying** - Rename old `dist` folder to `dist-backup`
2. **Deploy during low-traffic times** - Less users affected if something breaks
3. **Test in production immediately** - Catch issues early
4. **Keep a deployment log** - Note what you deployed and when
5. **Use Git tags** for releases - Easy to track versions

---

## 📞 **Need Help?**

If deployment fails:
1. Check error logs in cPanel → Setup Node.js App → Logs
2. Check browser console (F12)
3. Restore from backup
4. Review this guide step-by-step

---

**Happy Deploying! 🎉**

*Last Updated: 2026-01-21*
