#!/usr/bin/env python3
"""
YouTube Format Debugger

This script helps debug format selection issues by showing all available 
formats for a given YouTube video.
"""

import yt_dlp
import json
import os
import sys

def debug_video_formats(url):
    """Debug video formats for a specific URL"""
    
    # Use the same cookie configuration as the main app
    cookie_options = {}
    cookies_file = os.getenv('YT_DLP_COOKIES_FILE')
    if cookies_file and os.path.exists(cookies_file):
        cookie_options['cookiefile'] = cookies_file
    else:
        local_cookies = os.path.join(os.path.dirname(__file__), 'cookies.txt')
        if os.path.exists(local_cookies):
            cookie_options['cookiefile'] = local_cookies
    
    ydl_opts = {
        'quiet': False,
        'no_warnings': False,
        **cookie_options
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print(f"🔍 Analyzing formats for: {url}")
            info = ydl.extract_info(url, download=False)
            
            title = info.get('title', 'Unknown')
            formats = info.get('formats', [])
            
            print(f"📺 Video: {title}")
            print(f"📊 Total formats found: {len(formats)}")
            print()
            
            # Categorize formats
            video_only = []
            audio_only = []
            combined = []
            
            for fmt in formats:
                vcodec = fmt.get('vcodec', 'none')
                acodec = fmt.get('acodec', 'none')
                
                if vcodec != 'none' and acodec == 'none':
                    video_only.append(fmt)
                elif acodec != 'none' and vcodec == 'none':
                    audio_only.append(fmt)
                elif vcodec != 'none' and acodec != 'none':
                    combined.append(fmt)
            
            print(f"📊 FORMAT BREAKDOWN:")
            print(f"   Video-only formats: {len(video_only)}")
            print(f"   Audio-only formats: {len(audio_only)}")
            print(f"   Combined formats: {len(combined)}")
            print()
            
            # Show video formats
            if video_only:
                print("🎥 VIDEO-ONLY FORMATS:")
                for fmt in sorted(video_only, key=lambda x: x.get('height', 0), reverse=True)[:10]:
                    height = fmt.get('height', 'N/A')
                    fps = fmt.get('fps', 'N/A')
                    tbr = fmt.get('tbr', 'N/A')
                    format_id = fmt.get('format_id', 'N/A')
                    ext = fmt.get('ext', 'N/A')
                    print(f"   {format_id:>6} | {height:>4}p | {fps:>3}fps | {tbr:>6}kbps | {ext}")
                print()
            
            # Show audio formats
            if audio_only:
                print("🎵 AUDIO-ONLY FORMATS:")
                for fmt in sorted(audio_only, key=lambda x: x.get('abr', 0), reverse=True)[:10]:
                    abr = fmt.get('abr', 'N/A')
                    format_id = fmt.get('format_id', 'N/A')
                    ext = fmt.get('ext', 'N/A')
                    acodec = fmt.get('acodec', 'N/A')
                    print(f"   {format_id:>6} | {abr:>6}kbps | {ext:>4} | {acodec}")
                print()
            
            # Show combined formats
            if combined:
                print("🎬 COMBINED FORMATS:")
                for fmt in sorted(combined, key=lambda x: x.get('height', 0), reverse=True)[:10]:
                    height = fmt.get('height', 'N/A')
                    fps = fmt.get('fps', 'N/A')
                    tbr = fmt.get('tbr', 'N/A')
                    format_id = fmt.get('format_id', 'N/A')
                    ext = fmt.get('ext', 'N/A')
                    print(f"   {format_id:>6} | {height:>4}p | {fps:>3}fps | {tbr:>6}kbps | {ext}")
                print()
            
            # Test format selection
            print("🧪 TESTING FORMAT SELECTION:")
            
            # Test our format selection functions
            sys.path.append(os.path.dirname(__file__))
            
            try:
                from app import get_best_formats, get_format_for_quality
                
                print("   Testing get_best_formats()...")
                video_id, audio_id, format_info = get_best_formats(info)
                print(f"      Best video: {video_id}")
                print(f"      Best audio: {audio_id}")
                
                print("   Testing quality selections...")
                for quality in ['auto', 'best[height<=1080]', 'best[height<=720]', 'best[height<=480]']:
                    try:
                        v_id, a_id, _ = get_format_for_quality(info, quality)
                        print(f"      {quality:>20}: video={v_id}, audio={a_id}")
                    except Exception as e:
                        print(f"      {quality:>20}: ERROR - {e}")
                        
            except ImportError:
                print("   Cannot import format functions from app.py")
            
            return True
            
    except Exception as e:
        print(f"❌ Error analyzing video: {e}")
        return False

def main():
    print("🔧 YOUTUBE FORMAT DEBUGGER")
    print("=" * 50)
    
    # Test with the problematic video from your logs
    test_url = "https://www.youtube.com/watch?v=WyYiVdNhTE0"
    
    print(f"Testing with URL from your error logs:")
    print(f"{test_url}")
    print()
    
    success = debug_video_formats(test_url)
    
    if success:
        print("\n✅ Analysis complete!")
        print("Check the output above to see what formats are available")
        print("and whether the format selection functions work correctly.")
    else:
        print("\n❌ Analysis failed!")
        print("This might indicate a cookie or network issue.")

if __name__ == "__main__":
    main()
