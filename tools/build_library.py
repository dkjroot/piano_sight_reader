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
    required = ('title', 'composer', 'source_page', 'source_url', 'edition', 'contributor', 'licence', 'licence_url', 'licence_evidence', 'reviewed')
    if any(not entry.get(field) for field in required):
        raise ValueError('Missing library provenance or licence metadata.')
    licences = {
        'Public Domain dedication': 'https://www.mutopiaproject.org/legal.html#publicdomain',
        'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
        'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
    }
    if entry['licence'] not in licences or entry['licence_url'] != licences[entry['licence']]:
        raise ValueError('Library licence requires a separate review before acceptance.')
    if entry['licence'] == 'CC BY-SA 4.0':
        name = entry.get('licence_file', '')
        if not name or Path(name).name != name:
            raise ValueError('Share-alike editions require a local licence text.')
        text = (directory / name).read_text(encoding='utf-8')
        if 'Attribution-ShareAlike 4.0 International' not in text or 'Section 8' not in text:
            raise ValueError('Incomplete share-alike licence text.')
    if Path(entry['midi']).name != entry['midi'] or Path(entry['inspection']).name != entry['inspection']:
        raise ValueError('Library assets must be basenames.')
    data = (directory / entry['midi']).read_bytes()
    if sha256(data).hexdigest() != entry['sha256']:
        raise ValueError('MIDI checksum does not match the reviewed source.')
    score = inspect_midi(data)
    score['licence'] = entry['licence']
    provenance_fields = required + ('source_title', 'metadata_sha256', 'source_archive_sha256', 'source_archive_member', 'licence_file')
    score['provenance'] = {field: entry[field] for field in provenance_fields if field in entry}
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
