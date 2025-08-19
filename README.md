# YouTube Downloader Web Application

A full-stack web application for downloading YouTube videos, built with Next.js frontend and Python Flask backend.

## Features

- 🎥 Download YouTube videos in various qualities
- 📊 View detailed video information and available formats
- 🔄 Real-time download progress tracking
- 🎨 Modern, responsive UI with dark mode support
- 🐍 Python virtual environment for isolated backend dependencies
- ⚡ Fast development with Turbopack

## Architecture

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS
- **Backend**: Python Flask API with yt-dlp
- **Environment**: Python virtual environment for dependencies

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- FFmpeg (optional, for merging video and audio formats)

## Installation & Setup

### 1. Clone and Navigate

```bash
cd d:\Programming\Python\yt_downloader\webapp
```

### 2. Frontend Setup

```bash
npm install
```

### 3. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Running the Application

### Option 1: Using VS Code Tasks

1. Open the project in VS Code
2. Use Ctrl+Shift+P and run "Tasks: Run Task"
3. Select "Start Frontend Dev Server" and "Start Python Backend"

### Option 2: Manual Start

#### Start Backend (Terminal 1)

```bash
cd backend
venv\Scripts\activate
python app.py
```

Backend will run at: http://localhost:5000

#### Start Frontend (Terminal 2)

```bash
npm run dev
```

Frontend will run at: http://localhost:3000

## Usage

1. Open http://localhost:3000 in your browser
2. Enter a YouTube URL
3. Click "Get Video Info" to see available formats
4. Select quality preference and click "Download Now"
5. Monitor download progress in real-time

## API Endpoints

- `GET /api/health` - Health check with cookie configuration status
- `GET /api/system-status` - System diagnostics including yt-dlp version
- `GET /api/cookie-status` - Detailed cookie configuration and instructions
- `GET /api/test-video-extraction` - Test YouTube access with current configuration
- `POST /api/video-info` - Get video information
- `POST /api/download-direct` - Start direct download
- `GET /api/download-stream/<download_id>` - Stream video download
- `GET /api/download-status/<task_id>` - Check download status
- `GET /api/downloads` - Get all download statuses

## Project Structure

```
webapp/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main application page
│   │   ├── layout.tsx        # App layout
│   │   └── globals.css       # Global styles
│   └── components/
│       ├── VideoInfoCard.tsx # Video information display
│       └── DownloadProgress.tsx # Download progress tracking
├── backend/
│   ├── venv/                 # Python virtual environment
│   ├── app.py               # Flask API server
│   └── requirements.txt     # Python dependencies
├── public/                  # Static assets
└── package.json            # Node.js dependencies
```

## Dependencies

### Frontend

- Next.js 15.4.6
- React 19
- TypeScript
- Tailwind CSS
- ESLint

### Backend

- yt-dlp 2024.12.13
- Flask 3.1.0
- Flask-CORS 5.0.0

## Troubleshooting

### YouTube Bot Detection (Common Issue)

**Error**: `Sign in to confirm you're not a bot. Use --cookies-from-browser or --cookies for the authentication`

This error occurs when YouTube detects automated requests from your server (especially cloud platforms like Railway, Vercel, or Heroku). Here's how to fix it:

#### Solution 1: Export Browser Cookies (Recommended)

1. **Install a cookie export extension**:

   - Chrome: [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
   - Firefox: [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/)

2. **Export YouTube cookies**:

   - Visit YouTube and log in to your account
   - Use the extension to export cookies for `youtube.com`
   - Copy the entire cookie content

3. **Configure environment variables**:

   For Railway/Production:

   ```bash
   # Add this as an environment variable in your Railway dashboard
   YOUTUBE_COOKIES_RAW=# Netscape HTTP Cookie File
   # Paste your entire exported cookie content here
   .youtube.com	TRUE	/	FALSE	1234567890	cookie_name	cookie_value
   # ... rest of cookies
   ```

   For Local Development:

   ```bash
   # Create a .env file in the backend directory
   YOUTUBE_COOKIES_RAW=your_exported_cookies_here
   ```

#### Solution 2: Browser Auto-Extraction (Local Only)

```bash
# Set browser name for automatic extraction
YOUTUBE_COOKIES_BROWSER=chrome
# Supports: chrome, firefox, edge, safari, chromium
```

**Note**: This only works for local deployments where the browser is on the same machine.

#### Solution 3: Cookie File Path (Local Only)

```bash
# Path to a cookie file
YOUTUBE_COOKIES_FILE=/path/to/your/cookies.txt
```

#### Deployment on Railway

1. Go to your Railway project dashboard
2. Click on your service → Variables tab
3. Add the environment variable:
   - Key: `YOUTUBE_COOKIES_RAW`
   - Value: Your exported cookie content
4. Redeploy the service

#### Checking Cookie Status

Visit `/api/cookie-status` endpoint to verify your configuration:

- Local: http://localhost:5000/api/cookie-status
- Production: https://your-app.railway.app/api/cookie-status

#### Testing Cookies Locally

Use the included test script to verify your cookies work before deploying:

```bash
# Windows
set YOUTUBE_COOKIES_RAW=your_cookie_content_here
python test-cookies.py

# Linux/Mac
export YOUTUBE_COOKIES_RAW="your_cookie_content_here"
python test-cookies.py

# For help
python test-cookies.py --help
```

#### Important Notes

- Cookies expire periodically (usually 1-2 months)
- You'll need to refresh cookies when they expire
- Keep cookies secure - don't share them publicly
- Use cookies from the same region as your server when possible

### Other Common Issues

#### YouTube Player Extraction Failed

**Error**: `Failed to extract any player response; please report this issue on https://github.com/yt-dlp/yt-dlp/issues`

This error indicates yt-dlp cannot extract video information, usually due to:

**Solutions:**

1. **Update yt-dlp to the latest version**:

   ```bash
   # Local development
   cd backend
   venv\Scripts\activate
   pip install --upgrade yt-dlp

   # For Railway deployment - update requirements.txt
   yt-dlp>=2025.1.25
   ```

2. **Check video accessibility**:

   - Try the video URL in a regular browser
   - Video might be region-blocked, private, or deleted
   - Age-restricted videos may need cookie authentication

3. **Test with different videos**:

   - Some videos have special restrictions
   - Try a popular, unrestricted video first

4. **Check system status**:
   - Visit `/api/system-status` to see yt-dlp version and recommendations
   - Local: http://localhost:5000/api/system-status
   - Production: https://your-app.railway.app/api/system-status

#### Other Technical Issues

1. **Import errors in frontend**

   - Restart VS Code or development server
   - Check tsconfig.json path mappings

2. **Python packages not found**

   - Ensure virtual environment is activated
   - Run `pip install -r requirements.txt`

3. **CORS errors**

   - Ensure backend is running on port 5000
   - Flask-CORS is properly configured

4. **FFmpeg not found warning**
   - Install FFmpeg to enable video/audio merging
   - Without FFmpeg, files download separately

## License

This project is for educational purposes. Ensure compliance with YouTube's terms of service when using.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
