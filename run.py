import webbrowser
from app import app

if __name__ == '__main__':
    url = 'http://127.0.0.1:5000'
    webbrowser.open(url)
    app.run(host='127.0.0.1', port=5000)
