import unittest
from app import app


class ServerTests(unittest.TestCase):
    def test_page_and_local_assets(self):
        with app.test_client() as client:
            page = client.get('/')
            self.assertEqual(page.status_code, 200)
            self.assertIn(b'Connect MIDI', page.data)
            for asset in ('app.js', 'core.js', 'notation.js', 'harmony.js', 'metrics.js', 'progress.js', 'audio.js', 'sound.js', 'score.js', 'outline.js', 'style.css', 'lyre.svg'):
                with client.get('/static/' + asset) as response:
                    self.assertEqual(response.status_code, 200)
            self.assertEqual(client.get('/health').json, {'status': 'ok'})


if __name__ == '__main__':
    unittest.main()
