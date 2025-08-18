from flask import Flask, request, jsonify, send_from_directory, Response, stream_template
from flask_cors import CORS
import yt_dlp
import os
import tempfile
import threading
from datetime import datetime, timedelta
import uuid
import logging
import time

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Rate limiting storage - separate tracking for different operations
request_timestamps = {
    'video_info': [],
    'download': [],
    'test': []
}

# Different rate limits for different operations
RATE_LIMITS = {
    'video_info': {'requests': 15, 'window': 300},  # 15 requests per 5 minutes for video info
    'download': {'requests': 8, 'window': 300},     # 8 downloads per 5 minutes 
    'test': {'requests': 3, 'window': 300}          # 3 test requests per 5 minutes
}

def check_rate_limit(operation='video_info'):
    """Check if we're hitting rate limits for a specific operation"""
    global request_timestamps
    current_time = time.time()
    
    if operation not in RATE_LIMITS:
        operation = 'video_info'  # Default fallback
    
    config = RATE_LIMITS[operation]
    timestamps = request_timestamps.get(operation, [])
    
    # Clean old timestamps
    timestamps = [ts for ts in timestamps if current_time - ts < config['window']]
    request_timestamps[operation] = timestamps
    
    # Check if we're at the limit
    if len(timestamps) >= config['requests']:
        oldest_request = timestamps[0]
        wait_time = config['window'] - (current_time - oldest_request)
        return False, wait_time
    
    # Add current timestamp
    timestamps.append(current_time)
    request_timestamps[operation] = timestamps
    return True, 0

def adaptive_sleep_before_request(operation='video_info'):
    """Add adaptive sleep to avoid hitting rate limits proactively"""
    timestamps = request_timestamps.get(operation, [])
    current_time = time.time()
    
    # Clean old timestamps
    timestamps = [ts for ts in timestamps if current_time - ts < 60]  # Look at last minute
    
    # If we've made requests recently, add a small delay
    if len(timestamps) >= 3:  # If 3+ requests in last minute
        recent_requests = len([ts for ts in timestamps if current_time - ts < 30])
        if recent_requests >= 2:  # 2+ requests in last 30 seconds
            sleep_time = min(3 + recent_requests, 10)  # Sleep 3-10 seconds
            logger.info(f"Adding {sleep_time}s delay to avoid rate limiting")
            time.sleep(sleep_time)

# Configure CORS for production
allowed_origins = [
    "http://localhost:3000",  # Development
    os.getenv("FRONTEND_URL", "https://your-app.vercel.app")  # Production
]

CORS(app, origins=allowed_origins, 
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

# Store download status
download_status = {}

# Cache cookie options to avoid repeated detection
_cached_cookie_options = None
_cookie_options_cached_at = None

def validate_cookies_file(cookies_path):
    """
    Validate if cookies file exists and contains essential YouTube cookies
    
    Args:
        cookies_path (str): Path to the cookies file
        
    Returns:
        tuple: (is_valid, message)
    """
    if not os.path.exists(cookies_path):
        return False, f"Cookies file not found: {cookies_path}"
    
    try:
        with open(cookies_path, 'r') as f:
            content = f.read()
        
        # Check for essential YouTube cookies
        essential_cookies = ['__Secure-3PSID', '__Secure-3PAPISID', 'VISITOR_INFO1_LIVE']
        missing_cookies = []
        
        for cookie in essential_cookies:
            if cookie not in content:
                missing_cookies.append(cookie)
        
        if missing_cookies:
            return False, f"Missing essential cookies: {', '.join(missing_cookies)}"
        
        # Check if the file has recent timestamps (cookies not too old)
        lines = content.split('\n')
        cookie_lines = [line for line in lines if line.strip() and not line.startswith('#')]
        
        if not cookie_lines:
            return False, "Cookies file contains no valid cookie entries"
        
        # Check for expired session tokens (rough validation)
        current_time = time.time()
        has_valid_session = False
        
        for line in cookie_lines:
            parts = line.split('\t')
            if len(parts) >= 5:
                try:
                    expiry = int(parts[4]) if parts[4] != '0' else 0
                    # If expiry is 0, it's a session cookie (valid)
                    # If expiry is in the future, it's valid
                    if expiry == 0 or expiry > current_time:
                        has_valid_session = True
                        break
                except (ValueError, IndexError):
                    continue
        
        if not has_valid_session:
            return False, "All cookies appear to be expired"
        
        return True, "Cookies file validation passed"
        
    except Exception as e:
        return False, f"Error reading cookies file: {str(e)}"

def get_cookie_options():
    """
    Get cookie configuration for yt-dlp to avoid bot detection
    
    Returns:
        dict: Cookie options for yt-dlp
    """
    global _cached_cookie_options, _cookie_options_cached_at
    
    # Use cached options if available (cache for 2 minutes due to bot detection issues)
    import time
    if (_cached_cookie_options is not None and 
        _cookie_options_cached_at is not None and 
        time.time() - _cookie_options_cached_at < 120):  # Reduced cache time
        return _cached_cookie_options
    
    cookie_options = {}
    
    # Check for cookie file path first (most reliable for production)
    cookies_file = os.getenv('YT_DLP_COOKIES_FILE')
    if cookies_file:
        is_valid, message = validate_cookies_file(cookies_file)
        if is_valid:
            logger.info(f"Using validated cookies file from environment: {cookies_file}")
            cookie_options['cookiefile'] = cookies_file
            _cached_cookie_options = cookie_options
            _cookie_options_cached_at = time.time()
            return cookie_options
        else:
            logger.warning(f"Environment cookies file validation failed: {message}")
    
    # Check for local cookies.txt file in the same directory
    local_cookies = os.path.join(os.path.dirname(__file__), 'cookies.txt')
    if os.path.exists(local_cookies):
        is_valid, message = validate_cookies_file(local_cookies)
        if is_valid:
            logger.info(f"Using validated local cookies file: {local_cookies}")
            cookie_options['cookiefile'] = local_cookies
            _cached_cookie_options = cookie_options
            _cookie_options_cached_at = time.time()
            return cookie_options
        else:
            logger.warning(f"Local cookies file validation failed: {message}")
            # Still try to use it even if validation fails, but log the issue
            logger.info(f"Using potentially invalid cookies file: {local_cookies}")
            cookie_options['cookiefile'] = local_cookies
    
    # Alternative: Check for cookies content as environment variable
    cookies_content = os.getenv('YOUTUBE_COOKIES_CONTENT')
    if cookies_content:
        # Write cookies content to a temporary file
        temp_cookies_path = '/tmp/cookies.txt'
        try:
            with open(temp_cookies_path, 'w') as f:
                f.write(cookies_content)
            logger.info(f"Using cookies from environment content: {temp_cookies_path}")
            cookie_options['cookiefile'] = temp_cookies_path
            _cached_cookie_options = cookie_options
            _cookie_options_cached_at = time.time()
            return cookie_options
        except Exception as e:
            logger.error(f"Failed to write cookies from environment: {e}")
    
    # Check for cookies from browser (with validation)
    cookies_from_browser = os.getenv('YT_DLP_COOKIES_FROM_BROWSER')
    if cookies_from_browser:
        # Validate browser cookie access before using
        try:
            # Test if we can create a YoutubeDL instance with the browser cookies
            test_opts = {
                'quiet': True,
                'no_warnings': True,
                'cookiesfrombrowser': (cookies_from_browser, None, None, None)
            }
            
            # Quick test without actually extracting anything
            import yt_dlp
            with yt_dlp.YoutubeDL(test_opts) as ydl:
                # Just initialize to test cookie access
                pass
                
            logger.info(f"Successfully validated browser cookies: {cookies_from_browser}")
            cookie_options['cookiesfrombrowser'] = (cookies_from_browser, None, None, None)
            
        except Exception as e:
            error_msg = str(e)
            logger.warning(f"Failed to access {cookies_from_browser} cookies: {error_msg}")
            
            # If browser cookies fail, suggest cookie file method
            if "could not find" in error_msg.lower() or "database" in error_msg.lower():
                logger.warning(f"Browser {cookies_from_browser} not available in this environment. Consider using YT_DLP_COOKIES_FILE instead.")
    
    # If no cookies configured and no browser access, log guidance
    if not cookie_options:
        if os.getenv('FLASK_ENV') == 'production':
            logger.warning("No cookie authentication configured for production. This may cause bot detection issues.")
            logger.warning("Set YT_DLP_COOKIES_FILE environment variable with path to cookies.txt file for production environments.")
    
    return cookie_options

def get_enhanced_ydl_opts(base_opts=None):
    """
    Get enhanced yt-dlp options to minimize bot detection
    
    Args:
        base_opts (dict): Optional base options to merge with enhanced options
        
    Returns:
        dict: Enhanced yt-dlp options with cookie support
    """
    enhanced_opts = {
        'quiet': True,
        'no_warnings': True,
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',  # Updated Chrome version
        'referer': 'https://www.youtube.com/',
        'sleep_interval': 5,  # Further increased sleep interval
        'max_sleep_interval': 30,  # Increased max sleep to 30 seconds
        'extractor_retries': 2,  # Reduced retries to avoid triggering more blocks
        'fragment_retries': 2,
        'socket_timeout': 60,  # Increased timeout
        'http_chunk_size': 10485760,  # 10MB chunks
        'retry_sleep_functions': {
            'http': lambda n: min(10 ** n, 300),  # Much more aggressive backoff
            'fragment': lambda n: min(10 ** n, 300),
            'extractor': lambda n: min(10 ** n, 300)
        },
        'http_headers': {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.7',
            'Keep-Alive': '300',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
        },
        # Additional anti-detection measures
        'geo_bypass': True,
        'force_json': False,
        'force_write_archive': False,
        # More conservative approach to avoid triggering bot detection
        'extract_flat': False,
        'ignoreerrors': False,
    }
    
    # Add cookie options to prevent bot detection
    cookie_options = get_cookie_options()
    enhanced_opts.update(cookie_options)
    
    if base_opts:
        enhanced_opts.update(base_opts)
    
    return enhanced_opts

def get_best_formats(info):
    """
    Analyze available formats and return the best video and audio format IDs
    
    Args:
        info (dict): Video information from yt-dlp
        
    Returns:
        tuple: (best_video_format_id, best_audio_format_id, format_info)
    """
    formats = info.get('formats', [])
    
    if not formats:
        logger.warning("No formats available for video")
        return None, None, {'video_format': None, 'audio_format': None}
    
    # Separate video and audio formats
    video_formats = []
    audio_formats = []
    combined_formats = []
    
    for fmt in formats:
        vcodec = fmt.get('vcodec', 'none')
        acodec = fmt.get('acodec', 'none')
        
        if vcodec != 'none' and acodec == 'none':  # Video only
            video_formats.append(fmt)
        elif acodec != 'none' and vcodec == 'none':  # Audio only
            audio_formats.append(fmt)
        elif vcodec != 'none' and acodec != 'none':  # Combined
            combined_formats.append(fmt)
    
    # Log what we found
    logger.info(f"Format analysis: {len(video_formats)} video-only, {len(audio_formats)} audio-only, {len(combined_formats)} combined")
    
    # If we only have combined formats, use the best one
    if combined_formats and not video_formats and not audio_formats:
        logger.info("Only combined formats available, using best combined format")
        best_combined = max(combined_formats, key=lambda x: (
            x.get('height', 0),
            x.get('tbr', 0)
        ))
        return best_combined.get('format_id'), None, {
            'video_format': best_combined,
            'audio_format': best_combined,
            'video_formats': combined_formats[:10],
            'audio_formats': combined_formats[:8],
            'total_video_formats': len(combined_formats),
            'total_audio_formats': len(combined_formats)
        }
    
    # Sort video formats by quality (height, then fps, then bitrate) - Fixed None handling
    video_formats.sort(key=lambda x: (
        x.get('height') or 0,
        x.get('fps') or 0,
        x.get('tbr') or 0
    ), reverse=True)
    
    # Sort audio formats by quality (bitrate) - Fixed None handling
    audio_formats.sort(key=lambda x: (
        x.get('abr') or 0,
        x.get('tbr') or 0
    ), reverse=True)
    
    # Select best formats
    best_video = None
    best_audio = None
    
    # Find best video format (prefer 1080p or higher)
    for fmt in video_formats:
        height = fmt.get('height') or 0
        if height >= 1080:  # Prefer 1080p or higher
            best_video = fmt
            break
    
    if not best_video and video_formats:  # Fallback to highest available
        best_video = video_formats[0]
    
    # Find best audio format
    if audio_formats:
        best_audio = audio_formats[0]
    
    # If no separate video/audio but we have combined, use those as fallback
    if not best_video and not best_audio and combined_formats:
        best_combined = max(combined_formats, key=lambda x: x.get('tbr', 0))
        return best_combined.get('format_id'), None, {
            'video_format': best_combined,
            'audio_format': best_combined,
            'video_formats': combined_formats[:10],
            'audio_formats': combined_formats[:8],
            'total_video_formats': len(combined_formats),
            'total_audio_formats': len(combined_formats)
        }
    
    format_info = {
        'video_format': best_video,
        'audio_format': best_audio,
        'video_formats': video_formats[:10],  # Top 10 video formats
        'audio_formats': audio_formats[:8],   # Top 8 audio formats
        'total_video_formats': len(video_formats),
        'total_audio_formats': len(audio_formats)
    }
    
    return (
        best_video.get('format_id') if best_video else None,
        best_audio.get('format_id') if best_audio else None,
        format_info
    )

def get_simple_quality_label(format_info, video_id, audio_id):
    """Generate a simple quality label like '1080p', '720p', etc."""
    if format_info and format_info.get('video_format'):
        height = format_info['video_format'].get('height')
        if height:
            return f"{height}p"
    
    # Fallback based on format IDs or analysis
    if video_id and format_info:
        video_format = format_info.get('video_format', {})
        height = video_format.get('height')
        if height:
            return f"{height}p"
    
    return "Best Quality"

def get_format_for_quality(info, quality):
    """Get specific format IDs for the requested quality"""
    formats = info.get('formats', [])
    if not formats:
        logger.warning("No formats found in video info")
        return None, None, {'video_format': None, 'audio_format': None}
    
    # Separate video and audio formats
    video_formats = []
    audio_formats = []
    combined_formats = []  # Formats with both video and audio
    
    for fmt in formats:
        vcodec = fmt.get('vcodec', 'none')
        acodec = fmt.get('acodec', 'none')
        
        if vcodec != 'none' and acodec == 'none':  # Video only
            video_formats.append(fmt)
        elif acodec != 'none' and vcodec == 'none':  # Audio only
            audio_formats.append(fmt)
        elif vcodec != 'none' and acodec != 'none':  # Combined
            combined_formats.append(fmt)
    
    logger.info(f"Found {len(video_formats)} video, {len(audio_formats)} audio, {len(combined_formats)} combined formats")
    
    # If we have combined formats and no separate video/audio, use combined
    if combined_formats and not video_formats and not audio_formats:
        logger.info("Using combined formats as fallback")
        combined_formats.sort(key=lambda x: (
            x.get('height') or 0,
            x.get('tbr') or 0
        ), reverse=True)
        best_combined = combined_formats[0]
        return best_combined.get('format_id'), None, {
            'video_format': best_combined,
            'audio_format': best_combined
        }
    
    # Sort formats by quality
    video_formats = sorted(video_formats, key=lambda x: (
        x.get('height') or 0,
        x.get('fps') or 0,
        x.get('tbr') or 0
    ), reverse=True)
    
    audio_formats = sorted(audio_formats, key=lambda x: (
        x.get('abr') or 0,
        x.get('tbr') or 0
    ), reverse=True)
    
    # Find best audio format
    best_audio = audio_formats[0] if audio_formats else None
    
    if quality == 'auto':
        # Use the existing get_best_formats function for auto
        video_id, audio_id, format_info = get_best_formats(info)
        if not video_id and not audio_id and combined_formats:
            # Fallback to best combined format
            best_combined = combined_formats[0]
            return best_combined.get('format_id'), None, {
                'video_format': best_combined,
                'audio_format': best_combined
            }
        return video_id, audio_id, format_info
    elif quality == 'bestaudio':
        if not best_audio and combined_formats:
            # Use audio from combined format
            best_combined = max(combined_formats, key=lambda x: x.get('abr', 0))
            return None, best_combined.get('format_id'), {
                'audio_format': best_combined,
                'video_format': None
            }
        return None, best_audio.get('format_id') if best_audio else None, {
            'audio_format': best_audio,
            'video_format': None
        }
    else:
        # Extract target height from quality string (e.g., "best[height<=720]" -> 720)
        target_height = None
        if 'height<=' in quality:
            try:
                target_height = int(quality.split('height<=')[1].split(']')[0])
            except:
                target_height = 1080  # fallback
        else:
            target_height = 1080  # Default fallback
        
        # Find best video format at or below target height
        best_video = None
        for fmt in video_formats:
            height = fmt.get('height') or 0
            if height <= target_height:
                best_video = fmt
                break
        
        # If no format found at target height, get the lowest available
        if not best_video:
            if video_formats:
                best_video = video_formats[-1]  # Last (lowest quality) format
            elif combined_formats:
                # Fallback to combined format
                suitable_combined = [f for f in combined_formats if (f.get('height', 0) <= target_height)]
                if suitable_combined:
                    best_video = max(suitable_combined, key=lambda x: x.get('height', 0))
                else:
                    best_video = min(combined_formats, key=lambda x: x.get('height', 9999))
        
        format_info = {
            'video_format': best_video,
            'audio_format': best_audio
        }
        
        return (best_video.get('format_id') if best_video else None,
                best_audio.get('format_id') if best_audio else None,
                format_info)

def download_video_async(task_id, url, output_folder, quality='auto'):
    """
    Download a single YouTube video asynchronously
    """
    try:
        download_status[task_id]['status'] = 'extracting_info'
        download_status[task_id]['message'] = 'Extracting video information...'
        
        # Add a small delay before starting to avoid rapid successive requests
        time.sleep(2)
        
        # Get video info first
        with yt_dlp.YoutubeDL(get_enhanced_ydl_opts()) as ydl:
            info = ydl.extract_info(url, download=False)
            title = info.get('title', 'Unknown')
            duration = info.get('duration', 0)
            
            download_status[task_id]['video_info'] = {
                'title': title,
                'duration': f"{duration // 60}:{duration % 60:02d}",
                'uploader': info.get('uploader', 'N/A')
            }
        
        download_status[task_id]['status'] = 'analyzing_formats'
        download_status[task_id]['message'] = 'Analyzing available formats...'
        
        # Add another small delay before format analysis
        time.sleep(1)
        
        # Use new format selection function for all qualities
        video_id, audio_id, format_info = get_format_for_quality(info, quality)
        download_status[task_id]['format_info'] = format_info
        
        if video_id and audio_id:
            format_string = f"{video_id}+{audio_id}"
            format_description = get_simple_quality_label(format_info, video_id, audio_id)
        elif video_id:
            format_string = f"{video_id}+bestaudio"
            format_description = get_simple_quality_label(format_info, video_id, audio_id)
        elif audio_id:
            format_string = audio_id
            format_description = "Audio Only"
        else:
            format_string = "best[height<=1080]/best"
            format_description = "Best Quality (≤1080p)"
        
        download_status[task_id]['selected_format'] = format_string
        download_status[task_id]['format_description'] = format_description
        download_status[task_id]['status'] = 'downloading'
        download_status[task_id]['message'] = 'Downloading video...'
        
        # Configure yt_dlp options
        ydl_opts = get_enhanced_ydl_opts({
            'outtmpl': os.path.join(output_folder, '%(title)s.%(ext)s'),
            'format': format_string,
            'noplaylist': True,
        })
        
        # Only add merge format if we're combining formats
        if '+' in format_string:
            try:
                # Test if ffmpeg is available
                import subprocess
                subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
                ydl_opts['merge_output_format'] = 'mp4'
                download_status[task_id]['message'] = 'Downloading and merging video...'
            except (subprocess.CalledProcessError, FileNotFoundError):
                download_status[task_id]['message'] = 'Downloading (FFmpeg not found - separate files)'
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        # Find the downloaded file(s) in the output folder
        downloaded_files = []
        for file in os.listdir(output_folder):
            if file != '.gitkeep':  # Ignore gitkeep files
                downloaded_files.append(file)
            
        download_status[task_id]['status'] = 'completed'
        download_status[task_id]['message'] = f'Successfully downloaded: {title}'
        download_status[task_id]['completed_at'] = datetime.now().isoformat()
        download_status[task_id]['downloaded_files'] = downloaded_files
        download_status[task_id]['download_path'] = output_folder
            
    except Exception as e:
        download_status[task_id]['status'] = 'error'
        download_status[task_id]['message'] = f'Failed to download: {str(e)}'
        download_status[task_id]['error'] = str(e)

@app.route('/api/rate-limit-status', methods=['GET'])
def rate_limit_status():
    """Get current rate limit status for all operations"""
    try:
        current_time = time.time()
        status = {}
        
        for operation, config in RATE_LIMITS.items():
            timestamps = request_timestamps.get(operation, [])
            # Clean old timestamps for accurate count
            recent_timestamps = [ts for ts in timestamps if current_time - ts < config['window']]
            
            remaining = max(0, config['requests'] - len(recent_timestamps))
            reset_time = None
            
            if recent_timestamps:
                oldest_request = min(recent_timestamps)
                reset_time = oldest_request + config['window']
            
            status[operation] = {
                'limit': config['requests'],
                'window_seconds': config['window'],
                'used': len(recent_timestamps),
                'remaining': remaining,
                'reset_at': datetime.fromtimestamp(reset_time).isoformat() if reset_time else None,
                'reset_in_seconds': int(reset_time - current_time) if reset_time else 0
            }
        
        return jsonify({
            'rate_limits': status,
            'timestamp': datetime.now().isoformat(),
            'server_time': current_time
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to get rate limit status: {str(e)}'
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint with cookie status and rate limit info"""
    cookie_options = get_cookie_options()
    cookie_status = "No cookies configured"
    
    if 'cookiesfrombrowser' in cookie_options:
        browser = cookie_options['cookiesfrombrowser'][0]
        cookie_status = f"Using {browser} browser cookies"
    elif 'cookiefile' in cookie_options:
        cookie_status = f"Using cookies file: {cookie_options['cookiefile']}"
    
    # Get current rate limit usage
    current_time = time.time()
    rate_limit_summary = {}
    for operation, config in RATE_LIMITS.items():
        timestamps = request_timestamps.get(operation, [])
        recent_count = len([ts for ts in timestamps if current_time - ts < config['window']])
        rate_limit_summary[operation] = f"{recent_count}/{config['requests']}"
    
    return jsonify({
        'status': 'ok', 
        'message': 'YouTube Downloader API is running',
        'server': 'Gunicorn Production Server' if 'gunicorn' in os.environ.get('SERVER_SOFTWARE', '').lower() else 'Flask Development Server',
        'environment': os.getenv('FLASK_ENV', 'production'),
        'version': '1.3.0',  # Updated version with improved rate limiting
        'features': {
            'enhanced_anti_bot': True,
            'adaptive_rate_limiting': True,
            'browser_headers': True,
            'cookie_support': True,
            'cookie_validation': True
        },
        'cookie_status': cookie_status,
        'rate_limits': rate_limit_summary,
        'available_env_vars': {
            'YT_DLP_COOKIES_FROM_BROWSER': bool(os.getenv('YT_DLP_COOKIES_FROM_BROWSER')),
            'YT_DLP_COOKIES_FILE': bool(os.getenv('YT_DLP_COOKIES_FILE'))
        }
    })

@app.route('/api/test-video-extraction', methods=['GET'])
def test_video_extraction():
    """Test endpoint to verify yt-dlp configuration works with cookies"""
    try:
        # Check rate limiting for test requests
        allowed, wait_time = check_rate_limit('test')
        if not allowed:
            logger.warning(f"Test rate limit hit, suggested wait time: {wait_time} seconds")
            return jsonify({
                'success': False,
                'error': 'Test rate limit exceeded',
                'retry_after': int(wait_time),
                'type': 'rate_limit',
                'message': f'Too many test requests. Please wait {int(wait_time)} seconds before testing again.',
                'limit_info': f'Limit: {RATE_LIMITS["test"]["requests"]} tests per {RATE_LIMITS["test"]["window"]} seconds'
            }), 429
        
        # Use a known working video URL for testing
        test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Rick Roll - commonly used for testing
        
        # Add adaptive delay before making the request
        adaptive_sleep_before_request('test')
        
        ydl_opts = get_enhanced_ydl_opts()
        cookie_options = get_cookie_options()
        
        logger.info(f"Testing video extraction with cookie options: {list(cookie_options.keys())}")
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(test_url, download=False)
            
            return jsonify({
                'success': True,
                'title': info.get('title', 'N/A'),
                'duration': info.get('duration', 0),
                'uploader': info.get('uploader', 'N/A'),
                'configuration': {
                    'user_agent': ydl_opts.get('user_agent', 'N/A'),
                    'sleep_interval': ydl_opts.get('sleep_interval', 0),
                    'extractor_retries': ydl_opts.get('extractor_retries', 0),
                    'has_custom_headers': bool(ydl_opts.get('http_headers')),
                    'cookie_options': list(cookie_options.keys()),
                    'cookies_from_browser': cookie_options.get('cookiesfrombrowser', [None])[0] if 'cookiesfrombrowser' in cookie_options else None,
                    'cookies_file': cookie_options.get('cookiefile') if 'cookiefile' in cookie_options else None
                }
            })
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Test extraction failed: {error_msg}")
        
        if 'Sign in to confirm' in error_msg or 'bot' in error_msg.lower():
            cookie_options = get_cookie_options()
            return jsonify({
                'success': False,
                'error': 'Bot detection triggered - cookie authentication needed',
                'message': 'YouTube is blocking requests. Configure cookie authentication.',
                'cookie_status': {
                    'configured': bool(cookie_options),
                    'options': list(cookie_options.keys()) if cookie_options else [],
                    'suggestion': 'Set YT_DLP_COOKIES_FROM_BROWSER environment variable (e.g., chrome, firefox)'
                },
                'retry_recommended': True
            }), 429
        else:
            return jsonify({
                'success': False,
                'error': 'Extraction failed',
                'message': error_msg
            }), 500

@app.route('/api/cookie-status', methods=['GET'])
def cookie_status():
    """Check cookie configuration status"""
    try:
        cookie_options = get_cookie_options()
        
        # Test if we can create a YoutubeDL instance with the options
        test_opts = get_enhanced_ydl_opts()
        
        # Quick validation without actually downloading
        status = {
            'configured': bool(cookie_options),
            'options': list(cookie_options.keys()),
            'environment_variables': {
                'YT_DLP_COOKIES_FROM_BROWSER': os.getenv('YT_DLP_COOKIES_FROM_BROWSER'),
                'YT_DLP_COOKIES_FILE': os.getenv('YT_DLP_COOKIES_FILE')
            },
            'recommendations': [],
            'environment': os.getenv('FLASK_ENV', 'production'),
            'server_type': 'production' if 'gunicorn' in os.environ.get('SERVER_SOFTWARE', '').lower() else 'development',
            'cookie_validation': None
        }
        
        # Validate local cookies file if it exists
        local_cookies = os.path.join(os.path.dirname(__file__), 'cookies.txt')
        if os.path.exists(local_cookies):
            is_valid, validation_message = validate_cookies_file(local_cookies)
            status['cookie_validation'] = {
                'file_path': local_cookies,
                'is_valid': is_valid,
                'message': validation_message
            }
        
        if 'cookiesfrombrowser' in cookie_options:
            browser = cookie_options['cookiesfrombrowser'][0]
            status['active_method'] = f'Browser cookies from {browser}'
        elif 'cookiefile' in cookie_options:
            status['active_method'] = f'Cookie file: {cookie_options["cookiefile"]}'
        else:
            status['active_method'] = 'No cookie authentication configured'
            
            # Provide environment-specific recommendations
            if status['environment'] == 'production' or status['server_type'] == 'production':
                status['recommendations'].extend([
                    'For production servers: Use YT_DLP_COOKIES_FILE with exported cookies.txt',
                    'Export cookies from your browser and upload cookies.txt to server',
                    'Set YT_DLP_COOKIES_FILE=/path/to/cookies.txt environment variable'
                ])
            else:
                status['recommendations'].extend([
                    'For development: Configure YT_DLP_COOKIES_FROM_BROWSER environment variable',
                    'Supported browsers: chrome, firefox, edge, safari, opera, brave'
                ])
        
        # Test yt-dlp instantiation
        try:
            with yt_dlp.YoutubeDL(test_opts) as ydl:
                status['ydl_initialization'] = 'success'
        except Exception as e:
            status['ydl_initialization'] = f'failed: {str(e)}'
            if 'could not find' in str(e).lower():
                status['recommendations'].append('Browser not available in server environment - use cookie file method')
        
        return jsonify(status)
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to check cookie status: {str(e)}',
            'configured': False,
            'recommendation': 'Use cookie file method for production environments'
        }), 500

@app.route('/api/refresh-cookies', methods=['POST'])
def refresh_cookies():
    """Force refresh of cookie cache and validate cookies"""
    global _cached_cookie_options, _cookie_options_cached_at
    
    try:
        # Clear cache
        _cached_cookie_options = None
        _cookie_options_cached_at = None
        
        # Get fresh cookie options
        cookie_options = get_cookie_options()
        
        # Validate local cookies file if it exists
        validation_result = None
        local_cookies = os.path.join(os.path.dirname(__file__), 'cookies.txt')
        if os.path.exists(local_cookies):
            is_valid, message = validate_cookies_file(local_cookies)
            validation_result = {
                'file_path': local_cookies,
                'is_valid': is_valid,
                'message': message,
                'size_bytes': os.path.getsize(local_cookies),
                'modified_time': datetime.fromtimestamp(os.path.getmtime(local_cookies)).isoformat()
            }
            
            # If validation failed, provide specific suggestions
            if not is_valid:
                suggestions = []
                if 'expired' in message.lower():
                    suggestions.append('Export fresh cookies from your browser')
                    suggestions.append('Make sure you are logged into YouTube in your browser')
                elif 'missing' in message.lower():
                    suggestions.append('Export cookies from YouTube.com (not just any Google site)')
                    suggestions.append('Ensure the browser extension exports all YouTube cookies')
                else:
                    suggestions.append('Try re-exporting cookies from your browser')
                    suggestions.append('Verify the cookies.txt file format is correct')
                
                validation_result['suggestions'] = suggestions
        
        return jsonify({
            'success': True,
            'message': 'Cookie cache refreshed',
            'cookie_options': list(cookie_options.keys()) if cookie_options else [],
            'active_method': 'Cookie file' if 'cookiefile' in cookie_options else 'Browser cookies' if 'cookiesfrombrowser' in cookie_options else 'None',
            'validation': validation_result,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to refresh cookies: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/video-info', methods=['POST'])
def get_video_info():
    """Get video information without downloading"""
    try:
        # Check rate limiting for video info requests
        allowed, wait_time = check_rate_limit('video_info')
        if not allowed:
            logger.warning(f"Video info rate limit hit, suggested wait time: {wait_time} seconds")
            return jsonify({
                'error': 'Rate limit exceeded for video information requests',
                'retry_after': int(wait_time),
                'type': 'rate_limit',
                'message': f'Too many video info requests. Please wait {int(wait_time)} seconds before trying again.',
                'limit_info': f'Limit: {RATE_LIMITS["video_info"]["requests"]} requests per {RATE_LIMITS["video_info"]["window"]} seconds'
            }), 429
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
            
        url = data.get('url')
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        # Validate URL format
        if not isinstance(url, str) or not url.strip():
            return jsonify({'error': 'URL must be a non-empty string'}), 400
            
        url = url.strip()
        
        # Basic URL scheme validation
        if not (url.startswith('http://') or url.startswith('https://') or url.startswith('www.')):
            return jsonify({'error': 'Invalid URL format. URL must start with http://, https://, or www.'}), 400
        
        logger.info(f"Extracting video info for: {url}")
        
        # Add adaptive delay before making the request
        adaptive_sleep_before_request('video_info')
        
        # Enhanced yt-dlp configuration to avoid bot detection
        ydl_opts = get_enhanced_ydl_opts({
            'extract_flat': False,
            'writethumbnail': False,
            'writeinfojson': False
        })
        
        # Get video info
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Get format analysis for different qualities with error handling
            try:
                auto_video_id, auto_audio_id, format_info = get_format_for_quality(info, 'auto')
            except Exception as e:
                logger.warning(f"Auto format analysis failed: {e}")
                auto_video_id, auto_audio_id, format_info = None, None, {}
            
            try:
                p1080_video_id, p1080_audio_id, p1080_format_info = get_format_for_quality(info, 'best[height<=1080]')
            except Exception as e:
                logger.warning(f"1080p format analysis failed: {e}")
                p1080_video_id, p1080_audio_id, p1080_format_info = None, None, {}
                
            try:
                p720_video_id, p720_audio_id, p720_format_info = get_format_for_quality(info, 'best[height<=720]')
            except Exception as e:
                logger.warning(f"720p format analysis failed: {e}")
                p720_video_id, p720_audio_id, p720_format_info = None, None, {}
                
            try:
                p480_video_id, p480_audio_id, p480_format_info = get_format_for_quality(info, 'best[height<=480]')
            except Exception as e:
                logger.warning(f"480p format analysis failed: {e}")
                p480_video_id, p480_audio_id, p480_format_info = None, None, {}
            
            # Prepare response with fallback values
            response = {
                'title': info.get('title', 'Unknown'),
                'duration': info.get('duration', 0),
                'uploader': info.get('uploader', 'N/A'),
                'thumbnail': info.get('thumbnail'),
                'description': info.get('description', ''),
                'view_count': info.get('view_count', 0),
                'upload_date': info.get('upload_date', ''),
                'formats': {
                    'video_formats': format_info.get('video_formats', [])[:10] if format_info else [],
                    'audio_formats': format_info.get('audio_formats', [])[:8] if format_info else [],
                    'recommended_video': auto_video_id,
                    'recommended_audio': auto_audio_id,
                    'quality_formats': {
                        'auto': {'video': auto_video_id, 'audio': auto_audio_id},
                        '1080p': {'video': p1080_video_id, 'audio': p1080_audio_id},
                        '720p': {'video': p720_video_id, 'audio': p720_audio_id},
                        '480p': {'video': p480_video_id, 'audio': p480_audio_id}
                    }
                }
            }
            
            # Log available formats for debugging
            if info.get('formats'):
                logger.info(f"Video has {len(info['formats'])} total formats available")
            else:
                logger.warning("No formats found in video info")
            
            logger.info(f"Successfully extracted info for: {info.get('title', 'Unknown')}")
            return jsonify(response)
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Video info extraction failed: {error_msg}")
        
        # Check for different types of errors
        if any(phrase in error_msg.lower() for phrase in ['sign in to confirm', 'bot', 'blocked', '429']):
            cookie_options = get_cookie_options()
            
            # Provide detailed troubleshooting information
            local_cookies = os.path.join(os.path.dirname(__file__), 'cookies.txt')
            cookie_analysis = {
                'has_local_cookies': os.path.exists(local_cookies),
                'cookie_options_configured': bool(cookie_options),
                'validation': None
            }
            
            if os.path.exists(local_cookies):
                is_valid, message = validate_cookies_file(local_cookies)
                cookie_analysis['validation'] = {
                    'is_valid': is_valid,
                    'message': message,
                    'file_size': os.path.getsize(local_cookies),
                    'modified_ago_hours': (time.time() - os.path.getmtime(local_cookies)) / 3600
                }
            
            suggestions = []
            if not cookie_analysis['has_local_cookies']:
                suggestions.extend([
                    "1. Go to YouTube.com in your browser while logged in",
                    "2. Use a browser extension like 'Get cookies.txt LOCALLY' to export cookies",
                    "3. Save the cookies as 'cookies.txt' in the backend folder",
                    "4. Restart the backend server"
                ])
            elif cookie_analysis['validation'] and not cookie_analysis['validation']['is_valid']:
                if 'expired' in cookie_analysis['validation']['message'].lower():
                    suggestions.extend([
                        "Your cookies appear to be expired. Please:",
                        "1. Go to YouTube.com and log in again",
                        "2. Export fresh cookies using a browser extension",
                        "3. Replace the existing cookies.txt file",
                        "4. Restart the backend server"
                    ])
                elif 'missing' in cookie_analysis['validation']['message'].lower():
                    suggestions.extend([
                        "Essential YouTube cookies are missing. Please:",
                        "1. Make sure you're logged into YouTube.com (not just Google)",
                        "2. Export cookies specifically from YouTube.com domain",
                        "3. Use a reliable cookie export extension",
                        "4. Verify all cookies are exported, not just selected ones"
                    ])
                else:
                    suggestions.extend([
                        "Cookie validation failed. Please:",
                        "1. Try using a different browser or incognito/private mode",
                        "2. Log into YouTube.com and watch a video to ensure session is active",
                        "3. Export cookies again using a different method or extension",
                        "4. Check that the cookies.txt file format is correct (Netscape format)"
                    ])
            else:
                # Cookies exist and seem valid, but still getting bot detection
                suggestions.extend([
                    "Despite having valid cookies, bot detection was triggered. Try:",
                    "1. Wait 10-15 minutes before trying again (rate limiting)",
                    "2. Export completely fresh cookies from a different browser session",
                    "3. Try using a VPN if you're making many requests",
                    "4. Ensure you're logged into YouTube and have watched videos recently"
                ])
            
            return jsonify({
                'error': 'YouTube bot detection triggered - Cookie authentication required',
                'type': 'authentication_required',
                'retry_after': 900,  # 15 minutes
                'cookie_analysis': cookie_analysis,
                'detailed_suggestions': suggestions,
                'quick_fix': 'Export fresh YouTube cookies to cookies.txt and restart server',
                'help_endpoints': {
                    'check_status': '/api/cookie-status',
                    'refresh_cache': '/api/refresh-cookies'
                }
            }), 429
        elif 'network' in error_msg.lower() or 'timeout' in error_msg.lower():
            return jsonify({
                'error': 'Network connection issue',
                'retry_after': 30,
                'type': 'network_error',
                'suggestion': 'Check your internet connection and try again.'
            }), 503
        else:
            return jsonify({
                'error': f'Failed to extract video info: {error_msg}',
                'type': 'extraction_error'
            }), 500

@app.route('/api/download-direct', methods=['POST'])
def start_direct_download():
    """Start direct download to user's device"""
    try:
        # Check rate limiting for downloads
        allowed, wait_time = check_rate_limit('download')
        if not allowed:
            logger.warning(f"Download rate limit hit, suggested wait time: {wait_time} seconds")
            return jsonify({
                'error': 'Download rate limit exceeded',
                'retry_after': int(wait_time),
                'type': 'rate_limit',
                'message': f'Too many download requests. Please wait {int(wait_time)} seconds before starting another download.',
                'limit_info': f'Limit: {RATE_LIMITS["download"]["requests"]} downloads per {RATE_LIMITS["download"]["window"]} seconds'
            }), 429
            
        data = request.get_json()
        url = data.get('url')
        quality = data.get('quality', 'auto')
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        # Add adaptive delay before making the request
        adaptive_sleep_before_request('download')
        
        # Create download ID first for status tracking
        download_id = str(uuid.uuid4())
        
        # Initialize status tracking
        download_status[download_id] = {
            'status': 'extracting_info',
            'message': 'Extracting video information...',
            'url': url,
            'quality': quality,
            'direct_download': True,
            'started_at': datetime.now().isoformat()
        }

        # Get video info first to get title and analyze formats
        ydl_opts_info = get_enhanced_ydl_opts()
        
        with yt_dlp.YoutubeDL(ydl_opts_info) as ydl:
            info = ydl.extract_info(url, download=False)
            title = info.get('title', 'video')
            duration = info.get('duration', 0)
            uploader = info.get('uploader', 'N/A')
            
            # Clean filename for download
            safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).rstrip()
            if not safe_title:
                safe_title = 'video'
        
        # Update status to analyzing formats
        download_status[download_id]['status'] = 'analyzing_formats'
        download_status[download_id]['message'] = 'Analyzing available formats...'
        download_status[download_id]['video_info'] = {
            'title': title,
            'duration': f"{duration // 60}:{duration % 60:02d}",
            'uploader': uploader
        }

        # Analyze formats using the new function
        video_id, audio_id, format_info = get_format_for_quality(info, quality)
        
        if video_id and audio_id:
            # Use specific format IDs for better compatibility
            format_string = f"{video_id}+{audio_id}"
            selected_format_description = get_simple_quality_label(format_info, video_id, audio_id)
        elif video_id:
            format_string = f"{video_id}+bestaudio"
            selected_format_description = get_simple_quality_label(format_info, video_id, audio_id)
        elif audio_id:
            format_string = audio_id
            selected_format_description = "Audio Only"
        else:
            format_string = "best[height<=1080]/best"
            selected_format_description = "Best Quality (≤1080p)"
        
        # Store download info for the stream endpoint
        download_info = {
            'url': url,
            'quality': quality,
            'format_string': format_string,
            'safe_title': safe_title,
            'original_title': title,
            'selected_format_description': selected_format_description,
            'video_info': {
                'title': title,
                'duration': f"{duration // 60}:{duration % 60:02d}",
                'uploader': uploader
            }
        }
        
        # Use a simple in-memory store for download info (you might want to use Redis in production)
        if not hasattr(app, 'download_cache'):
            app.download_cache = {}
        app.download_cache[download_id] = download_info
        
        # Update status entry for the frontend polling
        download_status[download_id].update({
            'status': 'direct_download_ready',
            'message': f'Direct download ready: {title}',
            'download_url': f'/api/download-stream/{download_id}',
            'safe_title': safe_title,
            'selected_format': format_string,
            'format_description': selected_format_description,
            'video_info': download_info['video_info']
        })
        
        return jsonify({
            'download_id': download_id,
            'download_url': f'/api/download-stream/{download_id}',
            'title': title,
            'safe_title': safe_title
        })
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Download preparation failed: {error_msg}")
        
        if 'Sign in to confirm' in error_msg or 'bot' in error_msg.lower():
            cookie_options = get_cookie_options()
            cookie_suggestion = ""
            
            if not cookie_options:
                cookie_suggestion = " Configure YT_DLP_COOKIES_FROM_BROWSER environment variable (e.g., 'chrome', 'firefox') or YT_DLP_COOKIES_FILE with path to cookies.txt file."
            
            return jsonify({
                'error': 'YouTube bot detection triggered. Authentication required.',
                'retry_after': 300,  # Suggest retry after 5 minutes
                'type': 'authentication_required',
                'suggestion': f'Set up cookie authentication to bypass bot detection.{cookie_suggestion}',
                'documentation': 'See https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp'
            }), 429
        else:
            return jsonify({'error': f'Failed to prepare download: {error_msg}'}), 500

@app.route('/api/download-stream/<download_id>')
def stream_download(download_id):
    """Stream video directly to user's browser for download"""
    try:
        print(f"DEBUG: Stream download requested for ID: {download_id}")
        
        # Get download info
        if not hasattr(app, 'download_cache'):
            print("DEBUG: No download_cache attribute found")
            return jsonify({'error': 'Download cache not found'}), 404
            
        if download_id not in app.download_cache:
            print(f"DEBUG: Download ID {download_id} not found in cache")
            print(f"DEBUG: Available keys: {list(app.download_cache.keys())}")
            return jsonify({'error': 'Download not found'}), 404
        
        download_info = app.download_cache[download_id]
        print(f"DEBUG: Download info retrieved: {download_info}")
        
        url = download_info['url']
        quality = download_info['quality']
        safe_title = download_info['safe_title']
        format_string = download_info['format_string']
        format_description = download_info['selected_format_description']
        
        print(f"DEBUG: URL: {url}, Quality: {quality}, Safe title: {safe_title}")
        print(f"DEBUG: Using format: {format_string} ({format_description})")
        
        # Configure yt_dlp for streaming
        def generate():
            # Create a temporary directory for the download
            temp_dir = tempfile.mkdtemp()
            temp_path = None
            
            try:
                print(f"DEBUG: Created temp directory: {temp_dir}")
                
                print(f"DEBUG: Using analyzed format: {format_string}")
                
                # Download to temporary directory with safe filename
                ydl_opts = get_enhanced_ydl_opts({
                    'outtmpl': os.path.join(temp_dir, f'{safe_title}.%(ext)s'),
                    'format': format_string,
                    'noplaylist': True,
                    'writeinfojson': False,
                    'writesubtitles': False,
                    'writeautomaticsub': False,
                    'ignoreerrors': False,
                })
                
                # Add merge format if combining video and audio
                if '+' in format_string:
                    try:
                        import subprocess
                        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
                        ydl_opts['merge_output_format'] = 'mp4'
                        print("DEBUG: FFmpeg available - will merge formats")
                    except (subprocess.CalledProcessError, FileNotFoundError):
                        print("DEBUG: FFmpeg not found - using fallback format")
                        # Fallback to a simpler format selection
                        ydl_opts['format'] = 'best[height<=1080]/best'
                
                print(f"DEBUG: yt-dlp options: {ydl_opts}")
                
                # Update status to downloading with format info
                if download_id in download_status:
                    download_status[download_id]['status'] = 'downloading'
                    download_status[download_id]['message'] = f'Downloading: {safe_title} ({format_description})'
                
                try:
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        ydl.download([url])
                except Exception as ydl_error:
                    print(f"DEBUG: yt-dlp download error: {str(ydl_error)}")
                    # Try fallback format
                    print("DEBUG: Trying fallback format")
                    ydl_opts['format'] = 'best[height<=1080]/best'
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        ydl.download([url])
                
                # Update status to streaming
                if download_id in download_status:
                    download_status[download_id]['status'] = 'streaming'
                    download_status[download_id]['message'] = f'Streaming download: {safe_title}'
                
                # Find the downloaded file
                files = os.listdir(temp_dir)
                print(f"DEBUG: Files in temp dir: {files}")
                
                if not files:
                    raise Exception("No file was downloaded")
                    
                # Find the largest file (main video file)
                largest_file = max(files, key=lambda f: os.path.getsize(os.path.join(temp_dir, f)))
                temp_path = os.path.join(temp_dir, largest_file)
                
                # Validate file size
                file_size = os.path.getsize(temp_path)
                if file_size == 0:
                    raise Exception(f"Downloaded file is empty: {largest_file}")
                
                print(f"DEBUG: Streaming file: {temp_path} (size: {file_size} bytes)")
                
                # Stream the file to the user
                with open(temp_path, 'rb') as f:
                    while True:
                        chunk = f.read(8192)  # Read in 8KB chunks
                        if not chunk:
                            break
                        yield chunk
                        
            except Exception as e:
                print(f"DEBUG: Error in generate function: {str(e)}")
                raise e
            finally:
                # Clean up temporary directory and files
                import shutil
                if temp_dir and os.path.exists(temp_dir):
                    print(f"DEBUG: Cleaning up temp directory: {temp_dir}")
                    shutil.rmtree(temp_dir)
                # Remove from cache
                if hasattr(app, 'download_cache') and download_id in app.download_cache:
                    print(f"DEBUG: Removing {download_id} from cache")
                    del app.download_cache[download_id]
                # Update status to completed
                if download_id in download_status:
                    download_status[download_id]['status'] = 'completed'
                    download_status[download_id]['message'] = f'Direct download completed: {safe_title} ({format_description})'
                    download_status[download_id]['completed_at'] = datetime.now().isoformat()
        
        # Create response with proper headers for download
        response = Response(
            generate(),
            mimetype='video/mp4',
            headers={
                'Content-Disposition': f'attachment; filename="{safe_title}.mp4"',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            }
        )
        
        print(f"DEBUG: Returning response for {safe_title}")
        return response
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Stream download failed for {download_id}: {error_msg}")
        
        # Clean up on error
        if hasattr(app, 'download_cache') and download_id in app.download_cache:
            del app.download_cache[download_id]
        
        # Update status to error
        if download_id in download_status:
            download_status[download_id]['status'] = 'error'
            download_status[download_id]['error'] = error_msg
            
            # Provide specific error messaging for bot detection
            if 'Sign in to confirm' in error_msg or 'bot' in error_msg.lower():
                cookie_options = get_cookie_options()
                cookie_suggestion = ""
                
                if not cookie_options:
                    cookie_suggestion = " Configure YT_DLP_COOKIES_FROM_BROWSER environment variable."
                
                download_status[download_id]['message'] = f'Bot detection triggered. Authentication required.{cookie_suggestion}'
                return jsonify({
                    'error': 'YouTube bot detection triggered. Authentication required.',
                    'type': 'authentication_required',
                    'suggestion': f'Set up cookie authentication to bypass bot detection.{cookie_suggestion}',
                    'documentation': 'See COOKIES_SETUP.md for detailed instructions'
                }), 429
            else:
                download_status[download_id]['message'] = f'Direct download failed: {error_msg}'
        
        return jsonify({'error': f'Download failed: {error_msg}'}), 500

@app.route('/api/download', methods=['POST'])
def start_download():
    """Start video download"""
    try:
        # Check rate limiting for downloads
        allowed, wait_time = check_rate_limit('download')
        if not allowed:
            logger.warning(f"Download rate limit hit, suggested wait time: {wait_time} seconds")
            return jsonify({
                'error': 'Download rate limit exceeded',
                'retry_after': int(wait_time),
                'type': 'rate_limit',
                'message': f'Too many download requests. Please wait {int(wait_time)} seconds before starting another download.',
                'limit_info': f'Limit: {RATE_LIMITS["download"]["requests"]} downloads per {RATE_LIMITS["download"]["window"]} seconds'
            }), 429
            
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400
            
        url = data.get('url')
        quality = data.get('quality', 'auto')
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        # Validate URL format
        if not isinstance(url, str) or not url.strip():
            return jsonify({'error': 'URL must be a non-empty string'}), 400
            
        url = url.strip()
        
        # Basic URL scheme validation
        if not (url.startswith('http://') or url.startswith('https://') or url.startswith('www.')):
            return jsonify({'error': 'Invalid URL format. URL must start with http://, https://, or www.'}), 400
        
        # Add adaptive delay before making the request
        adaptive_sleep_before_request('download')
        
        # Use persistent downloads directory instead of temp
        downloads_dir = os.path.join(os.path.dirname(__file__), 'downloads')
        os.makedirs(downloads_dir, exist_ok=True)
        
        # Generate task ID
        import uuid
        task_id = str(uuid.uuid4())
        
        # Initialize download status
        download_status[task_id] = {
            'status': 'started',
            'message': 'Download started',
            'url': url,
            'quality': quality,
            'output_folder': downloads_dir,
            'started_at': datetime.now().isoformat()
        }
        
        # Start download in background thread
        download_thread = threading.Thread(
            target=download_video_async,
            args=(task_id, url, downloads_dir, quality)
        )
        download_thread.start()
        
        return jsonify({
            'task_id': task_id,
            'status': 'started',
            'message': 'Download started successfully'
        })
    
    except Exception as e:
        return jsonify({'error': f'Failed to start download: {str(e)}'}), 500

@app.route('/api/download-status/<task_id>', methods=['GET'])
def get_download_status(task_id):
    """Get download status"""
    if task_id not in download_status:
        return jsonify({'error': 'Task not found'}), 404
    
    return jsonify(download_status[task_id])

@app.route('/api/downloads', methods=['GET'])
def get_all_downloads():
    """Get all download statuses"""
    return jsonify(download_status)

@app.route('/api/downloads/files', methods=['GET'])
def list_downloaded_files():
    """List all downloaded files"""
    try:
        downloads_dir = os.path.join(os.path.dirname(__file__), 'downloads')
        if not os.path.exists(downloads_dir):
            return jsonify({'files': []})
        
        files = []
        for file in os.listdir(downloads_dir):
            if file != '.gitkeep':  # Ignore gitkeep files
                file_path = os.path.join(downloads_dir, file)
                if os.path.isfile(file_path):
                    stat = os.stat(file_path)
                    files.append({
                        'name': file,
                        'size': stat.st_size,
                        'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        'path': file_path
                    })
        
        return jsonify({'files': files, 'download_path': downloads_dir})
    except Exception as e:
        return jsonify({'error': f'Failed to list files: {str(e)}'}), 500

@app.route('/api/downloads/files/<filename>', methods=['GET'])
def download_file(filename):
    """Serve a downloaded file for browser download"""
    try:
        downloads_dir = os.path.join(os.path.dirname(__file__), 'downloads')
        file_path = os.path.join(downloads_dir, filename)
        
        # Check if file exists
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404
        
        # Serve file with proper headers for download
        response = send_from_directory(
            downloads_dir, 
            filename, 
            as_attachment=True,
            download_name=filename
        )
        
        # Add CORS headers
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        
        return response
        
    except Exception as e:
        return jsonify({'error': f'File download failed: {str(e)}'}), 500

if __name__ == '__main__':
    # Create downloads directory if it doesn't exist
    os.makedirs('downloads', exist_ok=True)
    
    # Get port from environment variable (Railway sets this)
    port = int(os.getenv('PORT', 5000))
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    
    app.run(debug=debug_mode, host='0.0.0.0', port=port)