# HTML → Excel Converter

Simple Flask web app to convert HTML files (with tables) into Excel (.xlsx). Upload an HTML file and click the button to receive a downloadable Excel workbook. Multiple HTML tables will be written to separate sheets.

Quick start

1. Create and activate a virtual environment (recommended):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
pip install -r requirements.txt
```

3. Run the app:

```powershell
python run.py
```

The app will open in your default browser on http://127.0.0.1:5000

Create a single-file executable (optional)

You can package `run.py` into an .exe using PyInstaller. Templates must be included with `--add-data`.

Example (Windows):

```powershell
pip install pyinstaller
pyinstaller --onefile --add-data "templates;templates" run.py
```

The produced `dist\run.exe` will run the server; you may need to ensure the `templates` folder is available or adjust how templates are loaded when packaging.

Notes
- The converter uses `pandas.read_html` to extract tables. If your HTML uses non-table markup, additional parsing logic will be needed.
- If a file contains multiple tables, each will become `Sheet1`, `Sheet2`, etc.

**Note:** the render deployment script requires `gunicorn` which is now included in `requirements.txt`.

## Deploying on Render.com

You can host this project on Render as a Python web service. Create a `run_start.sh` script (included) with the following content:

```bash
#!/usr/bin/env bash
set -euo pipefail
python -m pip install --upgrade pip
pip install -r requirements.txt
PORT=${PORT:-5000}
exec gunicorn --bind "0.0.0.0:${PORT}" app:app
```

Make the script executable (`chmod +x run_start.sh`) and commit it. On Render use:

- **Build & start command**: `bash run_start.sh`
- **Environment**: Python 3 (the script uses `$PORT` provided by Render)

Alternatively, add a `render.yaml` service definition:

```yaml
services:
  - type: web
    name: html-to-excel
    env: python
    plan: free
    buildCommand: bash run_start.sh
    startCommand: bash run_start.sh
```

After deployment, the app behaves the same; upload HTML files via the web UI and download an Excel workbook.
