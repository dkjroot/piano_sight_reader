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


class AcousticAssetTests(unittest.TestCase):
    def test_sample_assets_match_pinned_manifest_and_credits(self):
        from hashlib import sha256
        directory = ROOT.parent / 'audio' / 'salamander'
        manifest = json.loads((directory / 'manifest.json').read_text(encoding='utf-8'))
        self.assertEqual(manifest['author'], 'Alexander Holm')
        self.assertEqual(manifest['licence'], 'CC BY 3.0')
        self.assertEqual(len(manifest['samples']), 30)
        self.assertEqual([sample['pitch'] for sample in manifest['samples']], list(range(21, 109, 3)))
        for sample in manifest['samples']:
            data = (directory / sample['file']).read_bytes()
            self.assertEqual(len(data), sample['bytes'])
            self.assertEqual(sha256(data).hexdigest(), sample['sha256'])
        self.assertIn('Alexander Holm', (directory / 'NOTICES.md').read_text(encoding='utf-8'))
        self.assertIn('Attribution 3.0', (directory / 'CC-BY-3.0.txt').read_text(encoding='utf-8'))
