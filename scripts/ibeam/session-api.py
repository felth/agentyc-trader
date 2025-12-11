#!/usr/bin/env python3
"""
IBeam Session API Wrapper
Exposes IBeam's session cookies for Bridge to use

This service runs alongside IBeam and provides an API endpoint
that Bridge can call to get current Gateway session cookies.
"""
from flask import Flask, jsonify
import requests
import subprocess
import time
import re
from datetime import datetime
from typing import Optional, Dict

app = Flask(__name__)

# Cache session info to avoid hammering IBeam
_session_cache: Optional[Dict] = None
_cache_time = 0
CACHE_TTL = 30  # Cache for 30 seconds

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
        
        # Look for session ID pattern in logs
        # Format: "Gateway running and authenticated, session id: e4440b157282330a0b2ab95347139d5f"
        for line in result.stdout.split('\n'):
            if 'session id:' in line.lower():
                # Extract session ID (32-char hex string)
                match = re.search(r'session id:\s*([a-f0-9]{32})', line, re.IGNORECASE)
                if match:
                    return match.group(1)
    except Exception as e:
        print(f"Warning: Could not extract session ID from logs: {e}")
    return None

@app.route('/session-info', methods=['GET'])
def session_info():
    """Return session information for Bridge"""
    global _session_cache, _cache_time
    
    # Use cache if fresh
    current_time = time.time()
    if _session_cache and (current_time - _cache_time) < CACHE_TTL:
        return jsonify(_session_cache)
    
    # Get fresh status
    status = get_ibeam_status()
    session_id = extract_session_id_from_logs()
    
    # Determine authentication status
    authenticated = False
    if status:
        # Try to parse authentication from status
        if isinstance(status, dict):
            authenticated = status.get('authenticated', False)
    
    # If we have a session ID, assume authenticated
    if session_id:
        authenticated = True
    
    # Construct response
    response = {
        'authenticated': authenticated,
        'session_id': session_id,
        'timestamp': datetime.utcnow().isoformat(),
    }
    
    # Cache response
    _session_cache = response
    _cache_time = current_time
    
    return jsonify(response)

@app.route('/session-cookies', methods=['GET'])
def session_cookies():
    """
    Return Gateway cookies for Bridge to use.
    
    IBKR Gateway typically uses session-based authentication.
    We construct the standard session cookie from the session ID.
    """
    # Get session info
    session_info_resp = session_info()
    session_data = session_info_resp.get_json()
    
    cookies = {}
    cookie_header = ""
    
    if session_data and session_data.get('session_id'):
        session_id = session_data['session_id']
        
        # IBKR Gateway uses JSESSIONID cookie for session management
        # Format: JSESSIONID=<session_id>
        cookies['JSESSIONID'] = session_id
        
        # Construct Cookie header string
        cookie_header = '; '.join([f'{k}={v}' for k, v in cookies.items()])
    
    return jsonify({
        'ok': session_data.get('authenticated', False) if session_data else False,
        'cookies': cookies,
        'cookie_header': cookie_header,
        'session_id': session_data.get('session_id') if session_data else None,
        'timestamp': session_data.get('timestamp') if session_data else datetime.utcnow().isoformat(),
    })

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'ok': True,
        'service': 'ibeam-session-api',
        'timestamp': datetime.utcnow().isoformat(),
    })

if __name__ == '__main__':
    print("Starting IBeam Session API on port 5002")
    print("Endpoints:")
    print("  GET /health - Health check")
    print("  GET /session-info - Session information")
    print("  GET /session-cookies - Cookies for Bridge")
    app.run(host='0.0.0.0', port=5002, debug=False)

