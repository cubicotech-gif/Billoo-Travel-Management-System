# Debug Steps for Netlify Deployment

## Issue: App shows only title, not loading fully

### Step 1: Check Browser Console
1. Open your Netlify site in Chrome/Firefox
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Look for red error messages
5. Common errors to look for:
   - "Missing Supabase environment variables"
   - CORS errors
   - Failed to load module errors

### Step 2: Verify Environment Variables in Netlify
1. Go to Netlify Dashboard
2. Click on your site
3. Go to Site Settings → Environment Variables
4. Make sure you have BOTH:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
5. If they're missing or wrong, add them and REDEPLOY

### Step 3: Trigger a New Deploy
After adding/fixing environment variables:
1. Go to Deploys tab in Netlify
2. Click "Trigger deploy" → "Deploy site"
3. Wait for deploy to complete
4. Check site again

### Step 4: Check Build Logs
1. Go to Deploys tab
2. Click on the latest deploy
3. Check the build log for errors
4. Should say "Build succeeded" at the end

## What to Check

### Environment Variables Should Look Like:
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ...
```

### Build Should Show:
```
✓ built in XX.XXs
✓ Build succeeded
```

### Site Should Show:
- Login page with email/password fields
- "Billoo Travel" logo/heading
- Demo credentials shown
