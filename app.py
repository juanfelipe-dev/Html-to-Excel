from io import BytesIO, StringIO
import os
import re
from flask import Flask, request, render_template, send_file, redirect, url_for, flash
import pandas as pd

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 64 * 1024 * 1024
app.secret_key = os.environ.get('FLASK_SECRET', 'dev-secret')


def _sanitize_sheet_name(name: str) -> str:
    # Remove characters not allowed in Excel sheet names and limit length to 31
    name = re.sub(r'[\\\/*?:\[\]]', '_', name)
    return name[:31]


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/convert', methods=['POST'])
def convert():
    # Support both single-file form field `file` and multi-file field `files`
    files = request.files.getlist('files') or []
    single = request.files.get('file')
    if single and (not files or files == [None]):
        files = [single]

    files = [f for f in files if f and f.filename]
    if not files:
        flash('No file selected')
        return redirect(url_for('index'))

    try:
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            for f in files:
                filename = f.filename
                content = f.read()
                try:
                    text = content.decode('utf-8')
                except Exception:
                    text = content.decode('latin1', errors='ignore')

                # extract all tables from this HTML file
                dfs = pd.read_html(StringIO(text))
                base = os.path.splitext(filename)[0]
                for i, df in enumerate(dfs, start=1):
                    sheet_name = f"{base} - Sheet{i}"
                    sheet_name = _sanitize_sheet_name(sheet_name)
                    # ensure uniqueness by appending index if necessary
                    original = sheet_name
                    j = 1
                    while sheet_name in writer.book.sheetnames:
                        sheet_name = f"{original}_{j}"
                        sheet_name = _sanitize_sheet_name(sheet_name)
                        j += 1
                    df.to_excel(writer, sheet_name=sheet_name, index=False)

        output.seek(0)
        out_name = 'converted.xlsx'
        # If only one input file, use its name for the output
        if len(files) == 1:
            out_name = os.path.splitext(files[0].filename)[0] + '.xlsx'

        return send_file(
            output,
            as_attachment=True,
            download_name=out_name,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except ValueError:
        flash('No tables found in the uploaded HTML file(s).')
        return redirect(url_for('index'))
    except Exception as e:
        flash(f'Error processing file(s): {e}')
        return redirect(url_for('index'))


if __name__ == '__main__':
    app.run(debug=True)
