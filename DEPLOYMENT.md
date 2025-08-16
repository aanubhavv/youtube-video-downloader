# Deployment Guide

## Quick Deployment Options

### Option 1: Vercel + Railway (Recommended)

#### Step 1: Deploy Backend to Railway

1. Create account at [Railway.app](https://railway.app)
2. Connect your GitHub repository
3. Create new project from GitHub repo
4. Select the `backend` folder as root
5. Set environment variables:
   - `FLASK_ENV=production`
   - `FRONTEND_URL=https://your-vercel-app.vercel.app`
6. Railway will auto-deploy your Flask app

#### Step 2: Deploy Frontend to Vercel

1. Create account at [Vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL=https://your-railway-app.railway.app`
4. Deploy

### Option 2: Netlify + Render

#### Backend on Render:

1. Create account at [Render.com](https://render.com)
2. Create new Web Service from GitHub
3. Select `backend` folder
4. Build command: `pip install -r requirements.txt`
5. Start command: `gunicorn --bind 0.0.0.0:$PORT app:app`

#### Frontend on Netlify:

1. Create account at [Netlify.com](https://netlify.com)
2. Connect GitHub repository
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `out` (if using static export)
4. Environment variables:
   - `NEXT_PUBLIC_API_URL=https://your-render-app.onrender.com`

### Option 3: VPS/Cloud Server

#### Setup on Ubuntu/Debian:

```bash
# Install dependencies
sudo apt update
sudo apt install nodejs npm python3 python3-pip nginx ffmpeg

# Clone repository
git clone https://github.com/yourusername/yt-downloader.git
cd yt-downloader/webapp

# Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup frontend
cd ..
npm install
npm run build

# Configure nginx (see nginx.conf example)
# Setup systemd services for auto-restart
```

## Environment Variables

### Frontend (.env.production):

```
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

### Backend:

```
FLASK_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
PORT=5000
```

## GitHub Repository Setup

1. Create new repository on GitHub
2. Initialize git in your project:

```bash
cd d:\Programming\Python\yt_downloader\webapp
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/your-repo-name.git
git push -u origin main
```

## Important Notes

- Make sure your backend URL is accessible from the internet
- Update CORS settings in backend/app.py with your frontend domain
- Test both frontend and backend separately before deploying
- Consider using a CDN for better performance
- Monitor your API usage and implement rate limiting if needed

## Troubleshooting

- **CORS errors**: Check CORS configuration in backend
- **API not found**: Verify API_BASE_URL in frontend
- **Download failures**: Ensure ffmpeg is installed on server
- **Build failures**: Check Node.js and Python versions
