#!/usr/bin/env bash

set -eux

if [ -x "$(command -v deactivate)" ]
then
  # Attempt to deactivate any virutal env. If deactivating the virtual env fails
  # then we're probably not in a virtual env, there's another deactivate command.
  deactivate || true
fi

if [ ! -d "venv" ]
then
  echo "Creating venv"
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
else
  source venv/bin/activate
fi

python setup.py bdist_wheel
