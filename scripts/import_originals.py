"""Importe les copies officielles, uniquement si elles sont identiques au ZIP reçu."""
from pathlib import Path
import hashlib
import json
import tempfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://www.datagrandest.fr/geonetwork/srv/api/records/a9557bbf-673a-4936-a01e-6f250554b33f/attachments/'


def download(name, destination):
    request = urllib.request.Request(SOURCE + name, headers={'User-Agent': 'Concours-DataGrandEst-2026/1.0'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=90) as response, open(destination, 'wb') as output:
                while data := response.read(1024 * 1024):
                    output.write(data)
            return
        except Exception:
            if attempt == 2:
                raise


def verify_and_install(source, item):
    data = source.read_bytes()
    if len(data) != item['bytes'] or hashlib.sha256(data).hexdigest() != item['sha256']:
        raise RuntimeError('Le fichier officiel diffère de l’original reçu : ' + item['path'])
    destination = ROOT / item['path']
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    print('Identique au ZIP reçu :', item['path'], flush=True)


def main():
    manifest = json.loads((ROOT / 'DONNEES/manifest.json').read_text())
    with tempfile.TemporaryDirectory() as work:
        work = Path(work)
        tables = []
        for item in manifest:
            if item['path'].startswith('DONNEES/donnees/'):
                tables.append(item)
                continue
            name = Path(item['path']).name
            download(name, work / name)
            verify_and_install(work / name, item)
        download('donnees.zip', work / 'donnees.zip')
        with zipfile.ZipFile(work / 'donnees.zip') as archive:
            for item in tables:
                name = Path(item['path']).name
                matches = [entry for entry in archive.namelist() if Path(entry).name == name]
                if len(matches) != 1:
                    raise RuntimeError('Fichier absent ou ambigu dans l’archive officielle : ' + name)
                (work / name).write_bytes(archive.read(matches[0]))
                verify_and_install(work / name, item)


if __name__ == '__main__':
    main()
