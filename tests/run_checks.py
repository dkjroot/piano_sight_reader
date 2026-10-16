"""Run local checks with concise output; retain complete logs for investigation."""
import argparse
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import time
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'test-results'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', action='store_true', help='Include full browser regressions')
    parser.add_argument('--coverage', action='store_true', help='Measure Node unit-test coverage')
    parser.add_argument('--node', default='node')
    parser.add_argument('--browser-node', help='Node 20+ executable for Playwright')
    parser.add_argument('--channel', default=os.environ.get('BROWSER_CHANNEL', ''), help='E.g. msedge')
    args = parser.parse_args()
    OUTPUT.mkdir(exist_ok=True)
    results = []

    def check(name, command, env=None):
        started = time.monotonic()
        try:
            process = subprocess.run(command, cwd=ROOT, env=env, capture_output=True,
                                     text=True, encoding='utf-8', errors='replace', timeout=120)
            output = process.stdout + process.stderr
            code = process.returncode
        except (OSError, subprocess.TimeoutExpired) as error:
            output, code = str(error), 1
        log = OUTPUT / (name + '.log')
        log.write_text(output, encoding='utf-8')
        count = re.search(r'# tests (\d+)|Ran (\d+) test', output)
        result = {'check': name, 'status': 'PASS' if code == 0 else 'FAIL',
                  'seconds': round(time.monotonic()-started, 2), 'log': str(log)}
        if count:
            result['tests'] = int(next(value for value in count.groups() if value))
        if args.coverage and name == 'javascript':
            coverage = [line.strip() for line in output.splitlines() if 'all files' in line]
            if coverage:
                result['coverage_summary'] = coverage[-1]
            modules = []
            for line in output.splitlines():
                fields = [part.strip() for part in line.removeprefix('# ').split('|')]
                if len(fields) >= 4 and fields[0].replace('\\', '/').startswith('static/'):
                    modules.append({'file': fields[0], 'line_percent': float(fields[1]),
                                    'branch_percent': float(fields[2]), 'function_percent': float(fields[3])})
            result['unit_coverage_modules'] = modules
        results.append(result)
        print(f"{result['status']} {name}" + (f" ({result['tests']} tests)" if count else '')
              + f" [{result['seconds']:.2f}s]", flush=True)
        if code:
            print('\n'.join(output.splitlines()[-12:]))
            print('Full log: ' + str(log))

    node_command = [args.node]
    if args.coverage:
        node_command.append('--experimental-test-coverage')
    check('javascript', node_command + ['--test', 'tests/core.test.js'])
    check('python', [sys.executable, '-m', 'unittest', 'discover', '-s', 'tests'])
    check('diff', ['git', 'diff', '--check'])

    if args.browser:
        # A separate loopback server keeps tests away from the user's live session.
        server = None
        with (OUTPUT / 'server.log').open('w', encoding='utf-8') as server_log:
            try:
                with socket.socket() as probe:
                    probe.bind(('127.0.0.1', 0))
                    port = probe.getsockname()[1]
                server = subprocess.Popen([sys.executable, 'app.py', '--port', str(port)],
                                          cwd=ROOT, stdout=server_log, stderr=subprocess.STDOUT)
                url = f'http://127.0.0.1:{port}'
                for attempt in range(50):
                    try:
                        with urlopen(url + '/health', timeout=.5) as response:
                            if response.status == 200:
                                break
                    except OSError:
                        time.sleep(.1)
                else:
                    raise RuntimeError('Test server did not start; inspect test-results/server.log')
                env = dict(os.environ, APP_URL=url)
                if args.channel:
                    env['BROWSER_CHANNEL'] = args.channel
                check('browser', [args.browser_node or args.node, 'tests/browser.cjs'], env)
            except (OSError, RuntimeError) as error:
                results.append({'check': 'browser', 'status': 'FAIL', 'error': str(error)})
                print('FAIL browser: ' + str(error))
            finally:
                if server is not None:
                    server.terminate()
                    try:
                        server.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        server.kill()
                        server.wait()
    else:
        results.append({'check': 'browser', 'status': 'SKIPPED', 'reason': 'Use --browser for the full suite'})
        print('SKIPPED browser (use --browser for full suite)')

    report = {'checks': results, 'passed': not any(r['status'] == 'FAIL' for r in results),
              'hardware': 'Not verified by automated checks'}
    (OUTPUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    lines = ['# Test report', ''] + [f"- {r['status']}: {r['check']}" +
            (f" ({r['tests']} tests)" if 'tests' in r else '') for r in results]
    for result in results:
        for module in result.get('unit_coverage_modules', []):
            lines.append(f"- Unit coverage {module['file']}: {module['line_percent']}% lines, {module['branch_percent']}% branches")
    lines += ['', 'Coverage above is for the unit-tested modules, not the entire browser application.']
    lines += ['', 'Hardware: not verified by automated checks.', 'Full details: report.json and individual .log files.']
    (OUTPUT / 'report.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print('Report: test-results/report.json (full logs saved alongside)')
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    sys.exit(main())
