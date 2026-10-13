import importlib.util
from pathlib import Path
import re
import socket
import subprocess
import sys
import threading
import time
import unittest
from unittest.mock import patch, MagicMock
import errno
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('planning_server', ROOT / 'server.py')
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)


class LocalServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.http = server.PlanningServer(('127.0.0.1', 0))
        cls.thread = threading.Thread(target=cls.http.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.http.server_port}/'

    @classmethod
    def tearDownClass(cls):
        cls.http.stopping.set()
        cls.http.shutdown()
        cls.http.server_close()
        cls.thread.join(timeout=5)

    def test_page_and_logo(self):
        with urlopen(self.base) as r:
            html = r.read().decode()
        self.assertIn(self.http.token, html)
        self.assertNotIn('__PLANNING_SESSION__', html)
        with urlopen(self.base + 'logo.svg') as r:
            self.assertEqual(r.headers['Content-Type'], 'image/svg+xml')
            self.assertIn(b'<circle', r.read())

    def test_health_identifies_local_app_without_session(self):
        with urlopen(self.base + 'api/health') as response:
            self.assertEqual(response.read(), b'{"app":"campus-lookup"}')

    def test_unauthorized_session(self):
        with self.assertRaises(HTTPError) as result:
            urlopen(self.base + 'api/planning?path=day.php')
        self.assertEqual(result.exception.code, 403)

    def test_only_public_read_endpoints(self):
        for target in ['admin.php', 'edit_entry.php', 'https://example.com/day.php', '//example.com/day.php', '../day.php']:
            from urllib.parse import quote
            req = Request(self.base + 'api/planning?path=' + quote(target), headers={'X-Planning-Session': self.http.token})
            with self.assertRaises(HTTPError) as result:
                urlopen(req)
            self.assertEqual(result.exception.code, 400)

    def test_host_validation(self):
        with self.assertRaises(HTTPError) as result:
            urlopen(Request(self.base, headers={'Host': 'example.com'}))
        self.assertEqual(result.exception.code, 403)

    def test_redirect_validation(self):
        handler = server.PublicPlanningOnly()
        req = Request(server.BASE + 'day.php')
        for target in ['https://example.com/day.php', server.BASE + 'admin.php', 'http://planning-campus.austral.edu.ar:44443/day.php']:
            with self.assertRaises(ValueError):
                handler.redirect_request(req, None, 302, 'Found', {}, target)

    def test_inherited_socket(self):
        sock = socket.socket()
        sock.bind(('127.0.0.1', 0))
        sock.listen()
        app = server.PlanningServer(('127.0.0.1', 0), inherited_socket=sock)
        self.assertEqual(app.server_port, sock.getsockname()[1])
        app.server_close()


class LauncherTests(unittest.TestCase):
    def test_manual_launch_reuses_stable_bookmark_server(self):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = b'{"app":"campus-lookup"}'
        with patch.object(sys, 'argv', ['server.py']), patch.object(server, 'PlanningServer', side_effect=OSError(errno.EADDRINUSE, 'busy')), patch.object(server, 'urlopen', return_value=response) as read, patch.object(server.webbrowser, 'open') as open_browser:
            server.main()
            read.assert_called_once_with('http://127.0.0.1:18787/api/health', timeout=10)
            open_browser.assert_called_once_with('http://127.0.0.1:18787/')


class LifecycleTests(unittest.TestCase):
    def test_reload_multiple_tabs_and_shutdown(self):
        p = subprocess.Popen([sys.executable, '-u', str(ROOT / 'server.py'), '--no-browser', '--port', '0'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            line = p.stdout.readline().strip()
            self.assertTrue(line.startswith('Abriendo '), line)
            base = line.removeprefix('Abriendo ')
            with urlopen(base) as response:
                token = re.search(r"const SESSION = '([^']+)'", response.read().decode()).group(1)
            first = urlopen(base + 'api/session?token=' + token, timeout=5)
            first.readline(); first.close()
            time.sleep(2)
            self.assertIsNone(p.poll(), 'Recargar no debe cerrar Python')
            first = urlopen(base + 'api/session?token=' + token, timeout=5); first.readline()
            second = urlopen(base + 'api/session?token=' + token, timeout=5); second.readline()
            first.close(); time.sleep(8)
            self.assertIsNone(p.poll(), 'Una segunda pestaña mantiene el servidor')
            second.close(); p.wait(timeout=15)
            self.assertEqual(p.returncode, 0)
        finally:
            if p.poll() is None:
                p.terminate(); p.wait(timeout=5)
            p.stdout.close(); p.stderr.close()


if __name__ == '__main__':
    unittest.main()
