#!/usr/bin/env python3
import sys
import json
from pathlib import Path

def summarize(results_dir: Path):
    s = {}
    for f in results_dir.glob('*'):
        s[f.name] = {'exists': True}
    return s

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: compare_results.py <results_dir>')
        sys.exit(1)
    p = Path(sys.argv[1])
    if not p.exists():
        print('Directory not found:', p)
        sys.exit(2)
    print(json.dumps(summarize(p), indent=2))
