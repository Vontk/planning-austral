#!/usr/bin/env python3
"""Instala campus lookup y abre la app (Linux con systemd, sin sudo)."""
import subprocess
import sys
from pathlib import Path
import webbrowser

if __name__ == '__main__':
    root = Path(__file__).resolve().parent
    subprocess.run([sys.executable, str(root / 'install_bookmark.py')], check=True)
    webbrowser.open('http://campus-lookup.localhost:18787/')
