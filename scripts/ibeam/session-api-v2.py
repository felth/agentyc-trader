#!/usr/bin/env python3
"""
IBeam Session API v2 - Extract Real Cookies from Selenium
Exposes actual Gateway cookies from Selenium browser session

This version extracts the REAL cookies from Selenium's browser session,
not just the session ID from logs.
"""
from flask import Flask, jsonify, request
import requests
import subprocess
import time
import re
import sqlite3
import os
from datetime import datetime
from typing import Optional, Dict, List
from pathlib import Path

app = Flask(__name__)

# Cache session info to avoid hammering IBeam
_session_cache: Optional[Dict] = None
_cookie_cache: Optional[Dict] = None
_cache_time = 0
CACHE_TTL = 30  # Cache for 30 seconds

def find_chrome_profile_directory() -> Optional[Path]:
    """Find Chrome/Selenium profile directory in IBeam container"""
    # Common locations for Chrome profiles
    search_paths = [
        Path("/root/.cache/chromium"),
        Path("/root/.config/chromium"),
        Path("/root/.local/share/chromium"),
        Path("/root/.cache/google-chrome"),
        Path("/root/.config/google-chrome"),
        Path("/srv/ibeam/out"),
        Path("/tmp/chrome-user-data"),
    ]
    
    for base_path in search_paths:
        # Look for Default profile
        profile_path = base_path / "Default"
        cookies_db = profile_path / "Cookies"
        if cookies_db.exists():
            return profile_path
        
        # Look for any profile directory
        if base_path.exists():
            for item in base_path.iterdir():
                if item.is_dir() and (item / "Cookies").exists():
                    return item
    
    return None

def extract_cookies_from_chrome_db(profile_path: Path) -> Dict[str, str]:
    """Extract cookies from Chrome's SQLite cookie database"""
    cookies = {}
    cookies_db = profile_path / "Cookies"
    
    if not cookies_db.exists():
        return cookies
    
    try:
        # Copy database to avoid locking issues
        import tempfile
        import shutil
        with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as tmp_db:
            shutil.copy2(cookies_db, tmp_db.name)
            tmp_path = tmp_db.name
        
        try:
            conn = sqlite3.connect(tmp_path)
            cursor = conn.cursor()
            
            # Query cookies for Gateway domain (127.0.0.1:5000)
            cursor.execute("""
                SELECT name, value, host_key, path, expires_utc
                FROM cookies
                WHERE host_key LIKE '%127.0.0.1%' 
                   OR host_key LIKE '%localhost%'
                   OR host_key LIKE '%5000%'
                ORDER BY expires_utc DESC
            """)
            
            for row in cursor.fetchall():
                name, value, host_key, path, expires = row
                # Only include non-expired cookies (expires_utc > current time * 1000000)
                if expires == 0 or expires > (time.time() * 1000000):
                    cookies[name] = value
            
            conn.close()
        finally:
            os.unlink(tmp_path)
            
    except Exception as e:
        print(f"Warning: Could not extract cookies from Chrome DB: {e}")
    
    return cookies

def get_cookies_from_docker_exec() -> Dict[str, str]:
    """Try to get cookies by executing command in IBeam container"""
    cookies = {}
    
    # Try to find and extract cookies from container
    try:
        # Method 1: Check if IBeam exposes cookies via environment or file
        result = subprocess.run(
            ['docker', 'exec', 'ibeam_ibeam_1', 'find', '/', '-name', 'Cookies', '-type', 'f', '2>/dev/null'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        cookie_files = [line.strip() for line in result.stdout.split('\n') if line.strip()]
        
        for cookie_file in cookie_files[:5]:  # Limit to first 5 results
            try:
                # Copy cookie file out of container
                result = subprocess.run(
                    ['docker', 'cp', f'ibeam_ibeam_1:{cookie_file}', '/tmp/ibeam_cookies.db'],
                    capture_output=True,
                    timeout=10
                )
                
                if result.returncode == 0 and os.path.exists('/tmp/ibeam_cookies.db'):
                    # Parse SQLite cookie database
                    conn = sqlite3.connect('/tmp/ibeam_cookies.db')
                    cursor = conn.cursor()
                    
                    try:
                        cursor.execute("""
                            SELECT name, value FROM cookies
                            WHERE host_key LIKE '%127.0.0.1%' 
                               OR host_key LIKE '%localhost%'
                               OR host_key LIKE '%5000%'
                        """)
                        
                        for name, value in cursor.fetchall():
                            cookies[name] = value
                    except sqlite3.OperationalError:
                        # Table might not exist or different schema
                        pass
                    finally:
                        conn.close()
                        os.unlink('/tmp/ibeam_cookies.db')
                
                if cookies:
                    break  # Found cookies, stop searching
                    
            except Exception as e:
                print(f"Warning: Could not extract from {cookie_file}: {e}")
                continue
                
    except Exception as e:
        print(f"Warning: Could not get cookies from Docker: {e}")
    
    return cookies

def get_ibeam_status() -> Optional[Dict]:
    """Get IBeam status from health endpoint"""
    try:
        resp = requests.get('http://127.0.0.1:5001/status', timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Warning: Could not get IBeam status: {e}")
    return None

def extract_session_id_from_logs() -> Optional[str]:
    """Extract session ID from IBeam Docker logs"""
    try:
        result = subprocess.run(
            ['docker', 'logs', '--tail', '100', 'ibeam_ibeam_1'],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        for line in result.stdout.split('\n'):
            if 'session id:' in line.lower():
                match = re.search(r'session id:\s*([a-f0-9]{32})', line, re.IGNORECASE)
                if match:
                    return match.group(1)
    except Exception as e:
        print(f"Warning: Could not extract session ID from logs: {e}")
    return None

@app.route('/session-cookies', methods=['GET'])
def session_cookies():
    """
    Return REAL Gateway cookies from Selenium browser session.
    
    This endpoint tries multiple methods to extract actual cookies:
    1. Extract from Chrome cookie database in IBeam container
    2. Fallback to session ID if cookies not found
    """
    global _cookie_cache, _cache_time
    
    # Use cache if fresh
    current_time = time.time()
    if _cookie_cache and (current_time - _cache_time) < CACHE_TTL:
        return jsonify(_cookie_cache)
    
    cookies = {}
    cookie_header = ""
    
    # Method 1: Try to get cookies from Docker container's Chrome profile
    print("Attempting to extract cookies from IBeam container...")
    cookies = get_cookies_from_docker_exec()
    
    if not cookies:
        print("No cookies found via Docker exec, trying alternative methods...")
        
        # Method 2: If running inside IBeam container, check local profile
        profile_path = find_chrome_profile_directory()
        if profile_path:
            print(f"Found Chrome profile at: {profile_path}")
            cookies = extract_cookies_from_chrome_db(profile_path)
    
    # Method 3: Fallback to session ID from logs (less reliable)
    if not cookies:
        print("No cookies found, falling back to session ID from logs...")
        session_id = extract_session_id_from_logs()
        if session_id:
            # This is the fallback - less reliable but better than nothing
            cookies['JSESSIONID'] = session_id
            print(f"Using session ID fallback: {session_id}")
    
    # Construct cookie header
    if cookies:
        cookie_header = '; '.join([f'{k}={v}' for k, v in cookies.items()])
    
    # Check authentication status
    status = get_ibeam_status()
    authenticated = bool(cookies)  # If we have cookies, assume authenticated
    
    if status and isinstance(status, dict):
        authenticated = status.get('authenticated', authenticated)
    
    response = {
        'ok': authenticated,
        'cookies': cookies,
        'cookie_header': cookie_header,
        'cookie_count': len(cookies),
        'timestamp': datetime.utcnow().isoformat(),
    }
    
    # Cache response
    _cookie_cache = response
    _cache_time = current_time
    
    return jsonify(response)

@app.route('/test-gateway', methods=['GET'])
def test_gateway():
    """
    Test endpoint: Try to call Gateway with current cookies.
    Returns Gateway response to verify cookies work.
    """
    # Get cookies
    cookies_resp = session_cookies()
    cookies_data = cookies_resp.get_json()
    
    if not cookies_data.get('ok'):
        return jsonify({
            'ok': False,
            'error': 'No valid cookies available',
            'cookies_data': cookies_data
        }), 500
    
    cookie_header = cookies_data.get('cookie_header', '')
    
    # Test Gateway endpoint
    try:
        resp = requests.get(
            'https://127.0.0.1:5000/v1/api/portfolio/accounts',
            headers={'Cookie': cookie_header},
            verify=False,  # Self-signed cert
            timeout=10
        )
        
        return jsonify({
            'ok': resp.status_code == 200,
            'gateway_status': resp.status_code,
            'gateway_response': resp.text[:500],  # First 500 chars
            'cookies_used': cookies_data.get('cookies'),
        })
    except Exception as e:
        return jsonify({
            'ok': False,
            'error': str(e),
            'cookies_data': cookies_data
        }), 500

@app.route('/session-info', methods=['GET'])
def session_info():
    """Return session information for Bridge"""
    cookies_resp = session_cookies()
    cookies_data = cookies_resp.get_json()
    
    return jsonify({
        'authenticated': cookies_data.get('ok', False),
        'cookie_count': cookies_data.get('cookie_count', 0),
        'timestamp': cookies_data.get('timestamp'),
    })

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'ok': True,
        'service': 'ibeam-session-api-v2',
        'timestamp': datetime.utcnow().isoformat(),
    })

if __name__ == '__main__':
    print("Starting IBeam Session API v2 on port 5002")
    print("This version extracts REAL cookies from Selenium browser session")
    print("Endpoints:")
    print("  GET /health - Health check")
    print("  GET /session-info - Session information")
    print("  GET /session-cookies - Real cookies from Selenium")
    print("  GET /test-gateway - Test cookies against Gateway")
    app.run(host='0.0.0.0', port=5002, debug=False)

