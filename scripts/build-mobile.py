#!/usr/bin/env python3
"""Bundle the proven desktop Planning engine with an Android-specific interface."""
from pathlib import Path
import re
import subprocess
ROOT = Path(__file__).resolve().parent.parent
source = (ROOT / 'index.html').read_text()
script = re.search(r'<script>([\s\S]*?)</script>', source).group(1)
# Android owns networking and the process lifecycle; there is no Python session.
start = script.index('function connectSession() {')
end = script.index("$('date').value = relativeDate();", start)
script = script[:start] + script[end:]
script = script.replace("syncEnd(); load();\n", "syncEnd();\n")
# Mobile owns these listeners so each keystroke renders only once.
script = script.replace("for (const id of ['q', 'roomQuery', 'building']) $(id).addEventListener('input', render);", "")
# Event listeners must resolve the mobile render wrapper at event time.
script = script.replace("addEventListener('input', render)", "addEventListener('input', () => render())").replace("addEventListener('change', render)", "addEventListener('change', () => render())")
script = script.replace('const found = data.bookings.filter', 'const found = mergeSubjectBookings(data.bookings.filter')
script = script.replace('.sort((a, b) => a.score - b.score || a.start - b.start);', '.sort((a, b) => a.score - b.score || a.start - b.start), data.rooms);')
script = script.replace('room ? link(room) : null, b.description', 'b.displayRoom ? null : room ? link(room) : null, b.description')
script = script.replace('[b.room, academicLabel(b)]', '[shortBookingRoom(b, data.rooms), academicLabel(b)]')
script = script.replace("$('hours').setAttribute('aria-invalid', String(!range));", "$('hours').error = !range;")
# Official navigation handles focus, keyboard operation and selected state.
start_nav = script.index('for (const tab of tabs) {')
end_nav = script.index("addEventListener('online', load);", start_nav)
script = script[:start_nav] + script[end_nav:]
script = script.replace("$(id).setAttribute('aria-selected', String(mode === id)); $(id).tabIndex = mode === id ? 0 : -1;", "$(id).active = mode === id;")
# Picker choices use official Material actions, preserving the shared matching logic.
script = script.replace("document.createElement('button')", "document.createElement('md-text-button')")
# Bound DOM allocation to the visible page instead of creating every hidden card.
for loop in ['for (const b of found)', 'for (const {room} of found)', 'for (const {room, next} of free)']:
    script = script.replace(loop, loop.replace('of found', 'of pageResults(found)').replace('of free', 'of pageResults(free)'))
script = script.replace("theme === 'dark' ? '#9cdcfe' : '#246b93'", "theme === 'dark' ? '#e3e2e6' : '#46464f'")
# Native Android always follows system appearance; browser previews retain the theme control.
script = script.replace("let savedTheme = 'dark';", "let savedTheme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';")
script = script.replace("setTheme(savedTheme);", "setTheme(window.campusNativeTheme || savedTheme);")
script = script.replace("  try { localStorage.setItem('campus-theme', theme); } catch {}", "  if (!window.campusNativeTheme) try { localStorage.setItem('campus-theme', theme); } catch {}")
template = (ROOT / 'mobile/index.html').read_text()
for icon in ['menu_book', 'meeting_room', 'event_note', 'close', 'settings', 'schedule']:
    svg = (ROOT / 'mobile/icons' / (icon + '.svg')).read_text()
    svg = re.sub(r'fill="[^"]*"', 'fill="currentColor"', svg)
    svg = svg.replace('<svg ', '<svg aria-hidden="true" ', 1)
    template = template.replace('<!-- ICON:' + icon + ' -->', svg)
material = subprocess.run([str(ROOT / 'mobile/node_modules/.bin/esbuild'), str(ROOT / 'mobile/material.js'),
    '--bundle', '--minify', '--format=iife', '--target=chrome89', '--supported:template-literal=false', '--legal-comments=none'], check=True, capture_output=True, text=True).stdout
result = template.replace('/* MATERIAL_SCRIPT */', material).replace('/* MOBILE_STYLE */', (ROOT / 'mobile/style.css').read_text()).replace('/* PLANNING_SCRIPT */', script).replace('/* ROOM_GROUPS_SCRIPT */', (ROOT / 'mobile/rooms.js').read_text()).replace('/* MOBILE_SCRIPT */', (ROOT / 'mobile/app.js').read_text())
output = ROOT / 'android/app/src/main/assets/index.html'
output.write_text(result)
(output.parent / 'logo.svg').write_bytes((ROOT / 'logo.svg').read_bytes())
print(f'Bundled {output.relative_to(ROOT)} ({len(result.encode()):,} bytes)')

# Keep upstream license notices with the redistributed, tree-shaken controls.
notices = []
for package in ['@material/web', '@lit/reactive-element', 'lit-html', 'lit']:
    notices.append(package + '\n' + (ROOT / 'mobile/node_modules' / package / 'LICENSE').read_text())
(output.parent / 'THIRD_PARTY_NOTICES.txt').write_text('\n\n'.join(notices))
