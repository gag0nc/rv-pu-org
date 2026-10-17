#!/usr/bin/env bash
cd "$(dirname "$0")"
if [ ! -f venv/.ready ]; then
  python3 -m venv venv && ./venv/bin/pip install -r requirements.txt && touch venv/.ready || {
    echo "Installation failed. Check that Python 3.9 or newer is installed and the internet is on, then run this file again."
    exit 1
  }
fi
./venv/bin/python app.py
