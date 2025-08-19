#!/usr/bin/env python3
"""
YouTube Cookie Test Script

This script helps you test your YouTube cookies before deploying to Railway.
Run this locally to verify your cookies work with yt-dlp.
"""

import os
import sys
import tempfile
import yt_dlp
from datetime import datetime

def test_cookies():
    print("🧪 YouTube Cookie Test Script")
    print("=" * 40)
    
    # Check for cookie environment variable
    raw_cookies = os.getenv('YOUTUBE_COOKIES_RAW')
    if not raw_cookies:
        print("❌ YOUTUBE_COOKIES_RAW environment variable not found!")
        print("\nPlease export your cookies and set the environment variable:")
        print("For Windows: set YOUTUBE_COOKIES_RAW=your_cookie_content")
        print("For Linux/Mac: export YOUTUBE_COOKIES_RAW='your_cookie_content'")
        return False
    
    # Create temporary cookie file
    temp_cookie_file = None
    try:
        temp_cookie_file = os.path.join(tempfile.gettempdir(), 'test_youtube_cookies.txt')
        with open(temp_cookie_file, 'w', encoding='utf-8') as f:
            f.write(raw_cookies)
        
        print(f"✅ Cookie file created: {temp_cookie_file}")
        print(f"📝 Cookie content length: {len(raw_cookies)} characters")
        
        # Test with yt-dlp
        test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Rick Roll for testing
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'cookiefile': temp_cookie_file,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'extractor_retries': 3,
        }
        
        print(f"🔍 Testing YouTube access with cookies...")
        print(f"📺 Test URL: {test_url}")
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(test_url, download=False)
            
            print("✅ SUCCESS! YouTube access working with cookies")
            print(f"📺 Title: {info.get('title', 'N/A')}")
            print(f"👤 Uploader: {info.get('uploader', 'N/A')}")
            print(f"⏱️  Duration: {info.get('duration', 0)} seconds")
            print(f"📊 View count: {info.get('view_count', 0):,}")
            
            print("\n✅ Your cookies are working! You can deploy to Railway.")
            return True
            
    except Exception as e:
        error_msg = str(e)
        print(f"❌ ERROR: {error_msg}")
        
        if 'Sign in to confirm' in error_msg or 'bot' in error_msg.lower():
            print("\n🤖 Bot detection triggered - Cookie issues:")
            print("• Cookies may be expired or invalid")
            print("• Export fresh cookies from a logged-in YouTube session")
            print("• Make sure cookies include session tokens")
            print("• Try cookies from different browser or account")
        else:
            print(f"\n💥 Unexpected error: {error_msg}")
            
        return False
    
    finally:
        # Clean up temporary file
        if temp_cookie_file and os.path.exists(temp_cookie_file):
            try:
                os.remove(temp_cookie_file)
                print(f"🧹 Cleaned up: {temp_cookie_file}")
            except:
                pass

def show_help():
    print("🍪 YouTube Cookie Setup Guide")
    print("=" * 40)
    print("\n1. Export cookies from your browser:")
    print("   Chrome: https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc")
    print("   Firefox: https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/")
    print("\n2. Visit YouTube and log in")
    print("3. Use the extension to export cookies for youtube.com")
    print("4. Set environment variable with cookie content")
    print("\n5. Run this script to test:")
    print("   python test-cookies.py")
    
    print("\nEnvironment Variable Setup:")
    print("Windows Command Prompt:")
    print('  set YOUTUBE_COOKIES_RAW=# Netscape HTTP Cookie File...')
    print("\nWindows PowerShell:")
    print('  $env:YOUTUBE_COOKIES_RAW="# Netscape HTTP Cookie File..."')
    print("\nLinux/Mac:")
    print('  export YOUTUBE_COOKIES_RAW="# Netscape HTTP Cookie File..."')

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] in ['--help', '-h', 'help']:
        show_help()
    else:
        print(f"🕐 Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        success = test_cookies()
        
        if success:
            print(f"\n🎉 Test completed successfully at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            sys.exit(0)
        else:
            print(f"\n💔 Test failed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print("Run 'python test-cookies.py --help' for setup instructions")
            sys.exit(1)
