#!/usr/bin/env python3
"""Configura el inicio desde favoritos en Linux con systemd de usuario."""
import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys

NAME = 'campus-lookup'
ROOT = Path(__file__).resolve().parent


def unit_quote(value):
    # systemd interpreta % como especificador incluso dentro de comillas.
    return '"' + str(value).replace('\\', '\\\\').replace('"', '\\"').replace('%', '%%') + '"'


def run(*args, check=True):
    return subprocess.run(['systemctl', '--user', *args], check=check)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=18787)
    parser.add_argument('--uninstall', action='store_true')
    args = parser.parse_args()
    if sys.platform != 'linux' or not shutil.which('systemctl'):
        parser.exit(1, 'Este setup requiere Linux con systemd. Podés usar python3 server.py en otros sistemas.\n')
    if not 1024 <= args.port <= 65535:
        parser.error('Elegí un puerto entre 1024 y 65535.')
    config = Path(os.environ.get('XDG_CONFIG_HOME', str(Path.home() / '.config'))) / 'systemd' / 'user'
    service, sock = config / f'{NAME}.service', config / f'{NAME}.socket'
    for path in (service, sock):
        if path.exists() and '# Managed by campus-lookup' not in path.read_text():
            parser.exit(1, f'Ya existe una configuración ajena: {path}. No se modificó.\n')
    if args.uninstall:
        run('disable', '--now', f'{NAME}.socket', check=False)
        run('stop', f'{NAME}.service', check=False)
        service.unlink(missing_ok=True); sock.unlink(missing_ok=True)
        run('daemon-reload')
        print('Inicio desde favoritos desinstalado. Podés seguir usando server.py.')
        return
    # Verificar acceso al gestor de usuario antes de escribir la configuración.
    result = subprocess.run(['systemctl', '--user', 'show', '--property=Version'], capture_output=True)
    if result.returncode:
        parser.exit(1, 'No se puede conectar a systemd de usuario. Ejecutá esto desde tu sesión normal, sin sudo.\n')
    config.mkdir(parents=True, exist_ok=True)
    if sock.exists():
        run('disable', '--now', f'{NAME}.socket')
        run('stop', f'{NAME}.service', check=False)
    service.write_text(f'''# Managed by campus-lookup
[Unit]
Description=Campus lookup local app
Requires={NAME}.socket
After={NAME}.socket

[Service]
Type=simple
ExecStart={unit_quote(sys.executable)} {unit_quote(ROOT / 'server.py')} --socket-activation --no-browser
Restart=no
TimeoutStopSec=5
''')
    sock.write_text(f'''# Managed by campus-lookup
[Unit]
Description=Open campus lookup from a browser bookmark

[Socket]
ListenStream=127.0.0.1:{args.port}
Accept=no

[Install]
WantedBy=sockets.target
''')
    run('daemon-reload')
    try:
        run('enable', '--now', f'{NAME}.socket')
        run('is-active', '--quiet', f'{NAME}.socket')
    except subprocess.CalledProcessError:
        parser.exit(1, f'No se pudo activar el favorito; quizás el puerto {args.port} está ocupado. Probá --port con otro número.\n')
    print(f'Listo. Guardá este enlace en la barra de favoritos: http://campus-lookup.localhost:{args.port}/')
    print('Al abrirlo inicia Python en esa misma pestaña. Al cerrar la última pestaña, Python termina.')
    print('Si movés esta carpeta, volvé a ejecutar este setup.')


if __name__ == '__main__':
    main()
