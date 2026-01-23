# Deployment Guide

This guide will help you deploy the Billoo Travel Management System.

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Vercel or Netlify Account**: For hosting the frontend
3. **GitHub Account**: For version control and CI/CD

## Step 1: Set Up Supabase Database

1. **Create a new Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Name it "billoo-travel"
   - Choose a strong database password
   - Select your region

2. **Run the database schema**
   - Go to SQL Editor in Supabase dashboard
   - Copy the contents of `database/schema.sql`
   - Paste and click "Run"
   - Wait for all tables to be created

3. **Create the first admin user**
   - Go to Authentication > Users in Supabase
   - Click "Add User"
   - Email: `admin@billootravel.com`
   - Password: `admin123` (change this later!)
   - Click "Create User"
   - Copy the user's UUID

4. **Add user to users table**
   - Go back to SQL Editor
   - Run this query (replace YOUR_USER_ID with the UUID from step 3):
   ```sql
   INSERT INTO public.users (id, email, full_name, role)
   VALUES ('YOUR_USER_ID', 'admin@billootravel.com', 'Admin User', 'admin');
   ```

5. **Get your Supabase credentials**
   - Go to Project Settings > API
   - Copy:
     - Project URL (VITE_SUPABASE_URL)
     - anon/public key (VITE_SUPABASE_ANON_KEY)

## Step 2: Deploy to Vercel (Recommended)

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit - Billoo Travel Management System"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Configure:
     - Framework Preset: Vite
     - Build Command: `npm run build`
     - Output Directory: `dist`
     - Install Command: `npm install`

3. **Add Environment Variables**
   - In Vercel project settings > Environment Variables
   - Add:
     - `VITE_SUPABASE_URL` = your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Your app will be live at `https://your-project.vercel.app`

## Step 3: Alternative - Deploy to Netlify

1. **Push code to GitHub** (if not done already)
   ```bash
   git add .
   git commit -m "Initial commit - Billoo Travel Management System"
   git push origin main
   ```

2. **Deploy to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" > "Import an existing project"
   - Choose GitHub and select your repository
   - Configure:
     - Build command: `npm run build`
     - Publish directory: `dist`

3. **Add Environment Variables**
   - Go to Site Settings > Environment Variables
   - Add:
     - `VITE_SUPABASE_URL` = your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key

4. **Deploy**
   - Click "Deploy site"
   - Your app will be live at `https://your-site.netlify.app`

## Step 4: Test Your Deployment

1. Visit your deployed URL
2. Try logging in with:
   - Email: `admin@billootravel.com`
   - Password: `admin123`
3. Create a test query
4. Add a passenger
5. Create a vendor
6. Generate an invoice

## Step 5: Configure Custom Domain (Optional)

### Vercel:
1. Go to Project Settings > Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### Netlify:
1. Go to Site Settings > Domain Management
2. Add custom domain
3. Follow DNS configuration instructions

## Troubleshooting

### Login not working
- Check Supabase credentials in environment variables
- Verify user exists in both `auth.users` and `public.users` tables
- Check browser console for errors

### Data not loading
- Verify Supabase RLS policies are set correctly
- Check network tab for failed API calls
- Ensure user is authenticated

### Build errors
- Check Node.js version (should be 18+)
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check environment variables are set correctly

## Security Recommendations

1. **Change default admin password** immediately after first login
2. **Enable 2FA** in Supabase project settings
3. **Set up email verification** for new users
4. **Configure allowed domains** in Supabase Auth settings
5. **Review RLS policies** to ensure proper access control
6. **Enable rate limiting** in Supabase dashboard
7. **Set up regular backups** in Supabase settings

## Updating the Application

1. Make changes to your code
2. Commit and push to GitHub
3. Vercel/Netlify will automatically redeploy
4. For database changes, run SQL migrations in Supabase SQL Editor

## Support

For issues or questions:
- Check the README.md file
- Review Supabase documentation
- Check Vite documentation
- Open an issue on GitHub

## Next Steps

1. Customize the branding and colors
2. Add more features as needed
3. Set up email notifications (using Supabase or SendGrid)
4. Configure backups and monitoring
5. Add analytics (Google Analytics, Plausible, etc.)
