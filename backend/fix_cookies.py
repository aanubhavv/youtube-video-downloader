#!/usr/bin/env python3
"""
Extract Essential YouTube Cookies

This script extracts only the most recent and essential YouTube cookies
from your current cookies.txt file to fix the 429 rate limiting issue.
"""

import os
import re
from collections import defaultdict

def extract_essential_cookies():
    """Extract only essential YouTube cookies to prevent rate limiting"""
    
    backend_dir = os.path.dirname(__file__)
    current_cookies = os.path.join(backend_dir, 'cookies.txt')
    clean_cookies = os.path.join(backend_dir, 'cookies_essential.txt')
    
    if not os.path.exists(current_cookies):
        print("❌ cookies.txt not found!")
        return False
    
    # Essential cookie names we need
    essential_cookies = {
        'SID', 'HSID', 'SSID', 'APISID', 'SAPISID',
        '__Secure-1PSID', '__Secure-3PSID', 
        '__Secure-1PAPISID', '__Secure-3PAPISID',
        'YSC', 'LOGIN_INFO', 'SIDCC',
        '__Secure-1PSIDCC', '__Secure-3PSIDCC'
    }
    
    # Read current cookies
    with open(current_cookies, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    # Parse and collect essential cookies
    collected_cookies = defaultdict(list)
    
    for line in lines:
        line = line.strip()
        if line.startswith('#') or not line:
            continue
        
        parts = line.split('\t')
        if len(parts) >= 7 and 'youtube.com' in parts[0]:
            cookie_name = parts[5]
            if cookie_name in essential_cookies:
                # Store with timestamp to get most recent
                try:
                    timestamp = int(parts[4]) if parts[4] != '0' else 9999999999
                    collected_cookies[cookie_name].append((timestamp, line))
                except:
                    collected_cookies[cookie_name].append((0, line))
    
    # Get only the most recent of each essential cookie
    essential_lines = []
    
    for cookie_name, cookie_list in collected_cookies.items():
        if cookie_list:
            # Sort by timestamp (most recent first)
            cookie_list.sort(key=lambda x: x[0], reverse=True)
            most_recent = cookie_list[0][1]
            essential_lines.append(most_recent)
            print(f"✅ Found {cookie_name}")
    
    # Add one recent VISITOR_INFO1_LIVE (not all of them!)
    visitor_cookies = []
    for line in lines:
        line = line.strip()
        if 'VISITOR_INFO1_LIVE' in line and 'youtube.com' in line:
            parts = line.split('\t')
            if len(parts) >= 7:
                try:
                    timestamp = int(parts[4]) if parts[4] != '0' else 9999999999
                    visitor_cookies.append((timestamp, line))
                except:
                    pass
    
    if visitor_cookies:
        visitor_cookies.sort(key=lambda x: x[0], reverse=True)
        essential_lines.append(visitor_cookies[0][1])
        print("✅ Found VISITOR_INFO1_LIVE (most recent only)")
    
    # Write clean cookies file
    with open(clean_cookies, 'w') as f:
        f.write("# Netscape HTTP Cookie File\n")
        f.write("# This is a generated file! Do not edit.\n")
        f.write("# Essential YouTube cookies only - cleaned to prevent 429 errors\n\n")
        
        for line in essential_lines:
            f.write(line + '\n')
    
    print(f"\n✅ Created clean cookies file: cookies_essential.txt")
    print(f"📊 Reduced from 200+ cookies to {len(essential_lines)} essential cookies")
    print("\n🔄 TO APPLY THE FIX:")
    print("1. Stop your backend server (Ctrl+C)")
    print("2. Replace cookies.txt with cookies_essential.txt:")
    print("   copy cookies_essential.txt cookies.txt")
    print("3. Restart your backend server")
    
    return True

def show_cookie_stats():
    """Show statistics about current cookies"""
    backend_dir = os.path.dirname(__file__)
    current_cookies = os.path.join(backend_dir, 'cookies.txt')
    
    if not os.path.exists(current_cookies):
        print("❌ cookies.txt not found!")
        return
    
    with open(current_cookies, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    youtube_lines = [line for line in lines if 'youtube.com' in line and not line.startswith('#')]
    visitor_cookies = [line for line in youtube_lines if 'VISITOR_INFO1_LIVE' in line]
    session_cookies = [line for line in youtube_lines if any(cookie in line for cookie in ['SID', 'HSID', 'SSID'])]
    
    print("📊 CURRENT COOKIE STATISTICS:")
    print(f"   Total YouTube cookies: {len(youtube_lines)}")
    print(f"   VISITOR_INFO1_LIVE cookies: {len(visitor_cookies)}")
    print(f"   Session cookies: {len(session_cookies)}")
    print(f"   🚨 Problem: Too many cookies causing rate limiting!")

def main():
    print("🔧 FIXING 429 ERROR - CLEANING YOUTUBE COOKIES")
    print("=" * 60)
    
    show_cookie_stats()
    
    print(f"\nThe issue: Your cookies.txt has 200+ YouTube cookies including")
    print(f"dozens of old VISITOR_INFO1_LIVE tokens. This triggers YouTube's")
    print(f"bot detection and causes 429 rate limiting errors.")
    
    print(f"\nSolution: Extract only the essential, most recent cookies.")
    
    response = input("\nExtract essential cookies? (y/n): ").lower().strip()
    if response == 'y':
        extract_essential_cookies()
    else:
        print("Operation cancelled. Your cookies.txt remains unchanged.")

if __name__ == "__main__":
    main()
