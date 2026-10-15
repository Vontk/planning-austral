#!/usr/bin/env python3
"""Bundle the proven desktop Planning engine with an Android-specific interface."""
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parent.parent
source = (ROOT / 'index.html').read_text()
script = re.search(r'<script>([\s\S]*?)</script>', source).group(1)
# Android owns networking and the process lifecycle; there is no Python session.
start = script.index('function connectSession() {')
end = script.index("$('date').value = relativeDate();", start)
script = script[:start] + script[end:]
script = script.replace("syncEnd(); load();\n", "syncEnd();\n")
# Event listeners must resolve the mobile render wrapper at event time.
script = script.replace("addEventListener('input', render)", "addEventListener('input', () => render())").replace("addEventListener('change', render)", "addEventListener('change', () => render())")
template = (ROOT / 'mobile/index.html').read_text()
result = template.replace('/* MOBILE_STYLE */', (ROOT / 'mobile/style.css').read_text()).replace('/* PLANNING_SCRIPT */', script).replace('/* MOBILE_SCRIPT */', (ROOT / 'mobile/app.js').read_text())
output = ROOT / 'android/app/src/main/assets/index.html'
output.write_text(result)
(output.parent / 'logo.svg').write_bytes((ROOT / 'logo.svg').read_bytes())
print(f'Bundled {output.relative_to(ROOT)} ({len(result.encode()):,} bytes)')
