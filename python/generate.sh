if [ -x "$(command -v deactivate)" ]
then
  deactivate
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

python generate_tray.py -o ../packages/core/generated/python_library.json
