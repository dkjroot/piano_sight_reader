import json
from pathlib import Path
import tempfile
import unittest

from tools.build_library import compile_piece

ROOT = Path(__file__).resolve().parents[1] / 'static' / 'library'


class LibraryTests(unittest.TestCase):
    def test_every_bundled_piece_is_reproducible_and_served_locally(self):
        from app import app
        entries = json.loads((ROOT / 'catalogue.json').read_text(encoding='utf-8'))['pieces']
        self.assertGreaterEqual(len(entries), 2)
        with app.test_client() as client:
            for entry in entries:
                score = compile_piece(ROOT, entry)
                self.assertEqual(score, json.loads((ROOT / entry['inspection']).read_text(encoding='utf-8')))
                self.assertEqual(score['warning_count'], 0)
                for name in [entry['midi'], entry['inspection']]:
                    with client.get('/static/library/'+name) as response:
                        self.assertEqual(response.status_code, 200)

    def test_changed_sources_and_incomplete_credits_are_rejected(self):
        entry = json.loads((ROOT / 'catalogue.json').read_text(encoding='utf-8'))['pieces'][0]
        with self.assertRaises(ValueError):
            compile_piece(ROOT, {**entry, 'licence': ''})
        with self.assertRaises(ValueError):
            compile_piece(ROOT, {**entry, 'midi': '../outside.mid'})
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            (directory / entry['midi']).write_bytes(b'changed')
            with self.assertRaises(ValueError):
                compile_piece(directory, entry)
