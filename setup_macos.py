#!/usr/bin/env python3
"""Instala el inicio por URL con launchd. macOS; todavía no testeado."""
import argparse
import os
from pathlib import Path
import plistlib
import subprocess
import sys
import webbrowser

LABEL = 'local.campus-lookup'
ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--uninstall', action='store_true')
    args = parser.parse_args()
    if sys.platform != 'darwin':
        parser.exit(1, 'Este setup requiere macOS.\n')
    target = Path.home() / 'Library/LaunchAgents' / f'{LABEL}.plist'
    if target.exists():
        previous = plistlib.loads(target.read_bytes())
        if previous.get('CampusLookupManaged') is not True:
            parser.exit(1, f'Ya existe una configuración ajena: {target}\n')
    domain = f'gui/{os.getuid()}'
    subprocess.run(['launchctl', 'bootout', f'{domain}/{LABEL}'], capture_output=True)
    if args.uninstall:
        target.unlink(missing_ok=True)
        print('Inicio automático desinstalado.')
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    config = {
        'Label': LABEL,
        'CampusLookupManaged': True,
        'ProgramArguments': [sys.executable, str(ROOT / 'server.py'), '--launchd-activation', '--no-browser'],
        'WorkingDirectory': str(ROOT),
        'ThrottleInterval': 1,
        'Sockets': {'Listener': {'SockNodeName': '127.0.0.1', 'SockServiceName': '18787', 'SockType': 'stream', 'SockFamily': 'IPv4', 'SockPassive': True}},
    }
    target.write_bytes(plistlib.dumps(config))
    subprocess.run(['launchctl', 'bootstrap', domain, str(target)], check=True)
    url = 'http://campus-lookup.localhost:18787/'
    print(f'Listo. Guardá en favoritos: {url}')
    webbrowser.open(url)


if __name__ == '__main__':
    main()
