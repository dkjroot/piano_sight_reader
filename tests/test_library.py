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
        self.assertGreaterEqual(len(entries), 8)
        self.assertEqual(len({entry['id'] for entry in entries}), len(entries))
        with app.test_client() as client:
            for entry in entries:
                for field in ('composer', 'era', 'style', 'difficulty'):
                    self.assertTrue(entry[field])
                self.assertEqual(entry['difficulty'], 'Unrated')
                score = compile_piece(ROOT, entry)
                self.assertEqual(score, json.loads((ROOT / entry['inspection']).read_text(encoding='utf-8')))
                self.assertEqual(score['warnings'], entry.get('reviewed_warnings', []))
                self.assertEqual(score['warning_count'], len(entry.get('reviewed_warnings', [])))
                for name in [entry['midi'], entry['inspection']] + ([entry['licence_file']] if entry.get('licence_file') else []):
                    with client.get('/static/library/'+name) as response:
                        self.assertEqual(response.status_code, 200)

    def test_reviewed_satie_redundant_releases_remain_visible_and_hash_pinned(self):
        entries = json.loads((ROOT / 'catalogue.json').read_text(encoding='utf-8'))['pieces']
        entry = next(piece for piece in entries if piece['id'] == 'satie-gymnopedie-1')
        score = compile_piece(ROOT, entry)
        redundant = [event for event in score['events'] if event['tick'] == 13824 and event['track'] == 1 and event['message'].get('note') == 66 and event['message'].get('velocity') == 0]
        self.assertEqual(len(redundant), 3, 'one real release and two redundant source releases')
        with self.assertRaises(ValueError):
            compile_piece(ROOT, {**entry, 'reviewed_warnings': []})

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

    def test_licence_evidence_and_sharealike_terms_are_required(self):
        entries = json.loads((ROOT / 'catalogue.json').read_text(encoding='utf-8'))['pieces']
        pd = entries[0]
        for changes in [{'licence_evidence': ''}, {'licence': 'Free download'}, {'licence_url': 'https://outside.invalid/'}]:
            with self.assertRaises(ValueError):
                compile_piece(ROOT, {**pd, **changes})
        sa = next(entry for entry in entries if entry['licence'] == 'CC BY-SA 4.0')
        self.assertEqual(compile_piece(ROOT, sa)['provenance']['contributor'], 'Petro Kostandy')
        for name in ['', '../outside.txt']:
            with self.assertRaises(ValueError):
                compile_piece(ROOT, {**sa, 'licence_file': name})
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            (directory / sa['licence_file']).write_text('Truncated licence', encoding='utf-8')
            with self.assertRaises(ValueError):
                compile_piece(directory, sa)
        clementi = next(entry for entry in entries if entry['id'] == 'clementi-op36-1-1')
        self.assertEqual(compile_piece(ROOT, clementi)['provenance']['source_archive_member'], 'sonatina-1.mid')


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


class NotationAssetTests(unittest.TestCase):
    def test_offline_engine_matches_pinned_assets_and_font_notices(self):
        from hashlib import sha256
        directory = ROOT.parent / 'vendor' / 'vexflow-5.0.0'
        manifest = json.loads((directory / 'manifest.json').read_text(encoding='utf-8'))
        self.assertEqual(manifest['version'], '5.0.0')
        self.assertEqual(manifest['source_commit'], '0ca6f889545c33cce851b420c24945f6eb685aeb')
        self.assertTrue(manifest['package_integrity'].startswith('sha512-'))
        for entry in manifest['files']:
            data = (directory / entry['file']).read_bytes()
            self.assertEqual(len(data), entry['bytes'])
            self.assertEqual(sha256(data).hexdigest(), entry['sha256'])
        self.assertIn('Permission is hereby granted', (directory / 'LICENSE-MIT.txt').read_text(encoding='utf-8'))
        for font in ('bravura', 'academico'):
            self.assertIn('SIL OPEN FONT LICENSE', (directory / (font+'-OFL.txt')).read_text(encoding='utf-8'))
