#!/usr/bin/env python3
"""Abre Planning en el navegador predeterminado y termina al cerrar la página."""
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlsplit, parse_qs
from urllib.request import urlopen, Request, HTTPRedirectHandler, build_opener
from pathlib import Path
import argparse
import secrets
import threading
import time
import webbrowser
import os
import socket

BASE = 'https://planning-campus.austral.edu.ar:44443/'
HTML = Path(__file__).with_name('index.html')


class PublicPlanningOnly(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        target = urlsplit(new_url)
        if target.netloc != urlsplit(BASE).netloc or target.scheme != 'https' or target.path not in ('/', '/day.php', '/report.php'):
            raise ValueError('Redirección fuera del calendario público')
        return super().redirect_request(request, fp, code, message, headers, new_url)


class PlanningServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, inherited_socket=None):
        super().__init__(address, Handler, bind_and_activate=inherited_socket is None)
        if inherited_socket is not None:
            self.socket.close()
            self.socket = inherited_socket
            self.server_address = inherited_socket.getsockname()
            self.server_name = '127.0.0.1'
            self.server_port = self.server_address[1]
        self.token = secrets.token_urlsafe(32)
        self.lock = threading.Lock()
        self.connections = 0
        self.connected_once = False
        self.last_change = time.monotonic()
        self.stopping = threading.Event()

    def connection_change(self, amount):
        with self.lock:
            self.connections += amount
            self.connected_once |= amount > 0
            self.last_change = time.monotonic()

    def watch_browser(self):
        while not self.stopping.wait(1):
            with self.lock:
                idle = time.monotonic() - self.last_change
                should_stop = self.connections == 0 and idle > (6 if self.connected_once else 90)
            if should_stop:
                print('Página cerrada. Planning finalizado.', flush=True)
                self.stopping.set()
                self.shutdown()
                return


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # No registrar URLs de sesión ni parámetros de consultas.
        pass

    def do_GET(self):
        url = urlsplit(self.path)
        if self.headers.get('Host') != f'127.0.0.1:{self.server.server_port}':
            self.reply(403, b'Host no permitido', 'text/plain')
            return
        if url.path in ('/', '/index.html'):
            body = HTML.read_text(encoding='utf-8').replace('__PLANNING_SESSION__', self.server.token)
            self.reply(200, body.encode(), 'text/html; charset=utf-8')
            return
        if url.path == '/logo.svg':
            self.reply(200, HTML.with_name('logo.svg').read_bytes(), 'image/svg+xml')
            return
        if url.path == '/api/session':
            token = parse_qs(url.query).get('token', [''])[0]
        else:
            token = self.headers.get('X-Planning-Session', '')
        if not token.isascii() or not secrets.compare_digest(token, self.server.token):
            self.reply(403, b'Sesion no permitida', 'text/plain')
            return
        if url.path == '/api/session':
            self.keep_session()
        elif url.path == '/api/planning':
            path = parse_qs(url.query).get('path', [''])[0]
            parsed = urlsplit(path)
            if parsed.scheme or parsed.netloc or parsed.fragment or parsed.path not in ('day.php', 'report.php'):
                self.reply(400, b'Ruta no permitida', 'text/plain')
                return
            try:
                opener = build_opener(PublicPlanningOnly())
                request = Request(BASE + path, headers={'User-Agent': 'AustralPlanningReader/1.0'})
                with opener.open(request, timeout=35) as response:
                    body = response.read(10_000_001)
                    if len(body) > 10_000_000:
                        raise ValueError('Respuesta demasiado grande')
                    self.reply(200, body, response.headers.get('Content-Type', 'text/plain; charset=utf-8'))
            except Exception:
                self.reply(502, b'No se pudo leer Planning. Intenta nuevamente.', 'text/plain')
        else:
            self.reply(404, b'No encontrado', 'text/plain')

    def keep_session(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.connection.settimeout(5)
        self.server.connection_change(1)
        try:
            while not self.server.stopping.is_set():
                self.wfile.write(b': pagina abierta\n\n')
                self.wfile.flush()
                if self.server.stopping.wait(1):
                    break
        except (BrokenPipeError, ConnectionResetError, TimeoutError, OSError):
            pass
        finally:
            self.server.connection_change(-1)
            self.close_connection = True

    def reply(self, code, body, kind):
        self.send_response(code)
        self.send_header('Content-Type', kind)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass  # El navegador canceló una carga anterior.


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=0, help='Puerto opcional (predeterminado: uno libre)')
    parser.add_argument('--socket-activation', action='store_true', help='Inicio desde el favorito instalado con systemd')
    parser.add_argument('--no-browser', action='store_true', help='No abrir otra pestaña')
    args = parser.parse_args()
    inherited = None
    if args.socket_activation:
        if os.environ.get('LISTEN_PID') != str(os.getpid()) or os.environ.get('LISTEN_FDS') != '1':
            parser.error('No se recibió el socket de systemd. Usá python3 server.py para abrir manualmente.')
        inherited = socket.socket(fileno=3)
        if inherited.getsockname()[0] != '127.0.0.1':
            parser.error('El socket debe escuchar solamente en 127.0.0.1.')
    try:
        server = PlanningServer(('127.0.0.1', args.port), inherited)
    except OSError as error:
        parser.exit(1, f'No se pudo iniciar el servidor: {error}\n')
    url = f'http://127.0.0.1:{server.server_port}/'
    print(f'Abriendo {url}', flush=True)
    print('Cerrá la pestaña para terminar. También podés usar Ctrl+C.', flush=True)
    threading.Thread(target=server.watch_browser, daemon=True).start()
    if not args.no_browser and not args.socket_activation:
        threading.Thread(target=webbrowser.open, args=(url,), daemon=True).start()
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        print('\nPlanning finalizado.', flush=True)
    finally:
        server.stopping.set()
        server.server_close()


if __name__ == '__main__':
    main()
