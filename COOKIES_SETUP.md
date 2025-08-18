# Cookie Authentication Setup for YouTube Downloader

When deploying to production, YouTube may block requests with "Sign in to confirm you're not a bot" error. This requires cookie authentication to bypass bot detection.

## Quick Setup (Recommended)

### Option 1: Browser Cookie Extraction (Easiest)

Set the environment variable `YT_DLP_COOKIES_FROM_BROWSER` to your browser name:

**Railway Deployment:**

1. Go to your Railway project dashboard
2. Click on "Variables" tab
3. Add: `YT_DLP_COOKIES_FROM_BROWSER` = `chrome` (or `firefox`, `edge`, `safari`)

**Supported browsers:**

- `chrome`
- `firefox`
- `edge`
- `safari`
- `opera`
- `brave`
- `vivaldi`

### Option 2: Manual Cookie File

1. Export cookies from your browser to a `cookies.txt` file
2. Upload the file to your server
3. Set environment variable: `YT_DLP_COOKIES_FILE` = `/path/to/cookies.txt`

## How to Export Cookies Manually

### Chrome/Edge

1. Install browser extension: "Get cookies.txt LOCALLY" or "cookies.txt"
2. Go to YouTube.com and make sure you're logged in
3. Click the extension icon
4. Download the `cookies.txt` file

### Firefox

1. Install extension: "cookies.txt"
2. Go to YouTube.com and make sure you're logged in
3. Click the extension icon and export cookies

## Production Deployment

### Railway

```bash
# Set environment variable in Railway dashboard
YT_DLP_COOKIES_FROM_BROWSER=chrome
```

### Vercel (if using serverless functions)

```bash
# In Vercel environment variables
YT_DLP_COOKIES_FROM_BROWSER=chrome
```

### Docker

```dockerfile
# In your Dockerfile or docker-compose.yml
ENV YT_DLP_COOKIES_FROM_BROWSER=chrome
```

## Security Notes

- Cookies contain authentication information - keep them secure
- Don't commit cookie files to version control
- Use environment variables for production
- Browser cookie extraction is more secure than manual files

## Testing

After setup, check the `/api/health` endpoint to verify cookie configuration:

```json
{
  "cookie_status": "Using chrome browser cookies",
  "available_env_vars": {
    "YT_DLP_COOKIES_FROM_BROWSER": true,
    "YT_DLP_COOKIES_FILE": false
  }
}
```

## Troubleshooting

If you still get bot detection errors:

1. Ensure cookies are from a logged-in YouTube session
2. Try different browsers (chrome usually works best)
3. Clear cookies and re-login to YouTube, then re-export
4. Check logs for specific error messages

## Alternative Solutions

If cookie authentication doesn't work:

1. Use a VPN to change your IP address
2. Implement request delays and rotation
3. Use a proxy service
4. Consider using YouTube API v3 for metadata (though no download capability)
