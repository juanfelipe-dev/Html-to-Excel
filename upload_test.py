import requests

url = 'http://127.0.0.1:5000/convert'
with open('sample.html', 'rb') as f:
    files = {'files': ('sample.html', f, 'text/html')}
    r = requests.post(url, files=files)

if r.status_code == 200:
    with open('sample_converted.xlsx', 'wb') as out:
        out.write(r.content)
    print('UPLOAD_OK')
else:
    print('UPLOAD_FAIL', r.status_code)
    print(r.text)
