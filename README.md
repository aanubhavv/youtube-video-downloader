# YouTube Downloader Web Application

A full-stack web application for downloading YouTube videos, built with Next.js frontend and Python Flask backend.

## Features

- 🎥 Download YouTube videos in various qualities
- 📊 View detailed video information and available formats
- 🔄 Real-time download progress tracking
- 🎨 Modern, responsive UI with dark mode support
- 🐍 Python virtual environment for isolated backend dependencies
- ⚡ Fast development with Turbopack
- 🍪 Cookie authentication to bypass YouTube bot detection

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

### 4. Cookie Authentication (Production Required)

For production deployments, configure cookie authentication to avoid YouTube bot detection:

```bash
# Set environment variable for browser cookie extraction
export YT_DLP_COOKIES_FROM_BROWSER=chrome  # or firefox, edge, safari
```

See `COOKIES_SETUP.md` for detailed cookie configuration instructions.

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

- `GET /api/health` - Health check
- `POST /api/video-info` - Get video information
- `POST /api/download` - Start video download
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

### Common Issues

1. **"Sign in to confirm you're not a bot" error**

   - **Production only**: Configure cookie authentication
   - Set `YT_DLP_COOKIES_FROM_BROWSER=chrome` environment variable
   - See `COOKIES_SETUP.md` for detailed instructions
   - Test with `/api/cookie-status` endpoint

2. **Import errors in frontend**

   - Restart VS Code or development server
   - Check tsconfig.json path mappings

3. **Python packages not found**

   - Ensure virtual environment is activated
   - Run `pip install -r requirements.txt`

4. **CORS errors**

   - Ensure backend is running on port 5000
   - Flask-CORS is properly configured

5. **FFmpeg not found warning**
   - Install FFmpeg to enable video/audio merging

### Testing Cookie Configuration

Check if cookies are properly configured:

```bash
# Test cookie status
curl http://localhost:5000/api/cookie-status

# Test video extraction
curl http://localhost:5000/api/test-video-extraction
```

- Without FFmpeg, files download separately

## License

This project is for educational purposes. Ensure compliance with YouTube's terms of service when using.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
