# YouTube Downloader Deployment Guide

This guide will walk you through deploying your YouTube Downloader application using **Railway** for the backend and **Vercel** for the frontend.

## 📋 Prerequisites

Before you start, make sure you have:

- A GitHub account
- Your code pushed to a GitHub repository
- A Railway account (sign up at [railway.app](https://railway.app))
- A Vercel account (sign up at [vercel.com](https://vercel.com))

## 🚀 Step 1: Deploy Backend to Railway

### 1.1 Create Railway Account & Project

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository
5. Railway will automatically detect the Dockerfile and start building

### 1.2 Configure Environment Variables

1. In your Railway project dashboard, click on **"Variables"** tab
2. Add these **required** environment variables:

   - `PORT` = `5000` (Railway will override this automatically)
   - `FRONTEND_URL` = `https://your-app.vercel.app` (you'll update this after Vercel deployment)
   - `FLASK_ENV` = `production`

3. Add **YouTube cookie authentication** (Required to prevent bot detection):
   - `YOUTUBE_COOKIES_RAW` = (Your exported YouTube cookies - see instructions below)

#### 🍪 YouTube Cookie Setup (Critical Step)

YouTube blocks automated requests from cloud servers. To bypass this:

1. **Export cookies from your browser:**

   - Install: [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) (Chrome)
   - Or: [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/) (Firefox)

2. **Get YouTube cookies:**

   - Visit YouTube and log into your account
   - Use the extension to export cookies for `youtube.com`
   - Copy the entire cookie text content

3. **Add to Railway:**

   - Variable Key: `YOUTUBE_COOKIES_RAW`
   - Variable Value: Paste the entire cookie content (including headers)
   - Example format:

   ```
   # Netscape HTTP Cookie File
   .youtube.com	TRUE	/	FALSE	1234567890	cookie_name	cookie_value
   .youtube.com	TRUE	/	TRUE	1234567890	session_token	abc123
   ```

   **⚠️ Important:** Cookie content should start with `# Netscape HTTP Cookie File` header

4. **Test your cookies locally (optional but recommended):**

   ```bash
   # Set environment variable with your cookies
   set YOUTUBE_COOKIES_RAW=your_cookie_content

   # Run test script
   python test-cookies.py
   ```

5. **Alternative options** (if needed):
   - `YOUTUBE_COOKIES_BROWSER` = `chrome` (only works for local deployments)
   - `YOUTUBE_COOKIES_FILE` = `/path/to/cookies.txt` (only works for local deployments)

### 1.3 Get Your Railway URL

- After deployment completes, Railway will provide a URL like: `https://your-app-production-1234.up.railway.app`
- **Save this URL** - you'll need it for Vercel configuration!

## 🌐 Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect it's a Next.js project

### 2.2 Configure Build Settings

Vercel should automatically detect:

- **Framework Preset:** Next.js
- **Root Directory:** `.` (default)
- **Build Command:** `npm run build`
- **Output Directory:** `.next`

### 2.3 Add Environment Variables

1. In **"Environment Variables"** section, add:
   - **Key:** `NEXT_PUBLIC_API_URL`
   - **Value:** Your Railway URL (e.g., `https://your-app-production-1234.up.railway.app`)
   - **Environments:** Production, Preview, Development

### 2.4 Deploy

1. Click **"Deploy"**
2. Wait for deployment to complete
3. Get your Vercel URL: `https://your-app.vercel.app`

## 🔄 Step 3: Update Cross-Origin Settings

### 3.1 Update Railway Environment Variables

1. Go back to your Railway project
2. Update the `FRONTEND_URL` variable with your **actual Vercel URL**
3. Example: `FRONTEND_URL` = `https://your-app.vercel.app`

### 3.2 Redeploy Backend (if needed)

Railway should automatically redeploy when you update environment variables. If not, trigger a manual redeploy.

## ✅ Step 4: Test Your Deployed Application

1. **Test cookie configuration first:**

   - Visit: `https://your-railway-app.up.railway.app/api/cookie-status`
   - Verify `has_cookies: true` in the response
   - Visit: `https://your-railway-app.up.railway.app/api/test-video-extraction`
   - Should return successful video info without bot detection

2. **Visit your Vercel URL**
3. **Test the functionality:**
   - Paste a YouTube URL
   - Check if video info loads
   - Test download functionality
   - Verify both direct download and server download work

## 🔧 Environment Variables Summary

### Railway Environment Variables:

```
PORT=5000
FRONTEND_URL=https://your-actual-app.vercel.app
FLASK_ENV=production
YOUTUBE_COOKIES_RAW=# Netscape HTTP Cookie File
# Your exported YouTube cookies here
.youtube.com	TRUE	/	FALSE	1234567890	cookie_name	value
```

### Vercel Environment Variables:

```
NEXT_PUBLIC_API_URL=https://your-railway-app.up.railway.app
```

## 🐛 Troubleshooting

### Common Issues:

1. **YouTube Bot Detection Error (Most Common):**

   ```
   ERROR: Sign in to confirm you're not a bot
   ```

   **Solution:**

   - Ensure `YOUTUBE_COOKIES_RAW` is properly set in Railway
   - Export fresh cookies from a logged-in YouTube session
   - Check cookie format (must include Netscape headers)
   - Test with `/api/cookie-status` endpoint
   - Cookies expire every 1-2 months - refresh periodically

2. **CORS Errors:**

   - Double-check your URLs in environment variables
   - Make sure Railway has the correct Vercel URL
   - Make sure Vercel has the correct Railway URL

3. **500 Server Errors:**

   - Check Railway deployment logs
   - Go to Railway dashboard → "Deployments" → "View Logs"

4. **Build Failures:**

   - Ensure all dependencies are in `requirements.txt`
   - Check if Dockerfile is properly configured

5. **Environment Variables Not Working:**
   - Make sure environment variables are set correctly
   - Try redeploying after making changes
   - Check variable names match exactly (case-sensitive)

### How to Check Logs:

**Railway Logs:**

1. Go to Railway dashboard
2. Click on your project
3. Go to "Deployments" tab
4. Click "View Logs" for the latest deployment

**Vercel Logs:**

1. Go to Vercel dashboard
2. Click on your project
3. Go to "Functions" tab to see runtime logs

## 📱 Testing Checklist

After deployment, test these features:

- [ ] **Cookie configuration working** (`/api/cookie-status` shows `has_cookies: true`)
- [ ] **YouTube access working** (`/api/test-video-extraction` returns video info)
- [ ] Video info fetching works without bot detection errors
- [ ] Direct download to device works
- [ ] Server download works
- [ ] Download progress tracking works
- [ ] Downloaded files list works
- [ ] File downloads work from the server
- [ ] Error handling works properly

## 🎉 Success!

Your YouTube Downloader app should now be live and accessible worldwide!

**Frontend URL:** Your Vercel deployment URL  
**Backend API:** Your Railway deployment URL

## 📝 Notes

- Railway provides 500 hours of free usage per month
- Vercel provides generous free tier for hobby projects
- Both platforms support custom domains if needed
- Environment variables can be updated without code changes
- Both platforms support automatic deployments from GitHub

---

**Need Help?** Check the logs first, then verify all environment variables are set correctly.
