# 🚀 Vercel + Supabase Deployment Guide

Complete step-by-step guide to deploy Billoo Travel Management System to Vercel with Supabase.

---

## 📋 What You'll Get

✅ **Automatic deployment** from GitHub
✅ **Free hosting** (Vercel free tier)
✅ **Managed database** (Supabase)
✅ **Built-in authentication** (Supabase Auth)
✅ **Zero server management**
✅ **Automatic HTTPS**

---

## 🎯 Prerequisites

- GitHub account
- Email address (for Vercel and Supabase accounts)
- 30 minutes of time

---

## STEP 1: Create Supabase Project (10 minutes)

### 1.1 Sign Up for Supabase

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign in with GitHub (recommended) or email
4. You'll be redirected to your dashboard

### 1.2 Create a New Project

1. Click **"New Project"**
2. Fill in the details:
   - **Name:** `billoo-travel`
   - **Database Password:** Generate a strong password (SAVE THIS!)
   - **Region:** Choose closest to you
   - **Pricing Plan:** Free
3. Click **"Create new project"**
4. Wait 2-3 minutes for setup to complete

### 1.3 Get Your API Keys

1. In your project dashboard, click **"Settings"** (gear icon in sidebar)
2. Click **"API"** in the left menu
3. Copy and save these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

**Keep these safe! You'll need them later.**

### 1.4 Set Up Database Schema

1. In Supabase dashboard, click **"SQL Editor"** in the sidebar
2. Click **"New query"**
3. Copy the entire contents of `supabase/schema.sql` file
4. Paste into the editor
5. Click **"Run"** (or press Ctrl+Enter)
6. You should see: "Success. No rows returned"
7. Click **"Table Editor"** to verify - you should see `users` and `queries` tables

### 1.5 Create Admin User

1. In Supabase dashboard, click **"Authentication"** in sidebar
2. Click **"Users"** tab
3. Click **"Add user"** button
4. Choose **"Create new user"**
5. Fill in:
   - **Email:** `admin@billoo.com`
   - **Password:** `admin123` (or your preferred password)
   - **Auto Confirm User:** Check this box
6. Click **"Create user"**
7. Click **"Send magic link"** if needed

**✅ Supabase Setup Complete!**

---

## STEP 2: Deploy to Vercel (10 minutes)

### 2.1 Sign Up for Vercel

1. Go to [https://vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub account
5. You'll be redirected to Vercel dashboard

### 2.2 Import Your Project

1. In Vercel dashboard, click **"Add New..."** → **"Project"**
2. You'll see a list of your GitHub repositories
3. Find **"Billoo-Travel-Management-System"**
4. Click **"Import"**

### 2.3 Configure Project

1. **Framework Preset:** Next.js (should be auto-detected)
2. **Root Directory:** Click **"Edit"** and set to `nextjs-app`
3. **Build and Output Settings:** Leave default
4. **Environment Variables:** Click **"Add"** and add these:

   **Variable 1:**
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: (paste your Supabase Project URL from Step 1.3)

   **Variable 2:**
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: (paste your Supabase anon key from Step 1.3)

5. Click **"Deploy"**

### 2.4 Wait for Deployment

1. Vercel will start building your project
2. This takes 2-3 minutes
3. You'll see a progress screen with logs
4. When done, you'll see **"Congratulations!"** 🎉
5. Click **"Visit"** to see your live site!

**✅ Your site is now live!**

---

## STEP 3: Test Your Application

### 3.1 Access Your Site

1. Your site URL will be something like: `https://billoo-travel-xxxxx.vercel.app`
2. Vercel also gives you a custom domain option (Settings → Domains)

### 3.2 Test Login

1. Go to your site URL
2. You should see the login page
3. Enter:
   - **Email:** `admin@billoo.com`
   - **Password:** `admin123` (or what you set)
4. Click **"Sign In"**
5. You should be redirected to the Dashboard!

### 3.3 Test Features

1. **Dashboard:** Should show 0 queries initially
2. **Click "Queries"** in navigation
3. **Click "New Query"** button
4. Fill in the form and create a query
5. Query should appear in the list
6. Try changing the status dropdown
7. Go back to Dashboard - stats should update!

**If everything works:** ✅ **DEPLOYMENT SUCCESSFUL!**

---

## 🔄 How Updates Work (Automatic Deployment!)

### Making Changes

1. **I make changes** to the code
2. **I push to GitHub**
3. **Vercel automatically detects the push**
4. **Vercel rebuilds and deploys** (takes 2-3 minutes)
5. **Your site updates automatically!** ✅

**No manual deployment needed!**

### Monitoring Deployments

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your project
3. See all deployments in the **"Deployments"** tab
4. See build logs, errors, etc.

---

## 🔧 Configuration & Settings

### Custom Domain

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your domain (e.g., `app.billootravel.com`)
3. Follow Vercel's instructions to update DNS
4. SSL certificate is automatic!

### Environment Variables

To update environment variables:
1. Vercel dashboard → **Settings** → **Environment Variables**
2. Edit or add new variables
3. **Redeploy** for changes to take effect

### Database Backup

Supabase automatically backs up your database. To manual backup:
1. Supabase dashboard → **Database** → **Backups**
2. Click **"Download backup"**

---

## 📊 Monitoring & Analytics

### Vercel Analytics

1. In Vercel dashboard, click **"Analytics"** tab
2. See page views, performance, etc.
3. Free tier includes basic analytics

### Supabase Logs

1. Supabase dashboard → **Logs**
2. See all database queries
3. Monitor performance

---

## 🆘 Troubleshooting

### Issue: "Invalid API key" error

**Solution:**
1. Check environment variables in Vercel
2. Make sure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
3. Redeploy after fixing

### Issue: Login not working

**Solution:**
1. Check if user exists in Supabase → Authentication → Users
2. Make sure user is confirmed (green checkmark)
3. Try resetting password in Supabase

### Issue: "Table doesn't exist" error

**Solution:**
1. Go to Supabase → SQL Editor
2. Run the schema.sql file again
3. Verify tables exist in Table Editor

### Issue: Deployment failed

**Solution:**
1. Check build logs in Vercel
2. Usually a missing dependency or syntax error
3. Fix the error and push again

---

## 🎓 Advanced Features

### Add New User

**Method 1: Via Supabase Dashboard**
1. Supabase → Authentication → Users
2. Click "Add user"
3. Enter email and password
4. Check "Auto Confirm User"

**Method 2: Via Sign Up Page** (coming soon)
- You can add a sign-up page later
- Uses Supabase Auth

### Row Level Security

Your database has RLS (Row Level Security) enabled:
- Users can only see their own data
- Admins can see all data
- Configured in the schema.sql file

### Scaling

Both Vercel and Supabase scale automatically:
- **Vercel:** Free tier handles millions of requests
- **Supabase:** Free tier: 500MB database, 50,000 monthly active users
- Upgrade when needed (both have paid tiers)

---

## 💰 Costs

### Free Tier Limits

**Vercel Free:**
- Unlimited deployments
- 100GB bandwidth/month
- Serverless function execution
- Perfect for starting!

**Supabase Free:**
- 500MB database storage
- 1GB file storage
- 50,000 monthly active users
- 2GB bandwidth
- Great for MVP!

**When you need to upgrade:**
- Vercel Pro: $20/month
- Supabase Pro: $25/month
- Only needed when you exceed free limits

---

## ✅ Post-Deployment Checklist

- [ ] Site is accessible at Vercel URL
- [ ] Login works with admin credentials
- [ ] Can create queries
- [ ] Can update query status
- [ ] Dashboard shows stats correctly
- [ ] Changed default admin password
- [ ] (Optional) Added custom domain
- [ ] Bookmarked Vercel dashboard
- [ ] Bookmarked Supabase dashboard
- [ ] Saved all credentials securely

---

## 🎉 You're Done!

Your Billoo Travel Management System is now:
- ✅ Live on the internet
- ✅ Automatically deployed from GitHub
- ✅ Secure with HTTPS
- ✅ Scalable and fast
- ✅ Zero server management needed

### What's Next?

1. **Customize:** Change colors, add features
2. **Invite users:** Add team members in Supabase Auth
3. **Monitor:** Check Vercel analytics
4. **Scale:** Upgrade when needed

---

## 📞 Support Resources

- **Vercel Docs:** [https://vercel.com/docs](https://vercel.com/docs)
- **Supabase Docs:** [https://supabase.com/docs](https://supabase.com/docs)
- **Next.js Docs:** [https://nextjs.org/docs](https://nextjs.org/docs)

---

**Congratulations on deploying your application! 🚀**

*Last Updated: 2026-01-21*
*Version: 2.0 (Next.js + Supabase)*
