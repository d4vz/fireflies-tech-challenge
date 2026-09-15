#!/usr/bin/env python3
"""Prove CdpChrome talks Chrome DevTools Protocol, including click and ticket login."""

from __future__ import annotations

import importlib.machinery
import importlib.util
import threading
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
CONTROL = SCRIPT_DIR / "control-fireflies"
SIGNIN_HTML = (
    b"<!doctype html><html><head><title>Meetings</title></head><body>"
    b"<h1>Sign in</h1></body></html>"
)
HOME_HTML = (
    b"<!doctype html><html><head><title>Meetings</title></head><body>"
    b"<aside><nav><a href='/meetings'>Meetings</a></nav></aside>"
    b"<h1>Home</h1><p>Good Morning, Verify</p></body></html>"
)
MEETINGS_HTML = (
    b"<!doctype html><html><head><title>Meetings</title></head><body>"
    b"<h1>Meetings</h1><p>Capture your first meeting</p></body></html>"
)


def load_control():
    loader = importlib.machinery.SourceFileLoader("control_fireflies", str(CONTROL))
    spec = importlib.util.spec_from_loader(loader.name, loader)
    if spec is None:
        raise SystemExit(f"cannot load {CONTROL}")
    module = importlib.util.module_from_spec(spec)
    loader.exec_module(module)
    return module


def serve() -> HTTPServer:
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802
            parsed = urllib.parse.urlparse(self.path)
            query = urllib.parse.parse_qs(parsed.query)
            if parsed.path == "/sign-in" and query.get("__clerk_ticket"):
                self.send_response(302)
                self.send_header("Location", "/")
                self.end_headers()
                return
            if parsed.path == "/sign-in":
                body = SIGNIN_HTML
            elif parsed.path.startswith("/meetings"):
                body = MEETINGS_HTML
            else:
                body = HOME_HTML
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format: str, *args: object) -> None:
            del format, args

    server = HTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def assert_png(path: Path) -> None:
    if path.read_bytes()[:8] != b"\x89PNG\r\n\x1a\n":
        raise SystemExit(f"{path} is not a PNG")


def main() -> None:
    control = load_control()
    dest = control.RUN_DIR / "cdp-harness-test"
    dest.mkdir(parents=True, exist_ok=True)
    shot = dest / "probe.png"
    html = dest / "probe.html"
    aria = dest / "probe.aria.txt"
    meetings_shot = dest / "meetings.png"
    meetings_html = dest / "meetings.html"
    meetings_aria = dest / "meetings.aria.txt"
    signed_shot = dest / "signed-in.png"
    signed_html = dest / "signed-in.html"
    signed_aria = dest / "signed-in.aria.txt"
    for path in (
        shot,
        html,
        aria,
        meetings_shot,
        meetings_html,
        meetings_aria,
        signed_shot,
        signed_html,
        signed_aria,
    ):
        if path.exists():
            path.unlink()

    server = serve()
    origin = f"http://127.0.0.1:{server.server_port}"
    url = f"{origin}/"
    try:
        with control.CdpChrome() as cdp:
            if not cdp.cdp_base.startswith("http://127.0.0.1:"):
                raise SystemExit(f"expected CDP HTTP endpoint, got {cdp.cdp_base}")
            cdp.capture(url, shot, html, aria)
            cdp.drive(
                [
                    {"action": "signIn"},
                    control.capture_step(signed_shot, signed_html, signed_aria),
                    {"action": "click", "name": "Meetings"},
                    {"action": "waitPath", "path": "/meetings"},
                    {"action": "waitText", "text": "Capture your first meeting"},
                    control.capture_step(meetings_shot, meetings_html, meetings_aria),
                ],
                ticket="tok_verify",
                origin=origin,
            )
    finally:
        server.shutdown()
        server.server_close()

    assert_png(shot)
    assert_png(signed_shot)
    assert_png(meetings_shot)
    if "Good Morning, Verify" not in signed_html.read_text():
        raise SystemExit("__clerk_ticket sign-in did not reach Home")
    if "Good Morning, Verify" not in signed_aria.read_text():
        raise SystemExit("signed-in AX tree missed the greeting")
    if "Capture your first meeting" not in meetings_html.read_text():
        raise SystemExit("CDP click did not reach Meetings")
    if "Capture your first meeting" not in meetings_aria.read_text():
        raise SystemExit("Meetings AX tree missed the empty copy")
    print(f"cdp-harness=ok origin={origin} signed_in={signed_shot} meetings={meetings_shot}")


if __name__ == "__main__":
    main()
