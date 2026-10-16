"""Rebuild bundled MIDI inspections offline after source/licence review."""
from hashlib import sha256
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from score_import import inspect_midi


def compile_piece(directory, entry):
    required = ('title', 'composer', 'source_page', 'source_url', 'edition', 'contributor', 'licence', 'licence_url', 'reviewed')
    if any(not entry.get(field) for field in required):
        raise ValueError('Missing library provenance or licence metadata.')
    if Path(entry['midi']).name != entry['midi'] or Path(entry['inspection']).name != entry['inspection']:
        raise ValueError('Library assets must be basenames.')
    data = (directory / entry['midi']).read_bytes()
    if sha256(data).hexdigest() != entry['sha256']:
        raise ValueError('MIDI checksum does not match the reviewed source.')
    score = inspect_midi(data)
    score['licence'] = entry['licence']
    score['provenance'] = {field: entry[field] for field in required}
    return score


def main():
    directory = ROOT / 'static' / 'library'
    catalogue = json.loads((directory / 'catalogue.json').read_text(encoding='utf-8'))
    for entry in catalogue['pieces']:
        score = compile_piece(directory, entry)
        (directory / entry['inspection']).write_text(json.dumps(score, separators=(',', ':'), ensure_ascii=False)+'\n', encoding='utf-8', newline='\n')
        print(entry['id']+': '+str(len(score['notes']))+' attacks')


if __name__ == '__main__':
    main()
