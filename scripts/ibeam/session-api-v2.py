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
import shutil
import tempfile
from datetime import datetime
from typing import Optional, Dict, List
from pathlib import Path

app = Flask(__name__)

# Cache session info to avoid hammering IBeam
_cookie_cache: Optional[Dict] = None
_cache_time = 0
CACHE_TTL = 30  # Cache for 30 seconds

def debug_log(message: str):
    """Debug logging (print to stderr so it appears in logs)"""
    print(f"[DEBUG] {message}", file=__import__('sys').stderr, flush=True)

def find_chrome_cookie_database() -> Optional[Path]:
    """
    Find Chrome cookie database in IBeam container.
    Returns path to Cookies SQLite file.
    """
    debug_log("Searching for Chrome cookie database...")
    
    # Try to find via docker exec
    try:
        result = subprocess.run(
            ['docker', 'exec', 'ibeam_ibeam_1', 'find', '/', '-name', 'Cookies', '-type', 'f', '2>/dev/null'],
            capture_output=True,
            text=True,
            timeout=15
        )
        
        cookie_files = [line.strip() for line in result.stdout.split('\n') if line.strip()]
        debug_log(f"Found {len(cookie_files)} potential cookie files in container")
        
        for cookie_file in cookie_files:
            debug_log(f"  Checking: {cookie_file}")
            
            # Verify it's actually a SQLite database
            try:
                result = subprocess.run(
                    ['docker', 'exec', 'ibeam_ibeam_1', 'file', cookie_file],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if 'SQLite' in result.stdout or cookie_file.endswith('Cookies'):
                    debug_log(f"  ✓ Found SQLite cookie database: {cookie_file}")
                    return Path(cookie_file)
            except:
                continue
                
    except Exception as e:
        debug_log(f"Error searching container: {e}")
    
    return None

def extract_all_cookies_from_chrome_db(cookie_db_path: str) -> Dict[str, str]:
    """
    Extract ALL cookies from Chrome cookie database.
    Returns dict of {cookie_name: cookie_value}
    """
    cookies = {}
    temp_db = None
    
    try:
        debug_log(f"Extracting cookies from: {cookie_db_path}")
        
        # Copy database out of container to avoid locking
        temp_db = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        temp_path = temp_db.name
        temp_db.close()
        
        result = subprocess.run(
            ['docker', 'cp', f'ibeam_ibeam_1:{cookie_db_path}', temp_path],
            capture_output=True,
            timeout=15
        )
        
        if result.returncode != 0:
            debug_log(f"Failed to copy cookie database: {result.stderr}")
            return cookies
        
        debug_log(f"Copied cookie DB to temp file: {temp_path}")
        
        # Connect to SQLite database
        conn = sqlite3.connect(temp_path)
        cursor = conn.cursor()
        
        try:
            # Get all cookies (Chrome stores cookies in 'cookies' table)
            # Schema: name, value, host_key, path, expires_utc, is_secure, is_httponly, ...
            cursor.execute("SELECT name, value, host_key, expires_utc FROM cookies")
            
            rows = cursor.fetchall()
            debug_log(f"Found {len(rows)} total cookies in database")
            
            current_time_us = int(time.time() * 1000000)  # Chrome uses microseconds
            
            for name, value, host_key, expires_utc in rows:
                # Filter expired cookies
                if expires_utc and expires_utc > 0 and expires_utc < current_time_us:
                    continue
                
                # Accept cookies for Gateway (127.0.0.1, localhost, or port 5000)
                # Also accept all cookies initially, we'll filter if needed
                if any(kw in str(host_key).lower() for kw in ['127.0.0.1', 'localhost', '5000', '.ibkr', 'interactivebrokers']):
                    cookies[name] = value
                    debug_log(f"  ✓ Cookie: {name} = {value[:20]}... (host: {host_key})")
            
            # If we didn't find Gateway-specific cookies, try all non-expired cookies
            # Sometimes Gateway uses cookies without obvious domain hints
            if len(cookies) < 2:
                debug_log("Few Gateway-specific cookies found, checking all cookies...")
                cursor.execute("SELECT name, value, host_key, expires_utc FROM cookies WHERE expires_utc = 0 OR expires_utc > ?", (current_time_us,))
                for name, value, host_key, expires_utc in cursor.fetchall():
                    if name not in cookies:  # Don't overwrite
                        cookies[name] = value
                        debug_log(f"  + Cookie: {name} = {value[:20]}... (host: {host_key})")
            
        except sqlite3.OperationalError as e:
            debug_log(f"SQLite error: {e}")
            # Try alternative table/column names
            try:
                cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='cookies'")
                debug_log(f"Table schema: {cursor.fetchone()}")
            except:
                pass
        finally:
            conn.close()
            
    except Exception as e:
        debug_log(f"Error extracting cookies: {e}")
        import traceback
        debug_log(traceback.format_exc())
    finally:
        if temp_db and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except:
                pass
    
    debug_log(f"Extracted {len(cookies)} cookies total")
    return cookies

def get_ibeam_status() -> Optional[Dict]:
    """Get IBeam status from health endpoint"""
    try:
        resp = requests.get('http://127.0.0.1:5001/status', timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        debug_log(f"Could not get IBeam status: {e}")
    return None

def extract_session_id_from_logs() -> Optional[str]:
    """Extract session ID from IBeam Docker logs (fallback only)"""
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
        debug_log(f"Could not extract session ID from logs: {e}")
    return None

@app.route('/session-cookies', methods=['GET'])
def session_cookies():
    """
    Return REAL Gateway cookies from Selenium browser session.
    
    This endpoint extracts actual cookies from Chrome's cookie database.
    """
    global _cookie_cache, _cache_time
    
    # Use cache if fresh
    current_time = time.time()
    if _cookie_cache and (current_time - _cache_time) < CACHE_TTL:
        debug_log("Returning cached cookies")
        return jsonify(_cookie_cache)
    
    debug_log("=== Starting cookie extraction ===")
    cookies = {}
    
    # Method 1: Extract from Chrome cookie database
    cookie_db_path = find_chrome_cookie_database()
    if cookie_db_path:
        debug_log(f"Found cookie database: {cookie_db_path}")
        cookies = extract_all_cookies_from_chrome_db(str(cookie_db_path))
    else:
        debug_log("No cookie database found, trying fallback...")
    
    # Method 2: Fallback to session ID from logs (less reliable)
    if not cookies:
        debug_log("No cookies from database, using session ID fallback...")
        session_id = extract_session_id_from_logs()
        if session_id:
            cookies['JSESSIONID'] = session_id
            debug_log(f"Using session ID fallback: {session_id}")
    
    # Construct cookie header
    cookie_header = ""
    if cookies:
        cookie_header = '; '.join([f'{k}={v}' for k, v in cookies.items()])
        debug_log(f"Constructed cookie header with {len(cookies)} cookies")
    else:
        debug_log("WARNING: No cookies extracted!")
    
    # Check authentication status
    status = get_ibeam_status()
    authenticated = bool(cookies) and len(cookies) > 0
    
    if status and isinstance(status, dict):
        authenticated = status.get('authenticated', authenticated)
    
    response = {
        'ok': authenticated,
        'cookies': cookies,
        'cookie_header': cookie_header,
        'cookie_count': len(cookies),
        'cookie_db_found': cookie_db_path is not None,
        'timestamp': datetime.utcnow().isoformat(),
    }
    
    # Cache response
    _cookie_cache = response
    _cache_time = current_time
    
    debug_log(f"=== Cookie extraction complete: {len(cookies)} cookies ===")
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
    
    if not cookies_data.get('ok') or not cookies_data.get('cookie_header'):
        return jsonify({
            'ok': False,
            'error': 'No valid cookies available',
            'cookies_data': cookies_data
        }), 500
    
    cookie_header = cookies_data.get('cookie_header', '')
    debug_log(f"Testing Gateway with cookie header: {cookie_header[:50]}...")
    
    # Test Gateway endpoint
    try:
        resp = requests.get(
            'https://127.0.0.1:5000/v1/api/portfolio/accounts',
            headers={'Cookie': cookie_header},
            verify=False,  # Self-signed cert
            timeout=10
        )
        
        debug_log(f"Gateway response: status={resp.status_code}, body={resp.text[:100]}")
        
        return jsonify({
            'ok': resp.status_code == 200,
            'gateway_status': resp.status_code,
            'gateway_response': resp.text[:500],  # First 500 chars
            'cookies_used': cookies_data.get('cookies'),
            'cookie_count': cookies_data.get('cookie_count'),
            'cookie_db_found': cookies_data.get('cookie_db_found'),
        })
    except Exception as e:
        debug_log(f"Gateway test error: {e}")
        return jsonify({
            'ok': False,
            'error': str(e),
            'cookies_data': cookies_data
        }), 500

@app.route('/debug', methods=['GET'])
def debug():
    """Debug endpoint: Show what we're finding"""
    cookie_db = find_chrome_cookie_database()
    
    return jsonify({
        'cookie_db_found': cookie_db is not None,
        'cookie_db_path': str(cookie_db) if cookie_db else None,
        'cache_active': _cookie_cache is not None,
        'cache_time': datetime.fromtimestamp(_cache_time).isoformat() if _cache_time else None,
    })

@app.route('/session-info', methods=['GET'])
def session_info():
    """Return session information for Bridge"""
    cookies_resp = session_cookies()
    cookies_data = cookies_resp.get_json()
    
    return jsonify({
        'authenticated': cookies_data.get('ok', False),
        'cookie_count': cookies_data.get('cookie_count', 0),
        'cookie_db_found': cookies_data.get('cookie_db_found', False),
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
    print("  GET /debug - Debug information")
    print("  GET /session-info - Session information")
    print("  GET /session-cookies - Real cookies from Selenium")
    print("  GET /test-gateway - Test cookies against Gateway")
    app.run(host='0.0.0.0', port=5002, debug=False)
