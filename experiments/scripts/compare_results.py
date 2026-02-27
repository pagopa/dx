#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / 'results'

def collect():
    out = {}
    for d in RESULTS.iterdir():
        if not d.is_dir():
            continue
        m = d / 'metrics.json'
        if m.exists():
            out[d.name] = json.loads(m.read_text())
    print(json.dumps(out, indent=2))

if __name__ == '__main__':
    collect()
