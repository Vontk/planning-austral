#!/usr/bin/env python3
"""Instala el enlace campus-lookup://open para Windows. Todavía no testeado."""
import argparse
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
KEY = r'Software\Classes\campus-lookup'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--uninstall', action='store_true')
    args = parser.parse_args()
    if sys.platform != 'win32':
        parser.exit(1, 'Este setup requiere Windows.\n')
    import winreg
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, KEY) as key:
            managed = winreg.QueryValueEx(key, 'CampusLookupManaged')[0]
            if managed != '1':
                parser.exit(1, 'El protocolo campus-lookup ya pertenece a otra aplicación.\n')
    except FileNotFoundError:
        # Distinguish a missing marker from an absent protocol.
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, KEY):
                parser.exit(1, 'El protocolo campus-lookup ya pertenece a otra aplicación.\n')
        except FileNotFoundError:
            pass
    shortcut = Path(os.environ.get('LOCALAPPDATA', str(Path.home()))) / 'campus-lookup.url'
    if args.uninstall:
        for suffix in [r'\shell\open\command', r'\shell\open', r'\shell', '']:
            try:
                winreg.DeleteKey(winreg.HKEY_CURRENT_USER, KEY + suffix)
            except FileNotFoundError:
                pass
        shortcut.unlink(missing_ok=True)
        print('Enlace automático desinstalado.')
        return
    executable = Path(sys.executable)
    windowless = executable.with_name('pythonw.exe')
    if windowless.exists():
        executable = windowless
    command = f'"{executable}" "{ROOT / "server.py"}"'
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, KEY) as key:
        winreg.SetValueEx(key, '', 0, winreg.REG_SZ, 'URL:campus lookup')
        winreg.SetValueEx(key, 'URL Protocol', 0, winreg.REG_SZ, '')
        winreg.SetValueEx(key, 'CampusLookupManaged', 0, winreg.REG_SZ, '1')
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, KEY + r'\shell\open\command') as key:
        winreg.SetValueEx(key, '', 0, winreg.REG_SZ, command)
    shortcut.write_text('[InternetShortcut]\nURL=campus-lookup://open\n', encoding='utf-8')
    print('Listo. Enlace para abrir la app: campus-lookup://open')
    print(f'Acceso directo: {shortcut}')
    print('El navegador puede pedir permiso para abrir la aplicación local.')
    os.startfile(str(shortcut))


if __name__ == '__main__':
    main()
