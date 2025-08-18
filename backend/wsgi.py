#!/usr/bin/env python3
"""
Production startup script for the YouTube Downloader backend.
This script runs the Flask application using Gunicorn for better performance.
"""
import os
import sys
from app import app

if __name__ == "__main__":
    port = int(os.getenv('PORT', 5000))
    # For production, we let Railway handle the server
    # This script is mainly for local testing of production mode
    app.run(host='0.0.0.0', port=port, debug=False)
