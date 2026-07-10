"""Obtiene un GMAIL_REFRESH_TOKEN para mandar mails con la API de Gmail.

Se corre UNA sola vez, a mano. El refresh token no vence mientras la app siga
autorizada, así que después vive como variable de entorno en Railway.

Requiere un cliente OAuth de tipo "Aplicación de escritorio" en Google Cloud
Console (no el "Aplicación web" del login: ese exige redirect_uri públicos).

Uso:
    GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... python scripts/gmail_refresh_token.py
"""
import http.server
import os
import secrets
import sys
import threading
import urllib.parse
import webbrowser

import httpx

CLIENT_ID = os.getenv("GMAIL_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("GMAIL_CLIENT_SECRET", "")
PORT = 8765
REDIRECT_URI = f"http://localhost:{PORT}"
SCOPE = "https://www.googleapis.com/auth/gmail.send"

if not CLIENT_ID or not CLIENT_SECRET:
    sys.exit("Faltan GMAIL_CLIENT_ID y/o GMAIL_CLIENT_SECRET en el entorno.")

_state = secrets.token_urlsafe(16)
_code: list[str] = []
_done = threading.Event()


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        if params.get("state", [""])[0] != _state:
            self.wfile.write("<h1>state invalido</h1>".encode())
            return
        if "code" in params:
            _code.append(params["code"][0])
            self.wfile.write("<h1>Listo. Volve a la terminal.</h1>".encode())
        else:
            self.wfile.write(f"<h1>Error: {params.get('error')}</h1>".encode())
        _done.set()

    def log_message(self, *args) -> None:  # silenciar el log del http.server
        pass


auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
    "client_id": CLIENT_ID,
    "redirect_uri": REDIRECT_URI,
    "response_type": "code",
    "scope": SCOPE,
    "state": _state,
    # `offline` + `consent` fuerzan que Google devuelva el refresh token: sin
    # prompt=consent sólo lo manda la primera vez que autorizás la app.
    "access_type": "offline",
    "prompt": "consent",
})

server = http.server.HTTPServer(("localhost", PORT), Handler)
threading.Thread(target=server.handle_request, daemon=True).start()

print("Abriendo el navegador. Inicia sesion con la cuenta que va a MANDAR los mails")
print(f"(ahorrandoando.no.reply@gmail.com), no con la tuya personal.\n\n{auth_url}\n")
webbrowser.open(auth_url)

if not _done.wait(timeout=300):
    sys.exit("Se agoto el tiempo esperando la autorizacion en el navegador.")
if not _code:
    sys.exit("Google no devolvio el code (mira el error en el navegador).")

resp = httpx.post("https://oauth2.googleapis.com/token", data={
    "code": _code[0],
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "redirect_uri": REDIRECT_URI,
    "grant_type": "authorization_code",
}, timeout=20)
resp.raise_for_status()
token = resp.json().get("refresh_token")

if not token:
    sys.exit("Google no devolvio refresh_token. Revoca el acceso en "
             "https://myaccount.google.com/permissions y corre el script de nuevo.")

print("\n" + "=" * 70)
print("GMAIL_REFRESH_TOKEN=" + token)
print("=" * 70)
print("\nCargalo en Railway (servicio backend) junto con GMAIL_CLIENT_ID y")
print("GMAIL_CLIENT_SECRET. No lo commitees.")
