# Production Deployment Checklist

## ✅ Bot Detection Fix Implementation

The following has been implemented to resolve the "Sign in to confirm you're not a bot" error:

### Backend Changes Made:

1. **Cookie Authentication Support** - Added `get_cookie_options()` function
2. **Enhanced yt-dlp Configuration** - Updated `get_enhanced_ydl_opts()` to include cookies
3. **Environment Variables Support**:
   - `YT_DLP_COOKIES_FROM_BROWSER` - Browser cookie extraction (chrome, firefox, edge, etc.)
   - `YT_DLP_COOKIES_FILE` - Path to manual cookies.txt file
4. **Improved Error Handling** - Better error messages with cookie setup guidance
5. **New API Endpoints**:
   - `/api/cookie-status` - Check cookie configuration
   - Updated `/api/health` - Shows cookie status
   - Updated `/api/test-video-extraction` - Test with cookie info

## 🚀 Deployment Steps

### ⚠️ Important: Browser vs Cookie File Method

**The error you're seeing means the server environment doesn't have browser access. Use the Cookie File method instead:**

### Method 1: Cookie File (Recommended for Production)

1. **Generate cookies.txt file**:

   ```bash
   # On your local machine with browser access
   cd backend
   pip install browser-cookie3
   python generate_cookies.py
   ```

2. **Upload cookies.txt to your server** (Railway, Vercel, etc.)

3. **Set Environment Variables**:

   ```
   YT_DLP_COOKIES_FILE = /app/cookies.txt
   ```

   Remove `YT_DLP_COOKIES_FROM_BROWSER` if previously set.

### Method 2: Browser Cookie Extraction (Local/Development Only)

1. **Set Environment Variable**:

   ```
   YT_DLP_COOKIES_FROM_BROWSER = chrome
   ```

   (or `firefox`, `edge`, `safari` depending on server environment)

2. **Deploy and Test**:
   - Deploy your updated code
   - Test with `/api/health` endpoint to verify cookie status
   - Test with actual video URL

### For Other Platforms:

**Railway (Cookie File Method):**

```bash
YT_DLP_COOKIES_FILE=/app/cookies.txt
```

**Vercel/Netlify:**

```bash
YT_DLP_COOKIES_FILE=/tmp/cookies.txt
```

**Docker:**

```dockerfile
COPY cookies.txt /app/cookies.txt
ENV YT_DLP_COOKIES_FILE=/app/cookies.txt
```

**Local Testing:**

```bash
export YT_DLP_COOKIES_FROM_BROWSER=chrome  # Linux/Mac
set YT_DLP_COOKIES_FROM_BROWSER=chrome     # Windows
```

## 🧪 Testing

1. **Health Check**: `GET /api/health`

   - Should show: `"cookie_status": "Using chrome browser cookies"`

2. **Cookie Status**: `GET /api/cookie-status`

   - Should show: `"configured": true`

3. **Video Extraction Test**: `GET /api/test-video-extraction`
   - Should succeed without bot detection error

## 📋 Verification Checklist

- [ ] Choose appropriate cookie method (file vs browser)
- [ ] Environment variable is set correctly
- [ ] Backend deployment successful
- [ ] `/api/cookie-status` shows proper configuration
- [ ] `/api/test-video-extraction` works without errors
- [ ] Actual video downloads work in production

## 🔧 Troubleshooting

### Error: "could not find chrome cookies database"

**This is the exact error you're experiencing. Solution:**

1. **Remove browser cookie environment variable**:

   ```bash
   # Remove this from Railway
   YT_DLP_COOKIES_FROM_BROWSER=chrome
   ```

2. **Use cookie file method instead**:

   ```bash
   # Generate on your local machine
   cd backend
   python generate_cookies.py

   # Upload cookies.txt to Railway
   # Set this environment variable
   YT_DLP_COOKIES_FILE=/app/cookies.txt
   ```

### Other Common Issues:

1. **"Sign in to confirm you're not a bot"**: Cookie authentication not working

   - Regenerate cookies.txt file
   - Ensure cookies are from a logged-in YouTube session
   - Check file upload path matches environment variable

2. **Server environment has no browser**: Use cookie file method always for production

3. **Cookie file not found**: Check file path and permissions
   ```bash
   # Verify file exists on server
   ls -la /app/cookies.txt
   ```

### Quick Fix for Your Current Error:

```bash
# 1. On your local machine
cd backend
pip install browser-cookie3
python generate_cookies.py

# 2. Upload cookies.txt to Railway
# 3. In Railway environment variables:
#    Remove: YT_DLP_COOKIES_FROM_BROWSER
#    Add: YT_DLP_COOKIES_FILE=/app/cookies.txt
```

## 📚 Documentation

- `COOKIES_SETUP.md` - Detailed cookie setup instructions
- Updated `README.md` - Includes troubleshooting section
- Updated `DEPLOYMENT.md` - Includes cookie configuration steps

## 🔍 Monitoring

The application now logs cookie configuration attempts and provides detailed error messages when bot detection occurs, making it easier to diagnose and resolve authentication issues.
