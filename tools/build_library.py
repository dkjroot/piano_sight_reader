"""Rebuild bundled MIDI inspections offline after source/licence review."""
from hashlib import sha256
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from score_import import inspect_midi
from musicxml_import import import_musicxml


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
    if entry.get('notation_source'):
        if Path(entry['notation_source']).name != entry['notation_source'] or not entry.get('notation_source_url'):
            raise ValueError('Invalid reviewed notation source.')
        if sha256((directory / entry['notation_source']).read_bytes()).hexdigest() != entry.get('notation_source_sha256'):
            raise ValueError('Notation source checksum does not match the reviewed source.')
    score = inspect_midi(data)
    if score['warnings'] != entry.get('reviewed_warnings', []) or score['warning_count'] != len(entry.get('reviewed_warnings', [])):
        raise ValueError('MIDI diagnostics differ from the explicitly reviewed warnings.')
    score['licence'] = entry['licence']
    provenance_fields = required + ('source_title', 'metadata_sha256', 'source_archive_sha256', 'source_archive_member', 'licence_file')
    score['provenance'] = {field: entry[field] for field in provenance_fields if field in entry}
    return score


def compile_notation(directory, entry):
    compile_piece(directory, entry)  # edition/asset provenance must still validate
    excerpt = entry['notation_excerpt']
    for field in ('xml', 'inspection'):
        if Path(excerpt[field]).name != excerpt[field]:
            raise ValueError('Notation excerpt assets must be basenames.')
    data = (directory / excerpt['xml']).read_bytes()
    if sha256(data).hexdigest() != excerpt['sha256'] or not entry.get('notation_source_sha256'):
        raise ValueError('Notation excerpt checksum does not match the reviewed source.')
    score = import_musicxml(data)
    score['provenance'].update(edition=entry['edition'], contributor=entry['contributor'],
        licence=entry['licence'], source_page=entry['source_page'], excerpt=excerpt['scope'],
        notation_source_sha256=entry['notation_source_sha256'])
    return score


def main():
    directory = ROOT / 'static' / 'library'
    catalogue = json.loads((directory / 'catalogue.json').read_text(encoding='utf-8'))
    for entry in catalogue['pieces']:
        score = compile_piece(directory, entry)
        (directory / entry['inspection']).write_text(json.dumps(score, separators=(',', ':'), ensure_ascii=False)+'\n', encoding='utf-8', newline='\n')
        print(entry['id']+': '+str(len(score['notes']))+' attacks')
        if entry.get('notation_excerpt'):
            notation = compile_notation(directory, entry)
            (directory / entry['notation_excerpt']['inspection']).write_text(json.dumps(notation, separators=(',', ':'), ensure_ascii=False)+'\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    main()
