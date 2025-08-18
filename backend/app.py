from flask import Flask, request, jsonify, send_from_directory, Response, stream_template
from flask_cors import CORS
import yt_dlp
import os
import tempfile
import threading
from datetime import datetime
import uuid

app = Flask(__name__)

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

def get_best_formats(info):
    """
    Analyze available formats and return the best video and audio format IDs
    
    Args:
        info (dict): Video information from yt-dlp
        
    Returns:
        tuple: (best_video_format_id, best_audio_format_id, format_info)
    """
    formats = info.get('formats', [])
    
    # Separate video and audio formats
    video_formats = []
    audio_formats = []
    
    for fmt in formats:
        if fmt.get('vcodec') != 'none' and fmt.get('acodec') == 'none':  # Video only
            video_formats.append(fmt)
        elif fmt.get('acodec') != 'none' and fmt.get('vcodec') == 'none':  # Audio only
            audio_formats.append(fmt)
    
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
    
    # Separate video and audio formats
    video_formats = []
    audio_formats = []
    
    for fmt in formats:
        if fmt.get('vcodec') != 'none' and fmt.get('acodec') == 'none':  # Video only
            video_formats.append(fmt)
        elif fmt.get('acodec') != 'none' and fmt.get('vcodec') == 'none':  # Audio only
            audio_formats.append(fmt)
    
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
        return video_id, audio_id, format_info
    elif quality == 'bestaudio':
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
        
        # Find best video format at or below target height
        best_video = None
        for fmt in video_formats:
            height = fmt.get('height') or 0
            if height <= target_height:
                best_video = fmt
                break
        
        # If no format found at target height, get the lowest available
        if not best_video and video_formats:
            best_video = video_formats[-1]  # Last (lowest quality) format
        
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
        
        # Get video info first
        with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
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
        ydl_opts = {
            'outtmpl': os.path.join(output_folder, '%(title)s.%(ext)s'),
            'format': format_string,
            'noplaylist': True,
        }
        
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

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok', 
        'message': 'YouTube Downloader API is running',
        'server': 'Gunicorn Production Server' if 'gunicorn' in os.environ.get('SERVER_SOFTWARE', '').lower() else 'Flask Development Server',
        'environment': os.getenv('FLASK_ENV', 'production')
    })

@app.route('/api/video-info', methods=['POST'])
def get_video_info():
    """Get video information without downloading"""
    try:
        data = request.get_json()
        url = data.get('url')
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        # Get video info
        with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Get format analysis for different qualities
            auto_video_id, auto_audio_id, format_info = get_format_for_quality(info, 'auto')
            p1080_video_id, p1080_audio_id, p1080_format_info = get_format_for_quality(info, 'best[height<=1080]')
            p720_video_id, p720_audio_id, p720_format_info = get_format_for_quality(info, 'best[height<=720]')
            p480_video_id, p480_audio_id, p480_format_info = get_format_for_quality(info, 'best[height<=480]')
            
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
            
            return jsonify(response)
    
    except Exception as e:
        return jsonify({'error': f'Failed to get video info: {str(e)}'}), 500

@app.route('/api/download-direct', methods=['POST'])
def start_direct_download():
    """Start direct download to user's device"""
    try:
        data = request.get_json()
        url = data.get('url')
        quality = data.get('quality', 'auto')
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
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
        with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
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
        return jsonify({'error': f'Failed to prepare download: {str(e)}'}), 500

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
                ydl_opts = {
                    'outtmpl': os.path.join(temp_dir, f'{safe_title}.%(ext)s'),
                    'format': format_string,
                    'noplaylist': True,
                    'writeinfojson': False,
                    'writesubtitles': False,
                    'writeautomaticsub': False,
                    'ignoreerrors': False,
                }
                
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
        print(f"DEBUG: Main exception in stream_download: {str(e)}")
        # Clean up on error
        if hasattr(app, 'download_cache') and download_id in app.download_cache:
            del app.download_cache[download_id]
        # Update status to error
        if download_id in download_status:
            download_status[download_id]['status'] = 'error'
            download_status[download_id]['message'] = f'Direct download failed: {str(e)}'
            download_status[download_id]['error'] = str(e)
        return jsonify({'error': f'Download failed: {str(e)}'}), 500

@app.route('/api/download', methods=['POST'])
def start_download():
    """Start video download"""
    try:
        data = request.get_json()
        url = data.get('url')
        quality = data.get('quality', 'auto')
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
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
