#!/usr/bin/env python3
"""
yt-dlp Update Script for YouTube Downloader

This script updates yt-dlp to the latest version and tests the installation.
Run this when you encounter "Failed to extract any player response" errors.
"""

import subprocess
import sys
import os
from datetime import datetime

def run_command(command, description):
    """Run a command and return success status"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        print(f"✅ {description} completed successfully")
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e.stderr}")
        return False, e.stderr
    except FileNotFoundError as e:
        print(f"❌ Command not found: {e}")
        return False, str(e)

def main():
    print("🚀 YouTube Downloader - yt-dlp Update Script")
    print("=" * 50)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Check if we're in a virtual environment
    in_venv = hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)
    
    if not in_venv:
        print("⚠️  Warning: You're not in a virtual environment.")
        print("   It's recommended to activate your virtual environment first:")
        if os.name == 'nt':  # Windows
            print("   cd backend && venv\\Scripts\\activate")
        else:  # Linux/Mac
            print("   cd backend && source venv/bin/activate")
        print()
        
        response = input("Continue anyway? (y/N): ").lower().strip()
        if response != 'y':
            print("Cancelled by user")
            sys.exit(0)
    else:
        print("✅ Virtual environment detected")
    
    print()
    
    # Step 1: Check current yt-dlp version
    print("📋 Current yt-dlp installation:")
    success, output = run_command([sys.executable, "-c", "import yt_dlp; print(f'Version: {yt_dlp.version.__version__}')"], "Checking current yt-dlp version")
    if success:
        print(f"   {output.strip()}")
    print()
    
    # Step 2: Update yt-dlp
    success, output = run_command([sys.executable, "-m", "pip", "install", "--upgrade", "yt-dlp"], "Updating yt-dlp to latest version")
    if not success:
        print("💔 Failed to update yt-dlp")
        sys.exit(1)
    print()
    
    # Step 3: Check new version
    print("🔍 Verifying new installation:")
    success, output = run_command([sys.executable, "-c", "import yt_dlp; print(f'New version: {yt_dlp.version.__version__}')"], "Checking updated yt-dlp version")
    if success:
        print(f"   {output.strip()}")
    print()
    
    # Step 4: Test YouTube access
    print("🧪 Testing YouTube access:")
    test_code = '''
import yt_dlp
try:
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info("https://www.youtube.com/watch?v=dQw4w9WgXcQ", download=False)
        print(f"✅ Test successful - Title: {info.get('title', 'N/A')}")
except Exception as e:
    print(f"❌ Test failed: {str(e)}")
    if 'Sign in to confirm' in str(e) or 'bot' in str(e).lower():
        print("   This indicates bot detection - cookies may be needed")
    elif 'Failed to extract any player response' in str(e):
        print("   Player extraction still failing - may need newer yt-dlp version")
'''
    
    success, output = run_command([sys.executable, "-c", test_code], "Testing YouTube video extraction")
    if success:
        print(f"   {output.strip()}")
    print()
    
    # Step 5: Update requirements.txt (if it exists and we're in the right directory)
    requirements_paths = ['requirements.txt', 'backend/requirements.txt']
    for req_path in requirements_paths:
        if os.path.exists(req_path):
            print(f"📝 Found {req_path}")
            try:
                # Read current requirements
                with open(req_path, 'r') as f:
                    lines = f.readlines()
                
                # Update yt-dlp line
                updated = False
                for i, line in enumerate(lines):
                    if line.strip().startswith('yt-dlp'):
                        lines[i] = 'yt-dlp>=2025.1.25\n'
                        updated = True
                        break
                
                if updated:
                    with open(req_path, 'w') as f:
                        f.writelines(lines)
                    print(f"✅ Updated {req_path} with latest yt-dlp requirement")
                else:
                    print(f"⚠️  No yt-dlp line found in {req_path}")
            except Exception as e:
                print(f"❌ Failed to update {req_path}: {e}")
            break
    
    print()
    print("🎉 Update process completed!")
    print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    print("Next steps:")
    print("1. Restart your Flask backend server")
    print("2. If deploying to Railway, commit and push the updated requirements.txt")
    print("3. Test with a YouTube video to confirm the fix")
    print()
    print("If you still get errors, check:")
    print("• Cookie configuration (use test-cookies.py)")
    print("• Video accessibility (try different videos)")
    print("• System status endpoint (/api/system-status)")

if __name__ == "__main__":
    main()
