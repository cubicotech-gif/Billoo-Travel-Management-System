# 🚀 GitHub Actions Auto-Deployment Setup

This guide will help you set up automatic deployment from GitHub to your Namecheap server.

---

## 🎯 What This Does

**After setup, every time code is pushed to GitHub:**
1. ✅ Automatically builds backend (TypeScript → JavaScript)
2. ✅ Automatically builds frontend (React → optimized bundle)
3. ✅ Uploads backend to `travel-backend/` folder via FTP
4. ✅ Uploads frontend to `public_html/tmsportal/` folder via FTP
5. ✅ Your website updates automatically!

**You only need to restart the Node.js app** in cPanel (one click).

---

## 📋 One-Time Setup (5 Minutes)

### **Step 1: Create FTP Account in cPanel**

1. Login to **cPanel**
2. Go to **Files → FTP Accounts**
3. Click **"Add FTP Account"**
4. Fill in:
   - **Username:** `billoo_deploy` (or any name you want)
   - **Password:** Generate a strong password (use generator)
   - **Directory:** `/home/billbewf` (your home directory)
   - **Quota:** Unlimited
5. Click **"Create FTP Account"**
6. **Save these credentials** somewhere safe!

---

### **Step 2: Add FTP Credentials to GitHub Secrets**

1. Go to your GitHub repository:
   ```
   https://github.com/cubicotech-gif/Billoo-Travel-Management-System
   ```

2. Click **Settings** tab (top of page)

3. In left sidebar, click **Secrets and variables → Actions**

4. Click **"New repository secret"** button

5. **Add 3 secrets** (one by one):

   **Secret 1:**
   - Name: `FTP_SERVER`
   - Value: `ftp.billootravels.com` (or your FTP hostname)
   - Click **"Add secret"**

   **Secret 2:**
   - Name: `FTP_USERNAME`
   - Value: `billbewf_billoo_deploy` (your full FTP username with prefix)
   - Click **"Add secret"**

   **Secret 3:**
   - Name: `FTP_PASSWORD`
   - Value: (paste the FTP password you generated)
   - Click **"Add secret"**

---

### **Step 3: Enable GitHub Actions**

1. Still in your GitHub repo, click **"Actions"** tab
2. If asked to enable workflows, click **"I understand my workflows, go ahead and enable them"**
3. You should see the workflow: **"Deploy to Namecheap via FTP"**

---

## ✅ **That's It! Setup Complete!**

---

## 🚀 How to Use (After Setup)

### **Automatic Deployment:**

Every time someone pushes to `main` branch or `claude/analyze-repo-xUe7P` branch:
1. GitHub Actions automatically runs
2. Builds everything
3. Deploys to your server via FTP
4. Takes 3-5 minutes

**You'll see:**
- Go to **Actions** tab in GitHub
- See the running workflow
- Green checkmark ✅ when done

### **Manual Deployment:**

You can also trigger deployment manually:
1. Go to **Actions** tab
2. Click **"Deploy to Namecheap via FTP"**
3. Click **"Run workflow"** button
4. Select branch
5. Click **"Run workflow"**

---

## 📝 After Each Deployment

**Important:** After files are deployed, you need to:

1. Go to **cPanel → Setup Node.js App**
2. Find your application
3. Click **"Restart"** button
4. Wait 30 seconds
5. Your changes are live! ✅

---

## 🔍 Monitoring Deployments

### **Check Deployment Status:**

1. Go to GitHub repo → **Actions** tab
2. See list of all deployments
3. Click on any deployment to see details
4. See logs for each step

### **If Deployment Fails:**

1. Check the error logs in Actions tab
2. Common issues:
   - FTP credentials incorrect
   - FTP server unreachable
   - Build errors in code

---

## 🎯 What Gets Deployed

**Backend:**
- ✅ `backend/dist/` → Uploaded to `travel-backend/dist/`
- ✅ `backend/package.json` → Uploaded to `travel-backend/`
- ❌ Source files (`.ts` files) NOT uploaded (not needed)
- ❌ `node_modules` NOT uploaded (too large, use npm install on server)

**Frontend:**
- ✅ `frontend/dist/` → Uploaded to `public_html/tmsportal/`
- ✅ All built files (HTML, CSS, JS)
- ❌ Source files NOT uploaded (not needed)

---

## 🛡️ Security

**Is This Safe?**

✅ **YES!** Here's why:
- FTP credentials are stored in **GitHub Secrets** (encrypted)
- Only repository admins can see/edit secrets
- Secrets are never visible in logs
- FTP account can be limited to specific folders
- You can delete FTP account anytime

---

## 🎉 Benefits

**Before (Manual):**
1. Make changes
2. Build locally
3. Zip files
4. Upload via File Manager
5. Extract files
6. Restart app
**Time:** 10-15 minutes ⏱️

**After (Automated):**
1. Make changes
2. Push to GitHub
3. Restart app in cPanel
**Time:** 1 minute ⏱️

---

## 🆘 Troubleshooting

### **Problem: Deployment fails with FTP error**

**Solution:**
- Check FTP credentials in GitHub Secrets
- Verify FTP server hostname
- Make sure FTP account has correct permissions

### **Problem: Files deployed but app doesn't update**

**Solution:**
- Did you restart Node.js app in cPanel?
- Check if files actually uploaded (verify in File Manager)

### **Problem: Build fails**

**Solution:**
- Check error logs in Actions tab
- Usually a code syntax error
- Fix the error and push again

---

## 📞 Need Help?

If something doesn't work:
1. Check GitHub Actions logs
2. Verify FTP credentials
3. Check cPanel error logs
4. Try manual deployment once to verify FTP works

---

## 🎓 Advanced: Customizing the Workflow

The workflow file is located at:
```
.github/workflows/deploy.yml
```

You can customize:
- Which branches trigger deployment
- What files get deployed
- Add additional steps (like sending notifications)

---

**Happy Auto-Deploying! 🚀**

*Last Updated: 2026-01-21*
