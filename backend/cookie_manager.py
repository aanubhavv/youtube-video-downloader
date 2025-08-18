#!/usr/bin/env python3
"""
Cookie File Manager for YouTube Downloader

This script helps manage multiple cookie files to avoid 429 errors
by rotating between different authenticated sessions.
"""

import os
import shutil
import json
from datetime import datetime

class CookieManager:
    def __init__(self):
        self.backend_dir = os.path.dirname(__file__)
        self.active_cookies = os.path.join(self.backend_dir, 'cookies.txt')
        self.backup_dir = os.path.join(self.backend_dir, 'cookie_backups')
        self.config_file = os.path.join(self.backend_dir, 'cookie_config.json')
        
        # Create backup directory if it doesn't exist
        os.makedirs(self.backup_dir, exist_ok=True)
    
    def backup_current_cookies(self):
        """Backup the current cookies.txt file"""
        if os.path.exists(self.active_cookies):
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_name = f'cookies_backup_{timestamp}.txt'
            backup_path = os.path.join(self.backup_dir, backup_name)
            shutil.copy2(self.active_cookies, backup_path)
            print(f"✅ Backed up current cookies to: {backup_name}")
            return backup_path
        else:
            print("❌ No active cookies.txt file to backup")
            return None
    
    def list_backup_cookies(self):
        """List all available cookie backup files"""
        if not os.path.exists(self.backup_dir):
            print("No backup directory found")
            return []
        
        backup_files = [f for f in os.listdir(self.backup_dir) if f.endswith('.txt')]
        backup_files.sort()
        
        print(f"Available cookie backup files ({len(backup_files)}):")
        for i, file in enumerate(backup_files, 1):
            file_path = os.path.join(self.backup_dir, file)
            file_size = os.path.getsize(file_path)
            modified_time = datetime.fromtimestamp(os.path.getmtime(file_path))
            print(f"  {i}. {file} ({file_size} bytes, {modified_time.strftime('%Y-%m-%d %H:%M')})")
        
        return backup_files
    
    def restore_cookies(self, backup_filename):
        """Restore cookies from a backup file"""
        backup_path = os.path.join(self.backup_dir, backup_filename)
        
        if not os.path.exists(backup_path):
            print(f"❌ Backup file not found: {backup_filename}")
            return False
        
        # Backup current cookies first
        self.backup_current_cookies()
        
        # Restore the selected backup
        shutil.copy2(backup_path, self.active_cookies)
        print(f"✅ Restored cookies from: {backup_filename}")
        print("🔄 Please restart your backend server for changes to take effect")
        return True
    
    def validate_youtube_cookies(self, file_path=None):
        """Check if a cookie file contains YouTube cookies"""
        if file_path is None:
            file_path = self.active_cookies
        
        if not os.path.exists(file_path):
            return False, "File not found"
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            youtube_indicators = [
                'youtube.com', 'YSC', 'VISITOR_INFO', 'LOGIN_INFO', 
                'SAPISID', 'APISID', 'SIDCC'
            ]
            
            found_indicators = [indicator for indicator in youtube_indicators if indicator in content]
            youtube_lines = [line for line in content.split('\n') if 'youtube.com' in line.lower()]
            
            if found_indicators:
                return True, f"Found {len(found_indicators)} YouTube indicators, {len(youtube_lines)} cookie lines"
            else:
                return False, "No YouTube cookies found"
                
        except Exception as e:
            return False, f"Error reading file: {str(e)}"
    
    def check_all_cookies(self):
        """Check the validity of all cookie files"""
        print("🔍 CHECKING ALL COOKIE FILES")
        print("=" * 50)
        
        # Check active cookies
        print("1. Active cookies.txt:")
        valid, message = self.validate_youtube_cookies(self.active_cookies)
        status = "✅ Valid" if valid else "❌ Invalid"
        print(f"   {status}: {message}")
        
        # Check backup cookies
        backup_files = [f for f in os.listdir(self.backup_dir) if f.endswith('.txt')] if os.path.exists(self.backup_dir) else []
        
        print(f"\n2. Backup cookie files ({len(backup_files)}):")
        for file in backup_files:
            file_path = os.path.join(self.backup_dir, file)
            valid, message = self.validate_youtube_cookies(file_path)
            status = "✅ Valid" if valid else "❌ Invalid"
            print(f"   {file}: {status} - {message}")
    
    def create_fresh_cookies_template(self):
        """Create a template for fresh YouTube cookies"""
        template_path = os.path.join(self.backend_dir, 'cookies_template.txt')
        
        template_content = '''# Netscape HTTP Cookie File
# This is a generated file! Do not edit.
# 
# INSTRUCTIONS:
# 1. Go to https://youtube.com in your browser (logged in)
# 2. Use a cookie export extension to get YouTube cookies
# 3. Replace this file content with the exported cookies
# 4. Rename this file to 'cookies.txt'
# 5. Restart your backend server
#
# IMPORTANT: You need cookies from youtube.com domain
# Look for cookies with names like: YSC, VISITOR_INFO1_LIVE, LOGIN_INFO, etc.
'''
        
        with open(template_path, 'w') as f:
            f.write(template_content)
        
        print(f"✅ Created cookie template: {template_path}")
        print("📝 Edit this file with your YouTube cookies, then rename to cookies.txt")

def main():
    manager = CookieManager()
    
    while True:
        print("\n" + "=" * 60)
        print("YOUTUBE DOWNLOADER - COOKIE MANAGER")
        print("=" * 60)
        print("1. Check all cookie files")
        print("2. List backup cookie files") 
        print("3. Backup current cookies")
        print("4. Restore cookies from backup")
        print("5. Create fresh cookie template")
        print("6. Exit")
        print()
        
        choice = input("Choose an option (1-6): ").strip()
        
        if choice == '1':
            manager.check_all_cookies()
        
        elif choice == '2':
            manager.list_backup_cookies()
        
        elif choice == '3':
            manager.backup_current_cookies()
        
        elif choice == '4':
            backup_files = manager.list_backup_cookies()
            if backup_files:
                try:
                    selection = int(input(f"Select backup file (1-{len(backup_files)}): ")) - 1
                    if 0 <= selection < len(backup_files):
                        manager.restore_cookies(backup_files[selection])
                    else:
                        print("Invalid selection")
                except ValueError:
                    print("Invalid input. Please enter a number.")
        
        elif choice == '5':
            manager.create_fresh_cookies_template()
        
        elif choice == '6':
            print("👋 Goodbye!")
            break
        
        else:
            print("Invalid option. Please choose 1-6.")

if __name__ == "__main__":
    main()
