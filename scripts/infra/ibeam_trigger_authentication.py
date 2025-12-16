#!/usr/bin/env python3
"""
Manual authentication trigger for IBeam.
Creates a flag file that _maintenance() checks for.
"""
from pathlib import Path
import sys
import os

TRIGGER_FILE = Path('/srv/outputs/trigger_auth.flag')
OUTPUTS_DIR = Path('/srv/outputs')

def create_trigger():
    """Create authentication trigger flag file"""
    try:
        OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
        TRIGGER_FILE.touch()
        print(f"[TRIGGER] Authentication trigger created: {TRIGGER_FILE}")
        return True
    except Exception as e:
        print(f"[TRIGGER] Failed to create trigger: {e}", file=sys.stderr)
        return False

if __name__ == '__main__':
    success = create_trigger()
    sys.exit(0 if success else 1)



