#!/usr/bin/env python3
"""Prove CdpChrome talks Chrome DevTools Protocol, not --screenshot/--dump-dom."""

from __future__ import annotations

import importlib.machinery
import importlib.util
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
CONTROL = SCRIPT_DIR / "control-fireflies"
PROBE_HTML = (
    b"<!doctype html><html><head><title>Meetings</title></head>"
    b"<body><h1>CDP probe</h1><p>blob ok</p></body></html>"
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
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(PROBE_HTML)))
            self.end_headers()
            self.wfile.write(PROBE_HTML)

        def log_message(self, format: str, *args: object) -> None:
            del format, args

    server = HTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def main() -> None:
    control = load_control()
    dest = control.RUN_DIR / "cdp-harness-test"
    dest.mkdir(parents=True, exist_ok=True)
    shot = dest / "probe.png"
    html = dest / "probe.html"
    aria = dest / "probe.aria.txt"
    for path in (shot, html, aria):
        if path.exists():
            path.unlink()

    server = serve()
    url = f"http://127.0.0.1:{server.server_port}/"
    try:
        with control.CdpChrome() as cdp:
            if not cdp.cdp_base.startswith("http://127.0.0.1:"):
                raise SystemExit(f"expected CDP HTTP endpoint, got {cdp.cdp_base}")
            cdp.capture(url, shot, html, aria)
    finally:
        server.shutdown()
        server.server_close()

    png = shot.read_bytes()
    if png[:8] != b"\x89PNG\r\n\x1a\n":
        raise SystemExit(f"{shot} is not a PNG")
    page = html.read_text()
    tree = aria.read_text()
    if "CDP probe" not in page:
        raise SystemExit("Runtime.evaluate HTML missed the heading")
    if "CDP probe" not in tree:
        raise SystemExit("Accessibility.getFullAXTree missed the heading")
    print(f"cdp-harness=ok cdp={url} shot={shot}")


if __name__ == "__main__":
    main()
