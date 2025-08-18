#!/usr/bin/env python3
"""
Simple YouTube Cookies Extractor

This script provides instructions and simple methods to get YouTube cookies
to fix the 429 error in your YouTube downloader.
"""

import os
import sys

def print_instructions():
    """Print detailed instructions for getting YouTube cookies"""
    
    print("=" * 80)
    print("FIXING 429 ERROR - GET YOUTUBE COOKIES")
    print("=" * 80)
    print()
    print("The 429 error means YouTube is blocking your requests due to bot detection.")
    print("You need to add valid YouTube session cookies to fix this.")
    print()
    print("METHOD 1: Browser Extension (Recommended)")
    print("-" * 40)
    print("1. Install a cookie export extension:")
    print("   • Chrome: 'Get cookies.txt LOCALLY' extension")
    print("   • Firefox: 'cookies.txt' extension")
    print()
    print("2. Go to https://youtube.com and make sure you're logged in")
    print("3. Use the extension to export cookies for youtube.com")
    print("4. Save the exported cookies as 'cookies.txt' in the backend folder")
    print("5. Restart your backend server")
    print()
    print("METHOD 2: Manual Cookie Export (Advanced)")
    print("-" * 40)
    print("1. Go to https://youtube.com in your browser")
    print("2. Press F12 to open Developer Tools")
    print("3. Go to Application/Storage tab")
    print("4. Click on Cookies > https://www.youtube.com")
    print("5. Copy important cookies (see list below)")
    print()
    print("IMPORTANT YOUTUBE COOKIES TO LOOK FOR:")
    print("-" * 40)
    print("• VISITOR_INFO1_LIVE")
    print("• YSC") 
    print("• LOGIN_INFO")
    print("• SID, HSID, SSID")
    print("• SAPISID, APISID")
    print("• SIDCC")
    print("• __Secure-3PSID")
    print()
    print("CURRENT STATUS:")
    print("-" * 40)
    
    cookies_file = os.path.join(os.path.dirname(__file__), 'cookies.txt')
    if os.path.exists(cookies_file):
        with open(cookies_file, 'r') as f:
            content = f.read()
            if 'youtube.com' in content.lower():
                print("✓ cookies.txt exists and contains YouTube cookies")
            else:
                print("✗ cookies.txt exists but has NO YouTube cookies")
                print("  Your current file has cookies from other sites but not YouTube")
    else:
        print("✗ cookies.txt file not found")
    
    print()
    print("QUICK FIX:")
    print("-" * 40)
    print("1. Go to https://youtube.com in Chrome/Firefox")
    print("2. Make sure you're logged in to your YouTube account")
    print("3. Install 'Get cookies.txt LOCALLY' extension")
    print("4. Export cookies for youtube.com")
    print("5. Replace your current cookies.txt with the exported file")
    print("6. Restart the backend: Ctrl+C then 'python app.py'")
    print()
    print("=" * 80)

def check_cookie_file():
    """Check the current cookie file for YouTube cookies"""
    cookies_file = os.path.join(os.path.dirname(__file__), 'cookies.txt')
    
    if not os.path.exists(cookies_file):
        print("❌ No cookies.txt file found!")
        return False
        
    with open(cookies_file, 'r') as f:
        content = f.read()
        
    youtube_indicators = ['youtube.com', 'YSC', 'VISITOR_INFO', 'LOGIN_INFO']
    youtube_cookies_found = any(indicator in content for indicator in youtube_indicators)
    
    if youtube_cookies_found:
        print("✅ YouTube cookies found in cookies.txt")
        # Count lines that contain youtube.com
        youtube_lines = [line for line in content.split('\n') if 'youtube.com' in line.lower()]
        print(f"   Found {len(youtube_lines)} YouTube-related cookie entries")
        return True
    else:
        print("❌ No YouTube cookies found in cookies.txt")
        print("   Your cookies file exists but doesn't contain YouTube session cookies")
        return False

def main():
    print_instructions()
    
    print("\nCHECKING YOUR CURRENT SETUP...")
    print("-" * 40)
    has_youtube_cookies = check_cookie_file()
    
    if not has_youtube_cookies:
        print("\n🚨 ACTION REQUIRED:")
        print("Your cookies.txt file needs YouTube cookies to fix the 429 error.")
        print("Follow the instructions above to get fresh YouTube cookies.")
    else:
        print("\n✅ Setup looks good!")
        print("If you're still getting 429 errors, your cookies might be expired.")
        print("Try getting fresh cookies using the methods above.")
    
    print("\nAfter updating cookies, restart your backend server:")
    print("1. Stop the current server (Ctrl+C)")
    print("2. Start it again: python app.py")

if __name__ == "__main__":
    main()
