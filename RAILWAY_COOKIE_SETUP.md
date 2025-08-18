# 🚀 Railway Deployment - Cookie Setup Guide

## The Problem in Railway

Your Railway logs show:

```
WARNING:app:No cookie authentication configured for production.
ERROR: [youtube] Sign in to confirm you're not a bot.
```

This happens because Railway doesn't have access to your local `cookies.txt` file.

## ✅ SOLUTION: Environment Variable Setup

### Method 1: Using Railway Dashboard (Recommended)

1. **Go to your Railway project dashboard**
2. **Click on your backend service**
3. **Go to "Variables" tab**
4. **Add this environment variable:**
   ```
   Key: YT_DLP_COOKIES_FILE
   Value: /app/cookies.txt
   ```
5. **Click "Deploy"**

### Method 2: Alternative Cookie Setup

If the above doesn't work, you can also try setting up cookies as a multi-line environment variable:

1. **Copy your cookies.txt content**
2. **In Railway Variables, add:**
   ```
   Key: YOUTUBE_COOKIES_CONTENT
   Value: [paste your entire cookies.txt content here]
   ```

Then I'll update the app to write this content to a file on startup.

## 🔧 Code Changes Made

### 1. Updated Dockerfile

```dockerfile
# Set environment variable for production cookies
ENV YT_DLP_COOKIES_FILE=/app/cookies.txt
```

### 2. Enhanced Cookie Detection

The app now checks for cookies in this order:

1. Environment variable `YT_DLP_COOKIES_FILE` path
2. Local `cookies.txt` file in app directory
3. Browser cookies (fallback)

## 📋 Deployment Checklist

- [x] Updated Dockerfile with cookie environment variable
- [x] Enhanced app.py cookie detection
- [ ] **YOU NEED TO DO:** Set `YT_DLP_COOKIES_FILE=/app/cookies.txt` in Railway
- [ ] **YOU NEED TO DO:** Deploy to Railway

## 🚨 Important Notes

1. **The cookies.txt file is already in your repository**, so Railway will copy it
2. **You just need to set the environment variable** to tell the app where to find it
3. **After setting the variable, redeploy your Railway app**

## 🧪 Testing After Deployment

After you set the environment variable and deploy:

1. Check Railway logs - you should see:
   ```
   INFO:app:Using cookies file from environment: /app/cookies.txt
   ```
2. Instead of:
   ```
   WARNING:app:No cookie authentication configured for production.
   ```

## Alternative: Cookie Content as Environment Variable

If setting the file path doesn't work, I can modify the app to accept cookie content directly as an environment variable. Let me know if you need this approach!
