#!/usr/bin/env bash
# entrypoint script suitable for deployment on Render.com
# installs dependencies and launches the Flask app using gunicorn

set -euo pipefail

# upgrade pip and install reqs (Render typically caches dependencies but we'll ensure)
python -m pip install --upgrade pip
pip install -r requirements.txt

# When running on Render, PORT is provided via environment variable
PORT=${PORT:-5000}

# Start the server with gunicorn
# Ensure templates/static are included by listing them in the repo (they already are)
exec gunicorn --bind "0.0.0.0:${PORT}" app:app
