"""Scan publishable files for accidentally copied local server secrets.

Prints paths only, never values. Run from repository root with backend/.venv/bin/python.
"""
import subprocess
from pathlib import Path
from dotenv import dotenv_values

root = Path(__file__).resolve().parents[1]
env = dotenv_values(root / 'backend/.env')
names = ['GROQ_API_KEY', 'YOUTUBE_API_KEY', 'WORKOUTX_API_KEY', 'PAYPAL_CLIENT_SECRET', 'SUPABASE_SERVICE_ROLE_KEY']
secrets = [env.get(name, '').encode() for name in names if len(env.get(name, '') or '') >= 16]
paths = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=root).split(b'\0')
bad = []
for raw in set(paths):
    if not raw:
        continue
    path = root / raw.decode()
    if not path.is_file():
        continue
    data = path.read_bytes()
    if any(secret in data for secret in secrets):
        bad.append(str(path.relative_to(root)))
if bad:
    print('STOP: local server secret found in publishable paths:', ', '.join(bad))
    raise SystemExit(1)
print('PASS: no configured local server secrets found in publishable files. Review any other credentials separately.')
