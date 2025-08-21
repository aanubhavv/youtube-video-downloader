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
2. Add these environment variables:
   - `PORT` = `5000` (Railway will override this automatically)
   - `FRONTEND_URL` = `https://your-app.vercel.app` (you'll update this after Vercel deployment)
   - `FLASK_ENV` = `production`

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

1. **Visit your Vercel URL**
2. **Test the functionality:**
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
```

### Vercel Environment Variables:

```
NEXT_PUBLIC_API_URL=https://your-railway-app.up.railway.app
```

## 🐛 Troubleshooting

### Common Issues:

1. **CORS Errors:**

   - Double-check your URLs in environment variables
   - Make sure Railway has the correct Vercel URL
   - Make sure Vercel has the correct Railway URL

2. **500 Server Errors:**

   - Check Railway deployment logs
   - Go to Railway dashboard → "Deployments" → "View Logs"

3. **Build Failures:**

   - Ensure all dependencies are in `requirements.txt`
   - Check if Dockerfile is properly configured

4. **Environment Variables Not Working:**
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

- [ ] Video info fetching works
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
